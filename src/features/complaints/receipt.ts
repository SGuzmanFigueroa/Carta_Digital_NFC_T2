import type {ComplaintInput,ComplaintReceipt} from './validation';
const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function complaintReceiptHtml(entry:ComplaintInput,receipt:ComplaintReceipt):string {
  const row=(label:string,value:unknown)=>`<tr><th>${label}</th><td>${escape(value)}</td></tr>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Hoja ${escape(receipt.claimCode)}</title>
  <style>body{font-family:Arial,sans-serif;margin:30px;color:#111;font-size:12px}h1{font-size:20px}h2{font-size:15px;margin-top:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:8px;text-align:left;vertical-align:top}th{width:30%}td{white-space:pre-wrap;overflow-wrap:anywhere}@media print{body{margin:0}}</style></head><body>
  <h1>LIBRO DE RECLAMACIONES — HOJA DE RECLAMACIÓN</h1>
  <table>${row('Código de hoja',receipt.claimCode)}${row('Código del establecimiento',receipt.provider.bookId)}
  ${row('Fecha y hora',new Date(receipt.createdAt).toLocaleString('es-PE',{timeZone:'America/Lima'}))}
  ${row('Razón social',receipt.provider.name)}${row('RUC del proveedor',receipt.provider.ruc)}${row('Domicilio del establecimiento',receipt.provider.address)}</table>
  <h2>1. Identificación del consumidor</h2><table>${row('Nombres y apellidos',entry.fullName)}${row('Documento',`${entry.docType} ${entry.docNumber}`)}
  ${row('Domicilio',entry.address)}${row('Teléfono',entry.phone)}${row('Correo electrónico',entry.email)}${row('Menor de edad',entry.isMinor?'Sí':'No')}
  ${entry.isMinor?row('Padre, madre o representante',entry.parentName):''}</table>
  <h2>2. Identificación del bien contratado</h2><table>${row('Tipo',entry.contractedGoodType)}${row('Monto reclamado (S/)',entry.claimedAmount.toFixed(2))}
  ${row('Descripción',entry.goodDescription)}${row('Mesa',entry.tableNumber||'No indicada')}</table>
  <h2>3. Detalle y pedido del consumidor</h2><table>${row('Clasificación',entry.claimType)}${row('Detalle',entry.detail)}${row('Pedido',entry.consumerRequest)}</table>
  <h2>4. Acciones y observaciones del proveedor</h2><p>Pendiente de respuesta por el establecimiento. Plazo máximo: 15 días hábiles.</p>
  <p>El consumidor declaró que los datos ingresados son verídicos. Canal de respuesta solicitado: correo electrónico.</p>
  <p>La formulación de un reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el Indecopi.</p>
  <p>CONSUMIDOR — Copia de la hoja registrada en el libro del proveedor. No constituye una respuesta al reclamo ni una certificación de Indecopi.</p></body></html>`;
}
export function downloadComplaintReceipt(entry:ComplaintInput,receipt:ComplaintReceipt):void {
  const url=URL.createObjectURL(new Blob([complaintReceiptHtml(entry,receipt)],{type:'text/html;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`${receipt.claimCode}.html`;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function printComplaintReceipt(entry:ComplaintInput,receipt:ComplaintReceipt):void {
  const frame=document.createElement('iframe');frame.style.position='fixed';frame.style.width='0';frame.style.height='0';
  frame.title='Copia de la hoja de reclamación';frame.srcdoc=complaintReceiptHtml(entry,receipt);
  frame.onload=()=>{frame.contentWindow?.focus();frame.contentWindow?.print();setTimeout(()=>frame.remove(),60000);};
  document.body.appendChild(frame);
}
