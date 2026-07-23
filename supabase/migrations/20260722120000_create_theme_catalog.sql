create table if not exists public.theme_catalog (
    id text primary key,
    title text not null,
    description text not null,
    price_cents integer not null default 0 check (price_cents >= 0),
    is_free boolean not null default false,
    preview_available boolean not null default true,
    sort_order integer not null default 0
);

create table if not exists public.theme_bundles (
    id text primary key,
    title text not null,
    description text not null,
    theme_ids jsonb not null default '[]'::jsonb,
    price_cents integer not null default 0 check (price_cents >= 0)
);

create table if not exists public.theme_entitlements (
    user_id uuid not null references auth.users (id) on delete cascade,
    theme_id text not null references public.theme_catalog (id) on delete cascade,
    granted_at timestamptz not null default timezone('utc', now()),
    source text not null default 'manual',
    primary key (user_id, theme_id)
);

alter table public.theme_catalog enable row level security;
alter table public.theme_bundles enable row level security;
alter table public.theme_entitlements enable row level security;

create policy "Theme catalog is readable"
    on public.theme_catalog for select
    to anon, authenticated using (true);

create policy "Theme bundles are readable"
    on public.theme_bundles for select
    to anon, authenticated using (true);

create policy "Users can view their theme entitlements"
    on public.theme_entitlements for select
    to authenticated using ((select auth.uid()) = user_id);

grant select on table public.theme_catalog, public.theme_bundles to anon, authenticated;
grant select on table public.theme_entitlements to authenticated;
revoke all on table public.theme_entitlements from anon;

insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('neutral', 'Neutral', 'Bright ivory surfaces with a restrained amber accent.', 0, true, 10),
    ('sepia', 'Warm Sepia', 'Parchment cream, tea-brown contrast, and editorial warmth.', 0, true, 20),
    ('ink', 'Dark Ink', 'Soft charcoal surfaces with warm gold highlights.', 0, true, 30),
    ('black', 'Pitch Black', 'Near-black canvas with a quiet cool-gold accent.', 0, true, 40),
    ('jade', 'Jade', 'Deep green surfaces with gold-flecked contrast.', 199, false, 50),
    ('ceramic', 'Ceramic', 'Cool porcelain tones with slate and mist accents.', 199, false, 60),
    ('crimson', 'Crimson Gold', 'Lacquer red depth with luminous gold detail.', 199, false, 70),
    ('nes', 'NES', 'Warm cartridge gray, deep navy, and signal red.', 199, false, 80),
    ('famicom', 'Famicom', 'Cream plastic, oxblood red, and soft charcoal detail.', 199, false, 90),
    ('snes', 'SNES', 'Cool lavender, graphite, and playful purple accents.', 199, false, 100),
    ('super-famicom', 'Super Famicom', 'Charcoal hardware, muted teal, and coral control accents.', 199, false, 110)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;

insert into public.theme_bundles (id, title, description, theme_ids, price_cents)
values (
    'classic-consoles',
    'Classic Consoles',
    'Four hardware-inspired reading atmospheres from the NES through the Super Famicom.',
    '["nes", "famicom", "snes", "super-famicom"]'::jsonb,
    649
)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    theme_ids = excluded.theme_ids,
    price_cents = excluded.price_cents;
