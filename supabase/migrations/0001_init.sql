-- =====================================================================
-- MathQuest — skema database (Supabase / PostgreSQL)
-- Jalankan di Supabase Dashboard > SQL Editor, atau `supabase db push`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KATALOG (dapat dibaca publik, hanya diubah oleh service role/admin)
-- ---------------------------------------------------------------------
create table if not exists public.lessons (
  id          text primary key,              -- 'm1'..'m7'
  slug        text not null unique,
  number      int  not null,
  title       text not null,
  summary     text not null default '',
  difficulty  text not null check (difficulty in ('mudah','sedang','sulit')),
  minutes     int  not null default 15,
  created_at  timestamptz not null default now()
);

create table if not exists public.quizzes (
  id          text primary key,              -- 'lesson:m1', 'practice:mudah', 'evaluation'
  kind        text not null check (kind in ('lesson_quiz','practice','evaluation')),
  lesson_id   text references public.lessons(id) on delete set null,
  title       text not null,
  created_at  timestamptz not null default now()
);

-- Soal + kunci jawaban. TIDAK ADA policy SELECT untuk pengguna:
-- kunci hanya dapat dibaca server melalui service role.
create table if not exists public.quiz_questions (
  id           text primary key,
  quiz_id      text not null references public.quizzes(id) on delete cascade,
  topic        text not null,
  difficulty   text not null check (difficulty in ('mudah','sedang','sulit')),
  type         text not null check (type in ('mcq','tf','number','pair')),
  format       text not null,
  prompt       text not null,
  payload      jsonb not null default '{}'::jsonb,   -- options, context, pairLabels
  answer       text not null,
  explanation  jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions(quiz_id);

create table if not exists public.games (
  id            text primary key,
  title         text not null,
  max_score     int  not null,
  target_score  int  not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.achievements (
  id           text primary key,
  title        text not null,
  description  text not null,
  xp           int  not null default 0
);

-- ---------------------------------------------------------------------
-- 2. DATA PENGGUNA (RLS: hanya pemilik yang dapat membaca)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text check (char_length(display_name) <= 40),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.user_stats (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  xp          int  not null default 0 check (xp >= 0),
  level       int  not null default 1,
  counters    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  user_id          uuid not null references auth.users(id) on delete cascade,
  lesson_id        text not null references public.lessons(id) on delete cascade,
  status           text not null check (status in ('in_progress','completed')),
  opened_at        timestamptz not null default now(),
  completed_at     timestamptz,
  best_quiz_score  int not null default 0 check (best_quiz_score between 0 and 100),
  primary key (user_id, lesson_id)
);

create table if not exists public.quiz_attempts (
  id          text not null,                  -- ID event dari klien (UUID)
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('lesson_quiz','practice','evaluation')),
  quiz_id     text not null,                  -- 'm1' / 'latihan-mudah' / 'evaluasi-akhir'
  title       text not null,
  score       int  not null check (score between 0 and 100),
  correct     int  not null check (correct >= 0),
  total       int  not null check (total >= 0),
  xp          int  not null default 0,
  difficulty  text,
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists quiz_attempts_user_time on public.quiz_attempts(user_id, created_at desc);

create table if not exists public.game_attempts (
  id             text not null,
  user_id        uuid not null references auth.users(id) on delete cascade,
  game_id        text not null references public.games(id) on delete cascade,
  title          text not null,
  difficulty     text not null check (difficulty in ('mudah','sedang','sulit')),
  score_percent  int  not null check (score_percent between 0 and 100),
  raw_score      int  not null default 0,
  correct        int  not null default 0,
  total          int  not null default 0,
  xp             int  not null default 0,
  created_at     timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists game_attempts_user_time on public.game_attempts(user_id, created_at desc);

create table if not exists public.user_achievements (
  user_id         uuid not null references auth.users(id) on delete cascade,
  achievement_id  text not null references public.achievements(id) on delete cascade,
  earned_at       timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.activity_logs (
  id          text not null,                  -- ID event (dipakai untuk mencegah duplikasi saat migrasi)
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  ref_id      text not null,
  title       text not null,
  detail      text not null default '',
  xp          int  not null default 0,
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists activity_logs_user_time on public.activity_logs(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.lessons            enable row level security;
alter table public.quizzes            enable row level security;
alter table public.quiz_questions     enable row level security;
alter table public.games              enable row level security;
alter table public.achievements       enable row level security;
alter table public.profiles           enable row level security;
alter table public.user_stats         enable row level security;
alter table public.lesson_progress    enable row level security;
alter table public.quiz_attempts      enable row level security;
alter table public.game_attempts      enable row level security;
alter table public.user_achievements  enable row level security;
alter table public.activity_logs      enable row level security;

-- Katalog: boleh dibaca siapa saja
drop policy if exists "catalog read lessons" on public.lessons;
create policy "catalog read lessons" on public.lessons for select using (true);
drop policy if exists "catalog read quizzes" on public.quizzes;
create policy "catalog read quizzes" on public.quizzes for select using (true);
drop policy if exists "catalog read games" on public.games;
create policy "catalog read games" on public.games for select using (true);
drop policy if exists "catalog read achievements" on public.achievements;
create policy "catalog read achievements" on public.achievements for select using (true);
-- quiz_questions: sengaja TANPA policy → tertutup untuk anon & authenticated.

-- Data pengguna: hanya baca milik sendiri.
-- Penulisan XP/skor/progres dilakukan server (service role) setelah validasi,
-- sehingga pengguna tidak dapat memanipulasi XP lewat API Supabase langsung.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own stats read" on public.user_stats;
create policy "own stats read" on public.user_stats for select using (auth.uid() = user_id);
drop policy if exists "own lessons read" on public.lesson_progress;
create policy "own lessons read" on public.lesson_progress for select using (auth.uid() = user_id);
drop policy if exists "own quiz attempts read" on public.quiz_attempts;
create policy "own quiz attempts read" on public.quiz_attempts for select using (auth.uid() = user_id);
drop policy if exists "own game attempts read" on public.game_attempts;
create policy "own game attempts read" on public.game_attempts for select using (auth.uid() = user_id);
drop policy if exists "own achievements read" on public.user_achievements;
create policy "own achievements read" on public.user_achievements for select using (auth.uid() = user_id);
drop policy if exists "own activity read" on public.activity_logs;
create policy "own activity read" on public.activity_logs for select using (auth.uid() = user_id);

-- Kolom profil yang boleh diubah pengguna hanya display_name
revoke update on public.profiles from authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 4. TRIGGER: buat profil & statistik saat pengguna baru mendaftar
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_stats (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
