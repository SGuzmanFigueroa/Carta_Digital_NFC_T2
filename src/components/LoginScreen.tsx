'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuditLogger, sanitizeText } from '../utils/security';
import { kitchenAudio } from '../utils/audio';
import { AuthUser } from '../types';
import { changeOwnPassword, loadCurrentStaffUser, loginStaff } from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  onExploreAsGuest: () => void;
  onShowToast: (msg: string, icon?: string) => void;
  redirectTo?: string;
  /** El proxy detectó una contraseña temporal pendiente: se pide cambiarla. */
  forcePasswordChange?: boolean;
}

/** Usuarios de supabase/seed.sql: solo se ofrecen en `npm run dev`. */
const DEV_DEMO_USERS = [
  { username: 'admin', label: 'Admin / Gerente', dot: 'bg-[#ff5708]' },
  { username: 'chef_kenji', label: 'Jefe Cocina KDS', dot: 'bg-amber-400' },
  { username: 'garzon_sofia', label: 'Camarero Sala', dot: 'bg-emerald-400' },
  { username: 'bar_lucas', label: 'Bartender Barra', dot: 'bg-cyan-400' }
] as const;
const SHOW_DEV_DEMO_USERS = process.env.NODE_ENV === 'development';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onExploreAsGuest,
  onShowToast,
  redirectTo,
  forcePasswordChange = false
}) => {
  const router = useRouter();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<'login' | 'change_password'>('login');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRecoverModal, setShowRecoverModal] = useState(false);

  // Cambio de contraseña obligatorio (contraseña temporal entregada por el admin).
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!forcePasswordChange) return;
    let cancelled = false;
    loadCurrentStaffUser().then((user) => {
      if (cancelled || !user) return;
      setPendingUser(user);
      setView('change_password');
    });
    return () => {
      cancelled = true;
    };
  }, [forcePasswordChange]);

  const executeRoleRedirection = (user: AuthUser) => {
    const role = `${user.role} ${user.roleTitle}`.toLowerCase();
    const destination = redirectTo || (
      role.includes('admin') ? '/dashboard' :
      role.includes('kitchen') || role.includes('chef') || role.includes('cocina') ? '/kds' :
      role.includes('floor') || role.includes('waiter') || role.includes('mozo') || role.includes('mesero') || role.includes('sala') ? '/pedidos' :
      '/kds'
    );

    router.replace(destination);
  };

  const finishLogin = (user: AuthUser) => {
    onShowToast(`¡Bienvenido/a, ${user.name}! Sesión iniciada.`, 'verified_user');
    onLoginSuccess(user);
    executeRoleRedirection(user);
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage('');

    const identifier = sanitizeText(usernameOrEmail, 120);
    if (!identifier || !password) {
      setErrorMessage('Ingresa tu usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    const result = await loginStaff(identifier, password);
    setIsLoading(false);

    if (!result.ok) {
      // El servidor limita los intentos por usuario e IP y responde un mensaje genérico.
      AuditLogger.log({ eventType: 'LOGIN_FAILED', severity: 'WARN', details: 'Inicio de sesión rechazado' });
      kitchenAudio.playAllergyWarning();
      setPassword('');
      setErrorMessage(result.error);
      return;
    }

    AuditLogger.log({
      eventType: 'LOGIN_SUCCESS',
      severity: 'INFO',
      user: result.user.name,
      role: result.user.role,
      details: 'Inicio de sesión con Supabase Auth'
    });
    setPassword('');

    if (result.mustChangePassword) {
      setPendingUser(result.user);
      setView('change_password');
      return;
    }
    finishLogin(result.user);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !pendingUser) return;
    setErrorMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('La contraseña nueva debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    const result = await changeOwnPassword(newPassword);
    setIsLoading(false);
    if (!result.ok) {
      setErrorMessage(result.error || 'No se pudo cambiar la contraseña.');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    onShowToast('Contraseña actualizada.', 'key');
    finishLogin(pendingUser);
  };

  const fillDevDemoUser = (username: string) => {
    setUsernameOrEmail(username);
    setPassword('');
    setErrorMessage('');
    passwordInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-[#e5e1e4] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#ff5708]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#ff8c42]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#ff5708]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Bar Status Info */}
      <div className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-[#353437]/40 bg-[#131315]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ff5708] flex items-center justify-center text-[#511500] font-bold shadow-[0_0_16px_rgba(255,87,8,0.4)]">
            <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[17px] tracking-tight font-bold text-[#e5e1e4] uppercase">
                Gastro<span className="text-[#ff5708]">Pulse</span>
              </span>
              <span className="font-label-code text-[10px] text-[#ff5708] px-1.5 py-0.2 rounded bg-[#1c1b1d] border border-[#ff5708]/30">
                OS
              </span>
            </div>
            <span className="text-[11px] text-[#c6c5cf]">AUREA Bistro • Miraflores</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[12px] font-label-code">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#1c1b1d] border border-[#353437]/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#c6c5cf]">ESTACIÓN:</span>
            <strong className="text-[#e5e1e4]">TERM-04</strong>
          </div>

          <button
            type="button"
            onClick={onExploreAsGuest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1b1d] text-[#c6c5cf] hover:text-[#ff5708] hover:border-[#ff5708]/40 border border-[#353437] transition-all cursor-pointer text-[12px]"
            title="Abrir vista de comensal en mesa sin credenciales"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            <span>Ver Menú QR</span>
          </button>
        </div>
      </div>

      {/* Main Center Auth Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-[480px] bg-[#161619] rounded-2xl border border-[#353437]/80 shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Card Header */}
          <div className="p-6 sm:p-7 pb-4 border-b border-[#353437]/40 text-center relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5708]/10 border border-[#ff5708]/30 text-[#ff5708] font-label-code text-[11px] font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5708] animate-ping" />
              ACCESO OPERATIVO DE RESTAURANTE
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-[#e5e1e4] tracking-tight">
              {view === 'change_password' ? 'Elige tu contraseña' : 'Control de Turno & Caja'}
            </h1>
            <p className="text-[13px] text-[#c6c5cf] mt-1">
              {view === 'change_password'
                ? `${pendingUser?.name ?? ''}, tu contraseña actual es temporal. Crea una nueva para continuar.`
                : 'Ingresa tus credenciales para gestionar comandas, cocina KDS y sala.'}
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-7">
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/80 text-red-300 text-[13px] flex items-center gap-2.5 animate-fadeIn" role="alert" aria-live="assertive">
                <span className="material-symbols-outlined text-red-500 text-[20px]">warning</span>
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {view === 'change_password' ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-[12px] font-medium text-[#c6c5cf] mb-1.5">
                    Contraseña nueva (mínimo 8 caracteres)
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2.5 rounded-xl border border-[#353437] focus:border-[#ff5708] focus:outline-none focus:ring-1 focus:ring-[#ff5708] transition-all text-[13px]"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-[12px] font-medium text-[#c6c5cf] mb-1.5">
                    Repite la contraseña nueva
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0e0e10] text-[#e5e1e4] px-3.5 py-2.5 rounded-xl border border-[#353437] focus:border-[#ff5708] focus:outline-none focus:ring-1 focus:ring-[#ff5708] transition-all text-[13px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#ff5708] hover:bg-[#ff6922] text-[#511500] font-bold text-[14px] transition-all shadow-[0_0_20px_rgba(255,87,8,0.3)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#511500] border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[19px]">key</span>
                      <span>Guardar y continuar</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCredentialsLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-username" className="block text-[12px] font-medium text-[#c6c5cf] mb-1.5">
                    Usuario
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c6c5cf] material-symbols-outlined text-[18px]">
                      person
                    </span>
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoComplete="username"
                      autoCapitalize="none"
                      placeholder="ej. garzon_sofia"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="w-full bg-[#0e0e10] text-[#e5e1e4] pl-10 pr-3.5 py-2.5 rounded-xl border border-[#353437] focus:border-[#ff5708] focus:outline-none focus:ring-1 focus:ring-[#ff5708] transition-all text-[13px]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-[12px] font-medium text-[#c6c5cf]">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => setShowRecoverModal(true)}
                      className="text-[11px] text-[#ff8c42] hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu clave?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c6c5cf] material-symbols-outlined text-[18px]">
                      lock
                    </span>
                    <input
                      id="login-password"
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0e0e10] text-[#e5e1e4] pl-10 pr-10 py-2.5 rounded-xl border border-[#353437] focus:border-[#ff5708] focus:outline-none focus:ring-1 focus:ring-[#ff5708] transition-all text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c6c5cf] hover:text-[#e5e1e4] p-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#ff5708] hover:bg-[#ff6922] text-[#511500] font-bold text-[14px] transition-all shadow-[0_0_20px_rgba(255,87,8,0.3)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#511500] border-t-transparent rounded-full animate-spin" />
                      <span>Validando credenciales...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[19px]">login</span>
                      <span>Ingresar al Sistema GastroPulse</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Usuarios demo: solo en desarrollo; rellenan el usuario, la contraseña la escribes tú. */}
            {SHOW_DEV_DEMO_USERS && view === 'login' && (
              <div className="mt-6 pt-5 border-t border-[#353437]/40">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-label-code text-[11px] text-[#ff8c42] uppercase font-bold tracking-wider">
                    Usuarios demo (solo desarrollo)
                  </span>
                  <span className="text-[11px] text-[#c6c5cf]">Rellena el usuario</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEV_DEMO_USERS.map((demo) => (
                    <button
                      key={demo.username}
                      type="button"
                      onClick={() => fillDevDemoUser(demo.username)}
                      className="p-2.5 rounded-xl bg-[#0e0e10] hover:bg-[#201f22] border border-[#353437]/60 hover:border-[#ff5708]/50 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${demo.dot}`} />
                        <span className="text-[12px] font-bold text-[#e5e1e4] group-hover:text-[#ff5708]">{demo.label}</span>
                      </div>
                      <div className="font-label-code text-[10px] text-[#c6c5cf] mt-0.5 pl-4">{demo.username}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recuperación: la contraseña la restablece el administrador */}
      {showRecoverModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="recover-title" className="bg-[#161619] p-6 rounded-2xl w-full max-w-sm border border-[#353437] shadow-2xl animate-fadeIn">
            <h3 id="recover-title" className="text-xl font-bold text-[#e5e1e4] mb-2">Restablecer accesos</h3>
            <p className="text-sm text-[#c6c5cf] mb-4">
              Pide al administrador del restaurante que te asigne una contraseña temporal desde
              <strong className="text-[#e5e1e4]"> Personal</strong>. Al entrar con ella podrás elegir una nueva.
            </p>
            <button
              type="button"
              onClick={() => setShowRecoverModal(false)}
              className="w-full bg-[#2a2a2c] text-white py-2.5 rounded-xl hover:bg-[#353437] text-[13px]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Footer Info & Disclaimers */}
      <footer className="w-full py-3.5 px-6 border-t border-[#353437]/30 bg-[#131315]/80 text-[11px] font-label-code text-[#c6c5cf] flex flex-col sm:flex-row items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-3">
          <span>GastroPulse OS v2.4.0</span>
          <span>•</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Servidores Cloud Activos
          </span>
          <span>•</span>
          <span>Cifrado TLS 1.3</span>
        </div>

        <div>
          <span>Sucursal Miraflores • Sistema de Facturación Electrónica SUNAT Conectado</span>
        </div>
      </footer>
    </div>
  );
};
