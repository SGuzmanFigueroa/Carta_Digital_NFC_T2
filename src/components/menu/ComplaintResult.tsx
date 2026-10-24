'use client';

import type {ComplaintInput,ComplaintReceipt} from '@/features/complaints/validation';
import {downloadComplaintReceipt,printComplaintReceipt} from '@/features/complaints/receipt';
import {useLanguage} from '@/hooks/useLanguage';
/**
 * CD-101 · Constancia de la hoja de reclamación (paso posterior al formulario).
 * El copy visible respeta el idioma activo; el documento imprimible
 * (`features/complaints/receipt.ts`) sigue siendo la hoja legal en español.
 */
export function ComplaintResult({entry,receipt,error,onRetry,onClose,busy}:{entry:ComplaintInput;receipt:ComplaintReceipt|null;error:string;onRetry:()=>void;onClose:()=>void;busy:boolean}) {
  const {language,t}=useLanguage();
  const goodType=entry.contractedGoodType==='PRODUCTO'?t('claim.product'):t('claim.service');
  const classification=entry.claimType==='RECLAMO'?t('claim.typeClaim'):t('claim.typeComplaint');
  const rows:[string,string][]=[[t('claim.rowClaimant'),`${entry.fullName} — ${entry.docType} ${entry.docNumber}`],[t('claim.rowEmail'),entry.email],
    [t('claim.rowAddress'),entry.address],[t('claim.rowPhone'),entry.phone],
    [t('claim.rowGood'),`${goodType} — ${entry.goodDescription}`],[t('claim.rowAmount'),`S/ ${entry.claimedAmount.toFixed(2)}`],
    [t('claim.rowClassification'),classification],[t('claim.rowDetail'),entry.detail],[t('claim.rowRequest'),entry.consumerRequest]];
  if(entry.isMinor)rows.push([t('claim.rowGuardian'),entry.parentName||'']);
  return <div className="py-5 space-y-4">
    <h3 className="text-xl font-bold text-center">{receipt?t('claim.successTitle'):t('claim.resultPending')}</h3>
    {receipt?<div className="text-center space-y-2"><p className="font-bold text-[#c2410c] dark:text-[#ffb59c]">{t('claim.codeLabel',{code:receipt.claimCode})}</p>
      <p>{t('claim.resultProvider',{provider:receipt.provider.name,ruc:receipt.provider.ruc})}</p><p className="text-sm">{receipt.provider.address}</p>
      <p className="text-sm">{new Date(receipt.createdAt).toLocaleString(language==='en'?'en-US':'es-PE',{timeZone:'America/Lima'})}</p></div>
    :<p role="status" className="rounded-xl border border-amber-500 p-3">{error&&<span className="block font-semibold">{error}</span>}{t('claim.pendingBody')}</p>}
    <dl className="rounded-xl border border-[#94a3b8]/40 p-4 space-y-3 text-sm">{rows.map(([label,value])=><div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
    {receipt&&<p className="text-sm">{t('claim.resultDeadline',{days:15})}</p>}
    <div className="flex flex-wrap justify-center gap-2">
      {receipt?<><button type="button" onClick={()=>printComplaintReceipt(entry,receipt)} className="rounded-lg border px-3 py-2">{t('claim.printSheet')}</button>
        <button type="button" onClick={()=>downloadComplaintReceipt(entry,receipt)} className="rounded-lg border px-3 py-2">{t('claim.downloadCopy')}</button></>
      :<button type="button" disabled={busy} onClick={onRetry} className="rounded-lg bg-[#ff5708] px-3 py-2 font-bold text-[#2b0b00]">{busy?t('claim.submitting'):t('claim.retry')}</button>}
      <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-3 py-2">{t('claim.backToMenu')}</button>
    </div>
  </div>;
}
