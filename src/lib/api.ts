// Frontend API client — uses relative paths, cookies sent automatically by NextAuth session.
import type {
  ProfileDTO,
  SubjectDTO,
  AttemptResultDTO,
  StudentDashboardDTO,
  TutorDashboardDTO,
  RegisterPayload,
  SubmitAnswer,
} from "@/lib/types";
import type {
  StudentStatsDTO,
  GamifiedDashboardDTO,
  AchievementDTO,
  GameSessionDTO,
  GameHubDTO,
  GameSubmitPayload,
  GameSubmitResult,
  MathRushQuestion,
  PuzzleDTO,
  BossDTO,
} from "@/lib/game-types";
import type {
  TutorAnalyticsDTO,
  StudentDetailAnalyticsDTO,
  RecommendationDTO,
  ReportDTO,
  ParentDashboardDTO,
} from "@/lib/analytics-types";

async function req<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    credentials: "include",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
  // ---- auth ----
  register: (payload: RegisterPayload) =>
    req<{ ok: boolean; error?: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ---- profile ----
  getProfile: () => req<ProfileDTO>("/api/profile"),
  updateProfile: (data: Partial<ProfileDTO>) =>
    req<ProfileDTO>("/api/profile", { method: "PUT", body: JSON.stringify(data) }),

  // ---- subjects ----
  listSubjects: () =>
    req<
      {
        id: string;
        title: string;
        description: string | null;
        color: string;
        icon: string;
        tutorId: string;
        tutorName: string;
        topicsCount: number;
        lessonsTotal: number;
      }[]
    >("/api/subjects"),
  getSubject: (id: string) => req<SubjectDTO>(`/api/subjects/${id}`),
  createSubject: (data: { title: string; description?: string; color?: string; icon?: string }) =>
    req<SubjectDTO>("/api/subjects", { method: "POST", body: JSON.stringify(data) }),
  updateSubject: (id: string, data: Partial<{ title: string; description: string; color: string; icon: string }>) =>
    req<SubjectDTO>(`/api/subjects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSubject: (id: string) =>
    req<{ ok: boolean }>(`/api/subjects/${id}`, { method: "DELETE" }),

  // ---- topics ----
  createTopic: (data: { subjectId: string; title: string; description?: string; order?: number }) =>
    req<TopicLite>(`/api/topics`, { method: "POST", body: JSON.stringify(data) }),
  updateTopic: (id: string, data: Partial<{ title: string; description: string; order: number }>) =>
    req<TopicLite>(`/api/topics/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTopic: (id: string) => req<{ ok: boolean }>(`/api/topics/${id}`, { method: "DELETE" }),

  // ---- lessons ----
  createLesson: (data: { topicId: string; title: string; content: string; summary?: string; durationMin?: number }) =>
    req<LessonLite>(`/api/lessons`, { method: "POST", body: JSON.stringify(data) }),
  updateLesson: (id: string, data: Partial<{ title: string; content: string; summary: string; durationMin: number }>) =>
    req<LessonLite>(`/api/lessons/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLesson: (id: string) => req<{ ok: boolean }>(`/api/lessons/${id}`, { method: "DELETE" }),

  // ---- exercises ----
  createExercise: (data: { lessonId: string; title: string; type: string }) =>
    req<ExerciseLite>(`/api/exercises`, { method: "POST", body: JSON.stringify(data) }),
  updateExercise: (id: string, data: Partial<{ title: string; type: string }>) =>
    req<ExerciseLite>(`/api/exercises/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExercise: (id: string) => req<{ ok: boolean }>(`/api/exercises/${id}`, { method: "DELETE" }),

  // ---- questions ----
  createQuestion: (data: {
    exerciseId: string;
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    points?: number;
  }) => req<QuestionLite>("/api/questions", { method: "POST", body: JSON.stringify(data) }),
  updateQuestion: (
    id: string,
    data: Partial<{ text: string; options: string[]; correctAnswer: string; explanation: string; points: number }>
  ) => req<QuestionLite>(`/api/questions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteQuestion: (id: string) => req<{ ok: boolean }>(`/api/questions/${id}`, { method: "DELETE" }),

  // ---- sessions ----
  startSession: (lessonId: string) =>
    req<{ sessionId: string }>("/api/sessions", { method: "POST", body: JSON.stringify({ lessonId }) }),
  updateSession: (id: string, data: { status?: string; completionPct?: number; durationSec?: number }) =>
    req<{ ok: boolean }>(`/api/sessions/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // ---- exercise submit ----
  submitExercise: (exerciseId: string, answers: SubmitAnswer[]) =>
    req<AttemptResultDTO>(`/api/exercises/${exerciseId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),

  // ---- progress / mastery ----
  getProgress: () =>
    req<
      {
        lessonId: string;
        lessonTitle: string;
        topicTitle: string;
        subjectTitle: string;
        subjectColor: string;
        status: string;
        completionPct: number;
        timeSpentSec: number;
        lastAccessedAt: string | null;
      }[]
    >("/api/progress"),
  getMastery: () =>
    req<{ topics: any[]; subjects: any[] }>("/api/mastery"),

  // ---- dashboards ----
  getStudentDashboard: () => req<StudentDashboardDTO>("/api/dashboard/student"),
  getTutorDashboard: () => req<TutorDashboardDTO>("/api/dashboard/tutor"),

  // ===== Phase 2: Gamification =====
  getStudentStats: () => req<StudentStatsDTO>("/api/student/stats"),
  getGamifiedDashboard: () =>
    req<GamifiedDashboardDTO>("/api/dashboard/student-gamified"),
  getAchievements: () => req<AchievementDTO[]>("/api/achievements"),
  getGameHistory: (gameType?: string) =>
    req<GameSessionDTO[]>(
      `/api/game-history${gameType ? `?gameType=${gameType}` : ""}`
    ),
  getGameHub: () => req<GameHubDTO>("/api/game-hub"),
  submitGame: (payload: GameSubmitPayload) =>
    req<GameSubmitResult>("/api/games/submit", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMathRush: (count = 20, difficulty = "medium") =>
    req<{ questions: MathRushQuestion[]; durationSec: number }>(
      `/api/games/math-rush?count=${count}&difficulty=${difficulty}`
    ),
  getPuzzles: (count = 5) =>
    req<PuzzleDTO[]>(`/api/games/puzzles?count=${count}`),
  getBosses: () => req<BossDTO[]>("/api/games/bosses"),
  getBoss: (id: string) => req<BossDTO>(`/api/games/bosses/${id}`),
  getQuizQuestions: (subjectId?: string, count = 10) =>
    req<{
      questions: {
        id: string;
        text: string;
        options: string[] | null;
        correctAnswer: string;
        explanation: string | null;
        subjectTitle: string;
        subjectColor: string;
      }[];
      durationPerQuestionSec: number;
    }>(`/api/games/quiz?count=${count}${subjectId ? `&subjectId=${subjectId}` : ""}`),

  // ===== Phase 3: Intelligence & Reporting =====
  getTutorAnalytics: () => req<TutorAnalyticsDTO>("/api/analytics/tutor"),
  getStudentDetail: (studentId: string) =>
    req<StudentDetailAnalyticsDTO>(`/api/analytics/student/${studentId}`),
  generateRecommendation: (studentId: string) =>
    req<RecommendationDTO>(
      `/api/analytics/student/${studentId}/recommendations`,
      { method: "POST" }
    ),
  getReport: (studentId: string, period: "WEEKLY" | "MONTHLY" = "WEEKLY") =>
    req<ReportDTO>(`/api/reports/student/${studentId}?period=${period}`),
  getRecommendations: () => req<RecommendationDTO[]>("/api/recommendations"),
  getParentDashboard: () => req<ParentDashboardDTO>("/api/parent/dashboard"),
  getParentChildren: () =>
    req<{ id: string; student: { id: string; name: string; email: string }; relation: string }[]>(
      "/api/parent/children"
    ),
  linkChild: (studentEmail: string, relation?: string) =>
    req<{ id: string; student: { id: string; name: string; email: string } }>(
      "/api/parent/children",
      { method: "POST", body: JSON.stringify({ studentEmail, relation }) }
    ),
};

// Lite types for mutations
export interface TopicLite {
  id: string;
  title: string;
  description: string | null;
  order: number;
  subjectId: string;
}
export interface LessonLite {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  durationMin: number;
  order: number;
  topicId: string;
}
export interface ExerciseLite {
  id: string;
  title: string;
  type: string;
  lessonId: string;
}
export interface QuestionLite {
  id: string;
  text: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  points: number;
  order: number;
}
