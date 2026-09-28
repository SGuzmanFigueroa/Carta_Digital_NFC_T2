'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RolePermissionsMatrix } from './RolePermissionsMatrix';
import { StaffMember } from '../types';

interface StaffManagementProps {
  staffList: StaffMember[];
  onAddStaff: (newStaff: StaffMember) => void;
  onUpdateStaff?: (updatedStaff: StaffMember) => void;
  onDeleteStaff?: (staffId: string) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  staffList,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'admin' | 'kitchen' | 'floor' | 'bar'>('all');
  const [revealedPins, setRevealedPins] = useState<{ [id: string]: boolean }>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openMenuStaffId, setOpenMenuStaffId] = useState<string | null>(null);

  // Modals for Actions
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [changingPinStaff, setChangingPinStaff] = useState<StaffMember | null>(null);
  const [viewingPermissionsStaff, setViewingPermissionsStaff] = useState<StaffMember | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, 'allow' | 'read' | 'deny'>>({});

  // --- Scroll horizontal "profesional" de las pestañas de filtro (Todos / Administración / etc.) ---
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [showTabsLeftFade, setShowTabsLeftFade] = useState(false);
  const [showTabsRightFade, setShowTabsRightFade] = useState(false);

  const updateTabsFade = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setShowTabsLeftFade(el.scrollLeft > 4);
    setShowTabsRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateTabsFade();
    const el = tabsScrollRef.current;
    if (!el) return;
    const onResize = () => updateTabsFade();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateTabsFade, staffList.length]);

  const scrollTabsBy = (amount: number) => {
    tabsScrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const getDefaultPermissionsForRole = (role: string): Record<string, 'allow' | 'read' | 'deny'> => {
    if (role === 'admin') {
      return { panelAdmin: 'allow', kdsCocina: 'allow', edicionMenu: 'allow', cobroPos: 'allow', anulacionComandas: 'allow' };
    }
    if (role === 'kitchen') {
      return { panelAdmin: 'deny', kdsCocina: 'allow', edicionMenu: 'read', cobroPos: 'deny', anulacionComandas: 'deny' };
    }
    if (role === 'floor') {
      return { panelAdmin: 'deny', kdsCocina: 'deny', edicionMenu: 'deny', cobroPos: 'allow', anulacionComandas: 'deny' };
    }
    if (role === 'bar') {
      return { panelAdmin: 'deny', kdsCocina: 'allow', edicionMenu: 'deny', cobroPos: 'allow', anulacionComandas: 'deny' };
    }
    return { panelAdmin: 'deny', kdsCocina: 'read', edicionMenu: 'deny', cobroPos: 'deny', anulacionComandas: 'deny' };
  };

  const handleOpenPermissionsModal = (staff: StaffMember) => {
    const initial = staff.customPermissions 
      ? { ...getDefaultPermissionsForRole(staff.role), ...staff.customPermissions }
      : getDefaultPermissionsForRole(staff.role);
    setEditingPermissions(initial as any);
    setViewingPermissionsStaff(staff);
  };
  const [newPinValue, setNewPinValue] = useState('');
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  // New staff form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('pass123');
  const [newRole, setNewRole] = useState<StaffMember['role']>('floor');
  const [newAssignment, setNewAssignment] = useState('Salón Principal');
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

  const roleTitles: Record<StaffMember['role'], string> = {
    admin: 'ADMIN GENERAL',
    floor: 'CAMARERO / SALA',
    kitchen: 'JEFE DE COCINA / SOUS CHEF',
    bar: 'BARTENDER PRINCIPAL',
    runner: 'RUNNER / ENTREGA'
  };

  const handleCreateCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const usernameGenerated = newUsername.trim() || newName.toLowerCase().replace(/\s+/g, '.');
    const emailGenerated = newEmail.trim() || `${usernameGenerated}@aureabistro.pe`;

    const newMember: StaffMember = {
      id: `st-${Date.now()}`,
      name: newName.trim(),
      initials: newName.trim().charAt(0).toUpperCase(),
      role: newRole,
      roleTitle: roleTitles[newRole] || 'COLABORADOR',
      status: 'En Turno Activo',
      assignment: newAssignment || 'Salón Principal',
      permissions: 'Acceso Estándar TPV & Comandas',
      lastAccess: 'Justo ahora',
      pin: newPin.trim() || '1234',
      username: usernameGenerated,
      email: emailGenerated,
      password: newPassword.trim() || newPin.trim() || '1234'
    };

    onAddStaff(newMember);
    setIsCreateModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewUsername('');
    setNewPin('');
    setNewPassword('pass123');
  };

  const handleSaveEditStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !onUpdateStaff) return;
    onUpdateStaff(editingStaff);
    setEditingStaff(null);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPinStaff || !onUpdateStaff) return;
    if (newPinValue.length < 4) {
      onShowToast('El PIN debe tener al menos 4 dígitos numéricos', 'warning');
      return;
    }
    const updated: StaffMember = { 
      ...changingPinStaff, 
      pin: newPinValue,
      ...(newPasswordValue.trim() ? { password: newPasswordValue.trim() } : {})
    };
    onUpdateStaff(updated);
    setChangingPinStaff(null);
    setNewPinValue('');
    setNewPasswordValue('');
  };

  const handleConfirmDelete = () => {
    if (!deletingStaff || !onDeleteStaff) return;
    onDeleteStaff(deletingStaff.id);
    setDeletingStaff(null);
  };

  return (
    <div className="w-full flex flex-col px-4 lg:px-6 py-4 max-w-[1680px] mx-auto gap-6" onClick={() => setOpenMenuStaffId(null)}>
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
            <span className="text-[#ff5708] font-bold">En Turno: {staffList.filter(s => s.status.includes('Turno') || s.status.includes('Activo') || s.status.includes('Conectado')).length}</span>
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

      {/* Tabs / Filter Pills - versión con scroll horizontal profesional (flechas + fade) */}
      <div className="relative border-b border-[#2d2e38]">
        {showTabsLeftFade && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 bottom-1 w-10 z-10 bg-gradient-to-r from-[#0e0e10] to-transparent" />
            <button
              type="button"
              onClick={() => scrollTabsBy(-160)}
              aria-label="Desplazar pestañas a la izquierda"
              className="absolute left-0 top-1/2 -translate-y-1/2 -mt-0.5 z-20 w-6 h-6 rounded-full bg-[#1c1b1d] border border-[#353437] text-[#c6c5cf] hover:text-white hover:border-[#ff5708] flex items-center justify-center cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[15px]">chevron_left</span>
            </button>
          </>
        )}

        <div
          ref={tabsScrollRef}
          onScroll={updateTabsFade}
          className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1"
        >
          {[
            { id: 'all', label: `Todos (${staffList.length})` },
            { id: 'admin', label: `Administración (${staffList.filter((s) => s.role === 'admin').length})` },
            { id: 'kitchen', label: `Cocina KDS (${staffList.filter((s) => s.role === 'kitchen').length})` },
            { id: 'floor', label: `Sala y TPV (${staffList.filter((s) => s.role === 'floor').length})` },
            { id: 'bar', label: `Barra & Runner (${staffList.filter((s) => s.role === 'bar' || s.role === 'runner').length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors shrink-0 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#ff5708] text-[#2b0b00] font-bold shadow-sm'
                  : 'text-[#c6c5cf] hover:text-white hover:bg-[#20212a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showTabsRightFade && (
          <>
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-10 z-10 bg-gradient-to-l from-[#0e0e10] to-transparent" />
            <button
              type="button"
              onClick={() => scrollTabsBy(160)}
              aria-label="Desplazar pestañas a la derecha"
              className="absolute right-0 top-1/2 -translate-y-1/2 -mt-0.5 z-20 w-6 h-6 rounded-full bg-[#1c1b1d] border border-[#353437] text-[#c6c5cf] hover:text-white hover:border-[#ff5708] flex items-center justify-center cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </>
        )}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staff) => {
          const isRevealed = revealedPins[staff.id];
          const isMenuOpen = openMenuStaffId === staff.id;

          return (
            <div
              key={staff.id}
              className="p-4 rounded-xl bg-[#1c1b1d] border border-[#353437]/30 hover:border-[#ff5708]/40 transition-all flex flex-col justify-between gap-4 shadow-sm relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#2a2a2c] text-[#ff5708] font-bold text-[18px] flex items-center justify-center border border-[#ff5708]/20 shrink-0">
                    {staff.initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[16px] font-bold text-[#e5e1e4] leading-snug">{staff.name}</span>
                    <span className="font-label-code text-[11px] text-[#ffb59c] font-semibold">
                      {staff.roleTitle}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded font-label-code text-[10px] bg-[#0e0e10] text-[#a1c9ff] border border-[#a1c9ff]/20 shrink-0">
                  {staff.status}
                </span>
              </div>

              {/* Assignment & Details */}
              <div className="space-y-2 p-2.5 rounded-lg bg-[#0e0e10]/80 border border-[#353437]/30 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#c6c5cf]">Asignación:</span>
                  <span className="text-[#e5e1e4] font-medium">{staff.assignment}</span>
                </div>
                <div className="flex justify-between font-label-code text-[11px]">
                  <span className="text-[#c6c5cf]">Usuario Login:</span>
                  <span className="text-[#e5e1e4] font-bold font-mono">{staff.username || staff.name.toLowerCase().replace(/\s+/g, '.')}</span>
                </div>
                {staff.email && (
                  <div className="flex justify-between font-label-code text-[11px]">
                    <span className="text-[#c6c5cf]">Correo:</span>
                    <span className="text-[#e5e1e4] truncate max-w-[180px] font-mono">{staff.email}</span>
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
              <div className="flex items-center justify-between pt-1 relative">
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
                  {/* Botón Permisos: abre modal detallado de permisos */}
                  <button
                    type="button"
                    onClick={() => handleOpenPermissionsModal(staff)}
                    className="px-2.5 py-1 rounded bg-[#2a2a2c] hover:bg-[#353437] text-[#e5e1e4] text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                    title="Ver permisos de este usuario"
                  >
                    <span className="material-symbols-outlined text-[13px] text-[#ff5708]">security</span>
                    <span>Permisos</span>
                  </button>

                  {/* Botón de 3 Puntos: abre menú desplegable interactivo */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuStaffId(isMenuOpen ? null : staff.id);
                      }}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isMenuOpen ? 'bg-[#ff5708] text-[#2b0b00]' : 'bg-[#2a2a2c] hover:bg-[#353437] text-[#c6c5cf] hover:text-white'
                      }`}
                      title="Opciones del colaborador"
                    >
                      <span className="material-symbols-outlined text-[16px]">more_vert</span>
                    </button>

                    {/* Menú Flotante de Acciones */}
                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-full mb-1.5 w-48 bg-[#18181b] border border-[#3f3f46] rounded-xl shadow-2xl z-30 py-1.5 flex flex-col text-[12px] animate-in fade-in zoom-in-95 duration-150"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStaff({ ...staff, password: staff.password || staff.pin || '' });
                            setOpenMenuStaffId(null);
                          }}
                          className="px-3 py-2 text-left hover:bg-[#27272a] text-[#e5e1e4] flex items-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px] text-[#00FF88]">edit</span>
                          <span>Editar Colaborador</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setChangingPinStaff(staff);
                            setNewPinValue(staff.pin || '');
                            setNewPasswordValue(staff.password || staff.pin || '');
                            setOpenMenuStaffId(null);
                          }}
                          className="px-3 py-2 text-left hover:bg-[#27272a] text-[#e5e1e4] flex items-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px] text-[#ff5708]">key</span>
                          <span>Cambiar PIN TPV</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleOpenPermissionsModal(staff);
                            setOpenMenuStaffId(null);
                          }}
                          className="px-3 py-2 text-left hover:bg-[#27272a] text-[#e5e1e4] flex items-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px] text-[#38bdf8]">shield</span>
                          <span>Ver Nivel de Permisos</span>
                        </button>

                        <div className="border-t border-[#27272a] my-1" />

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingStaff(staff);
                            setOpenMenuStaffId(null);
                          }}
                          className="px-3 py-2 text-left hover:bg-rose-950/40 text-rose-400 flex items-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                          <span>Dar de Baja / Eliminar</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Matriz de Permisos y Niveles de Acceso por Rol */}
      <div id="matriz-permisos" className="pt-2">
        <RolePermissionsMatrix onShowToast={onShowToast} />
      </div>

      {/* ===================================================================== */}
      {/* 🚀 MODAL: CREAR NUEVO COLABORADOR */}
      {/* ===================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1c1b1d] max-w-md w-full rounded-2xl border border-[#ff5708]/40 shadow-2xl my-8 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 pb-3 border-b border-[#2d2e38] shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5708] text-[22px]">person_add</span>
                <h3 className="text-[17px] font-bold text-white">Registrar Nuevo Colaborador</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#24252e] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCollaborator} className="space-y-3.5 text-[13px] p-6 pt-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Daniel Gómez"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white focus:border-[#ff5708] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Rol Operativo</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white focus:border-[#ff5708] focus:outline-none"
                  >
                    <option value="floor">Camarero / Sala</option>
                    <option value="kitchen">Cocina KDS</option>
                    <option value="bar">Bartender / Barra</option>
                    <option value="runner">Runner / Pase</option>
                    <option value="admin">Administrador General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Estación / Zona</label>
                  <input
                    type="text"
                    placeholder="Ej: Terraza / Salón"
                    value={newAssignment}
                    onChange={(e) => setNewAssignment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white focus:border-[#ff5708] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">PIN TPV (4 dígitos) *</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="1234"
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white font-mono text-center tracking-widest text-[15px] focus:border-[#ff5708] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Usuario Login *</label>
                  <input
                    type="text"
                    placeholder="darvin"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white font-mono text-[12px] focus:border-[#ff5708] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Correo Corporativo</label>
                  <input
                    type="email"
                    placeholder="usuario@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white text-[12px] focus:border-[#ff5708] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Contraseña Login</label>
                  <input
                    type="text"
                    placeholder="Opcional (o usa el PIN)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white text-[12px] focus:border-[#ff5708] focus:outline-none"
                  />
                </div>
              </div>



              <div className="pt-3 flex gap-2 justify-end border-t border-[#2d2e38]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#323238] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#ff5708] hover:bg-[#ff703d] text-[#2b0b00] text-[12px] font-bold shadow-md cursor-pointer"
                >
                  Guardar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ✏️ MODAL: EDITAR COLABORADOR */}
      {/* ===================================================================== */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1c1b1d] max-w-md w-full rounded-2xl border border-white/20 shadow-2xl my-8 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 pb-3 border-b border-[#2d2e38] shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00FF88] text-[22px]">edit</span>
                <h3 className="text-[17px] font-bold text-white">Editar Datos del Colaborador</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#24252e] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff} className="space-y-3.5 text-[13px] p-6 pt-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white focus:border-[#ff5708] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Rol</label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => {
                      const r = e.target.value as StaffMember['role'];
                      setEditingStaff({ ...editingStaff, role: r, roleTitle: roleTitles[r] });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white focus:border-[#ff5708] focus:outline-none"
                  >
                    <option value="floor">Camarero / Sala</option>
                    <option value="kitchen">Cocina KDS</option>
                    <option value="bar">Bartender / Barra</option>
                    <option value="runner">Runner / Pase</option>
                    <option value="admin">Administrador General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Estado</label>
                  <select
                    value={editingStaff.status}
                    onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white focus:border-[#ff5708] focus:outline-none"
                  >
                    <option value="En Turno Activo">En Turno Activo</option>
                    <option value="Conectado (Móvil)">Conectado (Móvil)</option>
                    <option value="En Cocina KDS">En Cocina KDS</option>
                    <option value="Fuera de Turno">Fuera de Turno</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Estación / Asignación</label>
                <input
                  type="text"
                  value={editingStaff.assignment}
                  onChange={(e) => setEditingStaff({ ...editingStaff, assignment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white focus:border-[#ff5708] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">PIN TPV (4 dígitos)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editingStaff.pin || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, pin: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white font-mono text-center tracking-widest text-[14px] focus:border-[#ff5708] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Contraseña Login</label>
                  <input
                    type="text"
                    placeholder="Clave de acceso"
                    value={editingStaff.password || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white text-[12px] focus:border-[#ff5708] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Correo de Acceso</label>
                <input
                  type="email"
                  value={editingStaff.email || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141416] border border-[#2d2e38] text-white focus:border-[#ff5708] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end border-t border-[#2d2e38]">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#323238] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#00FF88] text-black font-bold text-[12px] shadow-md hover:bg-emerald-400 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 🔑 MODAL: CAMBIAR PIN TPV */}
      {/* ===================================================================== */}
      {changingPinStaff && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1c1b1d] max-w-sm w-full rounded-2xl border border-[#ff5708]/40 p-6 space-y-4 shadow-2xl text-center my-8 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-[#ff5708]/10 text-[#ff5708] flex items-center justify-center mx-auto border border-[#ff5708]/30">
              <span className="material-symbols-outlined text-[24px]">pin</span>
            </div>
            
            <div>
              <h3 className="text-[17px] font-bold text-white">Cambiar PIN y Contraseña</h3>
              <p className="text-[12px] text-[#c6c5cf] mt-1">
                Colaborador: <strong className="text-white">{changingPinStaff.name}</strong>
              </p>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Nuevo PIN TPV (4 dígitos)</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="Nuevo PIN"
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center py-2 px-3 rounded-xl bg-[#141416] border border-[#353437] text-white font-mono text-[18px] tracking-[0.3em] font-bold focus:border-[#ff5708] focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#c6c5cf] uppercase mb-1">Nueva Contraseña Web (Opcional)</label>
                <input
                  type="text"
                  placeholder="Dejar vacío para usar el PIN"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-[#141416] border border-[#353437] text-white text-[13px] focus:border-[#ff5708] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setChangingPinStaff(null)}
                  className="px-4 py-2 rounded-lg bg-[#27272a] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#ff5708] text-[#2b0b00] text-[12px] font-bold shadow-md hover:bg-[#ff703d] cursor-pointer"
                >
                  Actualizar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 🛡️ MODAL: VER / CONFIGURAR PERMISOS DE COLABORADOR (100% INTERACTIVO) */}
      {/* ===================================================================== */}
      {viewingPermissionsStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1c1b1d] max-w-xl w-full rounded-2xl border border-[#38bdf8]/40 shadow-2xl my-8 flex flex-col max-h-[90vh]">
            {/* Header fijo */}
            <div className="flex items-center justify-between p-6 pb-3 border-b border-[#2d2e38] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center border border-[#38bdf8]/30 shrink-0">
                  <span className="material-symbols-outlined text-[22px]">verified_user</span>
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-white">{viewingPermissionsStaff.name}</h3>
                  <span className="text-[11px] font-mono text-[#ffb59c] font-semibold">{viewingPermissionsStaff.roleTitle}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPermissionsStaff(null)}
                className="p-1 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#24252e] cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Cuerpo scrolleable */}
            <div className="space-y-2 text-[12.5px] px-6 py-4 overflow-y-auto">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[#c6c5cf] text-[12px]">
                  Haz clic en cualquier nivel para personalizar los accesos de este colaborador:
                </p>
                <button
                  type="button"
                  onClick={() => setEditingPermissions(getDefaultPermissionsForRole(viewingPermissionsStaff.role))}
                  className="text-[11px] text-[#ff5708] hover:underline font-semibold cursor-pointer shrink-0"
                >
                  Restablecer a Rol
                </button>
              </div>

              <div className="divide-y divide-[#2d2e38] border border-[#2d2e38] rounded-xl overflow-hidden bg-[#141416]">
                {[
                  { id: 'panelAdmin', title: 'Panel de Administración', desc: 'Cierres de caja, métricas financieras y auditoría' },
                  { id: 'kdsCocina', title: 'Cocina KDS', desc: 'Visualización y despacho de comandas en tiempo real' },
                  { id: 'edicionMenu', title: 'Edición de Menú', desc: 'Cambio de precios, recetas y disponibilidad' },
                  { id: 'cobroPos', title: 'Cobro TPV / POS', desc: 'Cobro de mesas, tarjetas y emisión de boletas' },
                  { id: 'anulacionComandas', title: 'Anulación de Comandas', desc: 'Cancelación de pedidos y descuentos especiales' },
                ].map((cap) => {
                  const currentVal = (editingPermissions as any)[cap.id] || 'deny';
                  return (
                    <div key={cap.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-white block text-[13px]">{cap.title}</span>
                        <span className="text-[11px] text-[#a1a1aa] leading-tight block">{cap.desc}</span>
                      </div>

                      {/* 3 Botones Interactivos: Permitir | Lectura | Denegar */}
                      <div className="flex items-center gap-1 shrink-0 bg-[#0e0e10] p-1 rounded-lg border border-[#2d2e38] self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => setEditingPermissions((prev) => ({ ...prev, [cap.id]: 'allow' }))}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            currentVal === 'allow'
                              ? 'bg-emerald-500 text-black shadow-sm font-extrabold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          ✔ PERMITIR
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingPermissions((prev) => ({ ...prev, [cap.id]: 'read' }))}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            currentVal === 'read'
                              ? 'bg-amber-400 text-black shadow-sm font-extrabold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          👁 LECTURA
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingPermissions((prev) => ({ ...prev, [cap.id]: 'deny' }))}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            currentVal === 'deny'
                              ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          ✖ DENEGAR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer fijo */}
            <div className="p-6 pt-3 border-t border-[#2d2e38] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setViewingPermissionsStaff(null);
                  const el = document.getElementById('matriz-permisos');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  onShowToast('Desplazado a la Matriz de Permisos por Rol', 'tune');
                }}
                className="text-[12px] text-[#ff5708] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Matriz de Roles Global</span>
                <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
              </button>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setViewingPermissionsStaff(null)}
                  className="px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#323238] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!viewingPermissionsStaff || !onUpdateStaff) return;
                    const updated = {
                      ...viewingPermissionsStaff,
                      customPermissions: editingPermissions,
                      permissions: 'Permisos Personalizados'
                    };
                    onUpdateStaff(updated as any);
                    setViewingPermissionsStaff(null);
                    onShowToast(`Permisos de ${viewingPermissionsStaff.name} guardados con éxito`, 'verified_user');
                  }}
                  className="px-5 py-2 rounded-lg bg-[#00FF88] hover:bg-emerald-400 text-black text-[12px] font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Guardar Permisos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 🗑️ MODAL: CONFIRMAR ELIMINACIÓN */}
      {/* ===================================================================== */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1c1b1d] max-w-sm w-full rounded-2xl border border-rose-500/40 p-6 space-y-4 shadow-2xl text-center my-8 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <span className="material-symbols-outlined text-[24px]">person_remove</span>
            </div>

            <div>
              <h3 className="text-[17px] font-bold text-white">¿Dar de baja a colaborador?</h3>
              <p className="text-[12px] text-[#c6c5cf] mt-1.5">
                Se retirará el acceso a <strong className="text-white">{deletingStaff.name}</strong> y su PIN TPV quedará revocado.
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 rounded-lg bg-[#27272a] text-white text-[12px] font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold shadow-md cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};