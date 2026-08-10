# Useful Supabase queries

These read-only queries are intended for the Supabase SQL Editor. They use the
current TextPlex schema and may expose private account or learner data, so keep
the results internal.

## Schema setup and readiness

The queries below read from TextPlex tables in the `public` schema. The SQL
queries do not create or enable those tables; the corresponding Supabase
migrations must be applied to the hosted project first.

Run this readiness check before troubleshooting an individual query:

```sql
select
  table_name,
  to_regclass(table_name) as resolved_relation,
  case
    when to_regclass(table_name) is null then 'MISSING'
    else 'READY'
  end as status
from (
  values
    ('public.profiles'::text),
    ('public.user_settings'::text),
    ('public.learning_events'::text),
    ('public.theme_catalog'::text),
    ('public.theme_bundles'::text),
    ('public.theme_visual_tokens'::text),
    ('public.theme_entitlements'::text),
    ('public.theme_checkout_sessions'::text),
    ('public.theme_commerce_events'::text)
) as required_tables(table_name)
order by table_name asc;
```

Apply all pending migrations from the repository root:

```powershell
supabase db push
```

If you are working entirely in the Supabase SQL Editor, run the migration file
contents in timestamp order. The public-table dependencies are:

| Tables enabled | Migration |
| --- | --- |
| `profiles`, `user_settings` | `20260721130000_create_profiles.sql` |
| `theme_catalog`, `theme_bundles`, `theme_entitlements` | `20260722120000_create_theme_catalog.sql` plus later theme catalog seed migrations |
| `learning_events` | `20260723100000_create_learning_events.sql` plus `20260810130000_harden_learning_event_sync.sql` |
| `theme_checkout_sessions`, `theme_commerce_events` | `20260723110000_create_theme_commerce.sql` |
| `theme_visual_tokens` | `20260809100000_create_theme_visual_tokens.sql` plus its two seed migrations |
| Signup language and learning-path fields | `20260809130000_add_signup_language_preferences.sql`, then `20260809140000_add_signup_learning_track.sql` |

`auth.users` is managed by Supabase Auth and is not created by these TextPlex
migrations.

Queries 8–10 and the learning-event portion of query 20 require the
`public.learning_events` table. If Supabase reports that the relation does not
exist, apply `supabase/migrations/20260723100000_create_learning_events.sql`
first. Query 7 below intentionally uses sign-in activity only, so it works
even before that optional event-sync table is present.

The application recognizes three product roles: `member`, `tester`, and
`admin`. Missing, invalid, or retired `qa` metadata is treated as `member`.

## Folder structure

- `User Groups`: accounts, roles, signups, and role cleanup
- `Profiles & Preferences`: learner profiles, language settings, and preferences
- `Learning Activity`: learner engagement and event summaries
- `Themes & Commerce`: entitlements, checkouts, and commerce events
- `Security & Database Operations`: RLS, table statistics, and health checks

## User Groups

### 1. All Users and Effective Product Roles

```sql
select
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_app_meta_data->>'textplex_role' as configured_role,
  case
    when raw_app_meta_data->>'textplex_role' in ('member', 'tester', 'admin')
      then raw_app_meta_data->>'textplex_role'
    else 'member'
  end as effective_product_role
from auth.users
order by created_at asc;
```

### 2. Tester Accounts

```sql
select
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_app_meta_data->>'textplex_role' as product_role
from auth.users
where raw_app_meta_data->>'textplex_role' = 'tester'
order by email asc;
```

### 3. Admin Accounts

```sql
select
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_app_meta_data->>'textplex_role' as product_role
from auth.users
where raw_app_meta_data->>'textplex_role' = 'admin'
order by email asc;
```

### 16. Invalid or Legacy Role Metadata

```sql
select
  id,
  email,
  created_at,
  raw_app_meta_data->>'textplex_role' as configured_role
from auth.users
where raw_app_meta_data->>'textplex_role' is not null
  and raw_app_meta_data->>'textplex_role' not in ('member', 'tester', 'admin')
order by email asc;
```

### 17. Recent Account Signups

```sql
select
  id,
  email,
  created_at,
  last_sign_in_at,
  confirmed_at,
  is_sso_user
from auth.users
order by created_at desc
limit 50;
```

## Profiles & Preferences

### 4. Users with Missing Profiles

```sql
select
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
order by u.created_at asc;
```

### 5. Users by Target Language

```sql
select
  case
    when target_language = 'other'
      then concat('Other: ', coalesce(nullif(trim(target_language_other), ''), 'unspecified'))
    else target_language
  end as target_language,
  count(*) as user_count
from public.profiles
group by 1
order by user_count desc, 1 asc;
```

### 6. Users by Learning Track

```sql
select
  learning_track as learning_track_code,
  case learning_track
    when 'local' then 'General reading / self-directed'
    when 'hsk' then 'HSK — Chinese'
    when 'jlpt' then 'JLPT — Japanese'
    when 'topik' then 'TOPIK — Korean'
    when 'trki' then 'TRKI — Russian'
    when 'cefr' then 'CEFR — general proficiency'
    when 'custom' then 'Custom / other'
    when 'not_sure' then 'Not sure yet'
    else 'Other / legacy value'
  end as learning_track_label,
  count(*) as user_count
from public.profiles
group by learning_track
order by user_count desc, learning_track_code asc;
```

### 15. User Settings Overview

```sql
select
  u.id,
  u.email,
  p.display_name,
  count(us.key) as setting_count,
  max(us.updated_at) as last_setting_update,
  max(us.updated_at) filter (where us.key = 'theme') as last_theme_update
from auth.users u
left join public.profiles p on p.id = u.id
left join public.user_settings us on us.user_id = u.id
group by u.id, u.email, p.display_name
order by last_setting_update desc nulls last, u.email asc;
```

