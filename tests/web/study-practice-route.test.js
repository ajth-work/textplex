const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const practiceSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "study-practice-view.tsx"), "utf8");
const practicePageSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "study", "practice", "page.tsx"), "utf8");

test("Study practice route exposes a one-card drill flow", () => {
  assert.match(practicePageSource, /StudyPracticeView/);
  assert.match(practicePageSource, /initialMode={mode}/);
  assert.match(practicePageSource, /initialProgramCode={programCode}/);
  assert.match(practicePageSource, /initialLevelCode={levelCode}/);
  assert.match(practicePageSource, /initialAssessmentAxisKey={assessmentAxisKey}/);

  assert.match(practiceSource, /Vocabulary practice session/);
  assert.match(practiceSource, /buildProgramCards/);
  assert.match(practiceSource, /buildReviewCards/);
  assert.match(practiceSource, /INTRODUCTION_CHUNK_SIZE = 5/);
  assert.match(practiceSource, /INTRODUCTION_AXIS_ORDER/);
  for (const axisKey of ["form_to_meaning", "form_to_reading", "meaning_to_form", "reading_to_form"]) {
    assert.match(practiceSource, new RegExp(axisKey));
  }
  assert.match(practiceSource, /Next introduction chunk/);
  assert.match(practiceSource, /Type the pronunciation or reading/);
  assert.match(practiceSource, /Type the target-language form/);
  assert.match(practiceSource, /study\.practice-card/);
  assert.match(practiceSource, /data-inventory-id="study\.practice-navigation"/);
  assert.match(practiceSource, /data-inventory-id="study\.practice-previous"/);
  assert.match(practiceSource, /data-inventory-id="study\.practice-next"/);
  assert.match(practiceSource, /disabled=\{practiceCards\.length <= 1 \|\| \(!revealed && answerResult === "idle"\)\}/);
  assert.match(practiceSource, /aria-label="Previous term"/);
  assert.match(practiceSource, /aria-label="Next term"/);
  assert.match(practiceSource, /data-inventory-id="study\.practice-not-sure"/);
  assert.match(practiceSource, /Not sure\?/);
  assert.match(practiceSource, /\/learning\/vocabulary-reviews/);
  assert.match(practiceSource, /axis_key: currentCard\.assessmentAxisKey/);
  assert.match(practiceSource, /result: isCorrect \? "correct" : "incorrect"/);
  assert.match(practiceSource, /result: "incorrect"/);
  assert.doesNotMatch(practiceSource, /Type the meaning to check recall before moving on|Program mode|Review mode/);
  assert.doesNotMatch(practiceSource, /Meaning hidden until you check it|Reveal answer|Hide answer/);
  assert.match(practiceSource, /Check answer/);
  assert.match(practiceSource, /Correct/);
  assert.match(practiceSource, /Incorrect/);
  assert.match(practiceSource, /No practice items available/);
  assert.match(practiceSource, /Loading practice session/);
});
