# TextPlex account roles

TextPlex keeps Supabase's built-in `authenticated` database role separate from its product role. Product roles are read from the trusted Supabase `app_metadata.textplex_role` field and default to `member` when the field is absent or invalid.

| Product role | Intended use | Permissions |
| --- | --- | --- |
| `member` | Normal learner account | Account-owned reading, profile, and settings data |
| `qa` | Internal testing account | Member access plus premium theme previews, experimental language access, and translation fallback testing |
| `admin` | Platform operations | QA access plus global usage reports, account management, and entitlement management |

## Bootstrap a QA account

Create the account through the TextPlex sign-up flow first. Then use a protected Supabase SQL Editor session to assign the role. Replace the email and role values deliberately:

```sql
update auth.users
set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{textplex_role}',
    to_jsonb('qa'::text),
    true
)
where email = 'qa@textplex.co';
```

The API treats every new account as `member` until this trusted field is assigned. Users cannot promote themselves through browser-editable profile metadata.

## Usage boundaries

Authenticated Google Translation usage is stored per account for the reader dashboard. The API also retains a separate service-wide counter for provider quota and billing operations. Only `admin` accounts can read the service-wide endpoint.
