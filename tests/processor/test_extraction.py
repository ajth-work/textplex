import processor.extraction as extraction

from processor import build_page_extraction_result, normalize_text, split_sentences, tokenize_sentence


def test_normalize_text_collapses_whitespace() -> None:
    assert normalize_text("  Hello\r\nworld\t ") == "Hello world"


def test_split_sentences_handles_chinese_punctuation() -> None:
    sentences = split_sentences("第一句。第二句！第三句？")

    assert sentences == ["第一句。", "第二句！", "第三句？"]


def test_build_page_extraction_result_collects_tokens_and_lexical_entries() -> None:
    result = build_page_extraction_result(
        book_id="book-123",
        page_number=8,
        language_code="zh",
        raw_text="科学边界。三体世界！",
    )

    assert result.page_number == 8
    assert result.clean_text == "科学边界。三体世界！"
    assert len(result.sentences) == 2
    assert len(result.token_occurrences) >= 4
    assert len(result.lexical_entries) >= 4
    assert result.sentences[0].tokens[0].surface_form == "科"


def test_tokenize_sentence_keeps_latin_words_together() -> None:
    tokens = tokenize_sentence("OpenAI builds tools.", "en")

    assert [token.surface_form for token in tokens] == ["OpenAI", "builds", "tools"]


def test_tokenize_sentence_uses_chinese_segmenter_when_available(monkeypatch) -> None:
    monkeypatch.setattr(extraction, "_jieba_lcut", lambda text, cut_all=False, HMM=True: ["科学", "边界"])

    tokens = tokenize_sentence("科学边界", "zh")

    assert [token.surface_form for token in tokens] == ["科学", "边界"]
