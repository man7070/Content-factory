import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true } }) : null;

export const STAGES = [
  { k: 'бриф', role: 'Автор брифа' },
  { k: 'сценарий', role: 'Сценарист' },
  { k: 'съёмка', role: 'Видеомейкер' },
  { k: 'сборка материала', role: 'Проект-менеджер' },
  { k: 'AI B-roll', role: 'AI контент-мейкер' },
  { k: 'упаковка', role: 'Проект-менеджер → Монтажёр' },
  { k: 'готов', role: 'ОТК' },
  { k: 'публикация', role: 'SMM' },
];
