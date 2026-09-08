"use client";

import { useNav } from "@/lib/store";
import { StudentDashboard } from "@/components/student/student-dashboard";
import { SubjectBrowser } from "@/components/student/subject-browser";
import { LessonViewer } from "@/components/student/lesson-viewer";
import { ExerciseRunner } from "@/components/student/exercise-runner";
import { ProgressView } from "@/components/student/progress-view";
import { ProfileView } from "@/components/student/profile-view";
import { TutorDashboard } from "@/components/tutor/tutor-dashboard";
import { ContentManager } from "@/components/tutor/content-manager";
import { StudentsView } from "@/components/tutor/students-view";
import { GameHub } from "@/components/games/game-hub";
import { QuizGame } from "@/components/games/quiz-game";
import { MathRushGame } from "@/components/games/math-rush-game";
import { MathPuzzleGame } from "@/components/games/math-puzzle-game";
import { BossChallenge } from "@/components/games/boss-challenge";
import { AchievementsView } from "@/components/games/achievements-view";
import { GameHistoryView } from "@/components/games/game-history-view";
import { TutorAnalytics } from "@/components/analytics/tutor-analytics";
import { StudentDetailAnalytics } from "@/components/analytics/student-detail";
import { ReportView } from "@/components/analytics/report-view";
import { ParentDashboard } from "@/components/parent/parent-dashboard";
import { ParentChildDetail } from "@/components/parent/parent-child-detail";
import { ParentLinkChild } from "@/components/parent/parent-link-child";
import type { SessionUser } from "@/lib/auth";

export function ViewRouter({ user }: { user: SessionUser }) {
  const view = useNav((s) => s.view);

  if (user.role === "STUDENT") {
    switch (view) {
      case "subjects":
        return <SubjectBrowser />;
      case "learn":
        return <LessonViewer />;
      case "exercise":
        return <ExerciseRunner />;
      case "progress":
        return <ProgressView />;
      case "profile":
        return <ProfileView />;
      case "gameHub":
        return <GameHub />;
      case "gameQuiz":
        return <QuizGame />;
      case "gameMathRush":
        return <MathRushGame />;
      case "gameMathPuzzle":
        return <MathPuzzleGame />;
      case "gameBoss":
        return <BossChallenge />;
      case "achievements":
        return <AchievementsView />;
      case "gameHistory":
        return <GameHistoryView />;
      case "dashboard":
      default:
        return <StudentDashboard />;
    }
  }

  if (user.role === "PARENT") {
    switch (view) {
      case "parentChildDetail":
        return <ParentChildDetail />;
      case "parentLinkChild":
        return <ParentLinkChild />;
      case "dashboard":
      default:
        return <ParentDashboard />;
    }
  }

  // TUTOR
  switch (view) {
    case "manage":
      return <ContentManager />;
    case "students":
      return <StudentsView />;
    case "tutorAnalytics":
      return <TutorAnalytics />;
    case "studentDetail":
      return <StudentDetailAnalytics />;
    case "report":
      return <ReportView />;
    case "dashboard":
    default:
      return <TutorDashboard />;
  }
}
