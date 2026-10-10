'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {fetchComplaintProvider} from '@/services/complaintService';
export function ComplaintBookSettings({sectionBg,sectionHeaderBorder}:{sectionBg:string;sectionHeaderBorder:string}) {
  const [name,setName]=useState(''),[ruc,setRuc]=useState(''),[address,setAddress]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[authenticated,setAuthenticated]=useState(false);
  useEffect(()=>{
    fetchComplaintProvider().then(p=>{setName(p.name);setRuc(p.ruc);setAddress(p.address);}).catch(()=>setMessage('Aplica la migración del libro para habilitar el guardado.'));
    supabase.auth.getSession().then(({data})=>setAuthenticated(Boolean(data.session)));
  },[]);
  const signIn=async()=>{
    setBusy(true);setMessage('');
    try{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
      if(error)throw new Error('No se pudo iniciar sesión con esa cuenta.');setAuthenticated(true);setPassword('');setMessage('Sesión iniciada. El guardado verificará tus permisos de administrador del libro.');
    }catch(e){setMessage(e instanceof Error?e.message:'No se pudo verificar la cuenta.');}finally{setBusy(false);}
  };
  const save=async()=>{
    if(name.trim().length<2||!/^\d{11}$/.test(ruc)||address.trim().length<5){setMessage('Completa la razón social, un RUC de 11 dígitos y la dirección.');return;}
    setBusy(true);setMessage('');
    try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Inicia sesión con una cuenta autorizada de Supabase Auth.');
      const response=await fetch('/api/complaints',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({name:name.trim(),ruc,address:address.trim()})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo guardar.');setMessage('Identificación guardada. Se usará en las nuevas hojas; las anteriores conservan sus datos originales.');
    }catch(e){setMessage(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}
  };
  const input='w-full rounded-lg border border-[#94a3b8]/40 bg-transparent px-3 py-2';
  return <section id="libro-reclamaciones" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
    <div className={`p-5 border-b ${sectionHeaderBorder}`}><h2 className="text-lg font-bold">11. Libro de Reclamaciones</h2><p className="text-sm opacity-70">Identificación del establecimiento que aparecerá en cada hoja.</p></div>
    <div className="p-5 space-y-4">
      <label className="block text-sm">Razón social<input className={input} maxLength={160} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label>
      <label className="block text-sm">RUC del proveedor<input className={input} inputMode="numeric" maxLength={11} value={ruc} onChange={e=>setRuc(e.target.value)} disabled={busy}/></label>
      <label className="block text-sm">Dirección del establecimiento<input className={input} maxLength={300} value={address} onChange={e=>setAddress(e.target.value)} disabled={busy}/></label>
      {!authenticated&&<div className="space-y-3 border-t border-[#94a3b8]/30 pt-4"><p className="text-sm">Para guardar, inicia una sesión segura con la cuenta del administrador del libro.</p>
        <label className="block text-sm">Correo del administrador<input type="email" autoComplete="username" className={input} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>
        <label className="block text-sm">Contraseña<input type="password" autoComplete="current-password" className={input} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
        <button type="button" disabled={busy} className="rounded-lg border px-4 py-2" onClick={signIn}>Iniciar sesión segura</button>
      </div>}
      <button type="button" disabled={busy||!authenticated} onClick={save} className="rounded-lg bg-[#ff5708] px-4 py-2 font-bold text-[#2b0b00] disabled:opacity-50">{busy?'Guardando…':'Guardar identificación del libro'}</button>
      {message&&<p role="status" className="text-sm">{message}</p>}
    </div>
  </section>;
}
