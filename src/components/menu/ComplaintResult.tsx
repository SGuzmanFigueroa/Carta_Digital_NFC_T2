import type {ComplaintInput,ComplaintReceipt} from '@/features/complaints/validation';
import {downloadComplaintReceipt,printComplaintReceipt} from '@/features/complaints/receipt';
export function ComplaintResult({entry,receipt,error,onRetry,onClose,busy}:{entry:ComplaintInput;receipt:ComplaintReceipt|null;error:string;onRetry:()=>void;onClose:()=>void;busy:boolean}) {
  const rows:[string,string][]=[['Reclamante',`${entry.fullName} — ${entry.docType} ${entry.docNumber}`],['Correo',entry.email],['Dirección',entry.address],['Teléfono',entry.phone],
    ['Bien contratado',`${entry.contractedGoodType} — ${entry.goodDescription}`],['Monto reclamado',`S/ ${entry.claimedAmount.toFixed(2)}`],['Clasificación',entry.claimType],['Detalle',entry.detail],['Pedido del consumidor',entry.consumerRequest]];
  if(entry.isMinor)rows.push(['Representante del menor',entry.parentName||'']);
  return <div className="py-5 space-y-4">
    <h3 className="text-xl font-bold text-center">{receipt?'Hoja de Reclamación Registrada':'Hoja pendiente de registro'}</h3>
    {receipt?<div className="text-center space-y-2"><p className="font-bold text-[#c2410c] dark:text-[#ffb59c]">Código: {receipt.claimCode}</p>
      <p>{receipt.provider.name} — RUC {receipt.provider.ruc}</p><p className="text-sm">{receipt.provider.address}</p>
      <p className="text-sm">{new Date(receipt.createdAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</p></div>
    :<p role="status" className="rounded-xl border border-amber-500 p-3">{error} Aún no tiene código REC ni confirma la recepción por el restaurante.</p>}
    <dl className="rounded-xl border border-[#94a3b8]/40 p-4 space-y-3 text-sm">{rows.map(([label,value])=><div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
    {receipt&&<p className="text-sm">El establecimiento debe responder en un plazo máximo de 15 días hábiles. Descarga o imprime tu copia completa. No se ha enviado un correo automático.</p>}
    <div className="flex flex-wrap justify-center gap-2">
      {receipt?<><button type="button" onClick={()=>printComplaintReceipt(entry,receipt)} className="rounded-lg border px-3 py-2">Imprimir hoja</button>
        <button type="button" onClick={()=>downloadComplaintReceipt(entry,receipt)} className="rounded-lg border px-3 py-2">Descargar copia</button></>
      :<button type="button" disabled={busy} onClick={onRetry} className="rounded-lg bg-[#ff5708] px-3 py-2 font-bold text-[#2b0b00]">{busy?'Registrando…':'Reintentar con conexión'}</button>}
      <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-3 py-2">Volver a la carta</button>
    </div>
  </div>;
}
