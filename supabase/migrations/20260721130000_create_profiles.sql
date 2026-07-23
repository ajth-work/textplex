-- TextPlex account-owned profile foundation.
-- Authentication identities remain in Supabase's auth.users table. This table
-- stores only learner-facing profile data and is protected by ownership RLS.

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null default 'Reader',
    target_language text not null default 'zh',
    learning_track text not null default 'local',
    proficiency_level text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint profiles_display_name_length check (char_length(trim(display_name)) between 1 and 80),
    constraint profiles_target_language_length check (char_length(trim(target_language)) between 2 and 16),
    constraint profiles_learning_track_length check (char_length(trim(learning_track)) between 1 and 32)
);

comment on table public.profiles is 'Learner-facing profile data owned by the matching Supabase Auth user.';

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
    on public.profiles
    for select
    to authenticated
    using ((select auth.uid()) = id);

create policy "Users can create their own profile"
    on public.profiles
    for insert
    to authenticated
    with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
    on public.profiles
    for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

grant select, insert, update on table public.profiles to authenticated;
revoke all on table public.profiles from anon;

create table if not exists public.user_settings (
    user_id uuid not null references auth.users (id) on delete cascade,
    key text not null,
    value text not null,
    updated_at timestamptz not null default timezone('utc', now()),
    primary key (user_id, key),
    constraint user_settings_key_length check (char_length(trim(key)) between 1 and 80)
);

comment on table public.user_settings is 'Per-user TextPlex display and reading preferences.';

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
    on public.user_settings
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can create their own settings"
    on public.user_settings
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can update their own settings"
    on public.user_settings
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users can delete their own settings"
    on public.user_settings
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.user_settings to authenticated;
revoke all on table public.user_settings from anon;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row
    execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
    before update on public.user_settings
    for each row
    execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Reader'), 80)
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- Backfill accounts that existed before this migration was applied.
insert into public.profiles (id, display_name)
select
    id,
    left(coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), 'Reader'), 80)
from auth.users
on conflict (id) do nothing;
