export default function LoginForm() {
  return (
    <div className="w-full">
      {/* Separador */}
      <div className="w-full flex items-center gap-4 my-8">
        <div className="h-px bg-zinc-800 flex-1"></div>
        <span className="text-zinc-600 text-xs font-bold tracking-widest">O CON TU CORREO</span>
        <div className="h-px bg-zinc-800 flex-1"></div>
      </div>

      <form className="flex flex-col gap-5">
        {/* Input Correo */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-sm font-medium text-zinc-300">Correo Electrónico</label>
            <span className="text-[10px] font-bold tracking-wider text-zinc-600">ID GOURMET</span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
            <input 
              type="email" 
              placeholder="tu.nombre@ejemplo.com"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>
        </div>

        {/* Input Contraseña */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-sm font-medium text-zinc-300">Contraseña</label>
            <a href="#" className="text-xs font-medium text-orange-500 hover:text-orange-400">¿Olvidaste tu contraseña?</a>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">🔒</span>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3.5 pl-11 pr-11 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              👁️
            </button>
          </div>
        </div>

        {/* Recordar dispositivo */}
        <div className="flex justify-between items-center py-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded-md border-zinc-700 bg-zinc-900 accent-orange-500 cursor-pointer" 
            />
            <span className="text-sm text-zinc-300 font-medium">Recordar en este dispositivo</span>
          </label>
          <span className="text-xs font-bold text-cyan-600 tracking-wider flex items-center gap-1">
            <span>🛡️</span> 256-BIT
          </span>
        </div>

        {/* Botón Principal */}
        <button 
          type="button" 
          className="w-full bg-[#ff5708] hover:bg-[#ff6922] text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,87,8,0.3)] transition-all flex items-center justify-center gap-2 mt-2"
        >
          <span>🍴</span> Iniciar Sesión
        </button>
      </form>

      {/* Tarjeta de Sincronización de Mesa reubicada */}
      <div className="w-full mt-8 bg-[#161618] border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
            <span className="text-orange-500 text-xl">🪑</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-zinc-100 text-sm font-bold">AUREA Bistro Experience</span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            </div>
            <span className="text-zinc-500 text-xs">Mesa 04 • Menú y KDS en directo</span>
          </div>
        </div>
        <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] px-2 py-1 rounded-md font-bold tracking-wider">
          SINCRONIZADO
        </span>
      </div>

      {/* Footer Text */}
      <div className="mt-8 text-center flex flex-col gap-2">
        <p className="text-zinc-400 text-sm">
          ¿Aún no eres miembro? <a href="/crear-cuenta" className="text-white font-bold hover:text-orange-400">Regístrate aquí ➔</a>
        </p>
        <div className="flex items-center justify-center gap-3 text-[10px] font-bold tracking-widest text-zinc-600 uppercase mt-4">
          <a href="#" className="hover:text-zinc-400">Términos de Servicio</a>
          <span>•</span>
          <a href="#" className="hover:text-zinc-400">Políticas de Privacidad</a>
        </div>
      </div>
    </div>
  );
}