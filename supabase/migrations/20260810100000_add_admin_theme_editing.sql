-- Admin-only write access for the first TextPlex theme console.
-- Public and authenticated users retain read access to catalog and visual data.

create or replace function public.is_textplex_admin()
returns boolean
language sql
stable
as $$
    select coalesce(
        (select auth.jwt() -> 'app_metadata' ->> 'textplex_role') = 'admin',
        false
    );
$$;

revoke all on function public.is_textplex_admin() from public;
grant execute on function public.is_textplex_admin() to authenticated;

drop policy if exists "Admins can create themes" on public.theme_catalog;
create policy "Admins can create themes"
    on public.theme_catalog for insert
    to authenticated
    with check ((select public.is_textplex_admin()));

drop policy if exists "Admins can update themes" on public.theme_catalog;
create policy "Admins can update themes"
    on public.theme_catalog for update
    to authenticated
    using ((select public.is_textplex_admin()))
    with check ((select public.is_textplex_admin()));

drop policy if exists "Admins can create theme bundles" on public.theme_bundles;
create policy "Admins can create theme bundles"
    on public.theme_bundles for insert
    to authenticated
    with check ((select public.is_textplex_admin()));

drop policy if exists "Admins can update theme bundles" on public.theme_bundles;
create policy "Admins can update theme bundles"
    on public.theme_bundles for update
    to authenticated
    using ((select public.is_textplex_admin()))
    with check ((select public.is_textplex_admin()));

drop policy if exists "Admins can create visual tokens" on public.theme_visual_tokens;
create policy "Admins can create visual tokens"
    on public.theme_visual_tokens for insert
    to authenticated
    with check ((select public.is_textplex_admin()));

drop policy if exists "Admins can update visual tokens" on public.theme_visual_tokens;
create policy "Admins can update visual tokens"
    on public.theme_visual_tokens for update
    to authenticated
    using ((select public.is_textplex_admin()))
    with check ((select public.is_textplex_admin()));

grant insert, update on table public.theme_catalog to authenticated;
grant insert, update on table public.theme_bundles to authenticated;
grant insert, update on table public.theme_visual_tokens to authenticated;
