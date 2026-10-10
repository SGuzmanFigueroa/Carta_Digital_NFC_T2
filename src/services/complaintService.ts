import {validateComplaint,type ComplaintInput,type ComplaintReceipt,type ComplaintProvider,type ComplaintErrors} from '@/features/complaints/validation';
import {savePendingComplaint,getPendingComplaints,removePendingComplaint} from './complaintStorage';
export type ComplaintEntry=ComplaintInput & Partial<ComplaintReceipt>;
export type SubmissionResult = {success:true;receipt:ComplaintReceipt;entry:ComplaintInput;requestId:string}
 | {success:false;pending:boolean;requestId:string;error:string;errors?:ComplaintErrors};
export async function fetchComplaintProvider():Promise<ComplaintProvider> {
  const response=await fetch('/api/complaints',{cache:'no-store'});
  if(!response.ok)throw new Error('No se pudo cargar la identificación del establecimiento. Solicita asistencia o el Libro de Reclamaciones físico.');
  return response.json();
}
export async function submitComplaintToDb(entry:ComplaintInput,requestId:string,bookId:string):Promise<SubmissionResult> {
  const validation=validateComplaint(entry);
  if(!validation.valid)return {success:false,pending:false,requestId,error:Object.values(validation.errors)[0]!,errors:validation.errors};
  const normalized=validation.value;
  let stored=false;
  try{await savePendingComplaint({requestId,bookId,entry:normalized,savedAt:new Date().toISOString()});stored=true;}catch{/* Online submission may still succeed. Never claim a local save unless confirmed. */}
  try {
    const response=await fetch('/api/complaints',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({requestId,bookId,entry:normalized})});
    const result=await response.json();
    if(!response.ok){
      return {success:false,pending:stored,requestId,error:result.error||'El registro no está disponible. Solicita el libro físico.',errors:result.errors};
    }
    if(typeof result.claimCode!=='string'||!/^REC-\d{4}-\d{4,}$/.test(result.claimCode)||typeof result.createdAt!=='string'||!result.provider)
      throw new Error('Respuesta de registro incompleta.');
    try{await removePendingComplaint(requestId);}catch{/* Keep idempotency if cleanup fails. */}
    return {success:true,receipt:result as ComplaintReceipt,entry:normalized,requestId};
  }catch{
    return {success:false,pending:stored,requestId,error:stored
      ?'La hoja quedó cifrada en este dispositivo, pero el registro no está confirmado. Reintenta con conexión o solicita el libro físico.'
      :'No se confirmó el registro ni se pudo guardar localmente. Conserva el formulario y solicita el libro físico.'};
  }
}
export const getLocalComplaints=getPendingComplaints;
export async function retryPendingComplaint(requestId:string,bookId:string):Promise<SubmissionResult> {
  const entry=(await getPendingComplaints(bookId)).find(record=>record.requestId===requestId)?.entry;
  if(!entry)return {success:false,pending:false,requestId,error:'No se encontró el borrador cifrado en este dispositivo.'};
  return submitComplaintToDb(entry,requestId,bookId);
}
