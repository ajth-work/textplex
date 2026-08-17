from processor import (
    build_page_extraction_result,
    extraction,
    normalize_text,
    split_sentences,
    stitch_page_sentence_carryover,
    tokenize_sentence,
)


def test_normalize_text_collapses_whitespace() -> None:
    assert normalize_text("  Hello\r\nworld\t ") == "Hello world"


def test_split_sentences_handles_chinese_punctuation() -> None:
    sentences = split_sentences("\u7b2c\u4e00\u53e5\u3002\u7b2c\u4e8c\u53e5\uff01\u7b2c\u4e09\u53e5\uff1f")

    assert sentences == ["\u7b2c\u4e00\u53e5\u3002", "\u7b2c\u4e8c\u53e5\uff01", "\u7b2c\u4e09\u53e5\uff1f"]


def test_build_page_extraction_result_marks_terminal_quotes_as_sentence_enders() -> None:
    result = build_page_extraction_result(
        book_id="book-quoted",
        page_number=1,
        language_code="zh",
        raw_text="\u4ed6\u8bf4\uff1a\u201c\u4f60\u597d\u3002\u201d",
    )

    assert result.page_ends_with_sentence_terminator is True
    assert result.sentences[0].ends_with_sentence_terminator is True


def test_build_page_extraction_result_applies_translations_to_sentences() -> None:
    result = build_page_extraction_result(
        book_id="book-translated",
        page_number=1,
        language_code="zh",
        raw_text="\u8fd9\u662f\u7b2c\u4e00\u53e5\u3002\u8fd9\u662f\u7b2c\u4e8c\u53e5\u3002",
        sentence_texts=["\u8fd9\u662f\u7b2c\u4e00\u53e5\u3002", "\u8fd9\u662f\u7b2c\u4e8c\u53e5\u3002"],
        sentence_translations=["This is the first sentence.", "This is the second sentence."],
        sentence_translation_sources=["google_translate_live", "google_translate_cache"],
        page_translation="This is page one.",
        page_translation_source="google_translate_live",
    )

    assert result.page_translation == "This is page one."
    assert result.page_translation_source == "google_translate_live"
    assert result.sentences[0].translation == "This is the first sentence."
    assert result.sentences[0].translation_source == "google_translate_live"
    assert result.sentences[1].translation == "This is the second sentence."
    assert result.sentences[1].translation_source == "google_translate_cache"


def test_stitch_page_sentence_carryover_moves_open_sentence_to_previous_page(monkeypatch) -> None:
    monkeypatch.setattr(
        extraction,
        "_jieba_lcut",
        lambda text, cut_all=False, HMM=True: text.split(),
    )

    first_page = build_page_extraction_result(
        book_id="book-123",
        page_number=1,
        language_code="en",
        raw_text="The red dog",
    )
    second_page = build_page_extraction_result(
        book_id="book-123",
        page_number=2,
        language_code="en",
        raw_text="ate some dog food. Another line follows.",
    )

    stitched = stitch_page_sentence_carryover([first_page, second_page])

    assert stitched[0].sentences[0].text == "The red dog ate some dog food."
    assert stitched[0].sentences[0].ends_with_sentence_terminator is True
    assert [sentence.text for sentence in stitched[1].sentences] == ["Another line follows."]


def test_build_page_extraction_result_collects_tokens_and_lexical_entries(monkeypatch) -> None:
    monkeypatch.setattr(
        extraction,
        "_jieba_lcut",
        lambda text, cut_all=False, HMM=True: ["\u79d1\u5b66", "\u8fb9\u754c"] if "\u79d1\u5b66\u8fb9\u754c" in text else ["\u4e09\u4f53", "\u4e16\u754c"],
    )

    result = build_page_extraction_result(
        book_id="book-123",
        page_number=8,
        language_code="zh",
        raw_text="\u79d1\u5b66\u8fb9\u754c\u3002\u4e09\u4f53\u4e16\u754c\uff01",
    )

    assert result.page_number == 8
    assert result.clean_text == "\u79d1\u5b66\u8fb9\u754c\u3002\u4e09\u4f53\u4e16\u754c\uff01"
    assert len(result.sentences) == 2
    assert len(result.token_occurrences) >= 4
    assert len(result.lexical_entries) >= 4
    assert result.sentences[0].tokens[0].surface_form == "\u79d1\u5b66"


def test_tokenize_sentence_keeps_latin_words_together() -> None:
    tokens = tokenize_sentence("OpenAI builds tools.", "en")

    assert [token.surface_form for token in tokens] == ["OpenAI", "builds", "tools"]
    assert [token.language_code for token in tokens] == ["en", "en", "en"]


def test_tokenize_sentence_assigns_language_per_script_for_mixed_text() -> None:
    tokens = tokenize_sentence("Привет OpenAI 이선중.", "ru")

    assert [token.surface_form for token in tokens] == ["Привет", "OpenAI", "이선중"]
    assert [token.language_code for token in tokens] == ["ru", "en", "ko"]


