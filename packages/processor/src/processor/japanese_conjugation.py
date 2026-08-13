from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

JapaneseConjugationClass = Literal["godan", "ichidan", "suru", "kuru", "irregular"]
JapaneseFormSlot = Literal[
    "plain_present",
    "polite_present",
    "plain_past",
    "polite_past",
    "plain_negative",
    "polite_negative",
    "plain_past_negative",
    "polite_past_negative",
    "te",
    "conditional",
    "volitional",
    "passive",
    "causative",
    "potential",
    "imperative",
]

FORM_SLOTS: tuple[JapaneseFormSlot, ...] = (
    "plain_present",
    "polite_present",
    "plain_past",
    "polite_past",
    "plain_negative",
    "polite_negative",
    "plain_past_negative",
    "polite_past_negative",
    "te",
    "conditional",
    "volitional",
    "passive",
    "causative",
    "potential",
    "imperative",
)

_GODAN_ENDINGS = frozenset("うくぐすつぬぶむる")
_COMMON_GODAN_RU = frozenset(
    {
        "ある",
        "帰る",
        "かえる",
        "切る",
        "きる",
        "知る",
        "しる",
        "入る",
        "はいる",
        "走る",
        "はしる",
        "要る",
        "いる",
        "減る",
        "へる",
        "蹴る",
        "ける",
        "しゃべる",
        "喋る",
        "滑る",
        "すべる",
        "握る",
        "にぎる",
        "焦る",
        "あせる",
        "限る",
        "かぎる",
        "参る",
        "まいる",
        "交じる",
        "まじる",
    }
)

_GODAN_RULES: dict[str, dict[str, str]] = {
    "う": {"polite": "います", "past": "った", "negative": "わない", "te": "って", "conditional": "えば", "volitional": "おう", "passive": "われる", "causative": "わせる", "potential": "える", "imperative": "え"},
    "く": {"polite": "きます", "past": "いた", "negative": "かない", "te": "いて", "conditional": "けば", "volitional": "こう", "passive": "かれる", "causative": "かせる", "potential": "ける", "imperative": "け"},
    "ぐ": {"polite": "ぎます", "past": "いだ", "negative": "がない", "te": "いで", "conditional": "げば", "volitional": "ごう", "passive": "がれる", "causative": "がせる", "potential": "げる", "imperative": "げ"},
    "す": {"polite": "します", "past": "した", "negative": "さない", "te": "して", "conditional": "せば", "volitional": "そう", "passive": "される", "causative": "させる", "potential": "せる", "imperative": "せ"},
    "つ": {"polite": "ちます", "past": "った", "negative": "たない", "te": "って", "conditional": "てば", "volitional": "とう", "passive": "たれる", "causative": "たせる", "potential": "てる", "imperative": "て"},
    "ぬ": {"polite": "にます", "past": "んだ", "negative": "なない", "te": "んで", "conditional": "ねば", "volitional": "のう", "passive": "なれる", "causative": "なせる", "potential": "ねる", "imperative": "ね"},
    "ぶ": {"polite": "びます", "past": "んだ", "negative": "ばない", "te": "んで", "conditional": "べば", "volitional": "ぼう", "passive": "ばれる", "causative": "ばせる", "potential": "べる", "imperative": "べ"},
    "む": {"polite": "みます", "past": "んだ", "negative": "まない", "te": "んで", "conditional": "めば", "volitional": "もう", "passive": "まれる", "causative": "ませる", "potential": "める", "imperative": "め"},
    "る": {"polite": "ります", "past": "った", "negative": "らない", "te": "って", "conditional": "れば", "volitional": "ろう", "passive": "られる", "causative": "らせる", "potential": "れる", "imperative": "れ"},
}


class JapaneseVerbRecord(BaseModel):
    lemma: str = Field(min_length=1)
    reading: str | None = None
    conjugation_class: JapaneseConjugationClass
    final_kana: str | None = None
    rule_id: str


class JapaneseConjugationResult(BaseModel):
    verb: JapaneseVerbRecord
    forms: dict[JapaneseFormSlot, str]
    overridden_slots: list[JapaneseFormSlot] = Field(default_factory=list)


def classify_japanese_verb(
    lemma: str,
    *,
    reading: str | None = None,
    conjugation_class: JapaneseConjugationClass | None = None,
) -> JapaneseVerbRecord:
    normalized_lemma = lemma.strip()
    normalized_reading = reading.strip() if reading and reading.strip() else None
    classifier_text = normalized_reading or normalized_lemma
    final_kana = classifier_text[-1] if classifier_text else None

    if conjugation_class is not None:
        resolved_class = conjugation_class
    elif normalized_lemma in {"する", "サ変する"} or normalized_lemma.endswith("する"):
        resolved_class = "suru"
    elif normalized_lemma in {"来る", "くる"} or classifier_text in {"来る", "くる"}:
        resolved_class = "kuru"
    elif (final_kana in _GODAN_ENDINGS and classifier_text in _COMMON_GODAN_RU) or (
        final_kana in _GODAN_ENDINGS and final_kana != "る"
    ):
        resolved_class = "godan"
    elif final_kana == "る":
        resolved_class = "ichidan"
    else:
        raise ValueError(f"Cannot classify Japanese verb {lemma!r}; provide conjugation_class explicitly.")

    rule_id = resolved_class if resolved_class != "godan" else f"godan-{final_kana}"
    return JapaneseVerbRecord(
        lemma=normalized_lemma,
        reading=normalized_reading,
        conjugation_class=resolved_class,
        final_kana=final_kana,
        rule_id=rule_id,
    )


