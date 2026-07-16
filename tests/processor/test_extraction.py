import processor.extraction as extraction

from processor import build_page_extraction_result, normalize_text, split_sentences, stitch_page_sentence_carryover, tokenize_sentence


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
        page_translation="This is page one.",
    )

    assert result.page_translation == "This is page one."
    assert result.sentences[0].translation == "This is the first sentence."
    assert result.sentences[1].translation == "This is the second sentence."


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


def test_tokenize_sentence_uses_chinese_segmenter_when_available(monkeypatch) -> None:
    monkeypatch.setattr(extraction, "_jieba_lcut", lambda text, cut_all=False, HMM=True: ["\u79d1\u5b66", "\u8fb9\u754c"])

    tokens = tokenize_sentence("\u79d1\u5b66\u8fb9\u754c", "zh")

    assert [token.surface_form for token in tokens] == ["\u79d1\u5b66", "\u8fb9\u754c"]


def test_tokenize_sentence_falls_back_to_characters_when_jieba_is_missing(monkeypatch) -> None:
    monkeypatch.setattr(extraction, "_jieba_lcut", None)

    tokens = tokenize_sentence("\u79d1\u5b66\u8fb9\u754c", "zh")

    assert [token.surface_form for token in tokens] == ["\u79d1", "\u5b66", "\u8fb9", "\u754c"]
