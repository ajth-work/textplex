import { Suspense } from "react";

import { StudyPracticeView } from "../../../components/study-practice-view";

export const dynamic = "force-dynamic";

type StudyPracticePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function StudyPracticePage({ searchParams = {} }: StudyPracticePageProps) {
  const modeValue = firstSearchParam(searchParams.mode);
  const mode = modeValue === "review" || modeValue === "glossed" || modeValue === "both" ? modeValue : "program";
  const languageCode = firstSearchParam(searchParams.language_code) ?? firstSearchParam(searchParams.language);
  const programCode = firstSearchParam(searchParams.program_code) ?? firstSearchParam(searchParams.program) ?? null;
  const levelCode = firstSearchParam(searchParams.level_code) ?? firstSearchParam(searchParams.level) ?? null;
  const assessmentAxisKey = firstSearchParam(searchParams.axis_key) ?? null;

  return (
    <Suspense fallback={<section className="card feature-card">Loading practice session...</section>}>
      <StudyPracticeView
        initialMode={mode}
        initialLanguageCode={languageCode ?? null}
        initialProgramCode={programCode}
        initialLevelCode={levelCode}
        initialAssessmentAxisKey={assessmentAxisKey}
      />
    </Suspense>
  );
}
