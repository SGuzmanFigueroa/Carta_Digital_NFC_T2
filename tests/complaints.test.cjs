const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ts=require('typescript');
const {randomUUID,webcrypto}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
require('fake-indexeddb/auto');
const root=path.join(__dirname,'..'),modules=new Map();
function load(relative){
 const absolute=path.join(root,relative);if(modules.has(absolute))return modules.get(absolute).exports;
 const source=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};modules.set(absolute,module);
 const requireLocal=id=>id.startsWith('@/')?load('src/'+id.slice(2)+'.ts'):id.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(absolute),id))+'.ts'):require(id);
 new Function('require','module','exports',source)(requireLocal,module,module.exports);return module.exports;
}
const {validateComplaint}=load('src/features/complaints/validation.ts');
const {complaintReceiptHtml}=load('src/features/complaints/receipt.ts');
const input=()=>({fullName:'Consumidor de prueba',docType:'DNI',docNumber:'01234567',phone:'999888777',email:'prueba@example.test',address:'Dirección de prueba 123',
 isMinor:false,contractedGoodType:'PRODUCTO',claimedAmount:20.50,goodDescription:'Plato de prueba',claimType:'RECLAMO',detail:'Detalle de prueba para la hoja',consumerRequest:'Solicito una respuesta',declarationAccepted:true});
