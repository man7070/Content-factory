'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, configured } from '../../lib/supabase';

export default function SetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save(e) {
    e.preventDefault(); setMsg('');
    if (p1.length < 8) { setMsg('Пароль должен быть не короче 8 символов.'); return; }
    if (p1 !== p2) { setMsg('Пароли не совпадают.'); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.updateUser({ password: p1, data: name.trim() ? { full_name: name.trim() } : undefined });
    if (!error && name.trim() && data?.user) await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', data.user.id);
    setBusy(false);
    if (error) setMsg('Не удалось сохранить: ' + error.message); else router.replace('/');
  }
  if (!configured) return null;
  return (
    <div className="wrap narrow">
      <div><h1>Задайте пароль</h1><p className="sub">И впишите своё имя, оно будет видно в ролике</p></div>
      {!ready ? <p className="card note">Откройте эту страницу по ссылке из письма. Если ссылка устарела, запросите новую на странице входа.</p> :
      <form className="card" onSubmit={save}>
        <label>Имя и фамилия<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>
        <label>Новый пароль<input type="password" value={p1} onChange={e => setP1(e.target.value)} autoComplete="new-password" required /></label>
        <label>Повторите пароль<input type="password" value={p2} onChange={e => setP2(e.target.value)} autoComplete="new-password" required /></label>
        <button className="primary" disabled={busy}>Сохранить и войти</button>
        {msg && <p className="err">{msg}</p>}
      </form>}
    </div>
  );
}
