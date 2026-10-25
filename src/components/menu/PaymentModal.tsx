'use client';

import React, { useState, useEffect, useRef } from 'react';
import { submitCustomerReview } from '@/services/reviewService';
import { getPaymentConfig, loadPaymentConfig, PaymentGatewayConfig } from '@/services/paymentConfigService';
import { useLanguage } from '@/hooks/useLanguage';
import type { PaymentClaim } from '@/types';
// CD-31 · Rótulo de mesa visible (ES/EN) sin alterar el valor guardado en la reseña.
import { localizeTableLabel } from '@/i18n/tableLabel';
import { UploadedImage } from '../UploadedImage';
import { useDialog } from '@/hooks/useDialog';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  /**
   * Saldo pendiente REAL de la mesa (`restaurant_tables.amount`). Es la ÚNICA
   * fuente de verdad del cobro: incluye los abonos previos ya descontados.
   */
  amountDue: number;
  orderId?: string;
  /** Clave del pedido del comensal: verifica la reseña (una por pedido). */
  orderKey?: string;
  onRequestTableAccount?: (paymentMethod: string, table?: string, claim?: PaymentClaim) => Promise<boolean> | void;
  /** Registra el abono y confirma al modal que puede limpiar el carrito local. */
  onPaymentSuccess: (
    amountPaid: number,
    options?: { keepOpen?: boolean }
  ) => Promise<boolean>;
  onShowToast: (msg: string, icon?: string) => void;
}

