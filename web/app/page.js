'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, configured, STAGES } from '../lib/supabase';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [brand, setBrand] = useState('');
  const [topic, setTopic] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (u) => {
    const [p, r, j] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', u.id).maybeSingle(),
      supabase.from('user_roles').select('role,is_chief').eq('user_id', u.id),
      supabase.from('jobs').select('id,brand,topic,status,published,created_at').order('created_at', { ascending: true }),
    ]);
    if (j.error) setErr('Не удалось загрузить ролики: ' + j.error.message);
    setProfile(p.data); setRoles(r.data || []); setJobs(j.data || []); setLoading(false);
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setUser(data.session.user); load(data.session.user);
    });
  }, [router, load]);

  if (!configured) return <div className="wrap"><p className="err">Не заданы ключи Supabase.</p></div>;
  if (loading) return <div className="wrap"><p className="note">Загрузка…</p></div>;
  if (!user) return null;

  const isChief = roles.some(r => r.is_chief);
  const idx = j => Math.max(0, STAGES.findIndex(s => s.k === j.status));

  async function create(e) {
    e.preventDefault(); setErr('');
    const { error } = await supabase.from('jobs').insert({ brand: brand.trim(), topic: topic.trim(), status: 'бриф', chief_id: user.id, data: { scenes: [], qc: {}, appr: {} } });
    if (error) { setErr('Не удалось создать ролик: ' + error.message); return; }
    setBrand(''); setTopic(''); load(user);
  }
  async function signOut() { await supabase.auth.signOut(); router.replace('/login'); }

  return (
    <div className="wrap">
      <header>
        <div><h1>Контент-завод</h1><p className="sub">{profile?.full_name || user.email} · {roles.length ? roles.map(r => r.role).join(', ') : 'роль не назначена'}</p></div>
        <button onClick={signOut}>Выйти</button>
      </header>
      {err && <p className="err">{err}</p>}
      {!roles.length && <p className="card note">Вам ещё не назначена роль. Обратитесь к главному.</p>}
      {isChief && (
        <form className="card" onSubmit={create}>
          <div className="row">
            <label style={{flex:'1 1 200px'}}>Бренд<input value={brand} onChange={e => setBrand(e.target.value)} required /></label>
            <label style={{flex:'2 1 300px'}}>Тема / оффер<input value={topic} onChange={e => setTopic(e.target.value)} required /></label>
          </div>
          <div><button className="primary">+ Новый ролик</button></div>
        </form>
      )}
      <div className="board">
        {STAGES.map((s, i) => {
          const js = jobs.filter(j => idx(j) === i);
          return (
            <section className="col" key={s.k}>
              <h3><span>{s.k}</span><span>{js.length}</span></h3>
              <span className="role">{s.role}</span>
              {js.map(j => (<div className="job" key={j.id}><b>{j.topic}</b><span className="meta">{j.brand}{j.published ? ' · опубликован' : ''}</span></div>)) }
              {!js.length && <span className="meta">пусто</span>}
            </section>
          );
        })}
      </div>
      <p className="note">Версия 0.1: вход, роли и доска. Форма ролика, утверждения, ОТК и оплата переносятся следующими шагами.</p>
    </div>
  );
}
