-- Role selection is persisted by the API's server-only Supabase Auth Admin API.
-- This migration is kept as the historical placeholder for the first role
-- migration attempt; the public RPC is removed by the follow-up migration.

create or replace function public.set_textplex_account_role(requested_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    normalized_role text := nullif(trim(requested_role), '');
begin
    if (select auth.uid()) is null then
        raise exception 'Authentication is required.';
    end if;

    if normalized_role not in ('member', 'tester') then
        raise exception 'Only member and tester roles can be selected during onboarding.';
    end if;

    update auth.users
    set raw_app_meta_data = jsonb_set(
        coalesce(raw_app_meta_data, '{}'::jsonb),
        '{textplex_role}',
        to_jsonb(normalized_role),
        true
    )
    where id = (select auth.uid());

    if not found then
        raise exception 'Authenticated account was not found.';
    end if;

    return normalized_role;
end;
$$;

revoke all on function public.set_textplex_account_role(text) from public;
grant execute on function public.set_textplex_account_role(text) to authenticated;