test('valida DNI/RUC/correo, datos del representante y normaliza sin perder ceros',()=>{
 assert.equal(validateComplaint(input()).valid,true);
 assert.equal(validateComplaint({...input(),docType:'RUC',docNumber:'12345678901'}).valid,true);
 for(const patch of [{docNumber:'1234567'},{docNumber:'123456789'},{docNumber:'1234567a'}, {docType:'RUC',docNumber:'1234567890'},
  {email:'sin-arroba'},{email:'a@b'},{email:'a@@b.com'},{email:'a@.com'},{email:'a..b@c.com'},{isMinor:true,parentName:''},{claimedAmount:-1},{claimedAmount:NaN},{claimedAmount:'20'},{declarationAccepted:false}])
  assert.equal(validateComplaint({...input(),...patch}).valid,false,JSON.stringify(patch));
 const result=validateComplaint({...input(),email:'  PRUEBA@EXAMPLE.TEST  ',fullName:'  Consumidor  '});
 assert.equal(result.value.email,'prueba@example.test');assert.equal(result.value.docNumber,'01234567');
});
test('copia completa: proveedor, fecha del servidor, documento, detalle y escape de HTML',()=>{
 const html=complaintReceiptHtml({...input(),detail:'<script>alert(1)</script>',isMinor:true,parentName:'Representante de prueba'},
  {claimCode:'REC-2026-0001',createdAt:'2026-10-10T15:00:00Z',provider:{bookId:'primary',name:'Proveedor de prueba',ruc:'12345678901',address:'Local de prueba',configured:true}});
 assert.ok(html.includes('01234567'));assert.ok(html.includes('Proveedor de prueba'));assert.ok(html.includes('Representante de prueba'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('Solicito una respuesta'));
});
async function setup(){
 const db=new PGlite();const dir=path.join(root,'supabase/migrations');
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated;`);
 await db.exec(fs.readFileSync(path.join(dir,'20260919183000_init_gastropulse.sql'),'utf8').replace(/^\uFEFF/,'').split('-- ROW LEVEL SECURITY')[0].replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
 await db.exec(fs.readFileSync(path.join(dir,'20261004225000_create_complaint_book.sql'),'utf8'));
 await db.exec("INSERT INTO public.system_config(id,branch_name,branch_ruc) VALUES('primary','Proveedor de prueba','12345678901')");
 await db.exec(fs.readFileSync(path.join(dir,'20261009010000_secure_complaint_book.sql'),'utf8'));
 await db.exec("UPDATE public.complaint_books SET provider_address='Local de prueba 123' WHERE id='primary'");
 return db;
}
const submit=(db,id,entry=input(),book='primary')=>db.query('SELECT public.submit_complaint($1,$2,$3::jsonb) AS receipt',[book,id,JSON.stringify(entry)]);
async function identity(db,claims={}){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify(claims)]);await db.exec('SET ROLE authenticated');}
test('PostgreSQL: correlativo, envío concurrente, reintentos, validación directa y snapshot',async()=>{
 const db=await setup();try{
  await db.exec('SET ROLE anon');
  for(const patch of [{docNumber:'123'},{docType:'RUC',docNumber:'1'},{email:'a@b'},{claimedAmount:-1},{claimedAmount:'5'},{isMinor:true},{declarationAccepted:false},{detail:''}])await assert.rejects(submit(db,randomUUID(),{...input(),...patch}));
  const id=randomUUID(),copies=await Promise.all(Array.from({length:5},()=>submit(db,id)));
  const receipt=copies[0].rows[0].receipt;assert.match(receipt.claimCode,/^REC-\d{4}-0001$/);
  copies.forEach(copy=>assert.deepEqual(copy.rows[0].receipt,receipt));
  await assert.rejects(submit(db,id,{...input(),detail:'Pedido con contenido diferente'}),/hoja distinta/);
  const second=(await submit(db,randomUUID(),{...input(),docType:'RUC',docNumber:'12345678901'})).rows[0].receipt;
  assert.match(second.claimCode,/-0002$/);
  await assert.rejects(db.query('SELECT * FROM public.complaint_book'),/permission denied/);
  await assert.rejects(db.exec("INSERT INTO public.complaint_book(claim_code,full_name,doc_type,doc_number,phone,email,address,contracted_good_type,claim_type,detail,consumer_request) VALUES ('fake','X','DNI','12345678','999999999','a@b.com','Address','PRODUCTO','QUEJA','Detail','Request')"),/permission denied/);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.complaint_book')).rows[0].n,2);
  await db.exec("UPDATE public.complaint_books SET provider_name='Nombre editado' WHERE id='primary'");
  await db.exec('SET ROLE anon');assert.deepEqual((await submit(db,id)).rows[0].receipt,receipt);
  await db.exec('RESET ROLE');
  await db.exec('UPDATE private.complaint_counters SET last_number=9999');
  assert.match((await submit(db,randomUUID())).rows[0].receipt.claimCode,/-10000$/);
  await db.exec("UPDATE public.complaint_books SET provider_address=NULL WHERE id='primary'");
  await assert.rejects(submit(db,randomUUID()),/identificación/);
 }finally{await db.close();}
});
test('PostgreSQL: lectura restringida, roles falsos, edición autorizada y hojas inmutables',async()=>{
 const db=await setup();try{
  const id=randomUUID();await submit(db,id);
  await identity(db,{user_metadata:{complaint_role:'admin',complaint_book_id:'primary'}});
  assert.equal((await db.query('SELECT * FROM public.complaint_book')).rows.length,0);
  await assert.rejects(db.query("SELECT public.configure_complaint_book('primary','Otro proveedor','12345678901','Otra dirección')"),/permiso/);
  await identity(db,{app_metadata:{complaint_role:'admin',complaint_book_id:'secondary'}});
  assert.equal((await db.query('SELECT * FROM public.complaint_book')).rows.length,0);
  await assert.rejects(db.query("SELECT public.configure_complaint_book('primary','Otro proveedor','12345678901','Otra dirección')"),/permiso/);
  await identity(db,{app_metadata:{complaint_role:'admin',complaint_book_id:'primary'}});
  assert.equal((await db.query('SELECT * FROM public.complaint_book')).rows.length,1);
  await db.exec("UPDATE public.complaint_book SET status='ATENDIDO',resolution_notes='Respuesta del proveedor',resolved_at=now()");
  await assert.rejects(db.exec("UPDATE public.complaint_book SET detail='Contenido modificado'"),/reescribir/);
  await db.query("SELECT public.configure_complaint_book('primary','Proveedor editado','12345678901','Dirección editada 456')");
  const {rows}=await db.query("SELECT public.get_complaint_book('primary') AS book");assert.equal(rows[0].book.name,'Proveedor editado');
 }finally{await db.close();}
});
test('almacenamiento AES-GCM: no guarda texto personal, clave no exportable, envío offline y reintento estable',async()=>{
 Object.defineProperty(global,'crypto',{value:webcrypto,configurable:true});
 global.localStorage={getItem(){throw new Error('No se debe leer datos personales de localStorage');},setItem(){throw new Error('No debe escribirse PII en localStorage');}};
 const storage=load('src/services/complaintStorage.ts'),service=load('src/services/complaintService.ts');
 const id=randomUUID();const record={requestId:id,bookId:'primary',entry:input(),savedAt:new Date().toISOString()};
 await storage.savePendingComplaint(record);assert.deepEqual(await storage.getPendingComplaints('primary'),[record]);
 assert.deepEqual(await storage.getPendingComplaints('otro-libro'),[]);
 const db=await new Promise(resolve=>{const r=indexedDB.open('gastropulse_complaints_encrypted_v1',1);r.onsuccess=()=>resolve(r.result);});
 const get=(store,key)=>new Promise(resolve=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);});
 const raw=await get('pending',id),key=await get('keys','aes');
 assert.ok(!JSON.stringify(raw).includes(record.entry.fullName));assert.ok(!new TextDecoder().decode(raw.ciphertext).includes(record.entry.docNumber));
 await assert.rejects(webcrypto.subtle.exportKey('raw',key));db.close();
 global.fetch=async()=>{throw new TypeError('Offline');};
 const pending=await service.submitComplaintToDb(input(),id,'primary');assert.equal(pending.success,false);assert.equal(pending.pending,true);
 let submittedId;global.fetch=async(_url,options)=>{submittedId=JSON.parse(options.body).requestId;return Response.json({claimCode:'REC-2026-0003',createdAt:'2026-10-10T15:00:00Z',provider:{bookId:'primary',name:'Proveedor',ruc:'12345678901',address:'Dirección',configured:true}});};
 const registered=await service.retryPendingComplaint(id,'primary');assert.equal(registered.success,true);assert.equal(submittedId,id);
 assert.deepEqual(await storage.getPendingComplaints('primary'),[]);
 global.fetch=async()=>Response.json({error:'Datos inválidos'},{status:400});
 const rejected=await service.submitComplaintToDb(input(),randomUUID(),'primary');assert.equal(rejected.success,false);
 delete global.localStorage;
});
