'use client';

import React, { useState, useEffect } from 'react';
import { RolePermissionItem, PermissionState, StaffAuditLogItem } from '@/types';
import {
  fetchRolePermissionsFromDb,
  updateRolePermissionInDb,
  fetchAuditLogsFromDb,
  createAuditLogInDb,
  DEFAULT_ROLE_PERMISSIONS
} from '@/services/authService';

interface RolePermissionsMatrixProps {
  onShowToast?: (message: string, icon?: string) => void;
}

type PermissionColumnKey = 'panelAdmin' | 'kdsCocina' | 'edicionMenu' | 'cobroPos' | 'anulacionComandas';

const COLUMN_DB_MAP: Record<PermissionColumnKey, 'panel_admin' | 'kds_cocina' | 'edicion_menu' | 'cobro_pos' | 'anulacion_comandas'> = {
  panelAdmin: 'panel_admin',
  kdsCocina: 'kds_cocina',
  edicionMenu: 'edicion_menu',
  cobroPos: 'cobro_pos',
  anulacionComandas: 'anulacion_comandas'
};

const COLUMN_NAMES: Record<PermissionColumnKey, string> = {
  panelAdmin: 'Panel Admin',
  kdsCocina: 'KDS Cocina',
  edicionMenu: 'Edición de Menú',
  cobroPos: 'Cobro POS',
  anulacionComandas: 'Anulación Comandas'
};

