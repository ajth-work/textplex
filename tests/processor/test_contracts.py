import pytest
from processor.contracts import (
    LexicalIdentity,
    PageExtractionResult,
    SentenceResult,
    TokenResult,
    build_lexical_identity_key,
)
from pydantic import ValidationError


def test_page_extraction_result_accepts_minimal_valid_payload() -> None:
    result = PageExtractionResult(
        book_id="book-alice-mini",
        page_number=1,
        language_code="en",
        raw_text="Alice was beginning to get very tired.",
        clean_text="Alice was beginning to get very tired.",
        sentences=[
            SentenceResult(
                order=1,
                text="Alice was beginning to get very tired.",
                tokens=[
                    TokenResult(order=1, surface_form="Alice", lemma="alice"),
                    TokenResult(order=2, surface_form="was", lemma="be"),
                ],
            )
        ],
    )

    assert result.page_number == 1
    assert result.sentences[0].tokens[0].surface_form == "Alice"
    assert result.sentences[0].tokens[0].lexical_identity is None


def test_page_extraction_result_rejects_page_number_below_one() -> None:
    with pytest.raises(ValidationError):
        PageExtractionResult(
            book_id="book-alice-mini",
            page_number=0,
            language_code="en",
            raw_text="bad page",
            clean_text="bad page",
            sentences=[],
        )


def test_lexical_identity_key_is_stable_across_canonical_equivalents() -> None:
    first = build_lexical_identity_key(language_code="EN_us", lemma=" Caf\u00e9 ", part_of_speech="NOUN")
    second = build_lexical_identity_key(language_code="en-US", lemma="CAFE\u0301", part_of_speech="noun")

    assert first == second
    assert first.startswith("lex:v1:")


def test_lexical_identity_key_separates_parts_of_speech_and_senses() -> None:
    noun = LexicalIdentity(language_code="en", lemma="record", part_of_speech="noun", status="resolved")
    verb = LexicalIdentity(language_code="en", lemma="record", part_of_speech="verb", status="resolved")
    first_sense = LexicalIdentity(language_code="en", lemma="bank", sense_id="financial", status="resolved")
    second_sense = LexicalIdentity(language_code="en", lemma="bank", sense_id="river", status="resolved")

    assert noun.identity_key != verb.identity_key
    assert first_sense.identity_key != second_sense.identity_key


def test_lexical_identity_preserves_explicit_ambiguity_and_low_confidence() -> None:
    identity = LexicalIdentity(
        language_code="JA",
        lemma=" \u751f ",
        status="ambiguous",
        provenance="unidic",
        confidence=0.25,
    )

    assert identity.language_code == "ja"
    assert identity.lemma == "\u751f"
    assert identity.status == "ambiguous"
    assert identity.confidence == 0.25
    assert identity.model_dump()["identity_key"] == identity.identity_key


def test_lexical_identity_rejects_invalid_confidence() -> None:
    with pytest.raises(ValidationError):
        LexicalIdentity(language_code="en", lemma="read", confidence=1.01)


@pytest.mark.parametrize(
    ("language_code", "lemma"),
    [(" ", "read"), ("en", " ")],
)
def test_lexical_identity_rejects_blank_canonical_fields(language_code: str, lemma: str) -> None:
    with pytest.raises(ValidationError):
        LexicalIdentity(language_code=language_code, lemma=lemma)