def conjugate_japanese_verb(
    lemma: str,
    *,
    reading: str | None = None,
    conjugation_class: JapaneseConjugationClass | None = None,
) -> JapaneseConjugationResult:
    verb = classify_japanese_verb(lemma, reading=reading, conjugation_class=conjugation_class)
    if verb.conjugation_class == "godan":
        forms, overridden_slots = _conjugate_godan(verb)
    elif verb.conjugation_class == "ichidan":
        forms, overridden_slots = _conjugate_ichidan(verb.lemma)
    elif verb.conjugation_class == "suru":
        forms, overridden_slots = _conjugate_suru(verb.lemma)
    elif verb.conjugation_class == "kuru":
        forms, overridden_slots = _conjugate_kuru(verb.lemma)
    else:
        raise ValueError(f"An explicit implementation is required for irregular verb {verb.lemma!r}.")

    return JapaneseConjugationResult(verb=verb, forms=forms, overridden_slots=overridden_slots)


def _conjugate_godan(verb: JapaneseVerbRecord) -> tuple[dict[JapaneseFormSlot, str], list[JapaneseFormSlot]]:
    final_kana = verb.final_kana
    if final_kana not in _GODAN_RULES:
        raise ValueError(f"Unsupported godan ending {final_kana!r} for {verb.lemma!r}.")
    stem = verb.lemma[:-1]
    rule = _GODAN_RULES[final_kana]
    negative = stem + rule["negative"]
    forms: dict[JapaneseFormSlot, str] = {
        "plain_present": verb.lemma,
        "polite_present": stem + rule["polite"],
        "plain_past": stem + rule["past"],
        "polite_past": stem + rule["polite"].removesuffix("ます") + "ました",
        "plain_negative": negative,
        "polite_negative": stem + rule["polite"].removesuffix("ます") + "ません",
        "plain_past_negative": negative.removesuffix("ない") + "なかった",
        "polite_past_negative": stem + rule["polite"].removesuffix("ます") + "ませんでした",
        "te": stem + rule["te"],
        "conditional": stem + rule["conditional"],
        "volitional": stem + rule["volitional"],
        "passive": stem + rule["passive"],
        "causative": stem + rule["causative"],
        "potential": stem + rule["potential"],
        "imperative": stem + rule["imperative"],
    }
    overridden_slots: list[JapaneseFormSlot] = []
    if verb.lemma in {"行く", "いく"}:
        forms["plain_past"] = stem + "った"
        forms["polite_past"] = stem + "きました"
        forms["te"] = stem + "って"
        overridden_slots = ["plain_past", "polite_past", "te"]
    if verb.lemma in {"ある", "有る"}:
        forms.update(
            {
                "plain_negative": "ない",
                "polite_negative": "ありません",
                "plain_past_negative": "なかった",
                "polite_past_negative": "ありませんでした",
                "potential": "ありえる",
            }
        )
        overridden_slots.extend(["plain_negative", "polite_negative", "plain_past_negative", "polite_past_negative", "potential"])
    return forms, overridden_slots


def _conjugate_ichidan(lemma: str) -> tuple[dict[JapaneseFormSlot, str], list[JapaneseFormSlot]]:
    stem = lemma[:-1]
    return (
        {
            "plain_present": lemma,
            "polite_present": stem + "ます",
            "plain_past": stem + "た",
            "polite_past": stem + "ました",
            "plain_negative": stem + "ない",
            "polite_negative": stem + "ません",
            "plain_past_negative": stem + "なかった",
            "polite_past_negative": stem + "ませんでした",
            "te": stem + "て",
            "conditional": stem + "れば",
            "volitional": stem + "よう",
            "passive": stem + "られる",
            "causative": stem + "させる",
            "potential": stem + "られる",
            "imperative": stem + "ろ",
        },
        [],
    )


def _conjugate_suru(lemma: str) -> tuple[dict[JapaneseFormSlot, str], list[JapaneseFormSlot]]:
    prefix = lemma[:-2] if lemma.endswith("する") else ""
    suffixes = {
        "plain_present": "する",
        "polite_present": "します",
        "plain_past": "した",
        "polite_past": "しました",
        "plain_negative": "しない",
        "polite_negative": "しません",
        "plain_past_negative": "しなかった",
        "polite_past_negative": "しませんでした",
        "te": "して",
        "conditional": "すれば",
        "volitional": "しよう",
        "passive": "される",
        "causative": "させる",
        "potential": "できる",
        "imperative": "しろ",
    }
    return {slot: prefix + suffix for slot, suffix in suffixes.items()}, []


def _conjugate_kuru(lemma: str) -> tuple[dict[JapaneseFormSlot, str], list[JapaneseFormSlot]]:
    kanji = lemma == "来る"
    base = "来" if kanji else "こ"
    forms = {
        "plain_present": lemma,
        "polite_present": "来ます" if kanji else "きます",
        "plain_past": "来た" if kanji else "きた",
        "polite_past": "来ました" if kanji else "きました",
        "plain_negative": "来ない" if kanji else "こない",
        "polite_negative": "来ません" if kanji else "きません",
        "plain_past_negative": "来なかった" if kanji else "こなかった",
        "polite_past_negative": "来ませんでした" if kanji else "きませんでした",
        "te": "来て" if kanji else "きて",
        "conditional": "来れば" if kanji else "くれば",
        "volitional": "来よう" if kanji else "こよう",
        "passive": base + "られる",
        "causative": base + "させる",
        "potential": base + "られる",
        "imperative": "来い" if kanji else "こい",
    }
    return forms, list(FORM_SLOTS)
