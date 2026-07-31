insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('season-fall-harvest-daylight', 'Harvest Orchard — Daylight', 'Warm ivory, cranberry, golden wheat, and orchard green in an illustrated fall reading atmosphere.', 199, false, 370),
    ('season-fall-harvest-night', 'Harvest Orchard — Night', 'Midnight navy, cranberry fruit, amber leaves, and soft orchard light for evening reading.', 199, false, 380)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;

insert into public.theme_bundles (id, title, description, theme_ids, price_cents)
values
    ('fall-editions', 'Fall Editions', 'Six illustrated fall atmospheres spanning maple walks, pumpkin patches, and harvest orchards.', '["season-fall-maple-daylight", "season-fall-maple-night", "season-fall-pumpkin-daylight", "season-fall-pumpkin-night", "season-fall-harvest-daylight", "season-fall-harvest-night"]'::jsonb, 899)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    theme_ids = excluded.theme_ids,
    price_cents = excluded.price_cents;
