import React, { useState } from 'react';
import { INITIAL_STAFF } from '../data/initialData';
import { StaffMember } from '../types';

export const GestionUsuarios: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Cocinero de Línea');
  const [newStation, setNewStation] = useState('P1 Fuego & Grill');

  const handleToggleStatus = (id: string) => {
    setStaffList((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const nextStatus = m.status === 'En servicio' ? 'Descanso' : 'En servicio';
        return { ...m, status: nextStatus };
      })
    );
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newMember: StaffMember = {
      id: `staff-${Date.now()}`,
      name: newName,
      role: newRole,
      station: newStation,
      status: 'En servicio',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      phone: '+51 980 000 111',
      shiftHours: '13:00 - 22:30',
      specialty: 'Partidas y Mise en Place'
    };

    setStaffList([...staffList, newMember]);
    setNewName('');
    setShowAddModal(false);
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1920px] mx-auto space-y-6 text-[#e5e1e4]">
      {/* Header */}
      <div className="bg-[#18181b] p-6 rounded-2xl border border-[#27272a] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0494fc]"></span>
            <span className="text-[12px] font-mono-code uppercase tracking-wider text-[#a1c9ff] font-bold">
              Brigada de Cocina & Personal de Sala
            </span>
          </div>
          <h1 className="text-[28px] font-bold text-white mt-1 font-sans">
            Gestión de Usuarios y Roles
          </h1>
          <p className="text-[14px] text-[#a1a1aa] mt-0.5">
            Asignación de partidas, jefes de estación y control de turnos en vivo
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-lg bg-[#ff5708] hover:bg-orange-600 text-white font-mono-code text-[12px] font-bold uppercase flex items-center gap-2 shadow-lg shadow-[#ff5708]/30 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Registrar Personal</span>
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {staffList.map((member) => (
          <div
            key={member.id}
            className="p-5 rounded-2xl bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-all flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start gap-4">
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#353437] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono-code text-[#ffb59c] font-bold uppercase">
                    {member.station}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold ${
                      member.status === 'En servicio'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-[#4a4b53] text-[#bcbbc5]'
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
                <h3 className="font-bold text-[17px] text-white mt-1 font-sans">{member.name}</h3>
                <div className="text-[13px] text-[#a1a1aa] font-medium">{member.role}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121215] border border-[#27272a] space-y-1.5 font-mono-code text-[12px]">
              <div className="flex justify-between text-[#71717a]">
                <span>Especialidad:</span>
                <span className="text-white truncate max-w-[200px]">{member.specialty}</span>
              </div>
              <div className="flex justify-between text-[#71717a]">
                <span>Horario Turno:</span>
                <span className="text-[#a1c9ff]">{member.shiftHours}</span>
              </div>
              <div className="flex justify-between text-[#71717a]">
                <span>Contacto:</span>
                <span className="text-[#c6c5cf]">{member.phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleToggleStatus(member.id)}
                className={`flex-1 py-2 rounded-lg font-mono-code text-[12px] font-bold transition-colors ${
                  member.status === 'En servicio'
                    ? 'bg-[#27272a] hover:bg-[#3f3f46] text-[#ffb4ab]'
                    : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300'
                }`}
              >
                {member.status === 'En servicio' ? 'Pausar (Descanso)' : 'Activar en Servicio'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#18181b] border border-[#3f3f46] rounded-xl shadow-2xl max-w-md w-full p-6 text-[#e5e1e4]">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <h3 className="font-bold text-[16px] text-white">Añadir Miembro a la Brigada</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#a1a1aa] hover:text-white">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 pt-4">
              <div>
                <label className="block text-[11px] font-mono-code uppercase text-[#a1a1aa] mb-1 font-bold">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Mateo Castillo"
                  className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-[13px] text-white focus:border-[#ff5708] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-code uppercase text-[#a1a1aa] mb-1 font-bold">
                  Rol / Puesto
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-[13px] text-white focus:border-[#ff5708] focus:outline-none"
                >
                  <option value="Cocinero de Línea">Cocinero de Línea</option>
                  <option value="Jefe de Partida">Jefe de Partida</option>
                  <option value="Sous Chef">Sous Chef</option>
                  <option value="Bartender">Bartender</option>
                  <option value="Runner de Salón">Runner de Salón</option>
                  <option value="Maitre / Expediter">Maitre / Expediter</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono-code uppercase text-[#a1a1aa] mb-1 font-bold">
                  Partida Asignada
                </label>
                <select
                  value={newStation}
                  onChange={(e) => setNewStation(e.target.value)}
                  className="w-full bg-[#121215] border border-[#27272a] rounded-lg px-3 py-2 text-[13px] text-white focus:border-[#ff5708] focus:outline-none"
                >
                  <option value="P1 Fuego & Grill">P1 Fuego & Grill</option>
                  <option value="P2 Frío & Nikkei">P2 Frío & Nikkei</option>
                  <option value="P3 Wok & Sauté">P3 Wok & Sauté</option>
                  <option value="P4 Pastelería">P4 Pastelería</option>
                  <option value="P5 Barra Mixología">P5 Barra Mixología</option>
                  <option value="Pase Central / Salón">Pase Central / Salón</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#27272a] text-[#a1a1aa] text-[13px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#ff5708] text-white font-bold text-[13px]"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
