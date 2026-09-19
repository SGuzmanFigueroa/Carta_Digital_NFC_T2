import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center p-6 font-sans relative">
      
      {/* Top Bar Status */}
      <div className="w-full max-w-md flex justify-between items-center mb-8">
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          <span className="text-orange-100 text-[10px] font-bold tracking-widest">OS:LIVE V3.4</span>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full">
          <span className="text-cyan-500 text-sm">☁️</span>
          <span className="text-orange-100 text-[10px] font-bold tracking-widest">ENLACE SEGURO</span>
        </div>
      </div>

      <div className="w-full max-w-md flex flex-col items-center mt-4">
        
        {/* Logo temporal */}
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800 shadow-lg shadow-orange-500/10">
          <span className="text-orange-500 text-2xl">🔥</span>
        </div>
        
        <h1 className="text-white text-3xl font-bold mb-3 tracking-tight">Iniciar Sesión</h1>
        <p className="text-zinc-400 text-center text-sm mb-8 px-4">
          Accede a tu experiencia culinaria interactiva, mesas en vivo y maridajes de autor.
        </p>

        {/* Componentes modulares */}
        <SocialLoginButtons />
        <LoginForm />
        
      </div>
    </main>
  );
}