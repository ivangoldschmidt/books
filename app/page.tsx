'use client';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, Clapperboard, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function ChooseSection() {
  const [hover, setHover] = useState<'books'|'cinema'|null>(null);
  return <main className="choose-main">
    <div className="choose-heading"><span className="eyebrow">Minha Biblioteca · Um lugar para suas histórias</span><h1>Que história vamos explorar <em>hoje?</em></h1><p>Seus livros e seus filmes. Duas coleções independentes, uma mesma conta.</p></div>
    <section className={`choose-panels ${hover ? `hover-${hover}` : ''}`} onMouseLeave={() => setHover(null)} aria-label="Escolha uma seção">
      <Link href="/livros" className="choose-panel choose-books" onMouseEnter={() => setHover('books')} onFocus={() => setHover('books')}>
        <div className="choose-text"><span className="choose-icon"><BookOpen size={25}/></span><span className="choose-kicker">CAPÍTULO UM</span><h2>Livros</h2><p>Descubra autores, acompanhe suas leituras, registre opiniões e encontre a próxima história.</p><span className="choose-link">Entrar na estante <ArrowUpRight size={19}/></span></div><div className="choose-decoration books-decoration" aria-hidden="true"><BookOpen size={180}/></div>
      </Link>
      <Link href="/cinema" className="choose-panel choose-cinema" onMouseEnter={() => setHover('cinema')} onFocus={() => setHover('cinema')}>
        <div className="choose-text"><span className="choose-icon"><Clapperboard size={25}/></span><span className="choose-kicker">CAPÍTULO DOIS</span><h2>Filmes <span>&</span> Séries</h2><p>Explore o cinema, salve o que quer assistir, avalie e compartilhe histórias especiais.</p><span className="choose-link">Entrar no cinema <ArrowUpRight size={19}/></span></div><div className="choose-decoration cinema-decoration" aria-hidden="true"><Clapperboard size={180}/></div>
      </Link>
    </section>
    <p className="choose-footnote"><Sparkles size={16}/> Seu perfil é o mesmo. Suas coleções continuam separadas.</p>
  </main>;
}
