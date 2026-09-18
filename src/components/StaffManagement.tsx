import React, { useState } from 'react';
import { StaffMember } from '../types';

interface StaffManagementProps {
  staffList: StaffMember[];
  onAddStaff: (newStaff: StaffMember) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  staffList,
  onAddStaff,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'admin' | 'kitchen' | 'floor' | 'bar'>('all');
  const [revealedPins, setRevealedPins] = useState<{ [id: string]: boolean }>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New staff form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('pass123');
  const [newRole, setNewRole] = useState<StaffMember['role']>('floor');
  const [newAssignment, setNewAssignment] = useState('Salón');
  const [newPin, setNewPin] = useState('');

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredStaff = staffList.filter((st) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'admin') return st.role === 'admin';
    if (activeTab === 'kitchen') return st.role === 'kitchen';
    if (activeTab === 'floor') return st.role === 'floor';
    if (activeTab === 'bar') return st.role === 'bar' || st.role === 'runner';
    return true;
  });

  const handleCreateCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const roleTitles: Record<StaffMember['role'], string> = {
      admin: 'ADMIN GENERAL',
      floor: 'CAMARERO / SALA',
      kitchen: 'COCINA KDS',
      bar: 'BARTENDER / BARRA',
      runner: 'RUNNER / ENTREGA'
    };

    const usernameGenerated = newUsername.trim() || newName.toLowerCase().replace(/\s+/g, '.');
    const emailGenerated = newEmail.trim() || `${usernameGenerated}@aureabistro.pe`;

    const newMember: StaffMember = {
      id: `st-${Date.now()}`,
      name: newName,
      initials: newName.charAt(0).toUpperCase(),
      role: newRole,
      roleTitle: roleTitles[newRole],
      status: 'En Turno Activo',
      assignment: newAssignment || 'Salón Principal',
      permissions: 'Acceso Estándar TPV & Comandas',
      lastAccess: 'Justo ahora',
      pin: newPin || '1234',
      username: usernameGenerated,
      email: emailGenerated,
      password: newPassword || 'pass123'
    };

    onAddStaff(newMember);
    setIsCreateModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewUsername('');
    setNewPin('');
    setNewPassword('pass123');
    onShowToast(`Colaborador ${newName} registrado con acceso ${emailGenerated}`, 'badge');
  };

  return (
    <div className="w-full flex flex-col px-4 lg:px-6 py-4 max-w-[1680px] mx-auto gap-6">
      {/* Header & Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-code text-[11px] text-[#ff5708] uppercase tracking-wider font-bold">
              SISTEMA
            </span>
            <span className="text-[#353437] text-xs">/</span>
            <span className="font-label-code text-[11px] text-[#c6c5cf]">CONFIGURACIÓN DE ACCESOS</span>
          </div>
          <h1 className="text-[26px] md:text-[32px] font-bold text-[#e5e1e4] tracking-tight">
            Gestión de Personal y Roles
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#1c1b1d] px-3 py-1.5 rounded-lg border border-[#353437]/40 text-[12px] font-label-code">
            <span className="text-[#c6c5cf]">Personal Total:</span>
            <strong className="text-[#e5e1e4]">{staffList.length}</strong>
            <span className="text-[#353437]">•</span>
            <span className="text-[#ff5708] font-bold">En Turno: 5</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff5708] text-[#511500] font-bold text-[13px] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_16px_rgba(255,87,8,0.3)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>+ Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 p-1 bg-[#1c1b1d] rounded-xl border border-[#353437]/30">
        {[
          { id: 'all', label: `Todos (${staffList.length})` },
          { id: 'admin', label: 'Administración (1)' },
          { id: 'kitchen', label: 'Cocina KDS (1)' },
          { id: 'floor', label: 'Sala y TPV (2)' },
          { id: 'bar', label: 'Barra & Runner (2)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#2a2a2c] text-[#ff5708] font-semibold border border-[#ff5708]/30'
                : 'text-[#c6c5cf] hover:text-[#e5e1e4]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staff) => {
          const isRevealed = revealedPins[staff.id];
          return (
            <div
              key={staff.id}
              className="p-4 rounded-xl bg-[#1c1b1d] border border-[#353437]/30 hover:border-[#ff5708]/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#2a2a2c] text-[#ff5708] font-bold text-[18px] flex items-center justify-center border border-[#ff5708]/20">
                    {staff.initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[16px] font-bold text-[#e5e1e4] leading-snug">{staff.name}</span>
                    <span className="font-label-code text-[11px] text-[#ffb59c] font-semibold">
                      {staff.roleTitle}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded font-label-code text-[10px] bg-[#0e0e10] text-[#a1c9ff] border border-[#a1c9ff]/20">
                  {staff.status}
                </span>
              </div>

              {/* Assignment & Details */}
              <div className="space-y-2 p-2.5 rounded-lg bg-[#0e0e10]/80 border border-[#353437]/30 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#c6c5cf]">Asignación:</span>
                  <span className="text-[#e5e1e4] font-medium">{staff.assignment}</span>
                </div>
                {staff.email && (
                  <div className="flex justify-between font-label-code text-[11px]">
                    <span className="text-[#c6c5cf]">Acceso Login:</span>
                    <span className="text-[#e5e1e4] truncate max-w-[180px]">{staff.email}</span>
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[#c6c5cf] text-[11px]">Permisos:</span>
                  <span className="text-[#c6c5cf] text-[11px] leading-snug">{staff.permissions}</span>
                </div>
                {staff.ordersToday !== undefined && (
                  <div className="flex justify-between font-label-code text-[11px] pt-1 border-t border-[#353437]/30">
                    <span className="text-[#c6c5cf]">Órdenes Hoy:</span>
                    <span className="text-[#ff5708] font-bold">{staff.ordersToday} comandas</span>
                  </div>
                )}
              </div>

              {/* PIN and Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#c6c5cf] font-label-code">PIN TPV:</span>
                  <span className="font-label-code text-[13px] font-bold text-[#e5e1e4] tracking-widest">
                    {isRevealed ? staff.pin : '••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePinReveal(staff.id)}
                    className="p-1 rounded text-[#c6c5cf] hover:text-[#ff5708] transition-colors cursor-pointer"
                    title={isRevealed ? 'Ocultar PIN' : 'Ver PIN'}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {isRevealed ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onShowToast(`Editando permisos de ${staff.name}`, 'security')}
                    className="px-2.5 py-1 rounded bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Permisos
                  </button>
                  <button
                    type="button"
                    onClick={() => onShowToast(`Opciones de usuario para ${staff.name}`, 'settings')}
                    className="p-1 rounded bg-[#2a2a2c] hover:bg-[#353437] text-[#c6c5cf] hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">more_vert</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Collaborator Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1b1d] max-w-md w-full rounded-2xl border border-[#ff5708]/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#353437]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[22px]">person_add</span>
                <h3 className="text-[17px] font-bold text-[#e5e1e4]">Registrar Nuevo Colaborador</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#c6c5cf] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCollaborator} className="space-y-3.5">
              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Daniel Flores"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Rol Operativo</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px]"
                >
                  <option value="floor">Camarero / Sala (TPV Móvil)</option>
                  <option value="kitchen">Cocinero / Sous Chef (KDS)</option>
                  <option value="bar">Bartender (Barra KDS)</option>
                  <option value="runner">Runner / Despacho</option>
                  <option value="admin">Administrador General</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Zona o Estación Asignada</label>
                <input
                  type="text"
                  placeholder="ej. Salón Principal o Wok 02"
                  value={newAssignment}
                  onChange={(e) => setNewAssignment(e.target.value)}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#c6c5cf] mb-1">Correo Electrónico (Login)</label>
                <input
                  type="email"
                  placeholder="ej. daniel@aureabistro.pe"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-[#c6c5cf] mb-1">PIN TPV (4 Dígitos)</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="ej. 5521"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px] font-label-code tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#c6c5cf] mb-1">Contraseña Login</label>
                  <input
                    type="text"
                    placeholder="ej. clave123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3 py-2 rounded-lg border border-[#353437] focus:outline-none focus:border-[#ff5708] text-[13px]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#2a2a2c] text-[#e5e1e4] text-[13px] hover:bg-[#353437]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#ff5708] text-[#511500] font-bold text-[13px] hover:brightness-110 shadow-md cursor-pointer"
                >
                  Crear Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
