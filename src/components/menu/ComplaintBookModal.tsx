'use client';

import React, { useState } from 'react';
import { submitComplaintToDb } from '@/services/complaintService';
import { useLanguage } from '@/hooks/useLanguage';

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
  // CD-31 · Formulario legal bilingüe (ES/EN) con el idioma activo de la carta.
  const { t } = useLanguage();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedClaimCode, setGeneratedClaimCode] = useState('');

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !docNumber.trim() || !email.trim() || !detail.trim() || !consumerRequest.trim()) {
      onShowToast(t('claim.errorRequired'), 'error');
      return;
    }

    if (!acceptTerms) {
      onShowToast(t('claim.errorTerms'), 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitComplaintToDb({
        fullName: fullName.trim(),
        docType,
        docNumber: docNumber.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        isMinor,
        parentName: isMinor ? parentName.trim() : undefined,
        contractedGoodType,
        claimedAmount: parseFloat(claimedAmount) || 0.0,
        goodDescription: goodDescription.trim(),
        tableNumber: currentTable || undefined,
        claimType,
        detail: detail.trim(),
        consumerRequest: consumerRequest.trim()
      });

      setGeneratedClaimCode(res.claimCode);
      setStep('success');
      onShowToast(t('claim.registered', { code: res.claimCode }), 'verified');
    } catch (err) {
      onShowToast(t('claim.errorSubmit'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep('form');
    setFullName('');
    setDocNumber('');
    setPhone('');
    setEmail('');
    setAddress('');
    setDetail('');
    setConsumerRequest('');
    setAcceptTerms(false);
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
                  {t('claim.title')}
                </h3>
                <span className="text-[9px] font-mono-code bg-white/10 text-[#ffb59c] px-2 py-0.5 rounded-full border border-white/15">
                  D.S. N° 011-2011-PCM
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                AUREA BISTRO S.A.C. • RUC: 20608945231
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
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Info Banner */}
              <div className="bg-[#fff7ed] dark:bg-[#1a181e] border border-[#ff5708]/30 rounded-xl p-3 text-[12px] text-[#7c2d12] dark:text-[#ffb59c] leading-relaxed flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#ff5708] text-[18px] shrink-0 mt-0.5">info</span>
                <span>{t('claim.info', { days: 15 })}</span>
              </div>

              {/* SECTION 1: DATOS DEL CONSUMIDOR */}
              <div className="space-y-3">
                <h4 className="text-[12px] font-mono-code font-bold uppercase tracking-wider text-[#c2410c] dark:text-[#ff5708] flex items-center gap-1.5 border-b border-[#e2e8f0] dark:border-[#24252e] pb-1.5">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>{t('claim.section1')}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      {t('claim.fullName')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t('claim.fullNamePlaceholder')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                        {t('claim.doc')}
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
                        {t('claim.docNumber')}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t('claim.docNumberPlaceholder')}
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      {t('claim.email')}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder={t('claim.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      {t('claim.phone')}
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
                      {t('claim.address')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t('claim.addressPlaceholder')}
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
                    <span>{t('claim.minor')}</span>
                  </label>
                  {isMinor && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder={t('claim.parentNamePlaceholder')}
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
                  <span>{t('claim.section2')}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      {t('claim.goodType')}
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
                        {t('claim.product')}
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
                        {t('claim.service')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                      {t('claim.amount')}
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
                      {t('claim.reference')}
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
                  <span>{t('claim.section3')}</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1.5">
                    {t('claim.classification')}
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
                        <strong className="block text-[12px] text-[#0f172a] dark:text-white">{t('claim.typeClaim')}</strong>
                        <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-tight block">
                          {t('claim.typeClaimDesc')}
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
                        <strong className="block text-[12px] text-[#0f172a] dark:text-white">{t('claim.typeComplaint')}</strong>
                        <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] leading-tight block">
                          {t('claim.typeComplaintDesc')}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                    {t('claim.detail')}
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder={t('claim.detailPlaceholder')}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    className="w-full p-3 rounded-lg bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] text-[12px] focus:outline-none focus:border-[#ff5708]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-[#94a3b8] mb-1">
                    {t('claim.request')}
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder={t('claim.requestPlaceholder')}
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
                    {t('claim.oath')}
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
                  {t('claim.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-xl bg-[#ff5708] hover:bg-[#ff6924] text-[#2b0b00] font-bold text-[13px] flex items-center justify-center gap-2 shadow-lg shadow-[#ff5708]/25 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#2b0b00] border-t-transparent rounded-full animate-spin"></span>
                      <span>{t('claim.submitting')}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>{t('claim.submit')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* SUCCESS VIEW */
            <div className="py-6 px-2 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg">
                <span className="material-symbols-outlined text-[36px]">verified</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono-code font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {t('claim.successKicker')}
                </span>
                <h3 className="text-[20px] font-bold text-[#0f172a] dark:text-white">
                  {t('claim.successTitle')}
                </h3>
                <div className="inline-block px-4 py-1.5 rounded-xl bg-[#ff5708]/15 border border-[#ff5708]/40 text-[#c2410c] dark:text-[#ffb59c] font-mono-code font-bold text-[16px] my-2">
                  {t('claim.codeLabel', { code: generatedClaimCode })}
                </div>
              </div>

              <div className="bg-[#f8fafc] dark:bg-[#1b1c24] border border-[#cbd5e1] dark:border-[#2d2e38] rounded-xl p-4 text-left space-y-2 text-[12px]">
                <div className="flex justify-between border-b border-[#e2e8f0] dark:border-[#24252e] pb-1.5">
                  <span className="text-[#64748b] dark:text-[#94a3b8]">{t('claim.issuedAt')}</span>
                  <span className="font-mono-code font-semibold">{new Date().toLocaleString('es-PE')}</span>
                </div>
                <div className="flex justify-between border-b border-[#e2e8f0] dark:border-[#24252e] pb-1.5">
                  <span className="text-[#64748b] dark:text-[#94a3b8]">{t('claim.claimant')}</span>
                  <span className="font-semibold">{fullName} ({docType} {docNumber})</span>
                </div>
                <div className="flex justify-between border-b border-[#e2e8f0] dark:border-[#24252e] pb-1.5">
                  <span className="text-[#64748b] dark:text-[#94a3b8]">{t('claim.classificationLabel')}</span>
                  <span className="font-bold text-[#ff5708]">{claimType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b] dark:text-[#94a3b8]">{t('claim.dueDate')}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{t('claim.dueDateValue', { days: 15 })}</span>
                </div>
              </div>

              <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed max-w-md mx-auto">
                {t('claim.successBody')}
              </p>

              <div className="flex items-center gap-2 pt-2 justify-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-10 px-4 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] dark:bg-[#1e1f28] dark:hover:bg-[#282935] dark:text-[#e5e1e4] font-medium text-[12px] flex items-center gap-1.5 border border-[#cbd5e1] dark:border-[#353642] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>{t('claim.print')}</span>
                </button>

                <button
                  type="button"
                  onClick={resetAndClose}
                  className="h-10 px-5 rounded-xl bg-[#ff5708] hover:bg-[#ff6924] text-[#2b0b00] font-bold text-[12px] flex items-center gap-1.5 shadow-md shadow-[#ff5708]/25 cursor-pointer"
                >
                  <span>{t('claim.backToMenu')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
