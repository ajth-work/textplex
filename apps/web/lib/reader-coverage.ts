export function calculateReadWithoutGlossesPercent(totalReadableWords: number, glossedWords: number): number | null {
  if (!Number.isFinite(totalReadableWords) || totalReadableWords <= 0) {
    return null;
  }

  const boundedGlossedWords = Math.min(totalReadableWords, Math.max(0, glossedWords));
  return Math.round(((totalReadableWords - boundedGlossedWords) / totalReadableWords) * 100);
}
