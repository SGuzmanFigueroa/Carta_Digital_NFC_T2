'use client';

import React, { useState, useEffect, useRef } from 'react';
import {submitComplaintToDb,fetchComplaintProvider,getLocalComplaints,retryPendingComplaint,type SubmissionResult} from '@/services/complaintService';
import {validateComplaint,type ComplaintInput,type ComplaintReceipt,type ComplaintProvider,type ComplaintErrors} from '@/features/complaints/validation';
import {ComplaintResult} from './ComplaintResult';

interface ComplaintBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTable?: string;
  onShowToast: (msg: string, icon?: string) => void;
}

export function ComplaintBookModal({
  isOpen,
  onClose,
  currentTable,
  onShowToast
}: ComplaintBookModalProps) {
  const [step, setStep] = useState<'form' | 'registered' | 'pending'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt,setReceipt]=useState<ComplaintReceipt|null>(null);
  const [provider,setProvider]=useState<ComplaintProvider|null>(null);
  const [submittedEntry,setSubmittedEntry]=useState<ComplaintInput|null>(null);
  const [formErrors,setFormErrors]=useState<ComplaintErrors>({});
  const [submitError,setSubmitError]=useState('');
  const sendingRef=useRef(false);
  const requestRef=useRef<{id:string;fingerprint:string}|null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [docType, setDocType] = useState<'DNI' | 'CE' | 'PASAPORTE' | 'RUC'>('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [parentName, setParentName] = useState('');

  const [contractedGoodType, setContractedGoodType] = useState<'PRODUCTO' | 'SERVICIO'>('PRODUCTO');
  const [claimedAmount, setClaimedAmount] = useState('');
  const [goodDescription, setGoodDescription] = useState(currentTable ? `Consumo en ${currentTable}` : 'Consumo en restaurante');

  const [claimType, setClaimType] = useState<'RECLAMO' | 'QUEJA'>('RECLAMO');
  const [detail, setDetail] = useState('');
  const [consumerRequest, setConsumerRequest] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(()=>{
    if(!isOpen)return;
    let alive=true;
    fetchComplaintProvider().then(async data=>{
      if(!alive)return;setProvider(data);
      if(!data.configured)setSubmitError('El establecimiento debe completar la identificación del libro. Solicita asistencia o el libro físico.');
      const pending=await getLocalComplaints(data.bookId).catch(()=>[]);
      if(alive&&pending.length){const record=pending[0];setSubmittedEntry(record.entry);requestRef.current={id:record.requestId,fingerprint:JSON.stringify(record.entry)};
        setSubmitError('Hay una hoja cifrada pendiente de confirmación. Puedes reintentar su envío.');setStep('pending');}
    }).catch(error=>{if(alive)setSubmitError(error.message);});
    return()=>{alive=false;};
  },[isOpen]);
  if (!isOpen) return null;
  const applyResult=(result:SubmissionResult)=>{
    if(result.success){setReceipt(result.receipt);setSubmittedEntry(result.entry);setStep('registered');setSubmitError('');onShowToast(`Hoja ${result.receipt.claimCode} registrada. Guarda tu copia.`,'verified');}
    else{setSubmitError(result.error);setFormErrors(result.errors||{});if(result.pending)setStep('pending');onShowToast(result.error,'warning');}
  };
  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();if(sendingRef.current)return;
    const validation=validateComplaint({fullName,docType,docNumber,phone,email,address,isMinor,parentName,contractedGoodType,
      claimedAmount:claimedAmount.trim()===''?0:Number(claimedAmount),goodDescription,tableNumber:currentTable,claimType,detail,consumerRequest,declarationAccepted:acceptTerms});
    if(!validation.valid){setFormErrors(validation.errors);setSubmitError('Revisa los campos indicados.');return;}
    setFormErrors({});setSubmittedEntry(validation.value);
    const fingerprint=JSON.stringify(validation.value);
    if(!requestRef.current||requestRef.current.fingerprint!==fingerprint)requestRef.current={id:crypto.randomUUID(),fingerprint};
    sendingRef.current=true;setIsSubmitting(true);
    try{applyResult(await submitComplaintToDb(validation.value,requestRef.current.id,provider?.bookId||'primary'));}
    catch{setSubmitError('No se confirmó el registro. Conserva los datos y solicita el libro físico.');}
    finally{sendingRef.current=false;setIsSubmitting(false);}
  };
  const retry=async()=>{
    if(sendingRef.current||!requestRef.current)return;
    sendingRef.current=true;setIsSubmitting(true);
    try{applyResult(await retryPendingComplaint(requestRef.current.id,provider?.bookId||'primary'));}
    catch{setSubmitError('No se pudo recuperar la hoja cifrada. Solicita asistencia o el libro físico.');}
    finally{sendingRef.current=false;setIsSubmitting(false);}
  };

  const resetAndClose = () => {
    if(sendingRef.current)return;
    setStep('form');setReceipt(null);setSubmittedEntry(null);setFormErrors({});setSubmitError('');requestRef.current=null;
    setFullName('');
    setDocNumber('');
    setPhone('');
    setEmail('');
    setAddress('');
    setDetail('');
    setConsumerRequest('');
    setAcceptTerms(false);setIsMinor(false);setParentName('');setClaimedAmount('');setDocType('DNI');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#13141a] text-[#0f172a] dark:text-[#e2e8f0] w-full max-w-2xl rounded-t-3xl sm:rounded-2xl border border-[#cbd5e1] dark:border-[#2d2e38] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0f172a] to-[#1e293b] dark:from-[#0d0e12] dark:to-[#161822] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff5708] flex items-center justify-center text-[#2b0b00] font-bold shadow-md shadow-[#ff5708]/30">
              <span className="material-symbols-outlined text-[22px]">menu_book</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] sm:text-[16px] font-bold tracking-tight">
                  Libro de Reclamaciones Virtual
                </h3>
                <span className="text-[9px] font-mono-code bg-white/10 text-[#ffb59c] px-2 py-0.5 rounded-full border border-white/15">
                  D.S. N° 011-2011-PCM
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {provider?`${provider.name} • RUC: ${provider.ruc}`:'Identificación del establecimiento pendiente de cargar'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-[13px]">
          {step === 'form' ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <fieldset disabled={isSubmitting} className="space-y-5">
              {(submitError||Object.keys(formErrors).length>0)&&<div role="alert" className="rounded-xl border border-red-500 p-3 text-red-600 dark:text-red-400">
                {submitError}<ul>{Object.entries(formErrors).map(([field,message])=><li key={field}>{message}</li>)}</ul></div>}
              {/* Info Banner */}
              <div className="bg-[#fff7ed] dark:bg-[#1a181e] border border-[#ff5708]/30 rounded-xl p-3 text-[12px] text-[#7c2d12] dark:text-[#ffb59c] leading-relaxed flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#ff5708] text-[18px] shrink-0 mt-0.5">info</span>
                <span>
                  Conforme a la ley de protección al consumidor de Perú (INDECOPI), el establecimiento dará respuesta formal a esta hoja en un plazo no mayor a <strong>15 días hábiles</strong> mediante el correo electrónico proporcionado.
                </span>
              </div>

              {/* SECTION 1: DATOS DEL CONSUMIDOR */}
              <div className="space-y-3">
                <h4 className="text-[12px] font-mono-code font-bold uppercase tracking-wider text-[#c2410c] dark:text-[#ff5708] flex items-center gap-1.5 border-b border-[#e2e8f0] dark:border-[#24252e] pb-1.5">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>1. Identificación del Consumidor Reclamante</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      Nombres y Apellidos *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez Quispe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                        Doc. *
                      </label>
                      <select
                        value={docType}
                        onChange={(e: any) => setDocType(e.target.value)}
                        className="w-full h-10 px-2 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                      >
                        <option value="DNI">DNI</option>
                        <option value="CE">C.E.</option>
                        <option value="PASAPORTE">Pas.</option>
                        <option value="RUC">RUC</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                        N° de Documento *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="N° documento"
                        inputMode={docType==='DNI'||docType==='RUC'?'numeric':'text'}
                        maxLength={docType==='DNI'?8:docType==='RUC'?11:20}
                        aria-invalid={Boolean(formErrors.docNumber)}
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      Correo Electrónico (para respuesta) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      maxLength={254}
                      aria-invalid={Boolean(formErrors.email)}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+51 999 888 777"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      Domicilio / Dirección Completa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Av. Principal 123, Distrito, Ciudad"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-[12px]">
                    <input
                      type="checkbox"
                      checked={isMinor}
                      onChange={(e) => setIsMinor(e.target.checked)}
                      className="accent-[#ff5708] rounded"
                    />
                    <span>El reclamante es menor de edad</span>
                  </label>
                  {isMinor && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Nombre completo del padre, madre o apoderado"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: BIEN CONTRATADO */}
              <div className="space-y-3">
                <h4 className="text-[12px] font-mono-code font-bold uppercase tracking-wider text-[#c2410c] dark:text-[#ff5708] flex items-center gap-1.5 border-b border-[#e2e8f0] dark:border-[#24252e] pb-1.5">
                  <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                  <span>2. Identificación del Bien Contratado</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      Tipo de Bien
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setContractedGoodType('PRODUCTO')}
                        className={`flex-1 h-10 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
                          contractedGoodType === 'PRODUCTO'
                            ? 'bg-[#ff5708] text-[#2b0b00] border-[#ff5708]'
                            : 'bg-[#f8fafc] dark:bg-[#1b1c24] border-[#cbd5e1] dark:border-[#2d2e38] text-[#64748b]'
                        }`}
                      >
                        Producto
                      </button>
                      <button
                        type="button"
                        onClick={() => setContractedGoodType('SERVICIO')}
                        className={`flex-1 h-10 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
                          contractedGoodType === 'SERVICIO'
                            ? 'bg-[#ff5708] text-[#2b0b00] border-[#ff5708]'
                            : 'bg-[#f8fafc] dark:bg-[#1b1c24] border-[#cbd5e1] dark:border-[#2d2e38] text-[#64748b]'
                        }`}
                      >
                        Servicio
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      Monto Reclamado (S/)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={claimedAmount}
                      onChange={(e) => setClaimedAmount(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      Referencia o Mesa
                    </label>
                    <input
                      type="text"
                      value={goodDescription}
                      onChange={(e) => setGoodDescription(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: DETALLE DE LA RECLAMACIÓN */}
              <div className="space-y-3">
                <h4 className="text-[12px] font-mono-code font-bold uppercase tracking-wider text-[#c2410c] dark:text-[#ff5708] flex items-center gap-1.5 border-b border-[#e2e8f0] dark:border-[#24252e] pb-1.5">
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>3. Detalle de la Reclamación y Pedido</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1.5">
                    Clasificación de la Reclamación:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      onClick={() => setClaimType('RECLAMO')}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        claimType === 'RECLAMO'
                          ? 'bg-[#fff7ed] dark:bg-[#201d24] border-[#ff5708]'
                          : 'bg-[#f8fafc] dark:bg-[#1b1c24] border-[#cbd5e1] dark:border-[#2d2e38]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="claim_type"
                        checked={claimType === 'RECLAMO'}
                        onChange={() => setClaimType('RECLAMO')}
                        className="accent-[#ff5708] mt-1"
                      />
                      <div>
                        <strong className="block text-[12px] text-[#0f172a] dark:text-white">RECLAMO</strong>
                        <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-tight block">
                          Disconformidad relacionada a los productos o servicios (ej. cobro erróneo, plato en mal estado).
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setClaimType('QUEJA')}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        claimType === 'QUEJA'
                          ? 'bg-[#fff7ed] dark:bg-[#201d24] border-[#ff5708]'
                          : 'bg-[#f8fafc] dark:bg-[#1b1c24] border-[#cbd5e1] dark:border-[#2d2e38]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="claim_type"
                        checked={claimType === 'QUEJA'}
                        onChange={() => setClaimType('QUEJA')}
                        className="accent-[#ff5708] mt-1"
                      />
                      <div>
                        <strong className="block text-[12px] text-[#0f172a] dark:text-white">QUEJA</strong>
                        <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-tight block">
                          Disconformidad referida a la mala atención al público o malestar con el personal.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                    Detalle del Hecho o Motivo *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Explica detalladamente lo ocurrido..."
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    className="w-full p-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                    Pedido Concreto del Consumidor *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Qué solución o medida solicita al restaurante (ej. Devolución, cambio de plato, disculpas)..."
                    value={consumerRequest}
                    onChange={(e) => setConsumerRequest(e.target.value)}
                    className="w-full p-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                  />
                </div>
              </div>

              {/* Declaración Jurada */}
              <div className="bg-[#f8fafc] dark:bg-[#1b1c24] p-3 rounded-xl border border-[#cbd5e1] dark:border-[#2d2e38]">
                <label className="inline-flex items-start gap-2.5 cursor-pointer text-[11px] text-[#475569] dark:text-[#94a3b8]">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="accent-[#ff5708] mt-0.5"
                  />
                  <span>
                    Declaro bajo juramento que los datos ingresados son verídicos y autorizo al establecimiento a comunicarse conmigo al correo electrónico brindado conforme al Código de Protección al Consumidor (Ley N° 29571).
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="flex-1 h-11 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] dark:bg-[#1e1f28] dark:hover:bg-[#282935] dark:text-[#e5e1e4] font-medium text-[13px] border border-[#cbd5e1] dark:border-[#353642] cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-xl bg-[#ff5708] hover:bg-[#ff6924] text-[#2b0b00] font-bold text-[13px] flex items-center justify-center gap-2 shadow-lg shadow-[#ff5708]/25 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#2b0b00] border-t-transparent rounded-full animate-spin"></span>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>Registrar Reclamación</span>
                    </>
                  )}
                </button>
              </div>
              </fieldset>
            </form>
          ) : (
            submittedEntry&&<ComplaintResult entry={submittedEntry} receipt={receipt} error={submitError} onRetry={retry} onClose={resetAndClose} busy={isSubmitting}/>

          )}
        </div>
      </div>
    </div>
  );
}
