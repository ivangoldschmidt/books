'use client';

import { createClient } from '@/lib/supabase-browser';
import type { LibraryItem } from '@/lib/types';
import { BookOpen, Search, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Mode = 'general' | 'authors' | 'books' | 'free';

export default function Recommendations() {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [mode, setMode] = useState<Mode>('general');
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [freeText, setFreeText] = useState('');

  useEffect(() => { void (async () => {
    const { data } = await createClient().from('library_items').select('*').eq('status', 'read').order('updated_at', { ascending: false });
    setItems((data || []) as LibraryItem[]);
  })(); }, []);

  const authors = useMemo(() => [...new Set(items.flatMap(item => item.book.authors || []))].sort(), [items]);
  const choices = mode === 'authors' ? authors.map(name => ({ id: name, label: name })) : items.map(item => ({ id: item.id, label: `${item.book.title} — ${item.book.authors.join(', ')}` }));
  const visibleChoices = choices.filter(choice => choice.label.toLowerCase().includes(filter.toLowerCase()));

  async function run() {
    setLoading(true); setError(''); setAnswer('');
    const response = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, selected, freeText }) });
    const json = await response.json();
    if (!response.ok) setError(json.error || 'Não foi possível gerar a recomendação.');
    else setAnswer(json.recommendation);
    setLoading(false);
  }

  return <main className="container section recommendation-page">
    <div className="eyebrow">Recomendação personalizada</div>
    <h1>O que ler agora?</h1>
    <p className="lead">Escolha como a IA deve interpretar seu momento de leitura. Você pode usar toda a biblioteca, autores específicos, livros específicos ou escrever livremente o que procura.</p>

    <div className="recommend-mode-grid">
      <button className={mode === 'general' ? 'recommend-mode active' : 'recommend-mode'} onClick={() => { setMode('general'); setSelected([]); }}><Sparkles />Gosto geral<span>Analisa todos os livros e notas.</span></button>
      <button className={mode === 'authors' ? 'recommend-mode active' : 'recommend-mode'} onClick={() => { setMode('authors'); setSelected([]); }}><UserRound />Por autores<span>Escolha autores já lidos.</span></button>
      <button className={mode === 'books' ? 'recommend-mode active' : 'recommend-mode'} onClick={() => { setMode('books'); setSelected([]); }}><BookOpen />Por livros<span>Escolha obras que representam seu gosto atual.</span></button>
      <button className={mode === 'free' ? 'recommend-mode active' : 'recommend-mode'} onClick={() => { setMode('free'); setSelected([]); }}><Search />Pedido livre<span>Descreva o que quer descobrir.</span></button>
    </div>

    {(mode === 'authors' || mode === 'books') && <section className="ai-selection-panel">
      <input value={filter} onChange={event => setFilter(event.target.value)} placeholder={mode === 'authors' ? 'Pesquisar autor…' : 'Pesquisar livro lido…'} />
      <div className="ai-choice-list">{visibleChoices.map(choice => <label key={choice.id}><input type="checkbox" checked={selected.includes(choice.id)} onChange={() => setSelected(current => current.includes(choice.id) ? current.filter(id => id !== choice.id) : [...current, choice.id])} /><span>{choice.label}</span></label>)}</div>
      <small>{selected.length} selecionado(s)</small>
    </section>}

    {mode === 'free' && <textarea className="ai-free-text" value={freeText} onChange={event => setFreeText(event.target.value)} placeholder="Ex.: Quero um romance curto, melancólico, ambientado na Europa, mas diferente dos autores que já li." rows={5} />}

    <button className="primary-btn" onClick={run} disabled={loading || ((mode === 'authors' || mode === 'books') && !selected.length) || (mode === 'free' && !freeText.trim())}><Sparkles size={18} />{loading ? 'Analisando…' : 'Gerar recomendação'}</button>
    {error && <div className="form-error">{error}</div>}
    {answer && <article className="ai-answer">{answer.split('\n').map((line, index) => <p key={index}>{line}</p>)}</article>}
  </main>;
}
