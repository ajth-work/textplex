insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values (
    'fruit-strawberry-night',
    'Strawberry — Night',
    'Deep berry canvas, dusky blossoms, and warm strawberry highlights for evening reading.',
    199,
    false,
    125
)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;
