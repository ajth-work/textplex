from __future__ import annotations

import unicodedata

_HEBREW_BASE_MAP = {
    "\u05d0": "a",  # alef
    "\u05d1": "b",  # bet
    "\u05d2": "g",  # gimel
    "\u05d3": "d",  # dalet
    "\u05d4": "h",  # he
    "\u05d5": "v",  # vav
    "\u05d6": "z",  # zayin
    "\u05d7": "kh",  # het
    "\u05d8": "t",  # tet
    "\u05d9": "i",  # yod
    "\u05da": "k",  # final kaf
    "\u05db": "k",  # kaf
    "\u05dc": "l",  # lamed
    "\u05dd": "m",  # final mem
    "\u05de": "m",  # mem
    "\u05df": "n",  # final nun
    "\u05e0": "n",  # nun
    "\u05e1": "s",  # samekh
    "\u05e2": "a",  # ayin
    "\u05e3": "p",  # final pe
    "\u05e4": "p",  # pe
    "\u05e5": "ts",  # final tsadi
    "\u05e6": "ts",  # tsadi
    "\u05e7": "k",  # qof
    "\u05e8": "r",  # resh
    "\u05e9": "sh",  # shin / sin resolved heuristically by the base letter only
    "\u05ea": "t",  # tav
    "\u05f0": "v",  # yiddish double vav
    "\u05f1": "oy",  # yiddish vav-yod
    "\u05f2": "ey",  # yiddish double yod
}

_HEBREW_FINAL_FORMS = {
    "\u05da": "\u05db",
    "\u05dd": "\u05de",
    "\u05df": "\u05e0",
    "\u05e3": "\u05e4",
    "\u05e5": "\u05e6",
}

_HEBREW_RTL_MARKS = {"\u200f", "\u200e"}
_HEBREW_DIACRITICS = set(chr(codepoint) for codepoint in range(0x0591, 0x05c8))


def _is_hebrew_letter(char: str) -> bool:
    return "\u0590" <= char <= "\u05ff" or "\uFB1D" <= char <= "\uFB4F"


def _nearest_hebrew_letter(chars: list[str], start: int, step: int) -> str | None:
    index = start + step
    while 0 <= index < len(chars):
        char = chars[index]
        if char in _HEBREW_RTL_MARKS or char.isspace():
            index += step
            continue
        if char in _HEBREW_DIACRITICS or unicodedata.combining(char):
            index += step
            continue
        if _is_hebrew_letter(char):
            return _HEBREW_FINAL_FORMS.get(char, char)
        index += step
    return None


def transliterate_hebrew_text(text: str) -> str | None:
    cleaned_text = unicodedata.normalize("NFKD", text or "")
    if not cleaned_text.strip():
        return None

    chars = [char for char in cleaned_text if not unicodedata.combining(char)]
    pieces: list[str] = []

    for index, char in enumerate(chars):
        if char in _HEBREW_RTL_MARKS:
            continue
        if char.isspace():
            pieces.append(char)
            continue
        if char in _HEBREW_DIACRITICS:
            continue

        base_char = _HEBREW_FINAL_FORMS.get(char, char)
        previous_hebrew = _nearest_hebrew_letter(chars, index, -1)
        next_hebrew = _nearest_hebrew_letter(chars, index, 1)

        if char == "\u05d5":  # vav
            if previous_hebrew and next_hebrew:
                pieces.append("o")
            else:
                pieces.append("v")
            continue

        if char == "\u05d9":  # yod
            pieces.append("i" if previous_hebrew else "y")
            continue

        if char == "\u05d4":  # he
            pieces.append("a" if next_hebrew is None else "h")
            continue

        if char in ("\u05d0", "\u05e2"):  # alef / ayin
            pieces.append("a")
            continue

        if char == "\u05e9":  # shin
            pieces.append("sh")
            continue

        transliteration = _HEBREW_BASE_MAP.get(base_char)
        if transliteration is not None:
            pieces.append(transliteration)
            continue

        pieces.append(char)

    transliterated = "".join(pieces).strip()
    return transliterated or None
