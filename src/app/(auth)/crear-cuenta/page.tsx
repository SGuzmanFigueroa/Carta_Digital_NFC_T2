import React from 'react';

export default function CrearCuentaPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Crear Cuenta</h1>
        <p className="text-zinc-400 text-sm mb-4">Registro en construcción.</p>
        <a href="/login" className="text-orange-500 hover:underline text-sm font-bold">➔ Volver al Login</a>
      </div>
    </div>
  );
}
