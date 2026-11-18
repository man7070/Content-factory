'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, configured } from '../../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!configured) return (<div className="wrap narrow card"><h1>Контент-завод</h1><p className="err">Не заданы ключи Supabase. Заполните NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.</p></div>);

  async function signIn(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setMsg('Не удалось войти: проверьте почту и пароль.'); else router.replace('/');
  }
  async function reset() {
    if (!email.trim()) { setMsg('Впишите почту, на неё придёт ссылка.'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/set-password' });
    setBusy(false);
    setMsg(error ? 'Не удалось отправить письмо: ' + error.message : 'Письмо отправлено. Откройте ссылку и задайте пароль.');
  }
  return (
    <div className="wrap narrow">
      <div><h1>Контент-завод</h1><p className="sub">Вход для сотрудников</p></div>
      <form className="card" onSubmit={signIn}>
        <label>Почта<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label>Пароль<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        <button className="primary" disabled={busy}>Войти</button>
        <button type="button" onClick={reset} disabled={busy}>Забыли пароль или первый вход</button>
        {msg && <p className={msg.startsWith('Письмо') ? 'ok' : 'err'}>{msg}</p>}
      </form>
    </div>
  );
}
