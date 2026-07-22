create table if not exists public.theme_checkout_sessions (
    session_id text primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    product_type text not null check (product_type in ('theme', 'bundle')),
    product_id text not null,
    theme_ids jsonb not null default '[]'::jsonb,
    amount_cents integer not null check (amount_cents >= 0),
    currency text not null default 'USD',
    status text not null default 'created' check (status in ('created', 'paid', 'refunded')),
    payment_status text not null default 'pending' check (payment_status in ('pending', 'succeeded', 'refunded')),
    idempotency_key text not null,
    provider text not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (user_id, idempotency_key)
);

create table if not exists public.theme_commerce_events (
    event_id text primary key,
    session_id text not null references public.theme_checkout_sessions (session_id) on delete cascade,
    event_type text not null,
    payload jsonb not null default '{}'::jsonb,
    occurred_at timestamptz not null default timezone('utc', now())
);

alter table public.theme_checkout_sessions enable row level security;
alter table public.theme_commerce_events enable row level security;

create policy "Users can view their checkout sessions"
    on public.theme_checkout_sessions for select
    to authenticated using ((select auth.uid()) = user_id);

create policy "Users can view their commerce events"
    on public.theme_commerce_events for select
    to authenticated using (
        exists (
            select 1 from public.theme_checkout_sessions session
            where session.session_id = theme_commerce_events.session_id
              and session.user_id = (select auth.uid())
        )
    );

grant select on table public.theme_checkout_sessions, public.theme_commerce_events to authenticated;
