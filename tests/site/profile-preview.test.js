const assert = require("node:assert/strict");
const { test } = require("node:test");

const { createNode, loadPreviewData, loadPreviewRouter } = require("./helpers/browser-context");

test("preview data exposes profile totals and settings", () => {
  const { window } = loadPreviewData();
  const api = window.TextPlexPreview;
  const profile = api.getProfilePreviewData();

  assert.ok(profile, "profile preview data should exist");
  assert.ok(profile.profile.reading_sessions >= 0);
  assert.ok(profile.profile.page_reads >= 0);
  assert.ok(profile.profile.sentence_reads >= 0);
  assert.ok(profile.settings.entries.some((entry) => entry.key === "theme"));
  assert.ok(profile.settings.entries.some((entry) => entry.key === "readerMode"));
});

test("profile preview derives elapsed time from stored reading sessions", () => {
  const readingState = {
    "spring-dawn": {
      completedPages: 1,
      completedCharacters: 232,
      pageCount: 3,
      lastUpdatedAt: "2026-07-15T08:34:32.000Z",
      activeSession: null,
      sessions: [
        {
          startedAt: "2026-07-15T08:20:00.000Z",
          endedAt: "2026-07-15T08:34:32.000Z",
          lastSeenAt: "2026-07-15T08:34:32.000Z",
          pageIndex: 0,
          sentenceIndex: 0,
          pageCount: 3,
          completedPages: 1,
          completedCharacters: 232,
        },
      ],
    },
  };

  const { window } = loadPreviewData({
    localStorageSeed: {
      "textplex.preview.readingState": JSON.stringify(readingState),
    },
  });
  const profile = window.TextPlexPreview.getProfilePreviewData();

  assert.ok(profile.profile.page_reads > 0);
  assert.ok(profile.profile.sentence_reads > 0);
  assert.ok(profile.profile.average_seconds_per_sentence > 0);
  assert.ok(profile.profile.average_seconds_per_word > 0);
  assert.ok(profile.profile.average_seconds_per_character > 0);
  assert.match(profile.books[0].active_seconds.toString(), /^[1-9]/);
});

test("profile preview renders reading history and profile metrics", async () => {
  const browser = loadPreviewRouter({
    pathname: "/profile-preview.html",
    selectorMap: {
      "button, a": [],
    },
    idMap: {
      profileTitle: createNode("h1"),
      profileSubtitle: createNode("p"),
      profileBadge: createNode("span"),
      profileSessionCount: createNode("strong"),
      profilePageReadCount: createNode("strong"),
      profileSentenceReadCount: createNode("strong"),
      profileActiveBookCount: createNode("strong"),
      profileUniqueWordCount: createNode("strong"),
      profileUniqueCharacterCount: createNode("strong"),
      profileTodaySentenceCount: createNode("strong"),
      profileTodayTokenCount: createNode("strong"),
      profileAvgSentence: createNode("strong"),
      profileAvgWord: createNode("strong"),
      profileAvgCharacter: createNode("strong"),
      profileTheme: createNode("strong"),
      profileReaderMode: createNode("strong"),
      profileOcrProvider: createNode("strong"),
      profileProcessorUrl: createNode("strong"),
      profileTrackTitle: createNode("h2"),
      profileTrackLevel: createNode("span"),
      profileTrackList: createNode("div"),
      profileTrackSubtitle: createNode("p"),
      profileTrackProgress: createNode("span"),
      profileTrackNextStep: createNode("p"),
      profileTrackJourney: createNode("div"),
      profileBookActivity: createNode("section"),
      profileActivityEmpty: createNode("p"),
    },
  });

  await browser.window.TextPlexPreviewRouter.ready;

  assert.match(browser.window.document.getElementById("profileTitle").textContent, /User profile/);
  assert.match(browser.window.document.getElementById("profileBadge").textContent, /active books/);
  assert.match(browser.window.document.getElementById("profileTrackTitle").textContent, /Track overview|HSK track/);
  assert.ok(browser.window.document.getElementById("profileTrackList").innerHTML.length > 0);
  assert.match(browser.window.document.getElementById("profileTrackSubtitle").textContent, /track/i);
  assert.match(browser.window.document.getElementById("profileBookActivity").innerHTML, /data-open-reader/);
  assert.equal(browser.window.document.getElementById("profileActivityEmpty").hidden, true);
});
