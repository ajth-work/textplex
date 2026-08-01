update public.theme_catalog
set description = 'Console gray canvas, black cards, and signal-red actions.'
where id = 'nes';

insert into public.theme_catalog (id, title, description, price_cents, is_free, sort_order)
values
    ('fruit-strawberry', 'Strawberry', 'Pale blush, warm cream, and a restrained berry-red accent.', 199, false, 120),
    ('fruit-blueberry', 'Blueberry', 'Mist blue surfaces with cool white cards and indigo focus.', 199, false, 130),
    ('fruit-citrus', 'Citrus', 'Lemon cream, warm white cards, and a tangerine-coral accent.', 199, false, 140),
    ('fruit-mango', 'Mango', 'Golden apricot atmosphere with parchment cards and burnt orange.', 199, false, 150),
    ('fruit-watermelon', 'Watermelon', 'Pale rind green, cool blush, and a separate coral-pink accent.', 199, false, 160),
    ('fruit-grape', 'Grape', 'Muted lavender, pale lilac cards, and deep plum detail.', 199, false, 170),
    ('vegetable-avocado', 'Avocado', 'Soft sage, avocado cream, and forest-green reading surfaces.', 199, false, 180),
    ('vegetable-carrot', 'Carrot', 'Warm sand, cream cards, and a muted carrot-orange accent.', 199, false, 190),
    ('vegetable-tomato', 'Tomato', 'Dusty tomato blush, warm ivory cards, and restrained basil support.', 199, false, 200),
    ('vegetable-corn', 'Corn', 'Butter yellow softened by oat, olive, and warm cream surfaces.', 199, false, 210),
    ('vegetable-cucumber', 'Cucumber', 'Cool mint, porcelain cards, and a fresh cucumber-green accent.', 199, false, 220),
    ('vegetable-eggplant', 'Eggplant', 'Aubergine atmosphere, pale lavender cards, and deep plum detail.', 199, false, 230),
    ('season-summer-citrus', 'Citrus Grove', 'Warm cream, citrus color, blossom white, and botanical green.', 199, false, 240),
    ('season-summer-meadow', 'Sunlit Meadow', 'Pale sky, wildflower color, cream, and soft meadow green.', 199, false, 250),
    ('season-summer-seaside', 'Seaside Garden', 'Aqua, sand, coral, sea grass, and deep teal in a coastal garden mood.', 199, false, 260)
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    is_free = excluded.is_free,
    sort_order = excluded.sort_order;

insert into public.theme_bundles (id, title, description, theme_ids, price_cents)
values
    (
        'fruit-stand',
        'Fruit Stand',
        'Six bright, fresh market-inspired reading atmospheres with calm editorial surfaces.',
        '["fruit-strawberry", "fruit-blueberry", "fruit-citrus", "fruit-mango", "fruit-watermelon", "fruit-grape"]'::jsonb,
        899
    ),
    (
        'garden-harvest',
        'Garden Harvest',
        'Six grounded botanical palettes with muted warmth and comfortable reading contrast.',
        '["vegetable-avocado", "vegetable-carrot", "vegetable-tomato", "vegetable-corn", "vegetable-cucumber", "vegetable-eggplant"]'::jsonb,
        899
    ),
    (
        'summer-editions',
        'Summer Editions',
        'Three illustrated summer atmospheres spanning citrus, meadow, and seaside color.',
        '["season-summer-citrus", "season-summer-meadow", "season-summer-seaside"]'::jsonb,
        499
    )
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    theme_ids = excluded.theme_ids,
    price_cents = excluded.price_cents;
