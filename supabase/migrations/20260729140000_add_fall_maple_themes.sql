insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('season-fall-maple-daylight', 'Maple Walk — Daylight', 'Parchment, rust, amber, and olive leaves in an illustrated fall reading atmosphere.', 199, false, 330),
    ('season-fall-maple-night', 'Maple Walk — Night', 'Charcoal, ember, and muted leaf tones for a quiet illustrated fall reading atmosphere.', 199, false, 340)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;
