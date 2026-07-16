'use client';
import Link from 'next/link';
import { BarChart3, BookPlus, Library, LogIn, LogOut, Menu, Moon, Search, Sparkles, Sun, X } from 'lucide-react';
import { useEffect,useState } from 'react';
import {createClient} from '@/lib/supabase-browser';

type Profile={name:string;avatar?:string};
const links=[
  {href:'/buscar',label:'Buscar',icon:Search},
  {href:'/adicionar-manualmente',label:'Adicionar',icon:BookPlus},
  {href:'/biblioteca',label:'Biblioteca',icon:Library},
  {href:'/dashboard',label:'Dashboard',icon:BarChart3},
  {href:'/recomendacoes',label:'IA',icon:Sparkles},
];
export function Header(){
  const[dark,setDark]=useState(false);const[profile,setProfile]=useState<Profile|null>(null);const[open,setOpen]=useState(false);
  useEffect(()=>{const saved=localStorage.getItem('theme');const d=saved?saved==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';setDark(d);const s=createClient();
    const apply=(user:any)=>setProfile(user?{name:user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Leitor',avatar:user.user_metadata?.avatar_url||user.user_metadata?.picture}:null);
    s.auth.getUser().then(({data})=>apply(data.user));const{data}=s.auth.onAuthStateChange((_e,x)=>apply(x?.user));return()=>data.subscription.unsubscribe()},[]);
  useEffect(()=>{document.body.style.overflow=open?'hidden':'';return()=>{document.body.style.overflow=''}},[open]);
  const toggle=()=>{const n=!dark;setDark(n);document.documentElement.dataset.theme=n?'dark':'light';localStorage.setItem('theme',n?'dark':'light')};
  async function logout(){await createClient().auth.signOut();location.href='/'}
  return <header className="header"><div className="container nav">
    <Link href="/" className="brand" onClick={()=>setOpen(false)}><span className="brand-mark">M</span> Minha Estante</Link>
    <nav className="nav-links" aria-label="Navegação principal">{links.map(({href,label,icon:Icon})=><Link key={href} href={href}><Icon size={16}/>{label}</Link>)}</nav>
    {profile&&<Link href="/perfil" className="user-chip desktop-user"><span className="avatar-shell">{profile.avatar?<img src={profile.avatar} alt="" referrerPolicy="no-referrer"/>:<b>{profile.name.slice(0,1).toUpperCase()}</b>}</span><strong>{profile.name}</strong></Link>}
    <button className="icon-btn" onClick={toggle} aria-label={dark?'Ativar modo claro':'Ativar modo escuro'}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button>
    {profile?<button className="icon-btn desktop-auth" onClick={logout} aria-label="Sair"><LogOut size={19}/></button>:<Link className="icon-btn desktop-auth" href="/login" aria-label="Entrar"><LogIn size={19}/></Link>}
    <button className="icon-btn menu-toggle" onClick={()=>setOpen(true)} aria-label="Abrir menu" aria-expanded={open}><Menu size={21}/></button>
  </div>
  <div className={`mobile-menu-backdrop ${open?'open':''}`} onClick={()=>setOpen(false)} aria-hidden={!open}/>
  <aside className={`mobile-menu ${open?'open':''}`} aria-hidden={!open}>
    <div className="mobile-menu-head"><strong>Menu</strong><button className="icon-btn" onClick={()=>setOpen(false)} aria-label="Fechar menu"><X size={20}/></button></div>
    {profile&&<Link href="/perfil" className="mobile-profile" onClick={()=>setOpen(false)}><span className="avatar-shell">{profile.avatar?<img src={profile.avatar} alt="" referrerPolicy="no-referrer"/>:<b>{profile.name.slice(0,1).toUpperCase()}</b>}</span><span><small>Conectado como</small><strong>{profile.name}</strong></span></Link>}
    <nav className="mobile-nav" aria-label="Navegação móvel">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>setOpen(false)}><Icon size={20}/><span>{label}</span></Link>)}</nav>
    <div className="mobile-menu-foot">{profile?<button className="secondary-btn" onClick={logout}><LogOut size={18}/> Sair</button>:<Link className="secondary-btn" href="/login" onClick={()=>setOpen(false)}><LogIn size={18}/> Entrar</Link>}</div>
  </aside>
  </header>}
