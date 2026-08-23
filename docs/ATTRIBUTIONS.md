# TextPlex Data Attributions

## JMdict

TextPlex may include a generated Japanese dictionary projection derived from the
English JMdict distribution (`JMdict_e.xml` or `JMdict_e.gz`). JMdict is
maintained by the Electronic Dictionary Research and Development Group (EDRDG).

The JMdict-derived data is used under the [EDRDG dictionary licence](https://kanjixml.sourceforge.net/kanjidicLicense.html).
The source documentation and licence notice must accompany any distribution of
the JMdict-derived data. The application must not imply that TextPlex owns the
underlying dictionary data.

Each imported snapshot records its source URL, version, retrieval time,
SHA-256 checksum, licence URL, and attribution text in the `lexicon_sources`
table. The `jmdict_entries` table preserves the upstream `ent_seq` and source
payload for reproducibility; `lexicon_entries` is only the runtime lookup
projection.

Default source URL: <http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz>

Required product acknowledgement:

> Japanese dictionary data derived from JMdict, maintained by the Electronic
> Dictionary Research and Development Group (EDRDG), used under the EDRDG
> dictionary licence.

For a commercial product or a paid server, review the EDRDG terms and obtain
permission if required before distributing the JMdict-derived data.
