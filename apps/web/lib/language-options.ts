export const targetLanguageOptions = [
  { code: "zh", label: "Chinese", shortCode: "zh" },
  { code: "ko", label: "Korean", shortCode: "ko" },
  { code: "ja", label: "Japanese", shortCode: "ja" },
  { code: "ru", label: "Russian", shortCode: "ru" },
  { code: "he", label: "Hebrew", shortCode: "he" },
  { code: "ar", label: "Arabic", shortCode: "ar" },
  { code: "yo", label: "Yoruba", shortCode: "yo" },
] as const;

export type TargetLanguageCode = (typeof targetLanguageOptions)[number]["code"];

export function languageOption(languageCode: string | null | undefined) {
  const normalized = (languageCode ?? "").toLowerCase().split("-", 1)[0];
  return targetLanguageOptions.find((option) => option.code === normalized) ?? null;
}

export function languageShortCode(languageCode: string | null | undefined): string {
  return languageOption(languageCode)?.shortCode ?? (languageCode ?? "").split("-", 1)[0].toLowerCase();
}

export function languageDisplayLabel(languageCode: string | null | undefined): string {
  const option = languageOption(languageCode);
  return option ? `${option.label} (${option.shortCode})` : languageShortCode(languageCode);
}
