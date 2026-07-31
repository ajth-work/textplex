insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('city-moscow-daylight', 'Moscow — Daylight', 'Pale birch, red-brick geometry, and cool river-city light inspired by Moscow.', 199, false, 270),
    ('city-moscow-night', 'Moscow — Night', 'Deep navy, cool birch branches, and warm architectural light inspired by Moscow after dark.', 199, false, 280)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;
