import React, { useState } from 'react';
import { kitchenAudio } from '../utils/audio';

interface ConfiguracionProps {
  onResetData: () => void;
  onSimulateNewOrder: () => void;
}

export const Configuracion: React.FC<ConfiguracionProps> = ({
  onResetData,
  onSimulateNewOrder
}) => {
  const [targetMins, setTargetMins] = useState(14);
  const [criticalDelayMins, setCriticalDelayMins] = useState(18);
  const [audioVolume, setAudioVolume] = useState(80);
  const [screenOrientation, setScreenOrientation] = useState('Horizontal (Mural 55")');
  const [autoScroll, setAutoScroll] = useState(true);
  const [allergenChime, setAllergenChime] = useState(true);

  const testAudio = (type: 'check' | 'dispatch' | 'runner' | 'allergy') => {
    if (type === 'check') kitchenAudio.playCheckItemSound();
    if (type === 'dispatch') kitchenAudio.playDispatchSound();
    if (type === 'runner') kitchenAudio.playRunnerAlertSound();
    if (type === 'allergy') kitchenAudio.playAllergyWarning();
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6 text-[#e5e1e4]">
      {/* Header */}
      <div className="bg-[#18181b] p-6 rounded-2xl border border-[#27272a] shadow-xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5708]"></span>
          <span className="text-[12px] font-mono-code uppercase tracking-wider text-[#ffb59c] font-bold">
            Parámetros del Sistema Operativo KDS
          </span>
        </div>
        <h1 className="text-[28px] font-bold text-white mt-1 font-sans">
          Configuración de Pantalla & Estaciones
        </h1>
        <p className="text-[14px] text-[#a1a1aa] mt-0.5">
          Ajustes de alertas audibles, metas de tiempo de pase y calibración de pantallas táctiles
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Audio Alerts */}
        <div className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-5">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#ff5708] text-[22px]">volume_up</span>
            <h2 className="text-[16px] font-bold text-white font-sans">
              Alertas Sonoras & Sintetizador de Pase
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[12px] font-mono-code mb-1">
                <span className="text-[#a1a1aa]">Volumen de Altavoces de Cocina</span>
                <span className="text-[#ffb59c] font-bold">{audioVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseInt(e.target.value))}
                className="w-full accent-[#ff5708] bg-[#27272a] h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#121215] border border-[#27272a]">
              <div>
                <div className="text-[13px] font-semibold text-white">Chime de Alerta Crítica Alérgenos</div>
                <div className="text-[11px] text-[#71717a]">Sonido diferenciado en comandas con frutos secos/mariscos</div>
              </div>
              <input
                type="checkbox"
                checked={allergenChime}
                onChange={(e) => setAllergenChime(e.target.checked)}
                className="w-5 h-5 accent-[#ff5708] cursor-pointer"
              />
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-mono-code uppercase text-[#71717a] block mb-2 font-bold">
                Probar Sintetizador Web Audio
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => testAudio('check')}
                  className="px-3 py-2 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[12px] font-mono-code text-white transition-colors"
                >
                  Tono Plato Listo
                </button>
                <button
                  type="button"
                  onClick={() => testAudio('dispatch')}
                  className="px-3 py-2 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[12px] font-mono-code text-emerald-400 transition-colors"
                >
                  Tono Comanda Despachada
                </button>
                <button
                  type="button"
                  onClick={() => testAudio('runner')}
                  className="px-3 py-2 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[12px] font-mono-code text-[#a1c9ff] transition-colors"
                >
                  Tono Aviso Runner
                </button>
                <button
                  type="button"
                  onClick={() => testAudio('allergy')}
                  className="px-3 py-2 rounded-lg bg-[#93000a]/40 hover:bg-[#93000a]/70 text-[12px] font-mono-code text-[#ffb4ab] transition-colors border border-[#ffb4ab]/20"
                >
                  Tono Alérgenos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Time Thresholds & Display */}
        <div className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-5">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#a1c9ff] text-[22px]">timer</span>
            <h2 className="text-[16px] font-bold text-white font-sans">
              Umbrales de Tiempo & Pantalla
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono-code uppercase text-[#a1a1aa] mb-1 font-bold">
                Tiempo Objetivo de Pase (Minutos)
              </label>
              <input
                type="number"
                value={targetMins}
                onChange={(e) => setTargetMins(parseInt(e.target.value) || 1)}
                className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-[13px] text-white focus:border-[#ff5708] focus:outline-none"
              />
              <span className="text-[11px] text-[#71717a]">Tiempo estándar promedio antes de alertar retraso</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono-code uppercase text-[#ffb4ab] mb-1 font-bold">
                Umbral de Demora Crítica (Halo Rojo Pulsante)
              </label>
              <input
                type="number"
                value={criticalDelayMins}
                onChange={(e) => setCriticalDelayMins(parseInt(e.target.value) || 1)}
                className="w-full bg-[#121215] border border-[#ffb4ab]/40 rounded-lg px-3 py-2 text-[13px] text-[#ffb4ab] focus:border-[#ff5708] focus:outline-none"
              />
              <span className="text-[11px] text-[#71717a]">A partir de este minuto el ticket entra en emergencia</span>
            </div>

            <div>
              <label className="block text-[11px] font-mono-code uppercase text-[#a1a1aa] mb-1 font-bold">
                Orientación y Perfil de Pantalla
              </label>
              <select
                value={screenOrientation}
                onChange={(e) => setScreenOrientation(e.target.value)}
                className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-[13px] text-white focus:border-[#ff5708] focus:outline-none"
              >
                <option value='Horizontal (Mural 55")'>Horizontal (Mural 55")</option>
                <option value='Pantalla Táctil Pase (24")'>Pantalla Táctil Pase (24")</option>
                <option value="Tablet Chef Expediter (12.9&quot;)">Tablet Chef Expediter (12.9")</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator & Data Reset Actions */}
      <div className="p-6 rounded-2xl bg-[#18181b] border border-[#27272a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-[16px] text-white font-sans">
            Simulador de Comandas & Mantenimiento
          </h3>
          <p className="text-[13px] text-[#a1a1aa]">
            Genera tickets automáticos de prueba o restablece los datos originales de la demostración
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSimulateNewOrder}
            className="px-4 py-2.5 rounded-lg bg-[#0494fc] hover:bg-blue-600 text-white font-mono-code text-[12px] font-bold uppercase flex items-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>Simular Ticket Entrante</span>
          </button>

          <button
            onClick={onResetData}
            className="px-4 py-2.5 rounded-lg bg-[#27272a] hover:bg-[#93000a]/50 text-[#ffb4ab] font-mono-code text-[12px] font-bold uppercase flex items-center gap-2 transition-all border border-[#3f3f46]"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            <span>Restablecer Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