def test_tokenize_sentence_uses_chinese_segmenter_when_available(monkeypatch) -> None:
    monkeypatch.setattr(extraction, "_jieba_lcut", lambda text, cut_all=False, HMM=True: ["\u79d1\u5b66", "\u8fb9\u754c"])

    tokens = tokenize_sentence("\u79d1\u5b66\u8fb9\u754c", "zh")

    assert [token.surface_form for token in tokens] == ["\u79d1\u5b66", "\u8fb9\u754c"]


def test_tokenize_sentence_keeps_korean_words_together() -> None:
    tokens = tokenize_sentence("\uc544\uce68\uc5d0 \uac00\uac8c\uc5d0 \uac14\uc5b4\uc694.", "ko")

    assert [token.surface_form for token in tokens] == ["\uc544\uce68\uc5d0", "\uac00\uac8c\uc5d0", "\uac14\uc5b4\uc694"]


def test_tokenize_sentence_keeps_japanese_hiragana_and_katakana_together() -> None:
    tokens = tokenize_sentence("\u4eca\u65e5\u306f\u30b3\u30d4\u30fc\u3067\u52c9\u5f37\u3057\u307e\u3057\u305f\u3002", "ja")

    assert [token.surface_form for token in tokens] == ["\u4eca\u65e5", "\u306f", "\u30b3\u30d4\u30fc", "\u3067", "\u52c9\u5f37\u3057\u307e\u3057\u305f"]


def test_tokenize_sentence_keeps_japanese_okurigana_attached_to_words() -> None:
    tokens = tokenize_sentence("\u671d\u306f\u6c34\u3092\u5c11\u3057\u98f2\u307f\u3001\u9854\u3092\u6d17\u3044\u307e\u3059\u3002", "ja")

    assert [token.surface_form for token in tokens] == [
        "\u671d",
        "\u306f",
        "\u6c34",
        "\u3092",
        "\u5c11\u3057",
        "\u98f2\u307f",
        "\u9854",
        "\u3092",
        "\u6d17\u3044\u307e\u3059",
    ]


def test_tokenize_sentence_keeps_japanese_nominal_suffixes_attached_to_pronouns() -> None:
    tokens = tokenize_sentence("私たちははいと答える。学生たちが来る。", "ja")

    assert [token.surface_form for token in tokens] == [
        "私たち",
        "は",
        "はい",
        "と",
        "答える",
        "学生たち",
        "が",
        "来る",
    ]


def test_tokenize_sentence_keeps_japanese_conjugations_and_na_adjectives_together() -> None:
    tokens = tokenize_sentence("正しい。完全な強固さとしなやかさが、間違ってはいなくても。", "ja")

    assert [token.surface_form for token in tokens] == [
        "正しい",
        "完全な",
        "強固さ",
        "と",
        "しなやかさ",
        "が",
        "間違ってはいなくても",
    ]


def test_tokenize_sentence_uses_morphology_for_japanese_word_boundaries() -> None:
    tokens = tokenize_sentence("私は学校に行かなければならない。昨日、友達と映画を見てしまった。", "ja")

    assert [token.surface_form for token in tokens] == [
        "私",
        "は",
        "学校",
        "に",
        "行かなければならない",
        "昨日",
        "友達",
        "と",
        "映画",
        "を",
        "見てしまった",
    ]


def test_tokenize_sentence_keeps_russian_words_together() -> None:
    tokens = tokenize_sentence("\u041f\u0440\u0438\u0432\u0435\u0442, \u043c\u0438\u0440!", "ru")

    assert [token.surface_form for token in tokens] == ["\u041f\u0440\u0438\u0432\u0435\u0442", "\u043c\u0438\u0440"]


def test_tokenize_sentence_keeps_arabic_words_together() -> None:
    tokens = tokenize_sentence("\u0645\u0631\u062d\u0628\u0627 \u0628\u0627\u0644\u0639\u0627\u0644\u0645.", "ar")

    assert [token.surface_form for token in tokens] == ["\u0645\u0631\u062d\u0628\u0627", "\u0628\u0627\u0644\u0639\u0627\u0644\u0645"]


def test_tokenize_sentence_keeps_hebrew_words_together() -> None:
    tokens = tokenize_sentence("\u05d0\u05e0\u05d9 \u05d1\u05d1\u05d9\u05ea.", "he")

    assert [token.surface_form for token in tokens] == ["\u05d0\u05e0\u05d9", "\u05d1\u05d1\u05d9\u05ea"]


def test_tokenize_sentence_falls_back_to_characters_when_jieba_is_missing(monkeypatch) -> None:
    monkeypatch.setattr(extraction, "_jieba_lcut", None)

    tokens = tokenize_sentence("\u79d1\u5b66\u8fb9\u754c", "zh")

    assert [token.surface_form for token in tokens] == ["\u79d1", "\u5b66", "\u8fb9", "\u754c"]
