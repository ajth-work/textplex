-- Store the semantic visual tokens that currently live in apps/web/app/globals.css.
-- The JSONB payload keeps the editor data-driven while preserving CSS values such as
-- rgba(), gradients, shadows, and var() references until the renderer is migrated.
create table if not exists public.theme_visual_tokens (
    theme_id text primary key references public.theme_catalog (id) on delete cascade,
    color_scheme text not null check (color_scheme in ('light', 'dark')),
    tokens jsonb not null default '{}'::jsonb check (jsonb_typeof(tokens) = 'object'),
    pattern_image text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.theme_visual_tokens is
    'Semantic visual tokens for each catalog theme, extracted from the web theme CSS for future theme editing.';

alter table public.theme_visual_tokens enable row level security;

drop policy if exists "Theme visual tokens are readable" on public.theme_visual_tokens;
create policy "Theme visual tokens are readable"
    on public.theme_visual_tokens for select
    to anon, authenticated using (true);

grant select on table public.theme_visual_tokens to anon, authenticated;
