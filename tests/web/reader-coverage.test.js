const assert = require("node:assert/strict");
const { test } = require("node:test");

const { calculateReadWithoutGlossesPercent } = require("../../apps/web/lib/reader-coverage.ts");

test("Reader reports the reconstructed 459-word, 36-gloss case as 92 percent", () => {
  assert.equal(calculateReadWithoutGlossesPercent(459, 36), 92);
});

test("Reader coverage uses intentional whole-number rounding and safe bounds", () => {
  assert.equal(calculateReadWithoutGlossesPercent(12, 1), 92);
  assert.equal(calculateReadWithoutGlossesPercent(10, -2), 100);
  assert.equal(calculateReadWithoutGlossesPercent(10, 12), 0);
  assert.equal(calculateReadWithoutGlossesPercent(0, 0), null);
});
