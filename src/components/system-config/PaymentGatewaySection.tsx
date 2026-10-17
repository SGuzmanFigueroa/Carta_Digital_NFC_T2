'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CONFIG_SYNC_ERROR_EVENT,
  getPaymentConfig,
  loadPaymentConfig,
  migrateLocalPaymentConfigToDb,
  savePaymentConfig,
  type PaymentGatewayConfig
} from '@/services/paymentConfigService';
import { UploadedImage } from '../UploadedImage';
import type { ConfigStyles } from './configStyles';

interface PaymentGatewaySectionProps {
  styles: ConfigStyles;
  onShowToast: (msg: string, icon?: string) => void;
}

/** Sección 08 de Configuración: QR de Yape/Plin, datos del titular y métodos de pago aceptados. */
export function PaymentGatewaySection({ styles, onShowToast }: PaymentGatewaySectionProps) {
  const { isLight, sectionBg, sectionHeaderBorder, titleColor, descColor, inputBg } = styles;

  const [paymentGatewayConfig, setPaymentGatewayConfig] = useState<PaymentGatewayConfig>(() => getPaymentConfig());
  // Datos de pago y geocerca viven en Supabase (system_config): se cargan al abrir
  // y, si un guardado falla (p. ej. sesión vencida), se avisa en vez de fingir éxito.
  const showToastRef = useRef(onShowToast);
  useEffect(() => {
    showToastRef.current = onShowToast;
  }, [onShowToast]);
  useEffect(() => {
    let cancelled = false;
    migrateLocalPaymentConfigToDb()
      .then(() => loadPaymentConfig())
      .then((config) => {
      if (!cancelled) setPaymentGatewayConfig(config);
    });
    const handleSyncError = (event: Event) => showToastRef.current((event as CustomEvent<string>).detail, 'error');
    window.addEventListener(CONFIG_SYNC_ERROR_EVENT, handleSyncError);
    return () => {
      cancelled = true;
      window.removeEventListener(CONFIG_SYNC_ERROR_EVENT, handleSyncError);
    };
  }, []);

  const handleUploadPaymentQr = (method: 'yape' | 'plin', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPaymentGatewayConfig((prev) => {
        const next = { ...prev, [method === 'yape' ? 'yapeQrImage' : 'plinQrImage']: dataUrl };
        savePaymentConfig(next);
        return next;
      });
      onShowToast(`Código QR de ${method.toUpperCase()} cargado y sincronizado en vivo`, 'check_circle');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePaymentQr = (method: 'yape' | 'plin') => {
    setPaymentGatewayConfig((prev) => {
      const next = { ...prev, [method === 'yape' ? 'yapeQrImage' : 'plinQrImage']: null };
      savePaymentConfig(next);
      return next;
    });
    onShowToast(`QR personalizado de ${method.toUpperCase()} eliminado. Se usará el QR dinámico.`, 'info');
  };

  const handleSavePaymentGateway = () => {
    savePaymentConfig(paymentGatewayConfig);
    onShowToast('Pasarela de pagos QR guardada y sincronizada en tiempo real con la Carta Digital', 'check_circle');
  };

  return (
    <>
      {/* SEC_08: PASARELA DE PAGOS DIGITALES QR (YAPE & PLIN) */}
      <section id="pagos-digitales" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-[#ff5708] shrink-0">qr_code_2</span>
            <div>
              <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Pasarela de Pagos & Códigos QR</h2>
              <p className={`text-[13px] ${descColor}`}>
                Configura los códigos QR oficiales de tu restaurante (Yape / Plin), titular de cuenta y métodos habilitados en mesa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSavePaymentGateway}
              className="px-4 py-2 bg-[#FF5A1F] text-white font-bold text-[12px] rounded-lg hover:bg-[#FF703D] flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#FF5A1F]/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>Guardar Cambios de Pagos</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Información y Datos de la Cuenta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={`text-[12px] font-bold uppercase tracking-wider ${descColor}`}>
                Razón Social / Titular de la Cuenta:
              </label>
              <input
                type="text"
                value={paymentGatewayConfig.titularName}
                onChange={(e) => setPaymentGatewayConfig({ ...paymentGatewayConfig, titularName: e.target.value })}
                placeholder="Ej. ÁUREA BISTRO S.A.C."
                className={`w-full px-3.5 py-2.5 rounded-lg border text-[13px] font-medium focus:outline-none transition-all ${inputBg}`}
              />
              <span className={`text-[11px] ${descColor}`}>
                Aparecerá en la pantalla de cobro del comensal para que corrobore el nombre.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[12px] font-bold uppercase tracking-wider ${descColor}`}>
                Número de Celular / Cuenta Yape y Plin:
              </label>
              <input
                type="text"
                value={paymentGatewayConfig.phoneNumber}
                onChange={(e) => setPaymentGatewayConfig({ ...paymentGatewayConfig, phoneNumber: e.target.value })}
                placeholder="Ej. 987 654 321"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-[13px] font-mono-code focus:outline-none transition-all ${inputBg}`}
              />
              <span className={`text-[11px] ${descColor}`}>
                Los comensales podrán copiar este número con un solo clic si pagan por número.
              </span>
            </div>
          </div>

          {/* Tarjetas de Subida de QR (YAPE & PLIN) */}
          <div className="space-y-3">
            <h3 className={`text-[14px] font-bold flex items-center gap-2 ${titleColor}`}>
              <span className="material-symbols-outlined text-[18px] text-[#ff5708]">image</span>
              <span>Códigos QR Oficiales del Restaurante</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta QR YAPE */}
              <div className={`p-4 rounded-xl border space-y-3.5 ${isLight ? 'bg-[#fcf8ff] border-[#e9d5ff]' : 'bg-[#18141f] border-[#742284]/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#742284]"></span>
                    <span className="text-[13px] font-bold text-[#742284] dark:text-[#d8b4fe]">
                      Código QR Oficial — YAPE
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    paymentGatewayConfig.yapeQrImage
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-[#742284]/10 text-[#742284] dark:text-[#d8b4fe]'
                  }`}>
                    {paymentGatewayConfig.yapeQrImage ? '✓ QR Personalizado Activo' : 'QR Dinámico por Defecto'}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 rounded-xl bg-white border-2 border-dashed border-[#742284]/30 flex items-center justify-center p-2 shrink-0 shadow-sm overflow-hidden">
                    {paymentGatewayConfig.yapeQrImage ? (
                      <UploadedImage
                        src={paymentGatewayConfig.yapeQrImage}
                        alt="QR Yape"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-2 text-[#742284]/60">
                        <span className="material-symbols-outlined text-[32px]">qr_code</span>
                        <div className="text-[9px] font-bold mt-1">QR Dinámico SVG</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className={`text-[11.5px] leading-relaxed ${descColor}`}>
                      Sube la imagen del QR descargado de tu app de Yape. Se mostrará automáticamente a los comensales al pagar su cuenta.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3 py-1.5 bg-[#742284] hover:bg-[#862b98] text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[15px]">upload</span>
                        <span>{paymentGatewayConfig.yapeQrImage ? 'Cambiar QR' : 'Subir QR de Yape'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadPaymentQr('yape', file);
                          }}
                        />
                      </label>

                      {paymentGatewayConfig.yapeQrImage && (
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentQr('yape')}
                          className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Restablecer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta QR PLIN */}
              <div className={`p-4 rounded-xl border space-y-3.5 ${isLight ? 'bg-[#f0f9ff] border-[#bae6fd]' : 'bg-[#101824] border-[#0077b6]/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0077b6]"></span>
                    <span className="text-[13px] font-bold text-[#0077b6] dark:text-[#7dd3fc]">
                      Código QR Oficial — PLIN
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    paymentGatewayConfig.plinQrImage
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-[#0077b6]/10 text-[#0077b6] dark:text-[#7dd3fc]'
                  }`}>
                    {paymentGatewayConfig.plinQrImage ? '✓ QR Personalizado Activo' : 'QR Dinámico por Defecto'}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 rounded-xl bg-white border-2 border-dashed border-[#0077b6]/30 flex items-center justify-center p-2 shrink-0 shadow-sm overflow-hidden">
                    {paymentGatewayConfig.plinQrImage ? (
                      <UploadedImage
                        src={paymentGatewayConfig.plinQrImage}
                        alt="QR Plin"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-2 text-[#0077b6]/60">
                        <span className="material-symbols-outlined text-[32px]">qr_code</span>
                        <div className="text-[9px] font-bold mt-1">QR Dinámico SVG</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className={`text-[11.5px] leading-relaxed ${descColor}`}>
                      Sube la imagen del QR descargado de tu banco afiliado a Plin (ej. BBVA, Interbank, Scotiabank).
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3 py-1.5 bg-[#0077b6] hover:bg-[#0284c7] text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[15px]">upload</span>
                        <span>{paymentGatewayConfig.plinQrImage ? 'Cambiar QR' : 'Subir QR de Plin'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadPaymentQr('plin', file);
                          }}
                        />
                      </label>

                      {paymentGatewayConfig.plinQrImage && (
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentQr('plin')}
                          className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Restablecer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Métodos de Pago Activos en Mesa */}
          <div className="space-y-3 pt-2 border-t border-gray-500/20">
            <h3 className={`text-[14px] font-bold flex items-center gap-2 ${titleColor}`}>
              <span className="material-symbols-outlined text-[18px] text-[#ff5708]">toggle_on</span>
              <span>Métodos de Pago Habilitados para Comensales en Mesa</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { key: 'acceptYape', label: 'Yape QR Móvil', icon: 'qr_code' },
                { key: 'acceptPlin', label: 'Plin QR Móvil', icon: 'qr_code' },
                { key: 'acceptPos', label: 'Tarjeta POS Inalámbrico', icon: 'point_of_sale' },
                { key: 'acceptCash', label: 'Efectivo con Vuelto', icon: 'payments' },
              ] as const).map((m) => {
                const isChecked = paymentGatewayConfig[m.key];
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      const next = { ...paymentGatewayConfig, [m.key]: !isChecked };
                      setPaymentGatewayConfig(next);
                      savePaymentConfig(next);
                      onShowToast(`${m.label} ${!isChecked ? 'habilitado' : 'desactivado'} para la Carta Digital`, 'info');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-[#FF5A1F]/10 border-[#FF5A1F] text-[#FF5A1F]'
                        : isLight
                        ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#94a3b8]'
                        : 'bg-[#151515] border-[#2A2A2A] text-gray-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                    <span className="text-[11.5px] font-bold">{m.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isChecked ? 'bg-[#FF5A1F] text-white' : 'bg-gray-500/20'}`}>
                      {isChecked ? 'Habilitado' : 'Desactivado'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
