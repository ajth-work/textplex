create table if not exists public.learning_events (
    event_id text primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    idempotency_key text not null,
    event_type text not null,
    book_id text not null,
    occurred_at timestamptz not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    constraint learning_events_type check (event_type in ('reading_session', 'page_read', 'sentence_read')),
    constraint learning_events_idempotency_unique unique (user_id, idempotency_key)
);

comment on table public.learning_events is 'Authenticated learner events replicated from local-first profile stores.';

create index if not exists learning_events_user_occurred_idx
    on public.learning_events (user_id, occurred_at, event_id);

alter table public.learning_events enable row level security;

create policy "Users can view their own learning events"
    on public.learning_events for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can create their own learning events"
    on public.learning_events for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

grant select, insert on table public.learning_events to authenticated;
revoke all on table public.learning_events from anon;
