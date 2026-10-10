import {createClient} from '@supabase/supabase-js';
import {validateComplaint,type ComplaintReceipt} from '@/features/complaints/validation';
export const runtime='nodejs';
const bookId=()=>process.env.COMPLAINT_BOOK_ID||'primary';
function client() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
}
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET() {
  const db=client();if(!db)return json({error:'El libro no está configurado.'},503);
  const {data,error}=await db.rpc('get_complaint_book',{p_book_id:bookId()});
  if(error||!data)return json({error:'El libro no está disponible. Solicita el libro físico.'},503);
  return json(data);
}
async function boundedBody(request:Request):Promise<unknown> {
  if(!request.body)throw new Error('Cuerpo vacío');
  const reader=request.body.getReader();let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
    if(size>32768){await reader.cancel();throw new Error('Solicitud demasiado grande');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function POST(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Origen no permitido.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Envía los datos como JSON.'},415);
  let body:{requestId?:unknown;bookId?:unknown;entry?:unknown};
  try{body=await boundedBody(request) as typeof body;if(!body||typeof body!=='object')throw new Error('Formato');}
  catch{return json({error:'La solicitud está vacía, es demasiado grande o no es válida.'},400);}
  if(typeof body.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))return json({error:'Referencia de envío inválida.'},400);
  if(body.bookId!==bookId())return json({error:'El formulario corresponde a otro establecimiento. Vuelve a abrirlo.'},409);
  const validation=validateComplaint(body.entry);
  if(!validation.valid)return json({error:Object.values(validation.errors)[0],errors:validation.errors},400);
  const db=client();if(!db)return json({error:'El libro no está configurado. Solicita el libro físico.'},503);
  const {data,error}=await db.rpc('submit_complaint',{p_book_id:bookId(),p_request_id:body.requestId,p_entry:validation.value});
  // Do not log or return database details containing personal data.
  if(error){
    if(error.code==='22023')return json({error:'Revisa los datos de la hoja o la referencia de envío.'},400);
    return json({error:'No se confirmó el registro. El establecimiento debe revisar su configuración. Puedes solicitar el libro físico.'},503);
  }
  if(!data)return json({error:'No se confirmó el registro.'},503);
  return json(data as ComplaintReceipt);
}

export async function PUT(request:Request) {
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Origen no permitido.'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!token||token.length>8000)return json({error:'Inicia una sesión segura de administrador del libro.'},401);
 if(!url||!key)return json({error:'El libro no está configurado.'},503);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:{user},error:userError}=await db.auth.getUser(token);
 if(userError||!user)return json({error:'La sesión no es válida.'},401);
 let body:{name?:unknown;ruc?:unknown;address?:unknown};try{body=await boundedBody(request) as typeof body;}catch{return json({error:'Solicitud inválida.'},400);}
 if(!body||typeof body.name!=='string'||body.name.trim().length<2||body.name.length>160||typeof body.ruc!=='string'||!/^\d{11}$/.test(body.ruc)
   ||typeof body.address!=='string'||body.address.trim().length<5||body.address.length>300)return json({error:'Completa la razón social, RUC de 11 dígitos y dirección.'},400);
 const {data,error}=await db.rpc('configure_complaint_book',{p_book_id:bookId(),p_name:body.name.trim(),p_ruc:body.ruc,p_address:body.address.trim()});
 if(error)return json({error:error.code==='42501'?'Tu cuenta no está autorizada para editar este libro.':'No se pudo guardar. Revisa la migración del libro.'},error.code==='42501'?403:503);
 return json(data);
}