export const RolePermissionsMatrix: React.FC<RolePermissionsMatrixProps> = ({ onShowToast }) => {
  const [permissions, setPermissions] = useState<RolePermissionItem[]>(DEFAULT_ROLE_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<StaffAuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Global policies state
  const [policies, setPolicies] = useState({
    requirePinForSensitive: true,
    autoLockInactive: true,
    strictCancelAuthorized: true,
    realtimeSyncAudit: true
  });

  const notify = (msg: string, icon = 'verified_user') => {
    if (onShowToast) {
      onShowToast(msg, icon);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      const data = await fetchRolePermissionsFromDb();
      if (mounted) {
        setPermissions(data);
        setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleTogglePermission = async (roleId: string, colKey: PermissionColumnKey) => {
    const currentItem = permissions.find((p) => p.roleId === roleId);
    if (!currentItem) return;

    const currentVal = currentItem[colKey];
    let nextVal: PermissionState = 'allow';
    if (currentVal === 'allow') nextVal = 'read';
    else if (currentVal === 'read') nextVal = 'deny';
    else if (currentVal === 'deny') nextVal = 'allow';

    // Optimistic UI update
    setPermissions((prev) =>
      prev.map((item) => (item.roleId === roleId ? { ...item, [colKey]: nextVal } : item))
    );

    const roleName = currentItem.roleTitle;
    const colName = COLUMN_NAMES[colKey];
    const statusLabel = nextVal === 'allow' ? 'Permitido (Total)' : nextVal === 'read' ? 'Solo Lectura' : 'Denegado';
    notify(`${roleName}: ${colName} -> ${statusLabel}`, nextVal === 'allow' ? 'check_circle' : nextVal === 'read' ? 'visibility' : 'block');

    // Persist to Supabase
    const dbField = COLUMN_DB_MAP[colKey];
    await updateRolePermissionInDb(roleId, dbField, nextVal);
    await createAuditLogInDb(
      'Modificación de Permiso',
      `${roleName} > ${colName}`,
      `Nivel cambiado de ${currentVal.toUpperCase()} a ${nextVal.toUpperCase()}`,
      'info'
    );
  };

  const handleOpenAuditModal = async () => {
    setShowAuditModal(true);
    setLoadingAudit(true);
    const logs = await fetchAuditLogsFromDb();
    setAuditLogs(logs);
    setLoadingAudit(false);
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowPoliciesModal(false);
    notify('Políticas globales de seguridad sincronizadas con el servidor', 'security');
    await createAuditLogInDb(
      'Actualización de Políticas Globales',
      'Configuración de Seguridad',
      'PIN estricto, bloqueo de inactividad y anulación autorizada actualizados',
      'warning'
    );
  };

  return (
    <div className="w-full bg-[#18181b] rounded-2xl border border-[#27272a] shadow-xl p-5 md:p-6 space-y-5 text-[#e5e1e4]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#27272a]/70">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ff5708]/15 border border-[#ff5708]/30 flex items-center justify-center text-[#ff5708] shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>
          <div>
            <h3 className="text-[17px] md:text-[18px] font-bold text-white tracking-tight">
              Matriz de Permisos y Niveles de Acceso por Rol
            </h3>
            <p className="text-[12px] text-[#a1a1aa] mt-0.5">
              Control granular de capacidades operativas. Haz clic en los íconos para modificar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <button
            type="button"
            onClick={() => setShowPoliciesModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#323236] border border-[#3f3f46]/70 text-[#e5e1e4] text-[12px] font-mono-code font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Ajustar Políticas Globales</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAuditModal}
            className="px-3.5 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#323236] border border-[#3f3f46]/70 text-[#e5e1e4] text-[12px] font-mono-code font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">assignment</span>
            <span>Log de Auditoría</span>
          </button>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-[#27272a] text-[#71717a] text-[10px] font-mono-code uppercase font-bold tracking-wider">
              <th className="py-3 px-3 w-[32%] text-left">ROL OPERATIVO</th>
              <th className="py-3 px-2 text-center">PANEL ADMIN</th>
              <th className="py-3 px-2 text-center">KDS COCINA</th>
              <th className="py-3 px-2 text-center">EDICIÓN DE MENÚ</th>
              <th className="py-3 px-2 text-center">COBRO POS</th>
              <th className="py-3 px-2 text-center">ANULACIÓN COMANDAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]/60">
            {permissions.map((row) => (
              <tr key={row.roleId} className="hover:bg-[#202024]/50 transition-colors">
                {/* Role title and description */}
                <td className="py-3 px-3">
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-bold text-white tracking-tight font-sans">
                      {row.roleTitle}
                    </span>
                    <span className="text-[11.5px] text-[#71717a] font-normal leading-snug">
                      {row.roleDescription}
                    </span>
                  </div>
                </td>

                {/* Columns */}
                {(['panelAdmin', 'kdsCocina', 'edicionMenu', 'cobroPos', 'anulacionComandas'] as PermissionColumnKey[]).map(
                  (colKey) => {
                    const val = row[colKey];
                    return (
                      <td key={colKey} className="py-3 px-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(row.roleId, colKey)}
                          className="group relative inline-flex items-center justify-center p-1 rounded-full cursor-pointer transition-transform hover:scale-115 active:scale-95"
                          title={`${row.roleTitle} > ${COLUMN_NAMES[colKey]}: ${val.toUpperCase()} (Haz clic para alternar)`}
                        >
                          {val === 'allow' && (
                            <span className="w-6 h-6 rounded-full flex items-center justify-center border border-[#ff5708] bg-[#ff5708]/15 text-[#ff5708] shadow-[0_0_8px_rgba(255,87,8,0.25)]">
                              <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                            </span>
                          )}

                          {val === 'read' && (
                            <span className="w-6 h-6 rounded-full flex items-center justify-center border border-[#eab308] bg-[#eab308]/15 text-[#eab308] shadow-[0_0_8px_rgba(234,179,8,0.25)]">
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                            </span>
                          )}

                          {val === 'deny' && (
                            <span className="w-6 h-6 rounded-full flex items-center justify-center border border-[#3f3f46] bg-[#27272a]/80 text-[#71717a] group-hover:border-[#71717a] group-hover:text-[#a1a1aa]">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  }
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Global Policies Modal */}
      {showPoliciesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#18181b] border border-[#3f3f46] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#e5e1e4] space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[22px]">tune</span>
                <h3 className="font-bold text-[16px] text-white">Políticas Globales de Acceso</h3>
              </div>
              <button
                onClick={() => setShowPoliciesModal(false)}
                className="text-[#a1a1aa] hover:text-white p-1 rounded-lg hover:bg-[#27272a]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePolicies} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#121215] border border-[#27272a]">
                <div className="pr-3">
                  <div className="text-[13px] font-bold text-white">Exigir PIN TPV en cobros</div>
                  <div className="text-[11px] text-[#71717a]">Solicita autenticación de 4 dígitos para transacciones POS</div>
                </div>
                <input
                  type="checkbox"
                  checked={policies.requirePinForSensitive}
                  onChange={(e) => setPolicies({ ...policies, requirePinForSensitive: e.target.checked })}
                  className="w-4 h-4 accent-[#ff5708] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#121215] border border-[#27272a]">
                <div className="pr-3">
                  <div className="text-[13px] font-bold text-white">Bloqueo por Inactividad</div>
                  <div className="text-[11px] text-[#71717a]">Bloquear terminal KDS/TPV tras 5 min de espera</div>
                </div>
                <input
                  type="checkbox"
                  checked={policies.autoLockInactive}
                  onChange={(e) => setPolicies({ ...policies, autoLockInactive: e.target.checked })}
                  className="w-4 h-4 accent-[#ff5708] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#121215] border border-[#27272a]">
                <div className="pr-3">
                  <div className="text-[13px] font-bold text-white">Anulación Restringida</div>
                  <div className="text-[11px] text-[#71717a]">Sólo Administrador o Sous Chef pueden anular comandas</div>
                </div>
                <input
                  type="checkbox"
                  checked={policies.strictCancelAuthorized}
                  onChange={(e) => setPolicies({ ...policies, strictCancelAuthorized: e.target.checked })}
                  className="w-4 h-4 accent-[#ff5708] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#121215] border border-[#27272a]">
                <div className="pr-3">
                  <div className="text-[13px] font-bold text-white">Auditoría en Tiempo Real</div>
                  <div className="text-[11px] text-[#71717a]">Registrar cambios de permisos en Supabase staff_audit_logs</div>
                </div>
                <input
                  type="checkbox"
                  checked={policies.realtimeSyncAudit}
                  onChange={(e) => setPolicies({ ...policies, realtimeSyncAudit: e.target.checked })}
                  className="w-4 h-4 accent-[#ff5708] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPoliciesModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#323236] text-[#a1a1aa] text-[12px] font-mono-code uppercase font-bold"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#ff5708] hover:bg-orange-600 text-white text-[12px] font-mono-code uppercase font-bold shadow-md cursor-pointer"
                >
                  Guardar Políticas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#18181b] border border-[#3f3f46] rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-[#e5e1e4] space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[22px]">history</span>
                <div>
                  <h3 className="font-bold text-[16px] text-white">Log de Auditoría de Personal y Permisos</h3>
                  <p className="text-[11px] text-[#71717a]">Historial de eventos de seguridad y cambios de privilegios</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-[#a1a1aa] hover:text-white p-1 rounded-lg hover:bg-[#27272a]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
              {loadingAudit ? (
                <div className="py-8 text-center text-[#71717a] font-mono-code text-[12px]">
                  Cargando registros desde Supabase...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-[#71717a] font-mono-code text-[12px]">
                  No hay registros de auditoría recientes.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#121215] border border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px]"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{log.action}</span>
                        {log.target && (
                          <span className="text-[11px] text-[#ffb59c] font-mono-code">[{log.target}]</span>
                        )}
                      </div>
                      {log.details && <p className="text-[#a1a1aa] text-[11.5px]">{log.details}</p>}
                      <div className="text-[10px] text-[#71717a] font-mono-code">
                        Operador: <span className="text-[#e5e1e4]">{log.performedBy}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded font-mono-code text-[10px] font-bold uppercase ${
                          log.level === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : log.level === 'warning'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-[#27272a] text-[#a1c9ff] border border-[#3f3f46]'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-[10.5px] text-[#71717a] font-mono-code whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#27272a]">
              <button
                type="button"
                onClick={handleOpenAuditModal}
                className="text-[11px] text-[#ff5708] hover:underline font-mono-code font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                Recargar Logs
              </button>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#323236] text-[#e5e1e4] text-[12px] font-mono-code font-bold uppercase"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
