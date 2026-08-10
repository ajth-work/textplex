alter table public.learning_events
    drop constraint if exists learning_events_type;

alter table public.learning_events
    add constraint learning_events_type check (
        event_type in (
            'reading_session',
            'page_read',
            'sentence_read',
            'study_vocabulary_item',
            'word_interaction'
        )
    );

alter table public.learning_events
    add constraint learning_events_event_id_nonempty check (char_length(trim(event_id)) > 0);

alter table public.learning_events
    add constraint learning_events_idempotency_key_nonempty check (char_length(trim(idempotency_key)) > 0);

comment on column public.learning_events.event_id is 'Stable local event identifier; retries must reuse this value.';
comment on column public.learning_events.idempotency_key is 'Per-user deduplication key; duplicate uploads are ignored.';

grant select, insert on table public.learning_events to authenticated;
revoke all on table public.learning_events from anon;
