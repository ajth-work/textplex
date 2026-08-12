const ROMAJI_TO_HIRAGANA = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  sa: "さ", si: "し", shi: "し", su: "す", se: "せ", so: "そ",
  ta: "た", ti: "ち", chi: "ち", tu: "つ", tsu: "つ", te: "て", to: "と",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", hu: "ふ", fu: "ふ", he: "へ", ho: "ほ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yi: "い", yu: "ゆ", ye: "いぇ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wi: "うぃ", wu: "う", we: "うぇ", wo: "を",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  za: "ざ", zi: "じ", ji: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  da: "だ", di: "ぢ", du: "づ", de: "で", do: "ど",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  kya: "きゃ", kyi: "きぃ", kyu: "きゅ", kye: "きぇ", kyo: "きょ",
  sya: "しゃ", sha: "しゃ", syu: "しゅ", shu: "しゅ", sye: "しぇ", she: "しぇ", syo: "しょ", sho: "しょ",
  tya: "ちゃ", cha: "ちゃ", tyu: "ちゅ", chu: "ちゅ", tye: "ちぇ", che: "ちぇ", tyo: "ちょ", cho: "ちょ",
  nya: "にゃ", nyi: "にぃ", nyu: "にゅ", nye: "にぇ", nyo: "にょ",
  hya: "ひゃ", hyi: "ひぃ", hyu: "ひゅ", hye: "ひぇ", hyo: "ひょ",
  mya: "みゃ", myi: "みぃ", myu: "みゅ", mye: "みぇ", myo: "みょ",
  rya: "りゃ", ryi: "りぃ", ryu: "りゅ", rye: "りぇ", ryo: "りょ",
  gya: "ぎゃ", gyi: "ぎぃ", gyu: "ぎゅ", gye: "ぎぇ", gyo: "ぎょ",
  zya: "じゃ", ja: "じゃ", zyu: "じゅ", ju: "じゅ", zye: "じぇ", je: "じぇ", zyo: "じょ", jo: "じょ",
  dya: "ぢゃ", dyi: "ぢぃ", dyu: "ぢゅ", dye: "ぢぇ", dyo: "ぢょ",
  bya: "びゃ", byi: "びぃ", byu: "びゅ", bye: "びぇ", byo: "びょ",
  pya: "ぴゃ", pyi: "ぴぃ", pyu: "ぴゅ", pye: "ぴぇ", pyo: "ぴょ",
  fwa: "ふぁ", fwi: "ふぃ", fwe: "ふぇ", fwo: "ふぉ", fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
  va: "ゔぁ", vi: "ゔぃ", vu: "ゔ", ve: "ゔぇ", vo: "ゔぉ",
  xa: "ぁ", xi: "ぃ", xu: "ぅ", xe: "ぇ", xo: "ぉ",
  xya: "ゃ", xyi: "ぃ", xyu: "ゅ", xye: "ぇ", xyo: "ょ",
  xtsu: "っ", ltsu: "っ", xka: "ゕ", xke: "ゖ",
};

const ROMAJI_KEYS = Object.keys(ROMAJI_TO_HIRAGANA).sort((left, right) => right.length - left.length);
const ROMAJI_PREFIXES = new Set(
  ROMAJI_KEYS.flatMap((key) => Array.from({ length: key.length - 1 }, (_, index) => key.slice(0, index + 1))),
);

const MACRON_EXPANSIONS = {
  "ā": "aa",
  "ī": "ii",
  "ū": "uu",
  "ē": "ei",
  "ō": "ou",
};

function normalizeRomajiRun(value) {
  return Array.from(value.normalize("NFC").toLowerCase())
    .map((character) => MACRON_EXPANSIONS[character] ?? character)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isConsonant(value) {
  return /^[bcdfghjklmpqrstvwxyz]$/.test(value);
}

function composeRomajiRun(value) {
  const run = normalizeRomajiRun(value);
  let composed = "";
  let index = 0;

  while (index < run.length) {
    const rest = run.slice(index);
    if (rest.startsWith("nn")) {
      composed += "ん";
      index += /[aiueoy]/.test(rest[2] ?? "") ? 1 : 2;
      continue;
    }
    if (run[index] === "n") {
      const next = run[index + 1];
      if (next === "'") {
        composed += "ん";
        index += 2;
        continue;
      }
      if (next && !/[aiueoyn]/.test(next)) {
        composed += "ん";
        index += 1;
        continue;
      }
      if (!next) {
        composed += "n";
        index += 1;
        continue;
      }
    }

    const current = run[index];
    const next = run[index + 1];
    if (current === next && isConsonant(current) && current !== "n") {
      const following = run.slice(index + 1);
      if (ROMAJI_KEYS.some((key) => following.startsWith(key))) {
        composed += "っ";
        index += 1;
        continue;
      }
    }

    const match = ROMAJI_KEYS.find((key) => rest.startsWith(key));
    if (match) {
      composed += ROMAJI_TO_HIRAGANA[match];
      index += match.length;
      continue;
    }
    if (ROMAJI_PREFIXES.has(rest)) {
      composed += rest;
      break;
    }

    composed += run[index];
    index += 1;
  }

  return composed;
}

function composeJapaneseRomaji(value) {
  let composed = "";
  let latinRun = "";

  const flushLatinRun = () => {
    if (latinRun) {
      composed += composeRomajiRun(latinRun);
      latinRun = "";
    }
  };

  for (const character of String(value ?? "")) {
    if (/^[A-Za-z'\u00c0-\u024f\u0300-\u036f]$/.test(character)) {
      latinRun += character;
      continue;
    }
    flushLatinRun();
    composed += character === "-" ? "ー" : character;
  }
  flushLatinRun();
  return composed;
}

function finalizeJapaneseRomaji(value) {
  return composeJapaneseRomaji(value).replace(/n$/u, "ん");
}

function composeJapaneseRomajiInput(value, selectionStart, selectionEnd = selectionStart) {
  const rawValue = String(value ?? "");
  const start = Math.max(0, Math.min(rawValue.length, selectionStart ?? rawValue.length));
  const end = Math.max(start, Math.min(rawValue.length, selectionEnd ?? start));
  return {
    value: composeJapaneseRomaji(rawValue),
    selectionStart: composeJapaneseRomaji(rawValue.slice(0, start)).length,
    selectionEnd: composeJapaneseRomaji(rawValue.slice(0, end)).length,
  };
}

module.exports = {
  composeJapaneseRomaji,
  composeJapaneseRomajiInput,
  finalizeJapaneseRomaji,
};
