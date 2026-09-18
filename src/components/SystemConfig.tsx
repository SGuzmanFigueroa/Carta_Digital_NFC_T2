import React, { useState } from 'react';
import { SystemConfigState } from '../types';

interface SystemConfigProps {
  config: SystemConfigState;
  onSaveConfig: (updated: SystemConfigState) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const SystemConfig: React.FC<SystemConfigProps> = ({
  config,
  onSaveConfig,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<SystemConfigState>({ ...config });
  const [activeTab, setActiveTab] = useState<'general' | 'alerts' | 'interface' | 'regional' | 'printers'>('general');
  const [testPrintActive, setTestPrintActive] = useState(false);

  const handleToggle = (field: keyof SystemConfigState) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = () => {
    onSaveConfig(formData);
    onShowToast('Configuración del sistema guardada con éxito', 'save');
  };

  const handleTestChime = () => {
    onShowToast('Reproduciendo timbre acústico de comanda entrante (800Hz)', 'volume_up');
  };

  const handleTestPrint = () => {
    setTestPrintActive(true);
    setTimeout(() => {
      setTestPrintActive(false);
      onShowToast(`Impresión de prueba enviada a ${formData.printerIp}:${formData.printerPort}`, 'print');
    }, 600);
  };

  return (
    <div className="w-full flex flex-col px-4 lg:px-6 py-4 max-w-[1680px] mx-auto gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-code text-[11px] text-[#ff5708] uppercase tracking-wider font-bold">
              SISTEMA
            </span>
            <span className="text-[#353437] text-xs">/</span>
            <span className="font-label-code text-[11px] text-[#c6c5cf]">CONFIGURACIÓN GENERAL</span>
          </div>
          <h1 className="text-[26px] md:text-[32px] font-bold text-[#e5e1e4] tracking-tight">
            Configuración del Sistema
          </h1>
          <p className="font-label-code text-[11px] text-[#c6c5cf]">
            Versión GastroPulse: v2.4.0 (Build 8941) • Terminal Activo: TERM-04
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setFormData({ ...config });
              onShowToast('Valores restablecidos a la configuración anterior', 'restart_alt');
            }}
            className="px-3.5 py-2 rounded-lg bg-[#1c1b1d] text-[#e5e1e4] hover:bg-[#2a2a2c] text-[13px] border border-[#353437] transition-all cursor-pointer"
          >
            Restablecer
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5708] text-[#511500] font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(255,87,8,0.3)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 p-1 bg-[#1c1b1d] rounded-xl border border-[#353437]/30">
        {[
          { id: 'general', label: 'General & Local', icon: 'storefront' },
          { id: 'alerts', label: 'Alertas & Sonido', icon: 'notifications_active' },
          { id: 'interface', label: 'Interfaz & Pantalla', icon: 'palette' },
          { id: 'regional', label: 'Idiomas & Regional', icon: 'public' },
          { id: 'printers', label: 'Impresoras ESC/POS', icon: 'print' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#2a2a2c] text-[#ff5708] font-semibold border border-[#ff5708]/30 shadow-sm'
                : 'text-[#c6c5cf] hover:text-[#e5e1e4]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Configuration Content Areas */}
      <div className="bg-[#1c1b1d] rounded-2xl border border-[#353437]/40 p-5 sm:p-7 shadow-sm">
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-[18px] font-bold text-[#e5e1e4]">Información del Local & Sucursal</h2>
              <p className="text-[13px] text-[#c6c5cf]">
                Datos de identificación fiscal y cabecera impresa en comprobantes y tickets térmicos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1 font-medium">Nombre de Sucursal</label>
                <input
                  type="text"
                  value={formData.branchName}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1 font-medium">RUC / ID Fiscal</label>
                <input
                  type="text"
                  value={formData.branchRuc}
                  onChange={(e) => setFormData({ ...formData, branchRuc: e.target.value })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px] font-label-code"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1 font-medium">Responsable / Administrador</label>
                <input
                  type="text"
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1 font-medium">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[12px] text-[#c6c5cf] mb-1 font-medium">Correo Electrónico de Reportes Z</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px]"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-[18px] font-bold text-[#e5e1e4]">Alertas Acústicas & Notificaciones KDS</h2>
              <p className="text-[13px] text-[#c6c5cf]">
                Controla los zumbadores acústicos y alertas visuales para avisar a camareros y cocina.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#201f22] border border-[#353437]/30">
                <div className="flex flex-col">
                  <span className="text-[14px] font-medium text-[#e5e1e4]">Timbre de Nueva Comanda</span>
                  <span className="text-[12px] text-[#c6c5cf]">Emite tono sonoro cuando un cliente pide vía QR o camarero envía pedido.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('soundAlerts')}
                  className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                    formData.soundAlerts ? 'bg-[#ff5708]' : 'bg-[#2a2a2c]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      formData.soundAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#201f22] border border-[#353437]/30">
                <div className="flex flex-col">
                  <span className="text-[14px] font-medium text-[#e5e1e4]">Alerta de Demora Crítica (KDS &gt; 16 min)</span>
                  <span className="text-[12px] text-[#c6c5cf]">Parpadeo en rojo y alerta sonora cuando un plato supera el límite establecido.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('delayAlerts')}
                  className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                    formData.delayAlerts ? 'bg-[#ff5708]' : 'bg-[#2a2a2c]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      formData.delayAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#201f22] border border-[#353437]/30">
                <div className="flex flex-col">
                  <span className="text-[14px] font-medium text-[#e5e1e4]">Aviso de Solicitud de Cuenta en Mesa</span>
                  <span className="text-[12px] text-[#c6c5cf]">Notifica a runners y camareros cuando una mesa presiona "Pedir Cuenta".</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('paymentAlerts')}
                  className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                    formData.paymentAlerts ? 'bg-[#ff5708]' : 'bg-[#2a2a2c]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      formData.paymentAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestChime}
                  className="px-4 py-2 rounded-lg bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] text-[13px] font-medium flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#ff5708]">volume_up</span>
                  <span>Probar Timbre de Comanda (Buzzer Test)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interface' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-[18px] font-bold text-[#e5e1e4]">Personalización Visual de Pantalla</h2>
              <p className="text-[13px] text-[#c6c5cf]">
                Ajuste de tema, contraste y densidad para terminales táctiles de salón y KDS.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => setFormData({ ...formData, themeMode: 'obsidian' })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.themeMode === 'obsidian'
                    ? 'border-[#ff5708] bg-[#201f22]'
                    : 'border-[#353437] bg-[#0e0e10] hover:border-[#ff5708]/40'
                }`}
              >
                <div className="w-full h-12 rounded-lg bg-[#131315] border border-[#ff5708]/30 mb-2 flex items-center justify-center">
                  <span className="w-3 h-3 rounded-full bg-[#ff5708]" />
                </div>
                <h4 className="text-[14px] font-bold text-[#e5e1e4]">Obsidian Dark (Predeterminado)</h4>
                <p className="text-[11px] text-[#c6c5cf]">Optimizado para ambientes gastronómicos con poca luz.</p>
              </div>

              <div
                onClick={() => setFormData({ ...formData, themeMode: 'midnight' })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.themeMode === 'midnight'
                    ? 'border-[#ff5708] bg-[#201f22]'
                    : 'border-[#353437] bg-[#0e0e10] hover:border-[#ff5708]/40'
                }`}
              >
                <div className="w-full h-12 rounded-lg bg-[#0d1527] border border-[#0494fc]/30 mb-2 flex items-center justify-center">
                  <span className="w-3 h-3 rounded-full bg-[#0494fc]" />
                </div>
                <h4 className="text-[14px] font-bold text-[#e5e1e4]">Midnight Deep Blue</h4>
                <p className="text-[11px] text-[#c6c5cf]">Gama fría para barras de coctelería y mixología.</p>
              </div>

              <div
                onClick={() => setFormData({ ...formData, themeMode: 'titanium' })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.themeMode === 'titanium'
                    ? 'border-[#ff5708] bg-[#201f22]'
                    : 'border-[#353437] bg-[#0e0e10] hover:border-[#ff5708]/40'
                }`}
              >
                <div className="w-full h-12 rounded-lg bg-[#27272a] border border-[#c6c5cf]/30 mb-2 flex items-center justify-center">
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <h4 className="text-[14px] font-bold text-[#e5e1e4]">Titanium Neutral</h4>
                <p className="text-[11px] text-[#c6c5cf]">Mayor contraste para terrazas con luz diurna.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'regional' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-[18px] font-bold text-[#e5e1e4]">Ajustes Regionales, Moneda e Impuestos</h2>
              <p className="text-[13px] text-[#c6c5cf]">
                Configuración de localización para comprobantes fiscales SUNAT y formato horario.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Idioma de Interfaz</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] text-[13px]"
                >
                  <option value="Español (Perú)">Español (Perú)</option>
                  <option value="English (US)">English (US)</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Moneda del Sistema</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] text-[13px]"
                >
                  <option value="Soles Peruanos (S/)">Soles Peruanos (S/ - PEN)</option>
                  <option value="Dólares Americanos ($)">Dólares Americanos ($ - USD)</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Zona Horaria</label>
                <input
                  type="text"
                  value={formData.timezone}
                  disabled
                  className="w-full bg-[#0e0e10] text-[#c6c5cf] px-3.5 py-2 rounded-lg border border-[#353437] text-[13px] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Formato de Hora</label>
                <select
                  value={formData.timeFormat}
                  onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value as any })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] text-[13px]"
                >
                  <option value="24h">24 Horas (ej. 20:45)</option>
                  <option value="12h">12 Horas AM/PM (ej. 08:45 PM)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'printers' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-[18px] font-bold text-[#e5e1e4]">Hardware & Comanderas ESC/POS</h2>
              <p className="text-[13px] text-[#c6c5cf]">
                Conexión de red TCP/IP (Raw Socket 9100) para impresoras de comanda y tickets de salón.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Dirección IP Impresora</label>
                <input
                  type="text"
                  value={formData.printerIp}
                  onChange={(e) => setFormData({ ...formData, printerIp: e.target.value })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] font-label-code text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Puerto Socket</label>
                <input
                  type="text"
                  value={formData.printerPort}
                  onChange={(e) => setFormData({ ...formData, printerPort: e.target.value })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] font-label-code text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Ancho de Papel</label>
                <select
                  value={formData.paperWidth}
                  onChange={(e) => setFormData({ ...formData, paperWidth: e.target.value as any })}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2 rounded-lg border border-[#353437] text-[13px]"
                >
                  <option value="80mm">80mm (Estándar 48 cols)</option>
                  <option value="58mm">58mm (Móvil 32 cols)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#201f22] border border-[#353437]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#e5e1e4]">Auto-corte de cuchilla (Guillotine Cut)</span>
                <input
                  type="checkbox"
                  checked={formData.autoCut}
                  onChange={() => handleToggle('autoCut')}
                  className="w-4 h-4 accent-[#ff5708]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#e5e1e4]">Buzzer acústico de fin de comanda</span>
                <input
                  type="checkbox"
                  checked={formData.acousticBuzzer}
                  onChange={() => handleToggle('acousticBuzzer')}
                  className="w-4 h-4 accent-[#ff5708]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestPrint}
                className="px-4 py-2 rounded-lg bg-[#ff5708] text-[#511500] font-bold text-[13px] flex items-center gap-2 hover:brightness-110 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>{testPrintActive ? 'Imprimiendo Test...' : 'Probar Impresión Térmica Test'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
