insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('season-fall-pumpkin-daylight', 'Pumpkin Patch — Daylight', 'Oat cream, pumpkin orange, sage, and deep brown in an illustrated harvest reading atmosphere.', 199, false, 350),
    ('season-fall-pumpkin-night', 'Pumpkin Patch — Night', 'Charcoal, pumpkin ember, muted vine green, and warm lantern light for evening reading.', 199, false, 360)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;

insert into public.theme_bundles (id, title, description, theme_ids, price_cents)
values
    ('fall-editions', 'Fall Editions', 'Four illustrated fall atmospheres spanning maple walks and pumpkin harvest nights.', '["season-fall-maple-daylight", "season-fall-maple-night", "season-fall-pumpkin-daylight", "season-fall-pumpkin-night"]'::jsonb, 649)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    theme_ids = excluded.theme_ids,
    price_cents = excluded.price_cents;
