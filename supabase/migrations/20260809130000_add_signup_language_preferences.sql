-- Capture the language selected during account creation and optional product suggestions.

alter table public.profiles
    add column if not exists target_language_other text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'profiles_target_language_other_length'
          and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles
            add constraint profiles_target_language_other_length
            check (
                target_language_other is null
                or char_length(trim(target_language_other)) between 1 and 80
            );
    end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    requested_target_language text;
    requested_target_language_other text;
begin
    requested_target_language := trim(coalesce(new.raw_user_meta_data ->> 'target_language', ''));
    if char_length(requested_target_language) not between 2 and 16 then
        requested_target_language := 'zh';
    end if;

    requested_target_language_other := nullif(
        left(trim(coalesce(new.raw_user_meta_data ->> 'target_language_other', '')), 80),
        ''
    );

    insert into public.profiles (id, display_name, target_language, target_language_other)
    values (
        new.id,
        left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Reader'), 80),
        requested_target_language,
        requested_target_language_other
    )
    on conflict (id) do nothing;
    return new;
end;
$$;
