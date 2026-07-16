# Reader Detail Analytics

This note tracks the data we want to surface on the reader detail page. The goal is to turn reading activity into a compact analytics surface without mixing stable book facts with learner-state data.

## Core principle

- **Book truth** lives in the book record and extraction artifacts.
- **Reader truth** lives in the user profile, sessions, and reading events.
- Derived analytics should combine both, but the source data should stay separated.

## Metrics to include

### Progress

- total pages
- pages completed
- pages remaining
- completion percentage
- current page / total pages
- current sentence / total sentences on page
- first read date
- last read date

### Reading time

- total time spent reading
- time spent this session
- number of sessions
- average session length
- longest session
- time per page
- time per sentence
- time per character
- average characters per minute
- average sentences per minute

### Content volume

- total characters in book
- total sentences in book
- average characters per sentence
- average tokens per sentence
- average tokens per page
- average page length in characters
- average page length in sentences

### Pace / fluency

- characters read per minute
- sentences read per minute
- pages read per hour
- slowest page
- fastest page
- longest sentence read
- shortest sentence read
- average pause between sentences
- average pause between pages

### Vocabulary exposure

- unique words encountered
- unique characters encountered
- words seen once / repeated / mastered
- HSK distribution
- unknown words count
- known words count
- review words count
- new words count
- most repeated words
- most repeated characters

### Reader behavior

- tokens clicked
- unique tokens inspected
- definitions opened
- lookups with no match
- re-read pages
- backtracked pages
- session resume count
- bookmark count
- archived / saved / vocabulary-added actions

### Difficulty / comprehension signals

- estimated difficulty score
- average HSK level seen on page
- unknown-token density
- character density per sentence
- sentence complexity score
- page complexity score
- pages with highest unknown-token ratio
- pages with longest dwell time

## First-pass cards

1. **Progress**
   - completion percent
   - pages completed
   - current page / total pages
   - current sentence / total sentences

2. **Reading Pace**
   - total time read
   - session count
   - characters per minute
   - average time per character
   - average time per sentence

3. **Text Structure**
   - total characters
   - total sentences
   - average sentence length
   - average page length

4. **Vocabulary Exposure**
   - known / review / new / unknown counts
   - HSK breakdown
   - most repeated words

5. **Session History**
   - session start and end time
   - duration
   - pages covered

## Useful derived formulas

- `reading_speed_chars_per_minute = completed_characters / total_reading_minutes`
- `reading_speed_sentences_per_minute = completed_sentences / total_reading_minutes`
- `avg_time_per_character = total_reading_seconds / completed_characters`
- `avg_time_per_sentence = total_reading_seconds / completed_sentences`
- `avg_time_per_page = total_reading_seconds / completed_pages`
- `avg_sentence_length = total_characters / total_sentences`
- `avg_page_length = total_characters / total_pages`
- `vocab_unknown_rate = unknown_tokens / total_tokens`
- `lookup_success_rate = matched_lookups / total_lookups`

## Implementation note

The reader detail page should only read from derived surfaces and profile events. It should not duplicate the extraction pipeline or invent its own book state.
