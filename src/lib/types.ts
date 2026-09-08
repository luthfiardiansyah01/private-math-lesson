// Shared API contracts between frontend and backend

export type Role = "STUDENT" | "TUTOR" | "PARENT";

export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type ExerciseType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";

// ---- Auth ----
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface RegisterResponse {
  ok: boolean;
  error?: string;
}

// ---- Profile ----
export interface ProfileDTO {
  bio: string | null;
  avatarUrl: string | null;
  educationLevel: string | null;
  targetExam: string | null;
  studyGoals: string | null;
  phone: string | null;
}

// ---- Content ----
export interface QuestionDTO {
  id: string;
  text: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  points: number;
  order: number;
}

export interface ExerciseDTO {
  id: string;
  title: string;
  type: ExerciseType;
  lessonId: string;
  questions: QuestionDTO[];
}

export interface LessonDTO {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  durationMin: number;
  order: number;
  topicId: string;
  exercises: ExerciseDTO[];
}

export interface TopicDTO {
  id: string;
  title: string;
  description: string | null;
  order: number;
  subjectId: string;
  lessons: LessonDTO[];
}

export interface SubjectDTO {
  id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  tutorId: string;
  tutorName: string;
  topics: TopicDTO[];
}

// ---- Student-facing (with progress) ----
export interface LessonProgressDTO extends LessonDTO {
  progressStatus: ProgressStatus;
  completionPct: number;
  timeSpentSec: number;
  lastAccessedAt: string | null;
}

export interface TopicMasteryDTO extends TopicDTO {
  masteryLevel: number;
  lessonsCompleted: number;
  lessonsTotal: number;
}

export interface SubjectStudentDTO {
  id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  tutorName: string;
  topicsCount: number;
  lessonsTotal: number;
  lessonsCompleted: number;
  overallMastery: number;
  topics: TopicMasteryDTO[];
}

// ---- Learning Session ----
export interface SessionDTO {
  id: string;
  studentId: string;
  lessonId: string;
  lessonTitle: string;
  topicTitle: string;
  subjectTitle: string;
  subjectColor: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  status: string;
}

// ---- Exercise Attempt ----
export interface SubmitAnswer {
  questionId: string;
  answer: string;
}

export interface AttemptResultDTO {
  attemptId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  details: {
    questionId: string;
    correct: boolean;
    correctAnswer: string;
    explanation: string | null;
    yourAnswer: string;
  }[];
}

// ---- Dashboards ----
export interface StudentDashboardDTO {
  user: { id: string; name: string; email: string };
  stats: {
    subjectsEnrolled: number;
    lessonsCompleted: number;
    lessonsTotal: number;
    activeSessions: number;
    totalTimeSpentSec: number;
    avgMastery: number;
    exercisesTaken: number;
    avgExerciseScore: number;
  };
  continueLearning: {
    lessonId: string;
    lessonTitle: string;
    topicTitle: string;
    subjectTitle: string;
    subjectColor: string;
    completionPct: number;
    status: ProgressStatus;
  }[];
  recentActivity: {
    id: string;
    type: "lesson" | "exercise";
    title: string;
    detail: string;
    timestamp: string;
  }[];
  masteryBySubject: {
    subjectId: string;
    subjectTitle: string;
    color: string;
    level: number;
  }[];
  weeklyActivity: { day: string; minutes: number }[];
}

export interface TutorDashboardDTO {
  user: { id: string; name: string; email: string };
  stats: {
    subjectsCount: number;
    topicsCount: number;
    lessonsCount: number;
    exercisesCount: number;
    studentsCount: number;
    totalSessions: number;
  };
  subjects: {
    id: string;
    title: string;
    color: string;
    topicsCount: number;
    lessonsCount: number;
    studentsCount: number;
    avgMastery: number;
  }[];
  recentStudents: {
    id: string;
    name: string;
    email: string;
    lessonsCompleted: number;
    avgMastery: number;
    lastActive: string | null;
  }[];
}
