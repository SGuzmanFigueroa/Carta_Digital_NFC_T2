'use client';

import React, { useState, useEffect } from 'react';
import {
  GeofenceConfig,
  getStoredGeofenceConfig,
  loadGeofenceConfig,
  migrateLocalGeofenceConfigToDb,
  saveStoredGeofenceConfig,
  DEFAULT_GEOFENCE_CONFIG,
  isLocalEnvironment
} from '@/utils/geofence';

interface GeofenceSettingsProps {
  isLight: boolean;
  isHighContrast: boolean;
  sectionBg: string;
  sectionHeaderBorder: string;
  onShowToast: (msg: string, icon?: string) => void;
}

export const GeofenceSettings: React.FC<GeofenceSettingsProps> = ({
  isLight,
  sectionBg,
  sectionHeaderBorder,
  onShowToast
}) => {
  const [config, setConfig] = useState<GeofenceConfig>(DEFAULT_GEOFENCE_CONFIG);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedAccuracy, setDetectedAccuracy] = useState<number | null>(null);
  const isDev = isLocalEnvironment();

  // Caché para pintar al instante; luego la configuración real de Supabase.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- datos que solo existen en el navegador (storage/URL/red); leerlos en el render rompe la hidratación
    setConfig(getStoredGeofenceConfig());
    migrateLocalGeofenceConfigToDb().then(() => loadGeofenceConfig()).then((fresh) => {
      if (!cancelled) setConfig(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleEnabled = () => {
    const next = { ...config, enabled: !config.enabled };
    setConfig(next);
    saveStoredGeofenceConfig(next);
    onShowToast(
      next.enabled ? 'Geocerca antifraude activada' : 'Geocerca antifraude desactivada',
      next.enabled ? 'shield' : 'shield_with_heart'
    );
  };

  const handleToggleBypass = () => {
    const next = { ...config, bypassInDev: !config.bypassInDev };
    setConfig(next);
    saveStoredGeofenceConfig(next);
    onShowToast(
      next.bypassInDev ? 'Bypass en desarrollo habilitado' : 'Bypass en desarrollo deshabilitado',
      'developer_mode'
    );
  };

  const handleRadiusChange = (radius: number) => {
    const next = { ...config, radiusMeters: radius };
    setConfig(next);
    saveStoredGeofenceConfig(next);
    onShowToast(`Radio de geocerca actualizado a ${radius}m`, 'radar');
  };

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      onShowToast('Tu navegador no soporta geolocalización', 'error');
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy || 0);

        const next = { ...config, latitude: lat, longitude: lon };
        setConfig(next);
        saveStoredGeofenceConfig(next);
        setDetectedAccuracy(acc);
        setIsDetectingLocation(false);
        onShowToast(`Coordenadas del restaurante detectadas (±${acc}m)`, 'my_location');
      },
      () => {
        setIsDetectingLocation(false);
        onShowToast('No se pudo obtener la ubicación: verifica los permisos del navegador', 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveCoordinates = () => {
    saveStoredGeofenceConfig(config);
    onShowToast('Configuración de seguridad GPS guardada con éxito', 'check_circle');
  };

  const titleColor = isLight ? 'text-[#0f172a]' : 'text-white';
  const descColor = isLight ? 'text-[#64748b]' : 'text-gray-400';
  const cardBg = isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]';
  const inputBg = isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#0f0f11] border-[#3f3f46] text-white';

  return (
    <section id="seguridad-geocerca" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
      {/* Cabecera de la Sección 10 */}
      <div className={`flex justify-between items-start p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF5A1F]/10 text-[#FF5A1F] flex items-center justify-center shrink-0 border border-[#FF5A1F]/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>
                10. Seguridad Antifraude & Geocerca GPS
              </h2>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                config.enabled
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
              }`}>
                {config.enabled ? 'ACTIVO' : 'PAUSADO'}
              </span>
            </div>
            <p className={`text-[13px] ${descColor}`}>
              Valida que los comensales se encuentren físicamente en el local antes de enviar comandas a cocina KDS.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Banner de Entorno Local / Sandbox */}
        {isDev && (
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            isLight ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">🛡️</span>
              <div className="text-[12.5px]">
                <strong className="block font-semibold">Entorno de Desarrollo Detectado (localhost)</strong>
                <span>El bypass inteligente permite pruebas completas de pedidos sin bloquear por coordenadas.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleBypass}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                config.bypassInDev
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-transparent border-amber-400 text-amber-600'
              }`}
            >
              Bypass: {config.bypassInDev ? 'Habilitado' : 'Estricto'}
            </button>
          </div>
        )}

        {/* Interruptor Principal */}
        <div className={`p-4 sm:p-5 rounded-xl border flex items-center justify-between ${cardBg}`}>
          <div>
            <h3 className={`text-[14px] font-bold ${titleColor}`}>
              Verificación Obligatoria de Ubicación en Mesa
            </h3>
            <p className={`text-[12px] mt-0.5 ${descColor}`}>
              Los clientes deben conceder permiso de ubicación al enviar el pedido para prevenir bromas a distancia.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
              config.enabled ? 'bg-[#FF5A1F]' : 'bg-gray-400 dark:bg-gray-700'
            }`}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
              config.enabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Coordenadas del Restaurante */}
        <div className={`p-4 sm:p-5 rounded-xl border space-y-4 ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className={`text-[14px] font-bold ${titleColor}`}>
                Coordenadas Geográficas de la Sede
              </h3>
              <p className={`text-[12px] mt-0.5 ${descColor}`}>
                Punto central del establecimiento comercial para el cálculo de distancia ortodrómica.
              </p>
            </div>
            <button
              type="button"
              disabled={isDetectingLocation}
              onClick={handleDetectCurrentLocation}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-bold bg-[#FF5A1F] text-white hover:bg-[#e04f1a] transition-all cursor-pointer disabled:opacity-50"
            >
              {isDetectingLocation ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Detectando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Detectar Ubicación Actual
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[12px] font-semibold mb-1.5 ${titleColor}`}>Latitud</label>
              <input
                type="number"
                step="any"
                value={config.latitude}
                onChange={(e) => setConfig({ ...config, latitude: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3.5 py-2 rounded-lg text-[13px] border outline-none font-mono ${inputBg}`}
                placeholder="-12.121700"
              />
            </div>
            <div>
              <label className={`block text-[12px] font-semibold mb-1.5 ${titleColor}`}>Longitud</label>
              <input
                type="number"
                step="any"
                value={config.longitude}
                onChange={(e) => setConfig({ ...config, longitude: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3.5 py-2 rounded-lg text-[13px] border outline-none font-mono ${inputBg}`}
                placeholder="-77.029800"
              />
            </div>
          </div>

          {detectedAccuracy && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
              ✓ Precisión GPS obtenida: ±{detectedAccuracy} metros
            </p>
          )}
        </div>

        {/* Radio de Cobertura */}
        <div className={`p-4 sm:p-5 rounded-xl border space-y-3 ${cardBg}`}>
          <div>
            <h3 className={`text-[14px] font-bold ${titleColor}`}>
              Radio de Cobertura Permitido
            </h3>
            <p className={`text-[12px] mt-0.5 ${descColor}`}>
              Distancia radial máxima alrededor del restaurante donde se admiten pedidos vía QR.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {[
              { meters: 50, label: '50 m', sub: 'Solo Salón' },
              { meters: 150, label: '150 m', sub: 'Salón + Terraza' },
              { meters: 300, label: '300 m', sub: 'Local Amplio / Mall' },
              { meters: 600, label: '600 m', sub: 'Perímetro Abierto' },
            ].map((option) => {
              const isSelected = config.radiusMeters === option.meters;
              return (
                <button
                  key={option.meters}
                  type="button"
                  onClick={() => handleRadiusChange(option.meters)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#FF5A1F] bg-[#FF5A1F]/10 ring-1 ring-[#FF5A1F]'
                      : isLight
                      ? 'bg-white border-[#e2e8f0] hover:border-slate-300'
                      : 'bg-[#121214] border-[#27272a] hover:border-[#3f3f46]'
                  }`}
                >
                  <div className={`text-[14px] font-bold ${isSelected ? 'text-[#FF5A1F]' : titleColor}`}>
                    {option.label}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${descColor}`}>
                    {option.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botón de Guardar Cambios de Geocerca */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveCoordinates}
            className="px-5 py-2.5 rounded-lg text-[13px] font-bold bg-[#FF5A1F] text-white hover:bg-[#e04f1a] shadow-sm transition-all cursor-pointer"
          >
            Guardar Configuración de Geocerca
          </button>
        </div>
      </div>
    </section>
  );
};
