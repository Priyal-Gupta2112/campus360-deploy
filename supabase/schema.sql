-- Campus360 initial schema for Supabase PostgreSQL.
-- Review before running. Never expose service_role keys in a browser.
create extension if not exists pgcrypto;

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  student_email text unique,
  role text not null default 'student' check (role in ('student','class_rep','cultural_rep','club_admin','campus_admin')),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.campus_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'Campus event',
  starts_at timestamptz,
  location text not null default 'VESIT campus',
  status text not null default 'Registration Open' check (status in ('Registration Open','Starting Soon','Live Now','Event Ended')),
  created_by uuid references public.student_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.campus_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  published_at timestamptz not null default now(),
  created_by uuid references public.student_profiles(id) on delete set null
);

create table if not exists public.assignment_deadlines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  due_date date not null,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  student_id uuid references public.student_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.ride_offers (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.student_profiles(id) on delete set null,
  pickup_label text not null,
  destination_label text not null,
  departure_at timestamptz,
  seats_available integer not null default 1 check (seats_available between 1 and 8),
  pickup_lat double precision,
  pickup_lng double precision,
  status text not null default 'Available' check (status in ('Available','Requested','Full','Cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.ride_offers(id) on delete cascade,
  student_id uuid references public.student_profiles(id) on delete set null,
  status text not null default 'Pending' check (status in ('Pending','Accepted','Declined','Cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.campus_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  target_group text not null default 'All VESIT students',
  category text not null default 'Community',
  credit_points integer not null default 0 check (credit_points between 0 and 500),
  contact_person text not null,
  status text not null default 'Pending approval' check (status in ('Pending approval','Open','Completed','Rejected')),
  created_by uuid references public.student_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.skill_swap_listings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.student_profiles(id) on delete set null,
  skill_name text not null,
  category text not null default 'Technology',
  intent text not null check (intent in ('Can teach','Want to learn')),
  exchange_interest text not null default '',
  contact_method text not null default 'Campus message',
  status text not null default 'Open' check (status in ('Open','Matched','Closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.campus_clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  description text not null default '',
  president_name text,
  official_contact text,
  verified_by_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

-- RLS is enabled as a safety default. Configure policies and Supabase Auth
-- before using client-side database access or deploying publicly.
alter table public.student_profiles enable row level security;
alter table public.campus_events enable row level security;
alter table public.campus_notices enable row level security;
alter table public.assignment_deadlines enable row level security;
alter table public.ride_offers enable row level security;
alter table public.ride_requests enable row level security;
alter table public.campus_challenges enable row level security;
alter table public.skill_swap_listings enable row level security;
alter table public.campus_clubs enable row level security;
