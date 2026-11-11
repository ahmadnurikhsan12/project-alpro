"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/components/providers/progress-provider";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { ButtonLink } from "@/components/ui";
import { LESSON_BY_ID } from "@/content/lessons";
import { XP_RULES } from "@/lib/progress/gamification";

/** Mencatat bahwa modul dibuka (sekali saja, saat pertama kali). */
export function LessonTracker({ lessonId }: { lessonId: string }) {
  const { ready, state, record } = useProgress();
  const sent = useRef(false);
  useEffect(() => {
    if (!ready || sent.current || state.lessons[lessonId]) return;
    sent.current = true;
    void record({ type: "lesson_open", lessonId });
  }, [ready, state.lessons, lessonId, record]);
  return null;
}

export function MiniQuiz({ lessonId, nextSlug }: { lessonId: string; nextSlug?: string }) {
  const { record } = useProgress();
  const [run, setRun] = useState(0);
  const lesson = LESSON_BY_ID[lessonId];
  return (
    <QuizRunner
      key={run}
      title="Mini quiz"
      questions={lesson.quiz}
      passScore={XP_RULES.lessonPassScore}
      onFinish={(answers) => record({ type: "lesson_quiz", lessonId, answers })}
      onRestart={() => setRun((r) => r + 1)}
      finishExtra={
        <ButtonLink href={nextSlug ? `/materi/${nextSlug}` : "/evaluasi"}>
          {nextSlug ? "Modul berikutnya" : "Evaluasi akhir"} <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      }
    />
  );
}
