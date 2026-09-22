'use client';

import React, { useState, useEffect } from 'react';
import { SystemConfigState } from '../types';
import { applyTheme } from '@/utils/theme';

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
  const [testPrintActive, setTestPrintActive] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [customLogoInput, setCustomLogoInput] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<'perfil' | 'notificaciones' | 'tema' | 'idioma' | 'impresion'>('perfil');

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('El archivo supera los 5MB permitidos', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFormData((prev) => ({ ...prev, logoUrl: base64 }));
        onShowToast('Nuevo logo seleccionado con éxito', 'photo_library');
        setShowLogoModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLogoInput.trim()) return;
    setFormData((prev) => ({ ...prev, logoUrl: customLogoInput.trim() }));
    onShowToast('URL de logo asignada correctamente', 'link');
    setShowLogoModal(false);
    setCustomLogoInput('');
  };

  const handleResetDefaultLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '/logo.png' }));
    onShowToast('Logo restaurado al oficial predeterminado', 'restore');
    setShowLogoModal(false);
  };

  const isLight = formData.themeMode === 'light';
  const isHighContrast = formData.themeMode === 'kds-high-contrast';

  // Dynamic theme styling tokens
  const sectionBg = isLight 
    ? 'bg-white border-[#e2e8f0] shadow-sm' 
    : isHighContrast 
    ? 'bg-black border-2 border-white' 
    : 'bg-[#1A1A1A] border-[#2A2A2A]';

  const sectionHeaderBorder = isLight ? 'border-[#e2e8f0]' : isHighContrast ? 'border-white' : 'border-[#2A2A2A]';
  const iconBoxBg = isLight ? 'bg-[#fff7ed] border-[#fed7aa]' : isHighContrast ? 'bg-black border-2 border-white' : 'bg-[#252525] border-[#333]';
  const titleColor = isLight ? 'text-[#0f172a]' : 'text-white';
  const descColor = isLight ? 'text-[#64748b]' : 'text-gray-400';
  const badgeStyle = isLight ? 'text-[#64748b] bg-[#f1f5f9] border-[#e2e8f0]' : 'text-gray-400 bg-[#252525] border-[#333]';
  const inputBg = isLight 
    ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] focus:border-[#FF5A1F] focus:bg-white' 
    : isHighContrast 
    ? 'bg-black border-2 border-white text-white focus:border-[#f59e0b]' 
    : 'bg-[#141414] border-[#2A2A2A] text-gray-200 focus:border-[#FF5A1F]';
  const labelColor = isLight ? 'text-[#475569]' : 'text-gray-500';
  const cardBg = isLight ? 'bg-[#f8fafc] border-[#e2e8f0] shadow-sm' : isHighContrast ? 'bg-black border-2 border-white' : 'bg-[#1C1C1C] border-[#2A2A2A]';
  const sidebarBg = isLight ? 'bg-white border-[#e2e8f0] shadow-sm text-[#64748b]' : isHighContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#141414] border-[#2A2A2A] text-gray-400';
  const selectBg = isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : isHighContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#252525] border-[#333] text-gray-200';

  useEffect(() => {
    setFormData({ ...config });
    applyTheme(config.themeMode, config.colorAccent, config.density);
  }, [config]);

  // Observador de scroll para actualizar el menú lateral automáticamente
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as any);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    const sectionIds = ['perfil', 'notificaciones', 'tema', 'idioma', 'impresion'];
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handleToggle = (field: keyof SystemConfigState) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = () => {
    onSaveConfig(formData);
  };

  const handleTestPrint = () => {
    setTestPrintActive(true);
    setTimeout(() => {
      setTestPrintActive(false);
      onShowToast(`Impresión de prueba enviada a ${formData.printerIp}:${formData.printerPort}`, 'print');
    }, 600);
  };

  return (
    <div className="w-full flex flex-col px-4 lg:px-8 py-6 max-w-[1400px] mx-auto gap-8 selection:bg-[#FF5A1F] selection:text-[#0F0F0F] transition-colors duration-200">
      
      {/* Header */}
      <div className={`mb-2 border-b pb-6 ${sectionHeaderBorder}`}>
        <p className={`text-[10px] uppercase tracking-[0.2em] mb-2 font-mono ${isLight ? 'text-[#64748b]' : 'text-gray-500'}`}>
          SYS // CONFIG-SUITE • NODE.LIM-01 • FIRMWARE v4.8.2
        </p>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold mb-1 tracking-tight ${titleColor}`}>
              Configuración del Sistema
            </h1>
            <p className={`text-[13px] max-w-2xl ${descColor}`}>
              Parámetros operacionales para la sucursal {formData.branchName || 'AUREA Bistro'}. Cambios reflejados en tiempo real en KDS, tabletas de mozos y comandera térmica.
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                setFormData({ ...config });
                applyTheme(config.themeMode, config.colorAccent, config.density);
                onShowToast('Valores restablecidos', 'restart_alt');
              }}
              className={`px-5 py-2.5 rounded border transition text-sm font-medium flex items-center gap-2 cursor-pointer ${
                isLight 
                  ? 'bg-white text-[#334155] border-[#cbd5e1] hover:bg-[#f8fafc] shadow-sm' 
                  : isHighContrast 
                  ? 'bg-black text-white border-2 border-white hover:bg-[#111]' 
                  : 'bg-[#1C1C1C] text-gray-300 border-[#2A2A2A] hover:bg-[#252525]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Restablecer Valores
            </button>
            <button 
              onClick={handleSave}
              className="px-5 py-2.5 bg-[#FF5A1F] text-white rounded hover:bg-[#FF703D] transition font-bold text-sm flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,90,31,0.25)] active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="flex gap-8 items-start">
        
        {/* Menú Lateral Sticky */}
        <aside className="w-[260px] shrink-0 flex flex-col gap-2 sticky top-24">
          <nav className="flex flex-col gap-1.5">
            {[
              {
                id: 'perfil',
                num: '01',
                label: 'Perfil & Cuenta',
                icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
              },
              {
                id: 'notificaciones',
                num: '02',
                label: 'Notificaciones',
                icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
              },
              {
                id: 'tema',
                num: '03',
                label: 'Tema & Visual',
                icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42'
              },
              {
                id: 'idioma',
                num: '04',
                label: 'Idioma & Región',
                icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
              },
              {
                id: 'impresion',
                num: '05',
                label: 'Hardware ESC/POS',
                icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z'
              },
            ].map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`flex justify-between items-center px-4 py-3 rounded text-sm transition-all cursor-pointer ${
                    isActive
                      ? isLight
                        ? 'bg-white text-[#ff5708] border-l-2 border-[#FF5A1F] shadow-sm font-semibold'
                        : 'bg-[#1A1A1A] text-white border-l-2 border-[#FF5A1F]'
                      : isLight
                      ? 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] border-l-2 border-transparent'
                      : 'text-gray-400 hover:bg-[#161616] hover:text-gray-200 border-l-2 border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 transition-colors ${isActive ? 'text-[#FF5A1F]' : isLight ? 'text-[#94a3b8]' : 'text-gray-500'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.label}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#FF5A1F]' : isLight ? 'text-[#94a3b8]' : 'text-gray-600'}`}>
                    {item.num}
                  </span>
                </a>
              );
            })}
          </nav>

          <div className={`mt-8 p-5 rounded text-[11px] font-mono tracking-wide border ${sidebarBg}`}>
            <div className={`flex justify-between mb-4 uppercase font-bold ${isLight ? 'text-[#64748b]' : 'text-gray-500'}`}>
              <span>Estado de Terminal</span>
              <span className="text-[#00FF88] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]"></span> OK</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span>Latencia KDS</span> 
                <span className={isLight ? 'text-[#0f172a] font-semibold' : 'text-white'}>18 ms</span>
              </div>
              <div className="flex justify-between">
                <span>Sincro Local</span> 
                <span className={isLight ? 'text-[#0f172a] font-semibold' : 'text-white'}>SQLite Activo</span>
              </div>
              <div className="flex justify-between">
                <span>Impresora Red</span> 
                <span className="text-[#FF5A1F] font-semibold">Conectada</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Contenido Central Scrollable */}
        <div className="flex-1 flex flex-col gap-8 max-w-4xl pb-24">
          
          {/* SEC_01: PERFIL */}
          <section id="perfil" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded border ${iconBoxBg}`}>
                  <svg className="w-5 h-5 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                </div>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Perfil & Cuenta Operativa</h2>
                  <p className={`text-[13px] ${descColor}`}>Identidad de sala y contacto oficial para auditorías tributarias y comandas.</p>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-1 rounded border tracking-widest uppercase ${badgeStyle}`}>SEC_01</span>
            </div>

            <div className="flex flex-col md:flex-row p-6 gap-6">
              {/* Panel Izquierdo (Logo) */}
              <div className={`w-full md:w-[240px] shrink-0 flex flex-col items-center justify-center p-5 rounded-lg border ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : isHighContrast ? 'bg-black border-2 border-white' : 'bg-[#0F0F0F] border-[#2A2A2A]'
              }`}>
                <div className={`w-[110px] h-[110px] rounded border mb-5 overflow-hidden flex items-center justify-center shadow-md ${
                  isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#050505] border-[#1A1A1A]'
                }`}>
                  <img 
                    src={formData.logoUrl || '/logo.png'} 
                    alt={`Logo ${formData.branchName || 'AUREA Bistro'}`} 
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className={`font-bold mb-1 text-[15px] text-center ${titleColor}`}>{formData.branchName || 'AUREA Bistro'}</h3>
                <p className={`text-[10px] font-mono tracking-widest mb-5 ${descColor}`}>RUC: {formData.branchRuc || '20608941203'}</p>
                <button 
                  type="button"
                  onClick={() => setShowLogoModal(true)}
                  className={`text-[11px] px-4 py-2 border rounded transition flex items-center justify-center gap-2 w-full cursor-pointer ${
                    isLight 
                      ? 'bg-white hover:bg-[#f1f5f9] border-[#cbd5e1] text-[#334155] shadow-sm font-semibold' 
                      : 'bg-[#1A1A1A] hover:bg-[#252525] border-[#333] text-gray-300'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Cambiar Logo
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoFileSelect} 
                  accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                  className="hidden" 
                />
              </div>

              {/* Panel Derecho */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Nombre de la Sucursal</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                      </div>
                      <input type="text" value={formData.branchName} onChange={(e) => setFormData({...formData, branchName: e.target.value})} className={`w-full rounded py-2.5 pr-3 pl-9 text-[13px] transition ${inputBg}`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Administrador de Turno</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <input type="text" value={formData.managerName} onChange={(e) => setFormData({...formData, managerName: e.target.value})} className={`w-full rounded py-2.5 pr-3 pl-9 text-[13px] transition ${inputBg}`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Correo de Notificaciones</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`w-full rounded py-2.5 pr-3 pl-9 text-[13px] transition ${inputBg}`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Teléfono de Contacto Sala</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className={`w-full rounded py-2.5 pr-3 pl-9 text-[13px] font-mono transition ${inputBg}`} />
                    </div>
                  </div>
                </div>
                
                <div className={`mt-8 pt-4 border-t flex justify-between items-center ${sectionHeaderBorder}`}>
                  <p className={`text-[11px] flex items-center gap-2 ${descColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]"></span>
                    Licencia GastroPulse Enterprise: <strong className={`font-medium ${titleColor}`}>32 Terminales Activas</strong>
                  </p>
                  <span className="text-[9px] text-[#FF5A1F] font-mono tracking-widest border border-[#FF5A1F]/30 bg-[#FF5A1F]/10 px-2 py-1 rounded font-bold">PLAN OMNI-CHEF</span>
                </div>
              </div>
            </div>
          </section>

          {/* SEC_02: NOTIFICACIONES */}
          <section id="notificaciones" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded border ${iconBoxBg}`}>
                  <svg className="w-5 h-5 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
                  </svg>
                </div>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Preferencias de Notificaciones & Alertas</h2>
                  <p className={`text-[13px] ${descColor}`}>Ajusta los disparadores de audio y avisos visuales para el personal de servicio.</p>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-1 rounded border tracking-widest uppercase ${badgeStyle}`}>SEC_02</span>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Alertas sonoras */}
              <div className={`p-4 rounded-xl flex justify-between items-start transition-all ${cardBg}`}>
                <div className="flex gap-3 pr-4">
                  <svg className="w-5 h-5 text-[#FF5A1F] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                  <div>
                    <h4 className={`text-[13.5px] font-bold mb-1 ${titleColor}`}>Alertas sonoras de comandas nuevas</h4>
                    <p className={`text-[11.5px] leading-tight ${descColor}`}>Campana acústica en KDS y estación de expedición al entrar comanda.</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleToggle('soundAlerts')} className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mt-1 ${formData.soundAlerts ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'}`}>
                  <div className={`w-5 h-5 rounded-full transition-transform ${formData.soundAlerts ? 'translate-x-5' : 'translate-x-0'} ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`} />
                </button>
              </div>

              {/* Card 2: Demora crítica */}
              <div className={`p-4 rounded-xl flex justify-between items-start transition-all ${cardBg}`}>
                <div className="flex gap-3 pr-4">
                  <svg className="w-5 h-5 text-[#FF8A65] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 3.75h12m-12 16.5h12M7.5 3.75V5.5c0 1.48-.68 2.89-1.85 3.82l-1.3 1.02c-.89.7-1.35 1.77-1.35 2.91s.46 2.21 1.35 2.91l1.3 1.02c1.17.93 1.85 2.34 1.85 3.82v1.75m9-16.5V5.5c0 1.48.68 2.89 1.85 3.82l1.3 1.02c.89.7 1.35 1.77 1.35 2.91s-.46 2.21-1.35 2.91l-1.3 1.02c-1.17.93-1.85 2.34-1.85 3.82v1.75" />
                  </svg>
                  <div>
                    <h4 className={`text-[13.5px] font-bold mb-1 ${titleColor}`}>Mesa con demora crítica (+15 min)</h4>
                    <p className={`text-[11.5px] leading-tight ${descColor}`}>Destello rojo pulsante si un plato supera su tiempo límite de preparación.</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleToggle('delayAlerts')} className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mt-1 ${formData.delayAlerts ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'}`}>
                  <div className={`w-5 h-5 rounded-full transition-transform ${formData.delayAlerts ? 'translate-x-5' : 'translate-x-0'} ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`} />
                </button>
              </div>

              {/* Card 3: Avisos de pago */}
              <div className={`p-4 rounded-xl flex justify-between items-start transition-all ${cardBg}`}>
                <div className="flex gap-3 pr-4">
                  <svg className="w-5 h-5 text-[#0EA5E9] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14.25h6M9 11.25h6M9 8.25h6M2.25 5.25A2.25 2.25 0 014.5 3h15a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0119.5 21h-15A2.25 2.25 0 012.25 18.75V5.25z" />
                  </svg>
                  <div>
                    <h4 className={`text-[13.5px] font-bold mb-1 ${titleColor}`}>Avisos de pago solicitado por comensal</h4>
                    <p className={`text-[11.5px] leading-tight ${descColor}`}>Notificación prioritaria al mozo cuando el cliente pide la cuenta vía QR.</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleToggle('paymentAlerts')} className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mt-1 ${formData.paymentAlerts ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'}`}>
                  <div className={`w-5 h-5 rounded-full transition-transform ${formData.paymentAlerts ? 'translate-x-5' : 'translate-x-0'} ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`} />
                </button>
              </div>

              {/* Card 4: Bajo stock */}
              <div className={`p-4 rounded-xl flex justify-between items-start transition-all ${cardBg}`}>
                <div className="flex gap-3 pr-4">
                  <svg className="w-5 h-5 text-[#FDBA74] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <div>
                    <h4 className={`text-[13.5px] font-bold mb-1 ${titleColor}`}>Alertas por bajo stock en cocina</h4>
                    <p className={`text-[11.5px] leading-tight ${descColor}`}>Aviso al Maitre cuando un ingrediente clave o botella descienda de 3 raciones.</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleToggle('lowStockAlerts')} className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mt-1 ${formData.lowStockAlerts ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'}`}>
                  <div className={`w-5 h-5 rounded-full transition-transform ${formData.lowStockAlerts ? 'translate-x-5' : 'translate-x-0'} ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* SEC_03: TEMA & ERGONOMÍA */}
          <section id="tema" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded border ${iconBoxBg}`}>
                  <svg className="w-5 h-5 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                </div>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Tema & Ergonomía Visual</h2>
                  <p className={`text-[13px] ${descColor}`}>Optimizado para legibilidad bajo luces cálidas de salón o el calor intenso de cocina.</p>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-1 rounded border tracking-widest uppercase ${badgeStyle}`}>SEC_03</span>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* MODO DE PANTALLA */}
              <div>
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold mb-3 block ${labelColor}`}>Modo de Pantalla</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Obsidian */}
                  <div 
                    onClick={() => {
                      setFormData({ ...formData, themeMode: 'obsidian' });
                      applyTheme('obsidian', formData.colorAccent, formData.density);
                    }} 
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.themeMode === 'obsidian' 
                        ? 'border-[#FF5A1F] bg-[#161616] ring-2 ring-[#FF5A1F]/30 shadow-md' 
                        : isLight 
                        ? 'border-[#e2e8f0] bg-[#141414] text-white hover:border-[#cbd5e1]'
                        : 'border-[#2A2A2A] bg-[#141414] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[13px] font-bold text-white">Oscuro Obsidian</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        formData.themeMode === 'obsidian' ? 'border-[#FF5A1F]' : 'border-gray-600'
                      }`}>
                        {formData.themeMode === 'obsidian' && <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />}
                      </span>
                    </div>
                    <div className="w-full h-20 rounded bg-[#0A0A0A] border border-[#222] p-2.5 mb-4 flex flex-col justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
                        <span className="w-16 h-1.5 rounded-full bg-[#2A2A2A]" />
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="h-6 bg-[#181818] rounded border border-[#252525]" />
                        <div className="h-6 bg-[#181818] rounded border border-[#252525]" />
                        <div className="h-6 bg-[#181818] rounded border border-[#252525]" />
                        <div className="h-6 bg-[#181818] rounded border border-[#252525]" />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight">Predeterminado. Reduce fatiga visual en salón de noche.</p>
                  </div>

                  {/* Claro Minimal */}
                  <div 
                    onClick={() => {
                      setFormData({ ...formData, themeMode: 'light' });
                      applyTheme('light', formData.colorAccent, formData.density);
                    }} 
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.themeMode === 'light' 
                        ? 'border-2 border-[#FF5A1F] bg-[#fff7ed]/50 shadow-md ring-2 ring-[#FF5A1F]/20' 
                        : isLight 
                        ? 'border-[#cbd5e1] bg-white text-[#0f172a] hover:border-[#94a3b8]'
                        : 'border-[#2A2A2A] bg-[#141414] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[13px] font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Claro Minimal</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        formData.themeMode === 'light' ? 'border-[#FF5A1F]' : 'border-gray-500'
                      }`}>
                        {formData.themeMode === 'light' && <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />}
                      </span>
                    </div>
                    <div className="w-full h-20 rounded bg-[#f1f5f9] border border-[#cbd5e1] p-2.5 mb-4 flex flex-col justify-between shadow-inner">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
                        <span className="w-16 h-1.5 rounded-full bg-[#cbd5e1]" />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="h-6 bg-white rounded border border-[#e2e8f0]" />
                        <div className="h-6 bg-white rounded border border-[#e2e8f0]" />
                        <div className="h-6 bg-white rounded border border-[#e2e8f0]" />
                      </div>
                    </div>
                    <p className={`text-[11px] leading-tight ${isLight ? 'text-[#64748b]' : 'text-gray-400'}`}>Ideal para terrazas con alta iluminación natural directa.</p>
                  </div>

                  {/* Alto Contraste KDS */}
                  <div 
                    onClick={() => {
                      setFormData({ ...formData, themeMode: 'kds-high-contrast' });
                      applyTheme('kds-high-contrast', formData.colorAccent, formData.density);
                    }} 
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.themeMode === 'kds-high-contrast' 
                        ? 'border-2 border-[#FF5A1F] bg-black ring-2 ring-[#FF5A1F]/30 shadow-md' 
                        : isLight 
                        ? 'border-[#e2e8f0] bg-black text-white hover:border-[#cbd5e1]'
                        : 'border-[#2A2A2A] bg-[#141414] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[13px] font-bold text-white">Alto Contraste KDS</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        formData.themeMode === 'kds-high-contrast' ? 'border-[#FF5A1F]' : 'border-gray-600'
                      }`}>
                        {formData.themeMode === 'kds-high-contrast' && <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />}
                      </span>
                    </div>
                    <div className="w-full h-20 rounded bg-black border-2 border-white p-2.5 mb-4 flex flex-col justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                        <span className="w-16 h-1.5 rounded-full bg-white" />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="h-6 bg-[#EAB308] rounded-sm" />
                        <div className="h-6 bg-[#10B981] rounded-sm" />
                        <div className="h-6 bg-white rounded-sm" />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight">Líneas hiper-visibles a 3 metros de distancia en línea de fuego.</p>
                  </div>
                </div>
              </div>

              {/* FILA INFERIOR: ACENTO CROMÁTICO + DENSIDAD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Acento Cromático */}
                <div className="flex flex-col gap-3">
                  <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Acento Cromático Operativo</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, colorAccent: 'amber' });
                        applyTheme(formData.themeMode, 'amber', formData.density);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-[12px] font-medium transition-all cursor-pointer ${
                        formData.colorAccent === 'amber'
                          ? isLight
                            ? 'border-[#FF5A1F] bg-[#fff7ed] text-[#c2410c] font-bold shadow-sm'
                            : 'border-[#FF5A1F] bg-[#221A15] text-white'
                          : isLight
                          ? 'border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]'
                          : 'border-[#2A2A2A] bg-[#141414] text-gray-400 hover:border-[#444]'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-[#FF5A1F] shadow-[0_0_8px_rgba(255,90,31,0.5)]" />
                      <span>Kinetic Amber</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, colorAccent: 'emerald' });
                        applyTheme(formData.themeMode, 'emerald', formData.density);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-[12px] font-medium transition-all cursor-pointer ${
                        formData.colorAccent === 'emerald'
                          ? isLight
                            ? 'border-[#00FF88] bg-[#f0fdf4] text-[#15803d] font-bold shadow-sm'
                            : 'border-[#00FF88] bg-[#10221A] text-white'
                          : isLight
                          ? 'border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]'
                          : 'border-[#2A2A2A] bg-[#141414] text-gray-400 hover:border-[#444]'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
                      <span>Esmeralda</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, colorAccent: 'cyan' });
                        applyTheme(formData.themeMode, 'cyan', formData.density);
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-[12px] font-medium transition-all cursor-pointer ${
                        formData.colorAccent === 'cyan'
                          ? isLight
                            ? 'border-[#00B4D8] bg-[#f0f9ff] text-[#0369a1] font-bold shadow-sm'
                            : 'border-[#00B4D8] bg-[#102028] text-white'
                          : isLight
                          ? 'border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]'
                          : 'border-[#2A2A2A] bg-[#141414] text-gray-400 hover:border-[#444]'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-[#00B4D8] shadow-[0_0_8px_rgba(0,180,216,0.5)]" />
                      <span>Cibernético</span>
                    </button>
                  </div>
                  <p className={`text-[11px] ${descColor}`}>El acento determina el foco de órdenes críticas y botones de acción rápida.</p>
                </div>

                {/* Densidad de Interfaz */}
                <div className="flex flex-col gap-3">
                  <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>
                    Densidad de Interfaz
                  </label>
                  <div className={`grid grid-cols-2 gap-2 p-1 rounded-lg border ${
                    isLight ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#141414] border-[#2A2A2A]'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, density: 'compact' });
                        applyTheme(formData.themeMode, formData.colorAccent, 'compact');
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-[12px] font-medium transition-all cursor-pointer ${
                        formData.density === 'compact'
                          ? isLight
                            ? 'border border-[#FF5A1F] bg-white text-[#FF5A1F] shadow-sm font-bold'
                            : 'border border-[#FF5A1F] bg-[#221A15] text-white shadow-[0_0_8px_rgba(255,90,31,0.2)]'
                          : isLight
                          ? 'border border-transparent text-[#64748b] hover:text-[#0f172a]'
                          : 'border border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-colors ${formData.density === 'compact' ? 'text-[#FF5A1F]' : isLight ? 'text-[#64748b]' : 'text-gray-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      <span>Compacta (Desktop)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, density: 'touch' });
                        applyTheme(formData.themeMode, formData.colorAccent, 'touch');
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-[12px] font-medium transition-all cursor-pointer ${
                        formData.density === 'touch'
                          ? isLight
                            ? 'border border-[#FF5A1F] bg-white text-[#FF5A1F] shadow-sm font-bold'
                            : 'border border-[#FF5A1F] bg-[#221A15] text-white shadow-[0_0_8px_rgba(255,90,31,0.2)]'
                          : isLight
                          ? 'border border-transparent text-[#64748b] hover:text-[#0f172a]'
                          : 'border border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-colors ${formData.density === 'touch' ? 'text-[#FF5A1F]' : isLight ? 'text-[#64748b]' : 'text-gray-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                      </svg>
                      <span>Táctil Ampliada</span>
                    </button>
                  </div>
                  <p className={`text-[11px] ${descColor}`}>
                    {formData.density === 'compact'
                      ? 'Compacta maximiza datos por pantalla en estación de caja y barra.'
                      : 'Táctil ampliada agranda botones para terminales táctiles en cocina y pase.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SEC_04: IDIOMA */}
          <section id="idioma" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded border ${iconBoxBg}`}>
                  <svg className="w-5 h-5 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                </div>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Idioma & Regionalización</h2>
                  <p className={`text-[13px] ${descColor}`}>Ajustes fiscales, moneda contable y sincronización horaria de comandas.</p>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-1 rounded border tracking-widest uppercase ${badgeStyle}`}>SEC_04</span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Idioma del Sistema</label>
                <select value={formData.language} onChange={(e) => setFormData({...formData, language: e.target.value})} className={`w-full rounded p-2.5 text-[13px] focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}>
                  <option value="Español (Perú)">Español (Perú)</option>
                  <option value="English (US)">English (US)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Moneda Base</label>
                <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className={`w-full rounded p-2.5 text-[13px] focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}>
                  <option value="Soles Peruanos (S/)">Soles Peruanos (S/)</option>
                  <option value="USD ($)">Dólares (USD)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Zona Horaria (NTP)</label>
                <select 
                  value={formData.timezone} 
                  onChange={(e) => setFormData({...formData, timezone: e.target.value})} 
                  className={`w-full rounded p-2.5 text-[13px] font-mono focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}
                >
                  <option value="America/Lima (UTC-5)">America/Lima (UTC-5)</option>
                  <option value="America/Bogota (UTC-5)">America/Bogota (UTC-5)</option>
                  <option value="America/Santiago (UTC-4)">America/Santiago (UTC-4)</option>
                  <option value="America/Buenos_Aires (UTC-3)">America/Buenos_Aires (UTC-3)</option>
                  <option value="America/Mexico_City (UTC-6)">America/Mexico_City (UTC-6)</option>
                  <option value="America/New_York (UTC-5)">America/New_York (UTC-5)</option>
                  <option value="Europe/Madrid (UTC+1)">Europe/Madrid (UTC+1)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Formato Horario</label>
                <div className={`flex border rounded overflow-hidden p-0.5 ${
                  isLight ? 'bg-[#f1f5f9] border-[#cbd5e1]' : 'bg-[#252525] border-[#333]'
                }`}>
                  <button 
                    type="button"
                    onClick={() => {
                      setFormData({...formData, timeFormat: '24h'});
                      onShowToast('Formato cambiado a 24 Horas', 'schedule');
                    }} 
                    className={`flex-1 text-[11px] font-bold rounded py-2 transition cursor-pointer ${
                      formData.timeFormat === '24h' 
                        ? isLight ? 'bg-white text-[#0f172a] shadow-sm font-bold' : 'bg-[#333] text-white font-bold' 
                        : isLight ? 'text-[#64748b] hover:text-[#0f172a]' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    24 HORAS
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setFormData({...formData, timeFormat: '12h'});
                      onShowToast('Formato cambiado a 12 Horas (AM/PM)', 'schedule');
                    }} 
                    className={`flex-1 text-[11px] font-bold rounded py-2 transition cursor-pointer ${
                      formData.timeFormat === '12h' 
                        ? isLight ? 'bg-white text-[#0f172a] shadow-sm font-bold' : 'bg-[#333] text-white font-bold' 
                        : isLight ? 'text-[#64748b] hover:text-[#0f172a]' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    12H (AM/PM)
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SEC_05: IMPRESIÓN */}
          <section id="impresion" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded border ${iconBoxBg}`}>
                  <svg className="w-5 h-5 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </div>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Hardware de Impresión & ESC/POS</h2>
                  <p className={`text-[13px] ${descColor}`}>Conexión directa vía socket TCP a impresoras térmicas de cocina y caja central.</p>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-1 rounded border tracking-widest uppercase ${badgeStyle}`}>SEC_05</span>
            </div>
            <div className="p-6 flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                  <p className={`text-[13px] font-semibold flex items-center gap-2 ${isLight ? 'text-[#334155]' : 'text-gray-300'}`}>
                    <span className="w-2 h-2 rounded-full bg-[#00FF88]"></span> Comandera Térmica de Red
                  </p>
                  <span className="text-[#00FF88] text-[10px] font-mono tracking-widest font-bold">ONLINE // READY</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Dirección IP</label>
                    <input type="text" value={formData.printerIp} onChange={(e) => setFormData({...formData, printerIp: e.target.value})} className={`w-full rounded p-2.5 text-[13px] font-mono focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`} />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Puerto / Socket</label>
                    <input type="text" value={formData.printerPort} onChange={(e) => setFormData({...formData, printerPort: e.target.value})} className={`w-full rounded p-2.5 text-[13px] font-mono focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`} />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>Ancho Papel</label>
                    <select value={formData.paperWidth} onChange={(e) => setFormData({...formData, paperWidth: e.target.value as any})} className={`w-full rounded p-2.5 text-[13px] focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}>
                      <option value="80mm">80mm</option>
                      <option value="58mm">58mm</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-6 pt-4 flex-wrap">
                  <label className={`flex items-center gap-2 text-[12.5px] cursor-pointer ${isLight ? 'text-[#334155]' : 'text-gray-300'}`}>
                    <input type="checkbox" checked={formData.autoCut} onChange={() => handleToggle('autoCut')} className="w-4 h-4 accent-[#FF5A1F]" />
                    Corte automático
                  </label>
                  <label className={`flex items-center gap-2 text-[12.5px] cursor-pointer ${isLight ? 'text-[#334155]' : 'text-gray-300'}`}>
                    <input type="checkbox" checked={formData.acousticBuzzer} onChange={() => handleToggle('acousticBuzzer')} className="w-4 h-4 accent-[#FF5A1F]" />
                    Buzzer acústico
                  </label>
                  <button onClick={handleTestPrint} className={`ml-auto px-4 py-2 border rounded-lg transition text-[12px] font-medium flex items-center gap-2 cursor-pointer ${
                    isLight 
                      ? 'bg-white hover:bg-[#f8fafc] border-[#cbd5e1] text-[#334155] shadow-sm' 
                      : 'bg-[#252525] hover:bg-[#333] border-[#3A3A3A] text-gray-300'
                  }`}>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    {testPrintActive ? 'Enviando...' : 'Imprimir Ticket de Prueba'}
                  </button>
                </div>
              </div>
              
              {/* Monitor Simulador */}
              <div className={`w-full md:w-[280px] shrink-0 border p-4 rounded-xl flex flex-col ${
                isLight ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-[#0F0F0F] border-[#2A2A2A]'
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] tracking-[0.1em] font-mono ${isLight ? 'text-[#64748b]' : 'text-gray-500'}`}>MONITOR ESC/POS</span>
                  <span className="text-[10px] text-[#FF5A1F] tracking-[0.1em] font-bold font-mono">SIMULADOR</span>
                </div>
                <div className="flex-1 bg-white p-4 font-mono text-[10px] text-black leading-relaxed shadow-md border border-[#e2e8f0] rounded">
                  <p className="text-center font-bold">=== {formData.branchName.toUpperCase() || 'AUREA BISTRO'} ===</p>
                  <p className="text-center font-bold mb-2">COMANDA: #4088 (MESA 12)</p>
                  <div className="flex justify-between mb-2 pb-1 border-b border-dashed border-gray-400">
                    <span>MOZO: CARLOS R.</span>
                    <span className="font-bold">{formData.timeFormat === '12h' ? '02:28:10 PM' : '14:28:10'}</span>
                  </div>
                  <div className="flex justify-between font-bold mt-2">
                    <span>2x LOMO SALTADO NIKKEI</span>
                    <span>TERM: MED</span>
                  </div>
                  <p className="pl-4 text-gray-600">- SIN CEBOLLA ROJA</p>
                  <div className="flex justify-between font-bold mt-2 pb-2 border-b border-dashed border-gray-400">
                    <span>1x CEVICHE PULPO BRASA</span>
                    <span>PIC: MED</span>
                  </div>
                  <div className="flex justify-between font-bold mt-2 text-[10px] pb-1 border-b border-dashed border-gray-300">
                    <span>TOTAL COMANDA:</span>
                    <span className="text-[#FF5A1F] font-bold">{formData.currency.includes('USD') ? '$ 48.00' : 'S/ 124.00'}</span>
                  </div>
                  <p className="text-center text-gray-500 mt-2 text-[8px]">-- PROTOCOLO ESC/POS OK --</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Modal de Cambio de Logo */}
      {showLogoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 ${
            isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-[#e5e1e4]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-[#e2e8f0]' : 'border-[#27272a]'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF5A1F] text-[22px]">add_photo_alternate</span>
                <h3 className={`font-bold text-[16px] ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  Actualizar Logo de la Sucursal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className={`p-1 rounded-lg ${isLight ? 'text-[#64748b] hover:bg-[#f1f5f9]' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'}`}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Opcion 1: Subir desde PC */}
              <div 
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-[#FF5A1F] ${
                  isLight ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-[#121215] border-[#27272a]'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-[#FF5A1F]/15 text-[#FF5A1F] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">upload_file</span>
                </div>
                <div className="text-center">
                  <div className={`text-[13px] font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Subir imagen desde el equipo</div>
                  <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-gray-400'}`}>PNG, JPG, SVG o WebP (Max. 5MB)</div>
                </div>
              </div>

              {/* Opcion 2: URL Externa */}
              <form onSubmit={handleApplyLogoUrl} className="space-y-2">
                <label className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? 'text-[#475569]' : 'text-gray-400'}`}>
                  O ingresar enlace directo (URL de imagen)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/logo.png"
                    value={customLogoInput}
                    onChange={(e) => setCustomLogoInput(e.target.value)}
                    className={`flex-1 rounded-lg px-3 py-2 text-[12.5px] border focus:border-[#FF5A1F] focus:outline-none ${
                      isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#121215] border-[#27272a] text-white'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#FF5A1F] text-white font-bold text-[12px] rounded-lg hover:bg-[#FF703D] cursor-pointer"
                  >
                    Asignar
                  </button>
                </div>
              </form>

              {/* Opcion 3: Restaurar por defecto */}
              <button
                type="button"
                onClick={handleResetDefaultLogo}
                className={`w-full py-2.5 rounded-lg border text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] border-[#cbd5e1] text-[#475569]' : 'bg-[#27272a] hover:bg-[#323236] border-[#3f3f46] text-[#a1a1aa]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Restaurar Logo Predeterminado (/logo.png)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
