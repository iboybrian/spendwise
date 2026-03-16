-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table public.users (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  salary numeric,
  weekly_budget numeric,
  currency text default 'USD'::text,
  language text default 'en'::text,
  onboarding_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EXPENSES TABLE
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  amount numeric not null,
  description text not null,
  category text not null,
  category_confidence numeric,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- WEEKLY REPORTS TABLE
create table public.weekly_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  week_start date not null,
  week_end date not null,
  total_spent numeric not null,
  summary_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS)

-- Users table
alter table public.users enable row level security;

create policy "Users can view their own profile."
  on public.users for select
  using ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.users for update
  using ( auth.uid() = id );

create policy "Users can insert their own profile."
  on public.users for insert
  with check ( auth.uid() = id );

-- Expenses table
alter table public.expenses enable row level security;

create policy "Users can view their own expenses."
  on public.expenses for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own expenses."
  on public.expenses for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own expenses."
  on public.expenses for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own expenses."
  on public.expenses for delete
  using ( auth.uid() = user_id );

-- Weekly Reports table
alter table public.weekly_reports enable row level security;

create policy "Users can view their own weekly reports."
  on public.weekly_reports for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own weekly reports (Edge Functions)."
  on public.weekly_reports for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own weekly reports."
  on public.weekly_reports for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own weekly reports."
  on public.weekly_reports for delete
  using ( auth.uid() = user_id );

-- FUNCTIONS & TRIGGERS
-- Auto-create user profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, language)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'en');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