## Learning Activity

### 7. Recently Active Learners (Sign-in Based)

```sql
select
  u.id,
  u.email,
  p.display_name,
  u.created_at,
  u.last_sign_in_at,
  coalesce(u.last_sign_in_at, u.created_at) as last_seen_at
from auth.users u
left join public.profiles p on p.id = u.id
where u.last_sign_in_at is not null
order by last_seen_at desc
limit 50;
```

### 8. Users with No Learning Activity

```sql
select
  u.id,
  u.email,
  p.display_name,
  u.created_at,
  u.last_sign_in_at
from auth.users u
left join public.profiles p on p.id = u.id
left join public.learning_events le on le.user_id = u.id
group by u.id, u.email, p.display_name, u.created_at, u.last_sign_in_at
having count(le.event_id) = 0
order by u.created_at asc;
```

### 9. Learning Events by User

```sql
select
  u.id,
  u.email,
  p.display_name,
  count(le.event_id) as event_count,
  min(le.occurred_at) as first_learning_activity,
  max(le.occurred_at) as last_learning_activity
from auth.users u
left join public.profiles p on p.id = u.id
left join public.learning_events le on le.user_id = u.id
group by u.id, u.email, p.display_name
order by event_count desc, last_learning_activity desc nulls last;
```

### 10. Learning Events by Event Type

```sql
select
  event_type,
  count(*) as event_count,
  count(distinct user_id) as unique_users,
  min(occurred_at) as first_event,
  max(occurred_at) as last_event
from public.learning_events
group by event_type
order by event_count desc;
```

## Themes & Commerce

### Theme Visual Token Map

The catalog migration stores each theme's semantic CSS values in `public.theme_visual_tokens`. Expand the JSONB object into one row per component token when inspecting or building the future theme editor:

```sql
select
  tc.id as theme_id,
  tc.title as theme_title,
  tv.color_scheme,
  token_name,
  token_value,
  tv.pattern_image
from public.theme_visual_tokens tv
join public.theme_catalog tc on tc.id = tv.theme_id
cross join lateral jsonb_each_text(tv.tokens) as token(token_name, token_value)
order by tc.sort_order asc, token_name asc;
```

### 11. Theme Entitlement Ownership

```sql
select
  te.user_id,
  u.email,
  p.display_name,
  te.theme_id,
  tc.title as theme_title,
  tc.price_cents,
  te.source,
  te.granted_at
from public.theme_entitlements te
join auth.users u on u.id = te.user_id
left join public.profiles p on p.id = te.user_id
join public.theme_catalog tc on tc.id = te.theme_id
order by te.granted_at desc, u.email asc, tc.title asc;
```

### 12. Granted Themes Not Currently Selected

```sql
select
  te.user_id,
  u.email,
  p.display_name,
  te.theme_id,
  tc.title as theme_title,
  us.value as currently_selected_theme,
  te.source,
  te.granted_at
from public.theme_entitlements te
join auth.users u on u.id = te.user_id
left join public.profiles p on p.id = te.user_id
join public.theme_catalog tc on tc.id = te.theme_id
left join public.user_settings us
  on us.user_id = te.user_id
 and us.key = 'theme'
where us.value is null or us.value <> te.theme_id
order by te.granted_at desc, u.email asc;
```

### 13. Checkout Session Statuses

```sql
select
  status,
  payment_status,
  product_type,
  count(*) as session_count,
  sum(amount_cents) as total_amount_cents,
  min(created_at) as first_session,
  max(created_at) as last_session
from public.theme_checkout_sessions
group by status, payment_status, product_type
order by last_session desc;
```

### 14. Commerce Event History

```sql
select
  e.occurred_at,
  e.event_type,
  e.event_id,
  s.session_id,
  s.user_id,
  u.email,
  s.product_type,
  s.product_id,
  s.amount_cents,
  s.currency,
  e.payload
from public.theme_commerce_events e
join public.theme_checkout_sessions s on s.session_id = e.session_id
join auth.users u on u.id = s.user_id
order by e.occurred_at desc
limit 200;
```

## Security & Database Operations

### 18. RLS Policy Audit

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename asc, policyname asc;
```

### 19. Estimated Database Table Row Counts

```sql
select
  schemaname,
  relname as table_name,
  n_live_tup as estimated_row_count,
  n_dead_tup as estimated_dead_rows,
  last_analyze,
  last_autoanalyze
from pg_stat_user_tables
where schemaname = 'public'
order by n_live_tup desc, relname asc;
```

### 20. Overall Supabase Health Snapshot

```sql
select *
from (
  values
    ('auth.users', (select count(*)::bigint from auth.users)),
    ('public.profiles', (select count(*)::bigint from public.profiles)),
    ('public.user_settings', (select count(*)::bigint from public.user_settings)),
    ('public.learning_events', (select count(*)::bigint from public.learning_events)),
    ('public.theme_catalog', (select count(*)::bigint from public.theme_catalog)),
    ('public.theme_visual_tokens', (select count(*)::bigint from public.theme_visual_tokens)),
    ('public.theme_entitlements', (select count(*)::bigint from public.theme_entitlements)),
    ('public.theme_checkout_sessions', (select count(*)::bigint from public.theme_checkout_sessions)),
    ('public.theme_commerce_events', (select count(*)::bigint from public.theme_commerce_events))
) as snapshot(table_name, row_count)
order by table_name asc;
```
