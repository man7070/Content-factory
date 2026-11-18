# База контент-завода

1. Supabase → SQL Editor → New query → вставить `migrations/001_init.sql` → Run.
2. Authentication → Users → Invite user: пригласить каждого сотрудника по почте.
3. Назначить роли (SQL Editor), подставив почту:
   insert into public.user_roles(user_id, role, is_chief)
   select id, 'Сценарист', false from auth.users where email = 'почта@пример.uz';
4. Главному: is_chief = true (Автор брифа и ОТК).
Ключи (service role) в репозиторий не кладём.