type PaymentMethod = 'yape' | 'plin' | 'tarjeta' | 'efectivo';
type ModalStep = 'payment' | 'feedback' | 'completed';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  amountDue,
  orderId,
  orderKey,
  onRequestTableAccount,
  onPaymentSuccess,
  onShowToast
}) => {
  // CD-31 · Idioma de la carta: pasarela de pago y reseña post-pago (ES/EN).
  const { t, language } = useLanguage();
  const [step, setStep] = useState<ModalStep>('payment');
  const [paymentConfig, setPaymentConfig] = useState<PaymentGatewayConfig>(() => getPaymentConfig());

  // Sincronización en vivo entre pestañas (evento 'storage' nativo) y dentro de la misma pestaña
  useEffect(() => {
    const syncConfig = () => {
      setPaymentConfig(getPaymentConfig());
    };
    syncConfig();

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent<PaymentGatewayConfig | undefined>).detail;
      if (detail) setPaymentConfig(detail);
      else syncConfig();
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (!e.key || e.key === 'gastropulse_payment_config_v1') {
        syncConfig();
      }
    };

    window.addEventListener('gastropulse_payment_config_updated', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('gastropulse_payment_config_updated', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Cada vez que el comensal abre el modal se lee la configuración real de Supabase
  // (número y QR de Yape/Plin); llega por el evento de arriba.
  useEffect(() => {
    if (isOpen) void loadPaymentConfig();
  }, [isOpen]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('yape');
  const [opCode, setOpCode] = useState('');
  const [voucherFile, setVoucherFile] = useState<string | null>(null);
  const [cashType, setCashType] = useState<'exact' | '50' | '100' | '200' | 'custom'>('exact');
  const [customCash, setCustomCash] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cálculo automático del vuelto en efectivo
  const numericCashGiven = React.useMemo(() => {
    if (cashType === 'exact') return amountDue;
    if (cashType === '50') return 50;
    if (cashType === '100') return 100;
    if (cashType === '200') return 200;
    if (cashType === 'custom') return parseFloat(customCash) || 0;
    return amountDue;
  }, [cashType, customCash, amountDue]);

  const cashChange = Math.max(0, numericCashGiven - amountDue);
  const isCashInsufficient = selectedMethod === 'efectivo' && cashType !== 'exact' && (numericCashGiven < amountDue);

  // Validación estricta de Código de Operación Yape/Plin (6 a 8 dígitos) o subida de captura de voucher
  const cleanOpDigits = opCode.replace(/\D/g, '');
  const isOpCodeValid = cleanOpDigits.length >= 6 && cleanOpDigits.length <= 8;
  const isVoucherUploaded = Boolean(voucherFile);
  const isDigitalPaymentValid =
    selectedMethod !== 'yape' && selectedMethod !== 'plin'
      ? true
      : (isOpCodeValid || isVoucherUploaded);

  // Estados de la pantalla Post-Pago (Reseñas & Feedback)
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTip, setSelectedTip] = useState<number>(5); // default S/ 5
  const [customTip, setCustomTip] = useState<string>('');
  const [comments, setComments] = useState('');

  // Métodos de pago dinámicamente habilitados según la configuración del restaurante
  const availableMethods = React.useMemo(() => {
    return [
      paymentConfig.acceptYape ? {
        id: 'yape' as PaymentMethod,
        label: t('pay.methodYape'),
        icon: 'qr_code',
        activeColor: 'bg-[#742284] text-white shadow-md'
      } : null,
      paymentConfig.acceptPlin ? {
        id: 'plin' as PaymentMethod,
        label: t('pay.methodPlin'),
        icon: 'qr_code',
        activeColor: 'bg-[#0077b6] text-white shadow-md'
      } : null,
      paymentConfig.acceptPos ? {
        id: 'tarjeta' as PaymentMethod,
        label: t('pay.methodCard'),
        icon: 'credit_card',
        activeColor: 'bg-primary text-on-primary shadow-md'
      } : null,
      paymentConfig.acceptCash ? {
        id: 'efectivo' as PaymentMethod,
        label: t('pay.methodCash'),
        icon: 'payments',
        activeColor: 'bg-[#10b981] text-[#064e3b] shadow-md'
      } : null,
    ].filter(Boolean) as Array<{
      id: PaymentMethod;
      label: string;
      icon: string;
      activeColor: string;
    }>;
  }, [paymentConfig, t]);

  // Si el método seleccionado fue deshabilitado en configuración, pasar al primero
  // activo. Se ajusta durante el render (sin efecto) para no pintar un método inválido.
  if (availableMethods.length > 0 && !availableMethods.some(m => m.id === selectedMethod)) {
    setSelectedMethod(availableMethods[0].id);
  }

  const paymentSubmittingRef = useRef(false);
  const handleClose = () => onClose();

  // Mientras se envía el pago, Esc no cierra (evita perder la confirmación).
  const dialog = useDialog(isOpen, isSubmitting ? undefined : handleClose);

  if (!isOpen) return null;

  const phoneAccount = paymentConfig.phoneNumber || '987 654 321';
  const titular = paymentConfig.titularName || 'ÁUREA BISTRO S.A.C.';

  const handleCopyPhone = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phoneAccount.replace(/\s/g, ''));
      onShowToast(t('pay.copyToast'), 'content_copy');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setVoucherFile(uploadEvent.target?.result as string);
        onShowToast(t('pay.voucherAttached'), 'attach_file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimulateVoucher = () => {
    setVoucherFile('voucher_simulado.png');
    const randomOp = String(Math.floor(100000 + Math.random() * 900000));
    setOpCode(randomOp);
    onShowToast(t('pay.voucherSimulated', { code: randomOp }), 'verified');
  };

  const handleConfirmPayment = async () => {
    if (paymentSubmittingRef.current) return;
    if ((selectedMethod === 'yape' || selectedMethod === 'plin') && !isDigitalPaymentValid) {
      onShowToast(t('pay.errorDigits'), 'warning');
      return;
    }
    if (selectedMethod === 'efectivo' && isCashInsufficient) {
      onShowToast(t('pay.errorCash'), 'warning');
      return;
    }

    paymentSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const opSuffix = cleanOpDigits ? ` (OP: ${cleanOpDigits})` : '';
      const methodLabel =
        selectedMethod === 'yape'
          ? `Yape QR${opSuffix}`
          : selectedMethod === 'plin'
          ? `Plin QR${opSuffix}`
          : selectedMethod === 'tarjeta'
          ? 'Tarjeta POS'
          : cashType === 'exact'
          ? `Efectivo (Monto Exacto: S/ ${amountDue.toFixed(2)})`
          : `Efectivo (Paga con: S/ ${numericCashGiven.toFixed(2)} • Vuelto: S/ ${cashChange.toFixed(2)})`;

      // El aviso usa la etiqueta VISIBLE (idioma de la carta); el payload que viaja
      // al panel del garzón (`methodLabel`) se mantiene en español.
      const displayMethodLabel =
        availableMethods.find((method) => method.id === selectedMethod)?.label ?? methodLabel;

      // Yape/Plin siguen pendientes hasta que el personal verifique el pago.
      if (selectedMethod === 'yape' || selectedMethod === 'plin') {
        if (onRequestTableAccount) {
          try {
            await onRequestTableAccount(methodLabel, tableNumber, {
              kind: selectedMethod,
              operationCode: cleanOpDigits || undefined
            });
          } catch (e) {
            console.warn('Advertencia en requestTableAccount:', e);
          }
        }

        // Forzamos la ejecución de onPaymentSuccess sin bloquear si retorna false
        try {
          await onPaymentSuccess(amountDue, { keepOpen: true });
        } catch (e) {
          console.warn('Advertencia en onPaymentSuccess:', e);
        }

        onShowToast(t('pay.pendingVerification', { method: displayMethodLabel }), 'hourglass_top');
        setStep('feedback');
        return;
      }

      // Efectivo/POS se consideran confirmados aquí. Persistir el abono primero;
      // si falla, conservar el carrito y dejar al usuario reintentar.
      const collected = await onPaymentSuccess(amountDue);
      if (!collected) {
        onShowToast(t('pay.errorConfirm'), 'error');
        return;
      }

      onShowToast(t('pay.paid', { method: displayMethodLabel }), 'check_circle');
      setStep('feedback');
    } catch (err) {
      onShowToast(t('pay.errorConfirm'), 'error');
      console.error('Error confirming payment:', err);
    } finally {
      paymentSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1: return t('pay.rating1');
      case 2: return t('pay.rating2');
      case 3: return t('pay.rating3');
      case 4: return t('pay.rating4');
      case 5: return t('pay.rating5');
      default: return t('pay.rating5');
    }
  };

  const effectiveTip = customTip ? parseFloat(customTip) || 0 : selectedTip;

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    try {
      await submitCustomerReview({
        tableNumber,
        orderId,
        orderKey,
        rating,
        ratingLabel: getRatingLabel(rating),
        tipAmount: effectiveTip,
        comments,
        paymentMethod: selectedMethod.toUpperCase(),
        operationCode: opCode || undefined,
        voucherUploaded: Boolean(voucherFile)
      });

      onShowToast(t('pay.reviewThanks'), 'sentiment_very_satisfied');
      setStep('completed');
    } catch (err) {
      // Se avisa y se deja reintentar; si el pedido ya tenía reseña, se da por cerrada.
      const message = err instanceof Error ? err.message : 'No se pudo enviar tu reseña.';
      onShowToast(message, 'error');
      if (/ya tiene una reseña/i.test(message)) setStep('completed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div {...dialog} aria-label={t('pay.title')} className="bg-white dark:bg-[#15161c] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#e2e8f0] dark:border-primary/30 shadow-2xl p-4 sm:p-6 pb-8 sm:pb-6 space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain">
        
        {/* ========================================================================= */}
        {/* PASO 1: PASARELA DE PAGO DIGITAL QR                                       */}
        {/* ========================================================================= */}
        {step === 'payment' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] dark:border-[#24252e]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[28px] text-primary shrink-0">qr_code_2</span>
                <div>
                  <h3 className="text-[17px] font-bold text-[#0f172a] dark:text-white leading-tight">
                    {t('pay.title')}
                  </h3>
                  <span className="text-[11px] font-mono-code text-primary font-semibold">
                    {t('pay.tableTotal', {
                      table: localizeTableLabel(tableNumber, language),
                      amount: `S/ ${amountDue.toFixed(2)}`
                    })}
                  </span>
                </div>
              </div>
              <button
                id="btn-close-payment-modal"
                type="button"
                onClick={handleClose}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#64748b] hover:text-[#0f172a] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Pestañas de Métodos de Pago Habilitados Dinámicamente */}
            {availableMethods.length > 0 ? (
              <div className={`grid gap-1.5 p-1 bg-[#f1f5f9] dark:bg-[#1e1f28] rounded-xl border border-[#cbd5e1] dark:border-[#353642] ${
                availableMethods.length === 4
                  ? 'grid-cols-4'
                  : availableMethods.length === 3
                  ? 'grid-cols-3'
                  : availableMethods.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
              }`}>
                {availableMethods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethod(m.id)}
                    className={`py-2 min-h-[44px] rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      selectedMethod === m.id
                        ? m.activeColor
                        : 'text-[#475569] dark:text-[#a1a1aa] hover:text-[#0f172a] dark:hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[12px] text-center font-medium">
                {t('pay.paused')}
              </div>
            )}

            {/* Panel de Yape / Plin con Códigos QR Dinámicos */}
            {(selectedMethod === 'yape' || selectedMethod === 'plin') && (
              <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#1a1b22] border border-[#e2e8f0] dark:border-[#2a2b36] space-y-3.5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedMethod === 'yape' ? 'bg-[#742284]' : 'bg-[#0077b6]'}`} />
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#0f172a] dark:text-white">
                    {selectedMethod === 'yape' ? t('pay.payWithYape') : t('pay.payWithPlin')}
                  </span>
                </div>

                {/* Código QR Personalizado o Dinámico */}
                <div className="relative inline-block p-3 rounded-2xl bg-white border-2 border-dashed shadow-inner border-[#cbd5e1] dark:border-white/20">
                  {selectedMethod === 'yape' && paymentConfig.yapeQrImage ? (
                    <div className="flex flex-col items-center">
                      <UploadedImage
                        src={paymentConfig.yapeQrImage}
                        alt={t('pay.qrAltYape')}
                        className="w-40 h-40 object-contain rounded-xl shadow-sm"
                      />
                      <span className="mt-1 text-[10px] font-bold text-[#742284] bg-[#742284]/10 px-2 py-0.5 rounded-full">
                        {t('pay.officialQr')}
                      </span>
                    </div>
                  ) : selectedMethod === 'plin' && paymentConfig.plinQrImage ? (
                    <div className="flex flex-col items-center">
                      <UploadedImage
                        src={paymentConfig.plinQrImage}
                        alt={t('pay.qrAltPlin')}
                        className="w-40 h-40 object-contain rounded-xl shadow-sm"
                      />
                      <span className="mt-1 text-[10px] font-bold text-[#0077b6] bg-[#0077b6]/10 px-2 py-0.5 rounded-full">
                        {t('pay.officialQr')}
                      </span>
                    </div>
                  ) : (
                    <svg className="w-40 h-40 mx-auto" viewBox="0 0 160 160" fill="none">
                    {/* Finder Patterns */}
                    <rect x="10" y="10" width="40" height="40" rx="6" fill="#0f172a" />
                    <rect x="18" y="18" width="24" height="24" rx="4" fill="#ffffff" />
                    <rect x="24" y="24" width="12" height="12" rx="2" fill={selectedMethod === 'yape' ? '#742284' : '#0077b6'} />

                    <rect x="110" y="10" width="40" height="40" rx="6" fill="#0f172a" />
                    <rect x="118" y="18" width="24" height="24" rx="4" fill="#ffffff" />
                    <rect x="124" y="24" width="12" height="12" rx="2" fill={selectedMethod === 'yape' ? '#742284' : '#0077b6'} />

                    <rect x="10" y="110" width="40" height="40" rx="6" fill="#0f172a" />
                    <rect x="18" y="118" width="24" height="24" rx="4" fill="#ffffff" />
                    <rect x="24" y="124" width="12" height="12" rx="2" fill={selectedMethod === 'yape' ? '#742284' : '#0077b6'} />

                    {/* Data grid dots */}
                    <circle cx="65" cy="20" r="3" fill="#0f172a" />
                    <circle cx="80" cy="20" r="3" fill="#0f172a" />
                    <circle cx="95" cy="20" r="3" fill="#0f172a" />
                    <circle cx="60" cy="35" r="3" fill="#0f172a" />
                    <circle cx="75" cy="35" r="3" fill="#0f172a" />
                    <circle cx="90" cy="35" r="3" fill="#0f172a" />
                    <circle cx="70" cy="50" r="3" fill="#0f172a" />
                    <circle cx="85" cy="50" r="3" fill="#0f172a" />

                    <circle cx="20" cy="65" r="3" fill="#0f172a" />
                    <circle cx="35" cy="65" r="3" fill="#0f172a" />
                    <circle cx="50" cy="65" r="3" fill="#0f172a" />
                    <circle cx="110" cy="65" r="3" fill="#0f172a" />
                    <circle cx="125" cy="65" r="3" fill="#0f172a" />
                    <circle cx="140" cy="65" r="3" fill="#0f172a" />

                    <circle cx="65" cy="115" r="3" fill="#0f172a" />
                    <circle cx="80" cy="115" r="3" fill="#0f172a" />
                    <circle cx="95" cy="115" r="3" fill="#0f172a" />
                    <circle cx="60" cy="130" r="3" fill="#0f172a" />
                    <circle cx="75" cy="130" r="3" fill="#0f172a" />
                    <circle cx="90" cy="130" r="3" fill="#0f172a" />
                    <circle cx="110" cy="130" r="3" fill="#0f172a" />
                    <circle cx="125" cy="130" r="3" fill="#0f172a" />
                    <circle cx="140" cy="130" r="3" fill="#0f172a" />

                    {/* Brand Center Badge */}
                    <rect x="58" y="58" width="44" height="44" rx="10" fill={selectedMethod === 'yape' ? '#742284' : '#0077b6'} />
                    <text x="80" y="84" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                      {selectedMethod === 'yape' ? 'YAPE' : 'PLIN'}
                    </text>
                  </svg>
                  )}

                  <div className="mt-1 text-[11px] font-mono-code font-bold text-[#0f172a]">
                    {t('pay.totalToPay', { amount: `S/ ${amountDue.toFixed(2)}` })}
                  </div>
                </div>

                {/* Datos del Comercio & Botón Copiar */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#121318] border border-[#cbd5e1] dark:border-[#353642] text-left">
                  <div>
                    <div className="text-[12px] font-bold text-[#0f172a] dark:text-white">
                      {titular}
                    </div>
                    <div className="text-[12px] font-mono-code text-primary font-bold">
                      {phoneAccount}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="px-3 py-1.5 min-h-[44px] rounded-lg bg-[#f1f5f9] dark:bg-[#20212b] hover:bg-[#e2e8f0] text-[#0f172a] dark:text-white border border-[#cbd5e1] dark:border-[#353642] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>{t('pay.copy')}</span>
                  </button>
                </div>

                {/* Subida de Captura / Código de Operación */}
                <div className="space-y-2 text-left pt-1">
                  <label className="text-[12px] font-semibold text-[#0f172a] dark:text-white flex items-center justify-between">
                    <span>{t('pay.opLabel')}</span>
                    <button
                      type="button"
                      onClick={handleSimulateVoucher}
                      className="text-[10px] text-primary hover:underline cursor-pointer"
                    >
                      {t('pay.autofill')}
                    </button>
                  </label>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={opCode}
                      onChange={(e) => setOpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                      placeholder={t('pay.opPlaceholder')}
                      className={`w-full bg-white dark:bg-[#121318] text-[#0f172a] dark:text-white px-3 py-2 min-h-[44px] rounded-xl text-[13px] border focus:outline-none transition-colors ${
                        cleanOpDigits.length > 0 && !isOpCodeValid && !isVoucherUploaded
                          ? 'border-amber-500 focus:border-amber-500'
                          : isOpCodeValid || isVoucherUploaded
                          ? 'border-emerald-500 focus:border-emerald-500'
                          : 'border-[#cbd5e1] dark:border-[#353642] focus:border-primary'
                      }`}
                    />

                    {/* Validación en tiempo real con feedback visual */}
                    <div className="text-[11px] min-h-[18px]">
                      {isOpCodeValid ? (
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          {t('pay.opValid', { count: cleanOpDigits.length })}
                        </span>
                      ) : isVoucherUploaded ? (
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          {t('pay.voucherOk')}
                        </span>
                      ) : cleanOpDigits.length > 0 ? (
                        <span className="text-amber-500 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          {t('pay.opMissingDigits', { count: cleanOpDigits.length })}
                        </span>
                      ) : (
                        <span className="text-[#64748b] dark:text-[#94a3b8]">
                          {t('pay.opHint')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subir archivo voucher */}
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#121318] border border-dashed border-[#cbd5e1] dark:border-[#353642] text-[12px] text-[#475569] dark:text-[#a1a1aa] hover:border-primary cursor-pointer transition-colors">
                      <span className="material-symbols-outlined text-[18px] text-primary">upload_file</span>
                      <span className="truncate">{voucherFile ? t('pay.uploaded') : t('pay.uploadCta')}</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>

                    {voucherFile && (
                      <div className="flex items-center gap-2">
                        {voucherFile.startsWith('data:image') && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary flex-shrink-0">
                            <UploadedImage src={voucherFile} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setVoucherFile(null)}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 cursor-pointer"
                          title={t('pay.removeVoucher')}
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Panel de Tarjeta POS */}
            {selectedMethod === 'tarjeta' && (
              <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#1a1b22] border border-[#e2e8f0] dark:border-[#2a2b36] space-y-3 text-center">
                <div className="flex items-center justify-center mx-auto text-primary">
                  <span className="material-symbols-outlined text-[36px]">point_of_sale</span>
                </div>
                <h4 className="text-[14px] font-bold text-[#0f172a] dark:text-white">
                  {t('pay.posTitle')}
                </h4>
                <p className="text-[12px] text-[#475569] dark:text-[#a1a1aa] leading-relaxed">
                  {t('pay.posBody', { table: localizeTableLabel(tableNumber, language) })}
                </p>
              </div>
            )}

            {/* Panel de Efectivo con Cálculo Automático de Vuelto */}
            {selectedMethod === 'efectivo' && (
              <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-[#1a1b22] border border-[#e2e8f0] dark:border-[#2a2b36] space-y-3.5 text-left">
                <div className="text-[13px] font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-500">payments</span>
                  <span>{t('pay.cashTitle')}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setCashType('exact'); setCustomCash(''); }}
                    className={`py-2 px-2 min-h-[44px] rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      cashType === 'exact'
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                        : 'bg-white dark:bg-[#121318] text-[#475569] dark:text-[#a1a1aa] border-[#cbd5e1] dark:border-[#353642]'
                    }`}
                  >
                    {t('pay.cashExact')}
                    <span className="block text-[10px] font-normal opacity-90">S/ {amountDue.toFixed(2)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setCashType('50'); setCustomCash(''); }}
                    className={`py-2 px-2 min-h-[44px] rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      cashType === '50'
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                        : 'bg-white dark:bg-[#121318] text-[#475569] dark:text-[#a1a1aa] border-[#cbd5e1] dark:border-[#353642]'
                    }`}
                  >
                    {t('pay.cashBill50')}
                    <span className="block text-[10px] font-normal opacity-90">
                      {amountDue <= 50 ? t('pay.cashChange', { amount: `S/ ${(50 - amountDue).toFixed(2)}` }) : t('pay.cashInsufficient')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setCashType('100'); setCustomCash(''); }}
                    className={`py-2 px-2 min-h-[44px] rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      cashType === '100'
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                        : 'bg-white dark:bg-[#121318] text-[#475569] dark:text-[#a1a1aa] border-[#cbd5e1] dark:border-[#353642]'
                    }`}
                  >
                    {t('pay.cashBill100')}
                    <span className="block text-[10px] font-normal opacity-90">
                      {amountDue <= 100 ? t('pay.cashChange', { amount: `S/ ${(100 - amountDue).toFixed(2)}` }) : t('pay.cashInsufficient')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setCashType('200'); setCustomCash(''); }}
                    className={`py-2 px-2 min-h-[44px] rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      cashType === '200'
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                        : 'bg-white dark:bg-[#121318] text-[#475569] dark:text-[#a1a1aa] border-[#cbd5e1] dark:border-[#353642]'
                    }`}
                  >
                    {t('pay.cashBill200')}
                    <span className="block text-[10px] font-normal opacity-90">
                      {amountDue <= 200 ? t('pay.cashChange', { amount: `S/ ${(200 - amountDue).toFixed(2)}` }) : t('pay.cashInsufficient')}
                    </span>
                  </button>
                </div>

                {/* Opción de Importe Personalizado */}
                <div className="pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#475569] dark:text-[#a1a1aa] whitespace-nowrap">{t('pay.cashCustom')}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#64748b]">S/</span>
                      <input
                        type="number"
                        step="0.10"
                        min="1"
                        placeholder="Ej. 150.00"
                        value={customCash}
                        onChange={(e) => {
                          setCustomCash(e.target.value);
                          setCashType('custom');
                        }}
                        className="w-full bg-white dark:bg-[#121318] text-[#0f172a] dark:text-white pl-8 pr-3 py-1.5 min-h-[38px] rounded-xl text-[12px] border border-[#cbd5e1] dark:border-[#353642] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* TARJETA DINÁMICA DE DESGLOSE DE VUELTO */}
                {!isCashInsufficient ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-emerald-500">point_of_sale</span>
                        {t('pay.cashChangeTitle')}
                      </span>
                      <span className="text-[18px] font-mono-code font-black text-emerald-600 dark:text-emerald-400">
                        S/ {cashChange.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#475569] dark:text-[#a1a1aa] flex justify-between border-t border-emerald-500/20 pt-1">
                      <span>{t('pay.cashTotal', { amount: `S/ ${amountDue.toFixed(2)}` })}</span>
                      <span>{t('pay.cashGiven', { amount: `S/ ${numericCashGiven.toFixed(2)}` })}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[12px] font-semibold flex items-center gap-2 animate-fadeIn">
                    <span className="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
                    <span>{t('pay.cashShort', {
                      given: `S/ ${numericCashGiven.toFixed(2)}`,
                      total: `S/ ${amountDue.toFixed(2)}`,
                      missing: `S/ ${(amountDue - numericCashGiven).toFixed(2)}`
                    })}</span>
                  </div>
                )}
              </div>
            )}

            {/* Botón de Confirmación Principal con Validación */}
            <button
              id="btn-confirm-payment"
              type="button"
              onClick={handleConfirmPayment}
              disabled={
                isSubmitting ||
                ((selectedMethod === 'yape' || selectedMethod === 'plin') && !isDigitalPaymentValid) ||
                (selectedMethod === 'efectivo' && isCashInsufficient)
              }
              className="w-full py-3 min-h-[44px] rounded-xl bg-primary hover:brightness-110 text-on-primary font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px] shadow-primary/35 transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>
                {isSubmitting
                  ? t('pay.confirming')
                  : ((selectedMethod === 'yape' || selectedMethod === 'plin') && !isDigitalPaymentValid)
                  ? t('pay.needOp')
                  : (selectedMethod === 'efectivo' && isCashInsufficient)
                  ? t('pay.needCash')
                  : t('pay.confirm', { amount: `S/ ${amountDue.toFixed(2)}` })}
              </span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 2: PANTALLA POST-PAGO CON RESEÑAS, ESTRELLAS Y PROPINA               */}
        {/* ========================================================================= */}
        {step === 'feedback' && (
          <div className="space-y-4 text-center animate-fadeIn">
            {/* Ícono de Éxito Flotante Limpio */}
            <div className="flex items-center justify-center mx-auto text-emerald-500">
              <span className="material-symbols-outlined text-[46px] animate-pulse drop-shadow-[0_0_14px_rgba(16,185,129,0.35)]">check_circle</span>
            </div>

            <div>
              <span className="text-[11px] font-mono-code text-primary font-bold uppercase tracking-wider">
                {t('pay.doneKicker')}
              </span>
              <h3 className="text-[18px] font-bold text-[#0f172a] dark:text-white mt-0.5">
                {t('pay.feedbackQuestion')}
              </h3>
              <p className="text-[12px] text-[#475569] dark:text-[#a1a1aa] mt-0.5">
                {t('pay.feedbackSubtitle', { table: localizeTableLabel(tableNumber, language) })}
              </p>
            </div>

            {/* ⭐ Selector Interactivo de Estrellas (1 a 5) */}
            <div className="p-3.5 rounded-2xl bg-[#f8fafc] dark:bg-[#1a1b22] border border-[#e2e8f0] dark:border-[#2a2b36] space-y-2">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                    >
                      <span
                        className={`material-symbols-outlined text-[32px] transition-colors ${
                          isFilled ? 'text-amber-400 font-filled' : 'text-[#cbd5e1] dark:text-[#353642]'
                        }`}
                        style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[13px] font-bold text-primary font-mono-code">
                {getRatingLabel(hoverRating || rating)}
              </div>
            </div>

            {/* 💰 Selector de Propina Opcional */}
            <div className="text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-[#0f172a] dark:text-white flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">volunteer_activism</span>
                  <span>{t('pay.tipLabel')}</span>
                </label>
                {effectiveTip > 0 && (
                  <span className="text-[11px] font-mono-code font-bold text-emerald-600 dark:text-emerald-400">
                    +S/ {effectiveTip.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: t('pay.tipNone'), val: 0 },
                  { label: 'S/ 3.00', val: 3 },
                  { label: 'S/ 5.00', val: 5 },
                  { label: 'S/ 10.00', val: 10 }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSelectedTip(item.val);
                      setCustomTip('');
                    }}
                    className={`py-2 min-h-[44px] rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                      selectedTip === item.val && !customTip
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-white dark:bg-[#1a1b22] text-[#475569] dark:text-[#a1a1aa] border-[#cbd5e1] dark:border-[#353642]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ✍️ Caja de Comentarios / Felicitaciones */}
            <div className="text-left space-y-1.5">
              <label className="text-[12px] font-semibold text-[#0f172a] dark:text-white">
                                {t('pay.commentsLabel')}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder={t('pay.commentsPlaceholder')}
                className="w-full bg-white dark:bg-[#1a1b22] text-[#0f172a] dark:text-white p-3 rounded-xl text-[13px] border border-[#cbd5e1] dark:border-[#353642] focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Botón Enviar Reseña */}
            <button
              id="btn-submit-customer-review"
              type="button"
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="w-full py-3 min-h-[44px] rounded-xl bg-primary hover:brightness-110 text-on-primary font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px] shadow-primary/35 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
              <span>{isSubmitting ? t('pay.savingReview') : t('pay.submitReview')}</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 3: MENSAJE FINAL DE AGRADECIMIENTO                                   */}
        {/* ========================================================================= */}
        {step === 'completed' && (
          <div className="space-y-4 text-center py-4 animate-fadeIn">
            <div className="flex items-center justify-center mx-auto text-primary">
              <span className="material-symbols-outlined text-[52px] drop-shadow-[0_0_16px] shadow-primary/45">sentiment_very_satisfied</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-[20px] font-bold text-[#0f172a] dark:text-white">
                {t('pay.thanksTitle')}
              </h3>
              <p className="text-[13px] text-[#475569] dark:text-[#a1a1aa] max-w-sm mx-auto leading-relaxed">
                {t('pay.thanksBody', { table: localizeTableLabel(tableNumber, language) })}
              </p>
            </div>

            <button
              id="btn-completed-close-modal"
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 min-h-[44px] rounded-xl bg-primary text-on-primary font-bold text-[13px] shadow hover:brightness-110 transition-all cursor-pointer"
            >
              {t('pay.closeBack')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentModal;
