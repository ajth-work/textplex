# Non-Romanized Language Test Corpus

This document picks starter public-domain texts for testing the non-Romanized language pipeline.

Use these as processor and reader smoke-test candidates, not as the final word on literary coverage.

## Selection Rule

For each language:

- prefer a source text that is already public domain or clearly open in the source repository
- use one shorter work for tokenization and sentence handling
- use one longer work for page stitching, chapter flow, and throughput
- prefer original-language texts over modern translations unless the translation itself is the target

## Starter Set

| Language | Primary test text | Backup test text | Why it is useful |
|---|---|---|---|
| Korean | [`창란호연록`](https://ko.wikisource.org/wiki/%EC%B0%BD%EB%9E%80%ED%98%B8%EC%97%B0%EB%A1%9D) | [`사씨남정기`](https://ko.wikisource.org/wiki/%EC%83%89%EC%9D%B8%3A%EC%82%AC%EC%94%A8%EB%82%A8%EC%A0%95%EA%B8%B0_3.pdf) | Classical Korean prose, long-form chapter structure, and older orthographic patterns. |
| Japanese | [`坊っちゃん`](https://ja.wikisource.org/wiki/%E5%9D%8A%E3%81%A3%E3%81%A1%E3%82%83%E3%82%93) | [`こころ`](https://ja.wikisource.org/wiki/%E3%81%93%E3%81%93%E3%82%8D) | Modern prose, dialogue, punctuation, and chapter flow. |
| Chinese | [`孙子兵法`](https://zh.wikisource.org/wiki/%E5%AD%99%E5%AD%90%E5%85%B5%E6%B3%95) | [`红楼梦（程乙本）`](https://zh.wikisource.org/wiki/%E7%B4%85%E6%A8%93%E5%A4%A2%EF%BC%88%E7%A8%8B%E4%B9%99%E6%9C%AC%EF%BC%89) | Sentence segmentation, token hints, classical + vernacular balance, and long chapter flow. |
| Russian | [`Капитанская дочка`](https://ru.wikisource.org/wiki/%D0%9A%D0%B0%D0%BF%D0%B8%D1%82%D0%B0%D0%BD%D1%81%D0%BA%D0%B0%D1%8F_%D0%B4%D0%BE%D1%87%D0%BA%D0%B0_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) | [`Война и мир`](https://ru.wikisource.org/wiki/%D0%92%D0%BE%D0%B9%D0%BD%D0%B0_%D0%B8_%D0%BC%D0%B8%D1%80_%28%D0%A2%D0%BE%D0%BB%D1%81%D1%82%D0%BE%D0%B9%29) | Cyrillic tokenization, dialogue, long prose, and pre-reform spelling exposure. |
| Hebrew | [`בן סירא`](https://he.wikisource.org/wiki/%D7%91%D7%9F_%D7%A1%D7%99%D7%A8%D7%90) | [`ספר יצירה`](https://he.wikisource.org/wiki/%D7%A1%D7%A4%D7%A8_%D7%99%D7%A6%D7%99%D7%A8%D7%94_%D7%95_%D7%91) | Right-to-left handling, classical Hebrew, optional niqqud, and compact verse/prose mixes. |
| Arabic | [`طوق الحمامة`](https://ar.wikisource.org/wiki/%D8%B7%D9%88%D9%82_%D8%A7%D9%84%D8%AD%D9%85%D8%A7%D9%85%D8%A9) | [`رسالة الغفران`](https://ar.wikisource.org/wiki/%D8%B1%D8%B3%D8%A7%D9%84%D8%A9_%D8%A7%D9%84%D8%BA%D9%81%D8%B1%D8%A7%D9%86) | Right-to-left handling, classical prose, ornate punctuation, and complex sentence boundaries. |

## How To Use Them

Start with the primary text for each language when validating:

- import
- page splitting
- tokenization
- lexicon attachment
- reader rendering

Use the backup text when you want to stress a different property of the same language:

- a short work paired with a long work
- a prose work paired with a more classical or ornate work
- a simpler segmentation case paired with a more difficult one

## Implementation Notes

- Korean and Japanese are the best first-wave languages for content volume and learner demand.
- Chinese is already central to the current pipeline and should remain a first-wave target.
- Russian and Hebrew are strong second-wave candidates for script coverage and literary value.
- Arabic should be tested with right-to-left handling in mind, even if it ships later.

For longer synthetic smoke-test passages, see [Non-Romanized Language Test Samples](./NON_ROMANIZED_LANGUAGE_TEST_SAMPLES.md).

## Caveat

Public-domain status can depend on jurisdiction and on whether you are using the original work or a later translation or edition. For internal processor tests, prefer the source repository's public-domain-marked originals and verify any shipping fixture separately.
