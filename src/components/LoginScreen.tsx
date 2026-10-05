'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthSessionCookie, AuditLogger, sanitizeText } from '../utils/security';
import { kitchenAudio } from '../utils/audio';
import { AuthUser, StaffMember } from '../types';
import { getPersistedStaffList, sendPasswordResetEmail, loginStaffWithCredentials, loginStaffWithPin } from '../services/authService';
import { INITIAL_STAFF } from '../data/mockData';

interface LoginScreenProps {
  staffList: StaffMember[];
  onLoginSuccess: (user: AuthUser) => void;
  onExploreAsGuest: () => void;
  onShowToast: (msg: string, icon?: string) => void;
  redirectTo?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  staffList,
  onLoginSuccess,
  onExploreAsGuest,
  onShowToast,
  redirectTo,
}) => {
  const router = useRouter();
  const [activeStaff, setActiveStaff] = useState<StaffMember[]>(staffList);

  useEffect(() => {
    getPersistedStaffList().then((list) => {
      if (list && list.length > 0) {
        setActiveStaff((prev) => {
          const map = new Map<string, StaffMember>();
          prev.forEach((s) => map.set(s.id || s.username || Math.random().toString(), s));
          list.forEach((s) => map.set(s.id || s.username || Math.random().toString(), s));
          return Array.from(map.values());
        });
      }
    }).catch(console.warn);
  }, []);

  const [authMode, setAuthMode] = useState<'credentials' | 'pin'>('credentials');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // CD-14 (Punto 1): Estados para validación en tiempo real
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // CD-14 (Punto 2): Estados para Modal de Recuperación
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverStatus, setRecoverStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [recoverError, setRecoverError] = useState('');

  // PIN keypad state & Security
  const [pinDigits, setPinDigits] = useState<string>('');
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<StaffMember | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // CD-14 (Punto 1): Funciones de Validación en Tiempo Real
  const handleEmailChange = (val: string) => {
    setUsernameOrEmail(val);
    const isEmail = val.includes('@');
    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailError(!emailRegex.test(val) ? 'Formato de correo institucional inválido.' : '');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (val.length < 4 && val.length > 0) {
      setPasswordError('Mínimo 4 caracteres.');
    } else {
      setPasswordError('');
    }
  };

  const executeRoleRedirection = (user: AuthUser) => {
    const role = `${user.role} ${user.roleTitle}`.toLowerCase();
    const destination = redirectTo || (
      role.includes('admin') ? '/dashboard' :
      role.includes('kitchen') || role.includes('chef') || role.includes('cocina') ? '/kds' :
      role.includes('floor') || role.includes('waiter') || role.includes('mozo') || role.includes('mesero') || role.includes('sala') ? '/pedidos' :
      '/dashboard'
    );

    router.replace(destination);
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0 || passwordError || emailError) return;
    setErrorMessage('');

    const sanitizedUser = sanitizeText(usernameOrEmail, 80);
    if (!sanitizedUser || !password) {
      setErrorMessage('Por favor ingresa tu usuario/correo y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Intento de autenticación en vivo con Supabase
      const res = await loginStaffWithCredentials(sanitizedUser, password);
      let authUser: AuthUser | null = res.success && res.user ? res.user : null;

      // 2. Resiliencia / Fallback si no está en la base de datos o fallo de red
      if (!authUser) {
        const trimmedInput = sanitizedUser.toLowerCase();
        const matched = activeStaff.find((st) => {
          const emailMatches = st.email && st.email.toLowerCase() === trimmedInput;
          const userMatches = st.username && st.username.toLowerCase() === trimmedInput;
          const nameMatches = st.name.toLowerCase() === trimmedInput;
          const passMatches = (st.password && st.password === password) || st.pin === password;
          return (emailMatches || userMatches || nameMatches) && passMatches;
        });

        if (matched) {
          if (['inactivo', 'inactive', 'disabled', 'desactivado', 'suspended'].includes(matched.status?.trim().toLowerCase() || '')) {
            setErrorMessage('Cuenta inactiva. Por favor, contacta a Recursos Humanos.');
            setIsLoading(false);
            return;
          }

          authUser = {
            id: matched.id,
            name: matched.name,
            username: matched.username || matched.name.toLowerCase().replace(/\s+/g, '.'),
            email: matched.email || `${matched.id}@aureabistro.pe`,
            role: (matched.role as AuthUser['role']) || 'floor',
            roleTitle: matched.roleTitle || 'Personal GastroPulse',
            pin: matched.pin || '1234',
            assignment: matched.assignment || 'Salón Principal',
            terminal: 'TERM-04',
            loginTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
          };
        }
      }

      if (authUser) {
        setFailedAttempts(0);
        try {
          if (rememberMe) {
            localStorage.setItem('gastropulse_auth_user', JSON.stringify(authUser));
          } else {
            localStorage.removeItem('gastropulse_auth_user');
          }
          setAuthSessionCookie(authUser);
        } catch (err) {}

        AuditLogger.log({
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          user: authUser.name,
          role: authUser.role,
          details: `Inicio de sesión exitoso vía credenciales Supabase (Usuario: ${sanitizedUser})`
        });

        setIsLoading(false);
        onShowToast(`¡Bienvenido/a, ${authUser.name}! Sesión iniciada.`, 'verified_user');
        onLoginSuccess(authUser);

        executeRoleRedirection(authUser);
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setIsLoading(false);

        AuditLogger.log({
          eventType: 'LOGIN_FAILED',
          severity: 'WARN',
          details: `Fallo de autenticación por credenciales (intento #${nextAttempts})`
        });

        if (nextAttempts >= 4) {
          setLockoutSeconds(30);
          kitchenAudio.playAllergyWarning();
          AuditLogger.log({
            eventType: 'PIN_LOCKOUT',
            severity: 'CRITICAL',
            user: 'TERMINAL',
            details: 'Bloqueo temporal de 30 segundos por 4 intentos fallidos de credenciales'
          });
          setErrorMessage('Demasiados intentos fallidos. Terminal bloqueada por 30s.');
        } else {
          setErrorMessage(res.error || `Credenciales incorrectas. Intento ${nextAttempts} de 4.`);
          kitchenAudio.playAllergyWarning();
        }
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Error de comunicación durante el inicio de sesión.');
    }
  };

  const handlePinInput = (digit: string) => {
    if (pinDigits.length >= 4) return;
    const newPin = pinDigits + digit;
    setPinDigits(newPin);
    setErrorMessage('');

    if (newPin.length === 4) {
      validatePin(newPin);
    }
  };

  const handlePinBackspace = () => {
    setPinDigits((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handlePinClear = () => {
    setPinDigits('');
    setErrorMessage('');
  };

  const validatePin = async (enteredPin: string) => {
    if (lockoutSeconds > 0) return;
    setIsLoading(true);

    try {
      // 1. Intento de autenticación en vivo con Supabase
      let authUser: AuthUser | null = await loginStaffWithPin(enteredPin);

      // 2. Fallback local si la red está offline o usuario local
      if (!authUser) {
        let matched: StaffMember | undefined;
        if (selectedStaffForPin) {
          if (selectedStaffForPin.pin === enteredPin) matched = selectedStaffForPin;
        } else {
          matched = activeStaff.find((st) => st.pin === enteredPin);
        }

        if (matched) {
          if (['inactivo', 'inactive', 'disabled', 'desactivado', 'suspended'].includes(matched.status?.trim().toLowerCase() || '')) {
            setErrorMessage('Cuenta inactiva. Por favor, contacta a Recursos Humanos.');
            setIsLoading(false);
            setPinDigits('');
            return;
          }

          authUser = {
            id: matched.id,
            name: matched.name,
            username: matched.username || matched.name.toLowerCase().replace(/\s+/g, '.'),
            email: matched.email || `${matched.id}@aureabistro.pe`,
            role: (matched.role as AuthUser['role']) || 'floor',
            roleTitle: matched.roleTitle || 'Personal',
            pin: matched.pin || '1234',
            assignment: matched.assignment || 'Salón Principal',
            terminal: 'TERM-04',
            loginTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
          };
        }
      }

      if (authUser) {
        setFailedAttempts(0);
        try {
          localStorage.setItem('gastropulse_auth_user', JSON.stringify(authUser));
          setAuthSessionCookie(authUser);
        } catch (e) {}

        AuditLogger.log({
          eventType: 'LOGIN_SUCCESS',
          severity: 'INFO',
          user: authUser.name,
          role: authUser.role,
          details: `Acceso exitoso vía PIN Supabase en terminal`
        });

        setIsLoading(false);
        onShowToast(`Acceso concedido vía PIN: ${authUser.name}`, 'key');
        onLoginSuccess(authUser);
        executeRoleRedirection(authUser);
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setIsLoading(false);
        setPinDigits('');

        AuditLogger.log({
          eventType: 'LOGIN_FAILED',
          severity: 'WARN',
          details: `Fallo de autenticación por PIN (intento #${nextAttempts})`
        });

        if (nextAttempts >= 4) {
          setLockoutSeconds(30);
          kitchenAudio.playAllergyWarning();
          AuditLogger.log({
            eventType: 'PIN_LOCKOUT',
            severity: 'CRITICAL',
            user: 'TERMINAL',
            details: 'Bloqueo temporal de 30 segundos por 4 intentos fallidos de PIN'
          });
          setErrorMessage('Demasiados intentos fallidos. Terminal bloqueada por 30s.');
        } else {
          setErrorMessage(`PIN incorrecto. Intento ${nextAttempts} de 4.`);
          kitchenAudio.playAllergyWarning();
        }
      }
    } catch (err) {
      setIsLoading(false);
      setPinDigits('');
      setErrorMessage('Error al validar el PIN en el servidor.');
    }
  };

  const fillQuickDemoUser = (targetRole: 'admin' | 'kitchen' | 'floor' | 'bar') => {
    let user = activeStaff.find((s) => s.role === targetRole);

    if (!user && targetRole === 'admin') {
      user = activeStaff.find((s) => s.role === 'admin' || s.username === 'admin') || INITIAL_STAFF.find((s) => s.role === 'admin');
    } else if (!user && targetRole === 'kitchen') {
      user = activeStaff.find((s) => s.role === 'kitchen' || s.username?.includes('chef')) || INITIAL_STAFF.find((s) => s.role === 'kitchen');
    } else if (!user && targetRole === 'floor') {
      user = activeStaff.find((s) => s.username === 'darvin' || s.name.toLowerCase().includes('darvin')) || activeStaff.find((s) => s.role === 'floor') || INITIAL_STAFF.find((s) => s.role === 'floor');
    } else if (!user && targetRole === 'bar') {
      user = activeStaff.find((s) => s.role === 'bar' || s.role === 'runner' || s.username?.includes('bar')) || INITIAL_STAFF.find((s) => s.role === 'bar');
    }

    if (!user) {
      user = INITIAL_STAFF[0];
    }

    setUsernameOrEmail(user.email || user.username || 'admin');
    setPassword(user.password || user.pin || 'admin123');
    setPinDigits(user.pin || '9021');
    setPasswordError('');
    setEmailError('');
    setErrorMessage('');

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      username: user.username || user.name.toLowerCase().replace(/\s+/g, '.'),
      email: user.email || `${user.username || 'user'}@aureabistro.pe`,
      role: (user.role as AuthUser['role']) || 'admin',
      roleTitle: user.roleTitle || 'Personal GastroPulse',
      pin: user.pin || '1234',
      assignment: user.assignment || 'Salón Principal',
      terminal: 'TERM-04',
      loginTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    };

    try {
      localStorage.setItem('gastropulse_auth_user', JSON.stringify(authUser));
      setAuthSessionCookie(authUser);
    } catch (e) {}

    AuditLogger.log({
      eventType: 'LOGIN_SUCCESS',
      severity: 'INFO',
      user: user.name,
      role: user.role,
      details: `Acceso rápido demo ejecutado para ${user.name} (${user.role})`
    });

    onShowToast(`Acceso concedido: ${user.name} (${user.roleTitle})`, 'verified');
    onLoginSuccess(authUser);
    executeRoleRedirection(authUser);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverStatus('loading');
    setRecoverError('');
    const { success, error } = await sendPasswordResetEmail(recoverEmail);
    if (success) {
      setRecoverStatus('success');
    } else {
      setRecoverStatus('error');
      setRecoverError(error || 'No se pudo enviar el correo. Inténtalo de nuevo.');
    }
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
              Control de Turno & Caja
            </h1>
            <p className="text-[13px] text-[#c6c5cf] mt-1">
              Ingresa tus credenciales para gestionar comandas, cocina KDS y sala.
            </p>

            {/* Auth Mode Toggle Tabs */}
            <div className="flex items-center bg-[#0e0e10] p-1 rounded-xl border border-[#353437]/40 mt-5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('credentials');
                  setErrorMessage('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  authMode === 'credentials'
                    ? 'bg-[#2a2a2c] text-[#ff5708] font-semibold shadow-sm'
                    : 'text-[#c6c5cf] hover:text-[#e5e1e4]'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">badge</span>
                <span>Usuario / Correo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('pin');
                  setErrorMessage('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  authMode === 'pin'
                    ? 'bg-[#2a2a2c] text-[#ff5708] font-semibold shadow-sm'
                    : 'text-[#c6c5cf] hover:text-[#e5e1e4]'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">dialpad</span>
                <span>PIN Rápido TPV</span>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-7">
            {/* CD-14 (Punto 3): Feedback visual accesible de error */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/80 text-red-300 text-[13px] flex items-center gap-2.5 animate-fadeIn" role="alert" aria-live="assertive">
                <span className="material-symbols-outlined text-red-500 text-[20px]">warning</span>
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {authMode === 'credentials' ? (
              <form onSubmit={handleCredentialsLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-username" className="block text-[12px] font-medium text-[#c6c5cf] mb-1.5">
                    Usuario o Correo Institucional
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c6c5cf] material-symbols-outlined text-[18px]">
                      person
                    </span>
                    <input
                      id="login-username"
                      type="text"
                      required
                      placeholder="ej. admin@aureabistro.pe o admin"
                      value={usernameOrEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? 'login-email-error' : undefined}
                      className={`w-full bg-[#0e0e10] text-[#e5e1e4] pl-10 pr-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-[13px] ${
                        emailError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-[#353437] focus:border-[#ff5708] focus:ring-[#ff5708]'
                      }`}
                    />
                  </div>
                  {/* Validación de correo en tiempo real */}
                  {emailError && <p id="login-email-error" className="mt-1 text-[11px] text-red-400">{emailError}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-[12px] font-medium text-[#c6c5cf]">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoverEmail(usernameOrEmail.includes('@') ? usernameOrEmail : '');
                        setRecoverError('');
                        setRecoverStatus('idle');
                        setShowRecoverModal(true);
                      }}
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
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      aria-invalid={Boolean(passwordError)}
                      aria-describedby={passwordError ? 'login-password-error' : undefined}
                      className={`w-full bg-[#0e0e10] text-[#e5e1e4] pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-[13px] ${
                        passwordError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-[#353437] focus:border-[#ff5708] focus:ring-[#ff5708]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c6c5cf] hover:text-[#e5e1e4] p-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {/* Validación de contraseña en tiempo real */}
                  {passwordError && <p id="login-password-error" className="mt-1 text-[11px] text-red-400">{passwordError}</p>}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-[12px] text-[#c6c5cf] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#ff5708]"
                    />
                    <span>Recordar sesión en este terminal</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !!passwordError || !!emailError}
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
            ) : (
              /* PIN Keypad Mode */
              <div className="space-y-4">
                {selectedStaffForPin && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#201f22] border border-[#ff5708]/30 text-[12px]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#2a2a2c] text-[#ff5708] font-bold flex items-center justify-center text-[13px]">
                        {selectedStaffForPin.initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#e5e1e4]">{selectedStaffForPin.name}</span>
                        <span className="text-[10px] text-[#ffb59c] font-label-code">{selectedStaffForPin.roleTitle}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStaffForPin(null);
                        setPinDigits('');
                      }}
                      className="text-[#c6c5cf] hover:text-white text-[11px] p-1"
                    >
                      Cambiar
                    </button>
                  </div>
                )}

                <div className="flex justify-center items-center gap-3 py-2">
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = pinDigits.length > index;
                    return (
                      <div
                        key={index}
                        className={`w-4 h-4 rounded-full border-2 transition-all ${
                          isFilled
                            ? 'bg-[#ff5708] border-[#ff5708] shadow-[0_0_12px_#ff5708]'
                            : 'bg-transparent border-[#353437]'
                        }`}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      disabled={lockoutSeconds > 0 || isLoading}
                      onClick={() => handlePinInput(digit)}
                      className="h-14 rounded-xl bg-[#201f22] hover:bg-[#2a2a2c] active:bg-[#ff5708] active:text-[#511500] text-[#e5e1e4] font-bold text-[20px] transition-colors flex items-center justify-center border border-[#353437]/40 cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={lockoutSeconds > 0 || isLoading}
                    onClick={handlePinClear}
                    className="h-14 rounded-xl bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] font-medium text-[13px] transition-colors flex items-center justify-center border border-[#353437]/40 cursor-pointer"
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    disabled={lockoutSeconds > 0 || isLoading}
                    onClick={() => handlePinInput('0')}
                    className="h-14 rounded-xl bg-[#201f22] hover:bg-[#2a2a2c] active:bg-[#ff5708] active:text-[#511500] text-[#e5e1e4] font-bold text-[20px] transition-colors flex items-center justify-center border border-[#353437]/40 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    disabled={lockoutSeconds > 0 || isLoading}
                    onClick={handlePinBackspace}
                    className="h-14 rounded-xl bg-[#201f22] hover:bg-[#2a2a2c] text-[#c6c5cf] hover:text-white transition-colors flex items-center justify-center border border-[#353437]/40 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">backspace</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Demo Credentials Access Section */}
            <div className="mt-6 pt-5 border-t border-[#353437]/40">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-label-code text-[11px] text-[#ff8c42] uppercase font-bold tracking-wider">
                  Acceso Rápido de Prueba (Demo Roles)
                </span>
                <span className="text-[11px] text-[#c6c5cf]">Click para autocompletar</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickDemoUser('admin')}
                  className="p-2.5 rounded-xl bg-[#0e0e10] hover:bg-[#201f22] border border-[#353437]/60 hover:border-[#ff5708]/50 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ff5708]" />
                    <span className="text-[12px] font-bold text-[#e5e1e4] group-hover:text-[#ff5708]">
                      Admin / Gerente
                    </span>
                  </div>
                  <div className="font-label-code text-[10px] text-[#c6c5cf] mt-0.5 pl-4">
                    admin@aureabistro.pe • PIN: 9021
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillQuickDemoUser('kitchen')}
                  className="p-2.5 rounded-xl bg-[#0e0e10] hover:bg-[#201f22] border border-[#353437]/60 hover:border-[#ff5708]/50 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[12px] font-bold text-[#e5e1e4] group-hover:text-[#ff5708]">
                      Jefe Cocina KDS
                    </span>
                  </div>
                  <div className="font-label-code text-[10px] text-[#c6c5cf] mt-0.5 pl-4">
                    cocina@aureabistro.pe • PIN: 2001
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillQuickDemoUser('floor')}
                  className="p-2.5 rounded-xl bg-[#0e0e10] hover:bg-[#201f22] border border-[#353437]/60 hover:border-[#ff5708]/50 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[12px] font-bold text-[#e5e1e4] group-hover:text-[#ff5708]">
                      Camarero Sala
                    </span>
                  </div>
                  <div className="font-label-code text-[10px] text-[#c6c5cf] mt-0.5 pl-4">
                    salon@aureabistro.pe • PIN: 1042
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillQuickDemoUser('bar')}
                  className="p-2.5 rounded-xl bg-[#0e0e10] hover:bg-[#201f22] border border-[#353437]/60 hover:border-[#ff5708]/50 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-[12px] font-bold text-[#e5e1e4] group-hover:text-[#ff5708]">
                      Bartender Barra
                    </span>
                  </div>
                  <div className="font-label-code text-[10px] text-[#c6c5cf] mt-0.5 pl-4">
                    bar@aureabistro.pe • PIN: 3010
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CD-14 (Punto 2): Modal de Recuperación con Supabase Auth */}
      {showRecoverModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="recover-title" className="bg-[#161619] p-6 rounded-2xl w-full max-w-sm border border-[#353437] shadow-2xl animate-fadeIn">
            <h3 id="recover-title" className="text-xl font-bold text-[#e5e1e4] mb-2">Restablecer Accesos</h3>

            {recoverStatus === 'success' ? (
              <div className="text-center py-4">
                <span className="material-symbols-outlined text-emerald-500 text-[40px] mb-2">check_circle</span>
                <p className="text-[#c6c5cf] text-sm mb-4">Se ha enviado un enlace seguro de restablecimiento a tu bandeja de correo.</p>
                <button onClick={() => { setShowRecoverModal(false); setRecoverStatus('idle'); }} className="w-full bg-[#2a2a2c] text-white py-2.5 rounded-xl hover:bg-[#353437]">Entendido</button>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit}>
                <p className="text-sm text-[#c6c5cf] mb-4">Ingresa tu correo institucional registrado en Supabase.</p>
                <input
                  type="email"
                  required
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  aria-label="Correo institucional para recuperación"
                  aria-invalid={recoverStatus === 'error'}
                  aria-describedby={recoverStatus === 'error' ? 'recover-error' : undefined}
                  placeholder="usuario@aureabistro.pe"
                  className="w-full bg-[#0e0e10] border border-[#353437] rounded-xl px-4 py-2.5 text-[#e5e1e4] mb-4 focus:border-[#ff5708] outline-none text-[13px]"
                />
                {recoverStatus === 'error' && <p id="recover-error" className="text-red-400 text-[11px] mb-3" role="alert">{recoverError}</p>}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowRecoverModal(false)} className="flex-1 bg-[#2a2a2c] text-[#c6c5cf] py-2.5 rounded-xl hover:bg-[#353437] transition-colors text-[13px]">
                    Cancelar
                  </button>
                  <button type="submit" disabled={recoverStatus === 'loading'} className="flex-1 bg-[#ff5708] text-[#511500] font-bold py-2.5 rounded-xl hover:bg-[#ff6922] transition-colors disabled:opacity-50 text-[13px]">
                    {recoverStatus === 'loading' ? 'Enviando...' : 'Enviar Enlace'}
                  </button>
                </div>
              </form>
            )}
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