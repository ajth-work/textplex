insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('city-st-petersburg-daylight', 'St. Petersburg — Daylight', 'Canal water, pale façades, blue flowers, and northern daylight inspired by St. Petersburg.', 199, false, 290),
    ('city-st-petersburg-night', 'St. Petersburg — Night', 'Deep canal blue, bridge lights, and floral reflections inspired by St. Petersburg after dark.', 199, false, 300)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;
