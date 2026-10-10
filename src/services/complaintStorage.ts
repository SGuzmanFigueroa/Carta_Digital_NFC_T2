import type { ComplaintInput } from '@/features/complaints/validation';
export interface PendingComplaint { requestId: string; bookId: string; entry: ComplaintInput; savedAt: string }
interface EncryptedComplaint { requestId: string; bookId: string; iv: Uint8Array<ArrayBuffer>; ciphertext: ArrayBuffer }
const DATABASE='gastropulse_complaints_encrypted_v1';
function openDatabase():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'||!globalThis.crypto?.subtle){reject(new Error('El almacenamiento cifrado no está disponible.'));return;}
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>{request.result.createObjectStore('keys');request.result.createObjectStore('pending',{keyPath:'requestId'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error('No se pudo abrir el almacenamiento cifrado.'));
    request.onblocked=()=>reject(new Error('Cierra otras pestañas del libro e inténtalo de nuevo.'));
  });
}
async function operation<T>(store:string,mode:IDBTransactionMode,run:(object:IDBObjectStore)=>IDBRequest<T>):Promise<T> {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(store,mode);
    const request=run(transaction.objectStore(store));
    transaction.oncomplete=()=>{db.close();resolve(request.result);};
    transaction.onerror=transaction.onabort=()=>{db.close();reject(new Error('No se pudo guardar de forma segura en este dispositivo.'));};
  });
}
let keyPromise:Promise<CryptoKey>|undefined;
async function encryptionKey():Promise<CryptoKey> {
  const saved=await operation<CryptoKey|undefined>('keys','readonly',s=>s.get('aes'));
  if(saved)return saved;
  const candidate=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  // A second tab may have generated a key. Insert/read in one serialized write transaction.
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('keys','readwrite'),store=tx.objectStore('keys');
    const request=store.get('aes');let key=candidate;
    request.onsuccess=()=>{if(request.result)key=request.result;else store.put(candidate,'aes');};
    tx.oncomplete=()=>{db.close();resolve(key);};
    tx.onerror=tx.onabort=()=>{db.close();reject(new Error('No se pudo crear la clave de cifrado.'));};
  });
}
function getKey():Promise<CryptoKey> {
  keyPromise??=encryptionKey().catch(error=>{keyPromise=undefined;throw error;});return keyPromise;
}
export async function savePendingComplaint(record:PendingComplaint):Promise<void> {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},await getKey(),new TextEncoder().encode(JSON.stringify(record)));
  await operation('pending','readwrite',s=>s.put({requestId:record.requestId,bookId:record.bookId,iv,ciphertext} satisfies EncryptedComplaint));
}
export async function getPendingComplaints(bookId:string):Promise<PendingComplaint[]> {
  const stored=await operation<EncryptedComplaint[]>('pending','readonly',s=>s.getAll());
  const selected=stored.filter(r=>r.bookId===bookId);
  if(!selected.length)return [];
  const key=await getKey();
  return Promise.all(selected.map(async r=>{
    const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:r.iv},key,r.ciphertext);
    const record=JSON.parse(new TextDecoder().decode(bytes)) as PendingComplaint;
    if(record.requestId!==r.requestId||record.bookId!==bookId)throw new Error('El borrador cifrado no es válido.');
    return record;
  }));
}
export async function removePendingComplaint(requestId:string):Promise<void> {
  await operation('pending','readwrite',s=>s.delete(requestId));
}
