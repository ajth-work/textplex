insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('season-summer-citrus-night', 'Citrus Grove — Night', 'Deep botanical green, citrus amber, and blossom light for a quiet evening orchard mood.', 199, false, 270),
    ('season-summer-meadow-night', 'Sunlit Meadow — Night', 'Midnight blue, dusk wildflowers, soft gold, and drifting meadow detail for evening reading.', 199, false, 280),
    ('season-summer-seaside-night', 'Seaside Garden — Night', 'Deep ocean blue, moonlit shells, cool botanicals, and restrained star-like light.', 199, false, 290)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;

insert into public.theme_bundles (id, title, description, theme_ids, price_cents)
values
    ('summer-editions', 'Summer Editions', 'Six illustrated summer atmospheres spanning citrus, meadow, and seaside color by day and night.', '["season-summer-citrus", "season-summer-citrus-night", "season-summer-meadow", "season-summer-meadow-night", "season-summer-seaside", "season-summer-seaside-night"]'::jsonb, 899)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    theme_ids = excluded.theme_ids,
    price_cents = excluded.price_cents;
