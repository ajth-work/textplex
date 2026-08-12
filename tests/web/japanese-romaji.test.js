const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  composeJapaneseRomaji,
  composeJapaneseRomajiInput,
  finalizeJapaneseRomaji,
} = require("../../apps/web/lib/japanese-romaji.js");

test("Japanese romaji composition handles WaniKani-style syllables and double consonants", () => {
  assert.equal(composeJapaneseRomaji("chi"), "ち");
  assert.equal(composeJapaneseRomaji("konnichiha"), "こんにちは");
  assert.equal(composeJapaneseRomaji("gakkou"), "がっこう");
  assert.equal(composeJapaneseRomaji("arigatou"), "ありがとう");
  assert.equal(composeJapaneseRomaji("chō"), "ちょう");
  assert.equal(composeJapaneseRomaji("ch\u006f\u0304"), "ちょう");
});

test("Japanese composition preserves direct script and partial input", () => {
  assert.equal(composeJapaneseRomaji("こんにちは"), "こんにちは");
  assert.equal(composeJapaneseRomaji("ちchi"), "ちち");
  assert.equal(composeJapaneseRomaji("ch"), "ch");
  assert.equal(composeJapaneseRomaji("chi"), "ち");
});

test("Japanese composition reports an accessible caret after converted text", () => {
  assert.deepEqual(composeJapaneseRomajiInput("chi", 3, 3), {
    value: "ち",
    selectionStart: 1,
    selectionEnd: 1,
  });
  assert.deepEqual(composeJapaneseRomajiInput("aち", 1, 2), {
    value: "あち",
    selectionStart: 1,
    selectionEnd: 2,
  });
});

test("Japanese furigana finalization commits a terminal n", () => {
  assert.equal(finalizeJapaneseRomaji("sasshin"), "さっしん");
  assert.equal(finalizeJapaneseRomaji("mizu"), "みず");
  assert.equal(finalizeJapaneseRomaji("さっしん"), "さっしん");
});
