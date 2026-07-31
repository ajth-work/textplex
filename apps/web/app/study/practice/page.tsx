import { StudyPracticeView } from "../../../components/study-practice-view";

type StudyPracticePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function StudyPracticePage({ searchParams = {} }: StudyPracticePageProps) {
  const mode = firstSearchParam(searchParams.mode) === "review" ? "review" : "program";
  const languageCode = firstSearchParam(searchParams.language_code) ?? firstSearchParam(searchParams.language);
  const programCode = firstSearchParam(searchParams.program) ?? null;
  const levelCode = firstSearchParam(searchParams.level) ?? null;
  const assessmentAxisKey = firstSearchParam(searchParams.axis_key) ?? null;

  return (
    <StudyPracticeView
      initialMode={mode}
      initialLanguageCode={languageCode ?? null}
      initialProgramCode={programCode}
      initialLevelCode={levelCode}
      initialAssessmentAxisKey={assessmentAxisKey}
    />
  );
}
