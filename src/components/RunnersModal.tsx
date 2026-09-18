import React from 'react';
import { Runner } from '../types';

interface RunnersModalProps {
  runners: Runner[];
  onClose: () => void;
  onCallAllRunners: () => void;
  onUpdateRunnerStatus: (runnerId: string, status: Runner['status'], table?: string) => void;
}

export const RunnersModal: React.FC<RunnersModalProps> = ({
  runners,
  onClose,
  onCallAllRunners,
  onUpdateRunnerStatus
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="bg-[#18181b] border border-[#3f3f46] rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden text-[#e5e1e4] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#121215]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#0494fc] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">hail</span>
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-white leading-tight font-sans">
                Despacho de Runners & Salón
              </h2>
              <p className="text-[12px] text-[#a1a1aa]">
                Control de mozos de pase, asignación a mesas y velocidad de entrega
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#3f3f46]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
            <span className="text-[12px] font-mono-code text-[#a1a1aa]">
              {runners.filter((r) => r.status === 'Libre en Pase').length} RUNNERS DISPONIBLES EN PASE
            </span>
            <button
              onClick={onCallAllRunners}
              className="px-3 py-1.5 rounded bg-[#ff5708] hover:bg-orange-600 text-white font-bold text-[12px] flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              <span>Llamar a Todos al Pase</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {runners.map((runner) => (
              <div
                key={runner.id}
                className="p-4 rounded-xl bg-[#121215] border border-[#27272a] flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={runner.avatarUrl}
                    alt={runner.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#353437]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono-code text-[#ffb59c] font-bold">
                        RUNNER #{runner.runnerNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold ${
                        runner.status === 'Libre en Pase'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : 'bg-[#ff5708]/20 text-[#ffb59c] border border-[#ff5708]/30'
                      }`}>
                        {runner.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-[15px] text-white mt-0.5">{runner.name}</h3>
                    <div className="text-[11px] text-[#71717a] font-mono-code">
                      {runner.location}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-code bg-[#1c1b1d] p-2 rounded-lg">
                  <div>
                    <span className="text-[#71717a] block text-[10px]">Entregas Hoy</span>
                    <span className="text-white font-bold">{runner.ordersHandledToday} comandas</span>
                  </div>
                  <div>
                    <span className="text-[#71717a] block text-[10px]">T. Promedio</span>
                    <span className="text-emerald-400 font-bold">{runner.avgDeliveryMinutes} min</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onUpdateRunnerStatus(runner.id, 'Libre en Pase', 'Libre en Pase')}
                    className={`flex-1 py-1.5 rounded text-[11px] font-mono-code font-semibold transition-colors ${
                      runner.status === 'Libre en Pase'
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-[#27272a] text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    Llamar al Pase
                  </button>
                  <button
                    onClick={() => onUpdateRunnerStatus(runner.id, 'En Mesa', 'En Mesa 04')}
                    className={`flex-1 py-1.5 rounded text-[11px] font-mono-code font-semibold transition-colors ${
                      runner.status === 'En Mesa'
                        ? 'bg-[#ff5708]/30 text-[#ffb59c] border border-[#ff5708]/40'
                        : 'bg-[#27272a] text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    Asignar Mesa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-[#121215] border-t border-[#27272a] text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e5e1e4] text-[13px] font-medium"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
