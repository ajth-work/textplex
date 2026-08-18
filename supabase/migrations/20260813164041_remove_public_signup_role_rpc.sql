-- Role assignment is performed by the API's server-only Supabase Auth Admin API.
-- Remove the temporary public RPC so no security-definer auth mutation is exposed.

drop function if exists public.set_textplex_account_role(text);
