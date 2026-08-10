export const learningTrackOptions = [
  {
    code: "local",
    label: "General reading / self-directed",
    description: "Read across topics without following a formal exam syllabus.",
  },
  {
    code: "hsk",
    label: "HSK — Chinese",
    description: "Chinese reading progression aligned with HSK levels.",
  },
  {
    code: "jlpt",
    label: "JLPT — Japanese",
    description: "Japanese reading progression aligned with JLPT levels.",
  },
  {
    code: "topik",
    label: "TOPIK — Korean",
    description: "Korean reading progression aligned with TOPIK levels.",
  },
  {
    code: "trki",
    label: "TRKI — Russian",
    description: "Russian reading progression aligned with TRKI levels.",
  },
  {
    code: "cefr",
    label: "CEFR — general proficiency",
    description: "A1–C2-style proficiency progression for European-language study.",
  },
  {
    code: "custom",
    label: "Custom / other",
    description: "A personal path that does not fit one of the formal programs.",
  },
  {
    code: "not_sure",
    label: "I’m not sure yet",
    description: "Start reading first and choose a more specific path later.",
  },
] as const;

export type LearningTrackCode = (typeof learningTrackOptions)[number]["code"];
