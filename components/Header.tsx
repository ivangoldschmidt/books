'use client';
import Link from 'next/link';
import { BarChart3, BookPlus, Library, LogIn, LogOut, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useEffect,useState } from 'react';
import {createClient} from '@/lib/supabase-browser';

type Profile={name:string;avatar?:string};
export function Header(){
  const[dark,setDark]=useState(false);const[profile,setProfile]=useState<Profile|null>(null);
  useEffect(()=>{const saved=localStorage.getItem('theme');const d=saved?saved==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';setDark(d);const s=createClient();
    const apply=(user:any)=>setProfile(user?{name:user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Leitor',avatar:user.user_metadata?.avatar_url||user.user_metadata?.picture}:null);
    s.auth.getUser().then(({data})=>apply(data.user));const{data}=s.auth.onAuthStateChange((_e,x)=>apply(x?.user));return()=>data.subscription.unsubscribe()},[]);
  const toggle=()=>{const n=!dark;setDark(n);document.documentElement.dataset.theme=n?'dark':'light';localStorage.setItem('theme',n?'dark':'light')};
  async function logout(){await createClient().auth.signOut();location.href='/'}
  return <header className="header"><div className="container nav"><Link href="/" className="brand"><span className="brand-mark">M</span> Minha Estante</Link><nav className="nav-links"><Link href="/buscar"><Search size={16}/> Buscar</Link><Link href="/adicionar-manualmente"><BookPlus size={16}/> Adicionar</Link><Link href="/biblioteca"><Library size={16}/> Biblioteca</Link><Link href="/dashboard"><BarChart3 size={16}/> Dashboard</Link><Link href="/recomendacoes"><Sparkles size={16}/> IA</Link></nav>
  {profile&&<Link href="/perfil" className="user-chip">{profile.avatar?<img src={profile.avatar} alt="" referrerPolicy="no-referrer"/>:<span>{profile.name.slice(0,1).toUpperCase()}</span>}<strong>{profile.name}</strong></Link>}
  <button className="icon-btn" onClick={toggle}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button>{profile?<button className="icon-btn" onClick={logout}><LogOut size={19}/></button>:<Link className="icon-btn" href="/login"><LogIn size={19}/></Link>}</div></header>}
