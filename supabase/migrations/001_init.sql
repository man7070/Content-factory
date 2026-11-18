-- Контент-завод: схема базы v1
-- Запуск: Supabase → SQL Editor → вставить → Run. Безопасно запускать повторно.

-- Роли
do $$ begin
  create type public.app_role as enum
    ('Автор брифа','Сценарист','Видеомейкер','Проект-менеджер','AI контент-мейкер','Монтажёр','ОТК','SMM');
exception when duplicate_object then null; end $$;

-- Профили сотрудников (имя меняет сам сотрудник)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

-- Роли сотрудников (у одного человека может быть несколько)
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  is_chief boolean not null default false,
  primary key (user_id, role)
);

-- Ролики (тело ролика: сцены, этапы, ОТК хранится в data, как в панели)
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  chief_id uuid references auth.users(id),
  brand text not null default '',
  topic text not null default '',
  status text not null default 'бриф',
  published boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Оплата по ролям (суммы видят только главный и проект-менеджер, а сотрудник видит свою)
create table if not exists public.job_payments (
  job_id uuid not null references public.jobs(id) on delete cascade,
  role public.app_role not null,
  user_id uuid references auth.users(id),
  amount_uzs bigint not null default 0 check (amount_uzs >= 0),
  frozen boolean not null default false,
  primary key (job_id, role)
);

-- Справочники
create table if not exists public.brands (id uuid primary key default gen_random_uuid(), name text not null, colors text, fonts text, lang text, style text, created_at timestamptz default now());
create table if not exists public.styles (id uuid primary key default gen_random_uuid(), code text not null, name text, notes text, created_at timestamptz default now());
create table if not exists public.clips (id uuid primary key default gen_random_uuid(), file text not null, kind text, duration text, tags text, rights text, created_at timestamptz default now());

-- Помощники
create or replace function public.has_any_role() returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.user_roles where user_id = auth.uid()) $$;

create or replace function public.is_chief() returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and is_chief) $$;

create or replace function public.is_pm_or_chief() returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and (is_chief or role = 'Проект-менеджер')) $$;

-- Новый пользователь получает пустой профиль
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')) on conflict do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists jobs_touch on public.jobs;
create trigger jobs_touch before update on public.jobs for each row execute function public.touch_updated_at();

-- Включаем защиту строк на всех таблицах
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_payments enable row level security;
alter table public.brands enable row level security;
alter table public.styles enable row level security;
alter table public.clips enable row level security;

-- Доступ к API выдаём вручную, только вошедшим
revoke all on public.profiles, public.user_roles, public.jobs, public.job_payments, public.brands, public.styles, public.clips from anon;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.jobs, public.brands, public.styles, public.clips to authenticated;
grant select, insert, update, delete on public.job_payments to authenticated;

-- Политики
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists roles_read on public.user_roles;
create policy roles_read on public.user_roles for select to authenticated using (true);
-- роли назначаются только через SQL Editor или сервисный ключ

drop policy if exists jobs_read on public.jobs;
create policy jobs_read on public.jobs for select to authenticated using (public.has_any_role());
drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs for insert to authenticated with check (public.is_chief());
drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs for update to authenticated using (public.has_any_role()) with check (public.has_any_role());
drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs for delete to authenticated using (public.is_chief());

drop policy if exists pay_read on public.job_payments;
create policy pay_read on public.job_payments for select to authenticated using (public.is_pm_or_chief() or user_id = auth.uid());
drop policy if exists pay_write on public.job_payments;
create policy pay_write on public.job_payments for all to authenticated using (public.is_chief() and not frozen) with check (public.is_chief() and not frozen);

drop policy if exists ref_brands on public.brands;
create policy ref_brands on public.brands for all to authenticated using (public.has_any_role()) with check (public.is_pm_or_chief());
drop policy if exists ref_styles on public.styles;
create policy ref_styles on public.styles for all to authenticated using (public.has_any_role()) with check (public.is_pm_or_chief());
drop policy if exists ref_clips on public.clips;
create policy ref_clips on public.clips for all to authenticated using (public.has_any_role()) with check (public.has_any_role());

-- Хранилище файлов (ролики, дубли): закрытое, только для сотрудников с ролью
insert into storage.buckets (id, name, public) values ('videos','videos', false) on conflict (id) do nothing;
drop policy if exists videos_rw on storage.objects;
create policy videos_rw on storage.objects for all to authenticated
  using (bucket_id = 'videos' and public.has_any_role()) with check (bucket_id = 'videos' and public.has_any_role());
