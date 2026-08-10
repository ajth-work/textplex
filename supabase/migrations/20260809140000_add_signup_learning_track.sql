-- Capture the learner's preferred progression path during account creation.
-- The language-preference migration runs immediately before this one.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    requested_target_language text;
    requested_target_language_other text;
    requested_learning_track text;
begin
    requested_target_language := trim(coalesce(new.raw_user_meta_data ->> 'target_language', ''));
    if char_length(requested_target_language) not between 2 and 16 then
        requested_target_language := 'zh';
    end if;

    requested_target_language_other := nullif(
        left(trim(coalesce(new.raw_user_meta_data ->> 'target_language_other', '')), 80),
        ''
    );

    requested_learning_track := trim(coalesce(new.raw_user_meta_data ->> 'learning_track', ''));
    if requested_learning_track not in ('local', 'hsk', 'jlpt', 'topik', 'trki', 'cefr', 'custom', 'not_sure') then
        requested_learning_track := 'local';
    end if;

    insert into public.profiles (
        id,
        display_name,
        target_language,
        target_language_other,
        learning_track
    )
    values (
        new.id,
        left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Reader'), 80),
        requested_target_language,
        requested_target_language_other,
        requested_learning_track
    )
    on conflict (id) do nothing;
    return new;
end;
$$;
