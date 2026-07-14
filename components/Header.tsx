'use client';
import Link from 'next/link';
import { LogIn, LogOut, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export function Header() {
  const [dark, setDark] = useState(false);
  const [logged, setLogged] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const useDark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = useDark ? 'dark' : 'light'; setDark(useDark);
    const supabase = createClient();
    supabase.auth.getSession().then(({data}) => setLogged(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e,s) => setLogged(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  function toggle(){ const next=!dark; setDark(next); document.documentElement.dataset.theme=next?'dark':'light'; localStorage.setItem('theme',next?'dark':'light'); }
  async function logout(){ await createClient().auth.signOut(); location.href='/'; }
  return <header className="header"><div className="container nav">
    <Link href="/" className="brand"><span className="brand-mark">M</span> Minha Estante</Link>
    <nav className="nav-links"><Link className="nav-link" href="/">Início</Link><Link className="nav-link" href="/buscar">Buscar</Link><Link className="nav-link" href="/biblioteca">Biblioteca</Link></nav>
    <button className="icon-btn" onClick={toggle} aria-label="Alternar tema">{dark?<Sun size={19}/>:<Moon size={19}/>}</button>
    {logged?<button className="icon-btn" onClick={logout} aria-label="Sair"><LogOut size={19}/></button>:<Link className="icon-btn" href="/login" aria-label="Entrar"><LogIn size={19}/></Link>}
  </div></header>
}
