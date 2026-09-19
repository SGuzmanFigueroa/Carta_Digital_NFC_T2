export default function SocialLoginButtons() {
  return (
    <div className="w-full flex flex-col gap-3">
      <button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3.5 px-4 rounded-xl border border-zinc-800 flex items-center justify-center gap-2 transition-colors">
        <span className="font-bold text-blue-500">G</span>
        Continuar con Google
      </button>
      
      <button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 px-4 rounded-xl border border-zinc-800 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-xl">⛶</span>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold">Escanear QR de Mesa</span>
            <span className="text-xs text-zinc-500 font-normal">Acceso exprés comensal sin clave</span>
          </div>
        </div>
        <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded-md font-bold tracking-wider">MESA ACTIVA</span>
      </button>
    </div>
  );
}