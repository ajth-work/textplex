insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('city-kazan-daylight', 'Kazan — Daylight', 'Cream stone, terracotta towers, botanical branches, and ornamental detail inspired by Kazan.', 199, false, 310),
    ('city-kazan-night', 'Kazan — Night', 'Deep blue, illuminated domes, stars, and quiet floral ornament inspired by Kazan after dark.', 199, false, 320)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;
