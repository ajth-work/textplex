insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('city-hong-kong-daylight', 'Hong Kong — Daylight', 'Harbor water, hillside contours, ferries, and vertical city geometry inspired by Hong Kong.', 199, false, 390),
    ('city-hong-kong-night', 'Hong Kong — Night', 'Deep harbor blue, reflected tower lights, ferries, and hillside city glow inspired by Hong Kong after dark.', 199, false, 400)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;
