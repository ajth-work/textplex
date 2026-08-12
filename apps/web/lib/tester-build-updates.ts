export type TesterBuildChangeSection = {
  id: string;
  title: string;
  summary: string;
  changes: readonly string[];
};

export type TesterBuildChangelogEntry = {
  build: string;
  summary: string;
  sections: readonly TesterBuildChangeSection[];
};

export const testerBuildChangelog: readonly TesterBuildChangelogEntry[] = [
  {
    build: "0.1.1",
    summary: "This build makes reading, importing, and tester feedback easier to understand and try.",
    sections: [
      {
        id: "reader-language-support",
        title: "Reader and language support",
        summary: "These changes affect how language details appear while you read and study.",
        changes: [
          "Japanese readings can be shown as romaji or hiragana/furigana for a sentence and for the word you select.",
          "Japanese kanji tokens now show their stored furigana in the word details panel, including readings that end in n.",
          "Japanese study answers support romaji composition as well as direct kana entry.",
        ],
      },
      {
        id: "import-library",
        title: "Import and library",
        summary: "These changes affect how new reading material enters your library.",
        changes: [
          "EPUB imports keep the book title and author, read chapters in order, and create pages you can open in the reader.",
          "Random Wikipedia import lets you choose the target language before TextPlex adds the article to your library.",
          "Import actions now explain when a sign-in session is missing instead of showing a generic server error.",
        ],
      },
      {
        id: "navigation-and-tester-feedback",
        title: "Navigation and tester feedback",
        summary: "These changes make it easier to move around TextPlex and report what you find.",
        changes: [
          "Library, Read, and Study menus now open from the full navigation control, including on smaller screens.",
          "Hosted theme choices can be selected and saved for the whole account.",
          "Tester feedback now includes clearer review instructions when a fix is ready for you to try.",
        ],
      },
    ],
  },
];

export const TESTER_LAST_BUILD_STORAGE_PREFIX = "textplex.tester-last-build";

function buildNumberParts(value: string): number[] {
  return value.match(/\d+/g)?.map(Number) ?? [];
}

export function compareBuildNumbers(left: string, right: string): number {
  const leftParts = buildNumberParts(left);
  const rightParts = buildNumberParts(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return left.localeCompare(right);
}

export function testerLastBuildStorageKey(userId: string): string {
  return `${TESTER_LAST_BUILD_STORAGE_PREFIX}:${userId}`;
}

export function readTesterLastBuild(userId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(testerLastBuildStorageKey(userId));
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function acknowledgeTesterBuild(userId: string, build: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(testerLastBuildStorageKey(userId), build);
  } catch {
    // The gate remains visible if browser storage is unavailable.
  }
}

export function getTesterChangelogSince(lastBuild: string | null, currentBuild: string): readonly TesterBuildChangelogEntry[] {
  const entries = testerBuildChangelog.filter((entry) => compareBuildNumbers(entry.build, currentBuild) <= 0);
  if (!lastBuild) {
    return entries;
  }

  const changes = entries.filter((entry) => compareBuildNumbers(entry.build, lastBuild) > 0);
  return changes.length > 0 ? changes : entries.filter((entry) => entry.build === currentBuild);
}
