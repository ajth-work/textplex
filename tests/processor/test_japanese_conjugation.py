import pytest
from processor.japanese_conjugation import (
    classify_japanese_verb,
    conjugate_japanese_verb,
)


@pytest.mark.parametrize(
    ("lemma", "expected"),
    [
        (
            "会う",
            {
                "plain_present": "会う",
                "polite_present": "会います",
                "plain_past": "会った",
                "plain_negative": "会わない",
                "te": "会って",
                "conditional": "会えば",
                "volitional": "会おう",
                "potential": "会える",
                "imperative": "会え",
            },
        ),
        (
            "書く",
            {
                "plain_past": "書いた",
                "polite_past": "書きました",
                "plain_negative": "書かない",
                "polite_negative": "書きません",
                "te": "書いて",
                "potential": "書ける",
            },
        ),
        (
            "食べる",
            {
                "plain_present": "食べる",
                "polite_present": "食べます",
                "plain_past": "食べた",
                "plain_negative": "食べない",
                "te": "食べて",
                "potential": "食べられる",
                "imperative": "食べろ",
            },
        ),
        (
            "勉強する",
            {
                "plain_present": "勉強する",
                "polite_present": "勉強します",
                "plain_past": "勉強した",
                "plain_negative": "勉強しない",
                "te": "勉強して",
                "potential": "勉強できる",
                "imperative": "勉強しろ",
            },
        ),
        (
            "来る",
            {
                "plain_present": "来る",
                "polite_present": "来ます",
                "plain_past": "来た",
                "plain_negative": "来ない",
                "te": "来て",
                "potential": "来られる",
                "imperative": "来い",
            },
        ),
    ],
)
def test_conjugate_japanese_verb_generates_feature_slots(lemma: str, expected: dict[str, str]) -> None:
    result = conjugate_japanese_verb(lemma)

    assert all(result.forms[slot] == form for slot, form in expected.items())


def test_classification_uses_reading_and_explicit_override_for_ambiguous_ru_verbs() -> None:
    assert classify_japanese_verb("帰る").conjugation_class == "godan"
    assert classify_japanese_verb("見る").conjugation_class == "ichidan"
    assert classify_japanese_verb("走る", conjugation_class="godan").rule_id == "godan-る"


def test_lexical_overrides_handle_iku_and_aru() -> None:
    iku = conjugate_japanese_verb("行く")
    aru = conjugate_japanese_verb("ある")

    assert iku.forms["plain_past"] == "行った"
    assert iku.forms["te"] == "行って"
    assert "te" in iku.overridden_slots
    assert aru.forms["plain_negative"] == "ない"
    assert aru.forms["polite_negative"] == "ありません"


def test_unknown_ending_requires_an_explicit_classification() -> None:
    with pytest.raises(ValueError, match="Cannot classify"):
        conjugate_japanese_verb("愛", conjugation_class=None)
