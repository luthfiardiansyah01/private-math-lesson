import { create } from "zustand";

interface NavState {
  view: string;
  // student nav params
  selectedSubjectId: string | null;
  selectedTopicId: string | null;
  selectedLessonId: string | null;
  selectedExerciseId: string | null;
  // game nav params
  selectedBossId: string | null;
  // tutor nav params
  manageSubjectId: string | null;
  manageTopicId: string | null;
  manageLessonId: string | null;
  // analytics nav params (tutor viewing a student detail, parent viewing child)
  analyticsStudentId: string | null;
  reportStudentId: string | null;
  reportPeriod: "WEEKLY" | "MONTHLY";
  // parent nav params
  parentSelectedChildId: string | null;
  // actions
  setView: (v: string) => void;
  openSubject: (subjectId: string) => void;
  backToSubjects: () => void;
  openLesson: (lessonId: string, subjectId?: string) => void;
  backToDashboard: () => void;
  openExercise: (exerciseId: string) => void;
  openProgress: () => void;
  openProfile: () => void;
  // games
  openGameHub: () => void;
  openGame: (gameType: "gameQuiz" | "gameMathRush" | "gameMathPuzzle" | "gameBoss") => void;
  openBoss: (bossId: string) => void;
  openAchievements: () => void;
  openGameHistory: () => void;
  // tutor
  openManage: (subjectId?: string) => void;
  backToManageList: () => void;
  openManageTopic: (topicId: string) => void;
  openManageLesson: (lessonId: string) => void;
  // analytics (Phase 3)
  openTutorAnalytics: () => void;
  openStudentDetail: (studentId: string) => void;
  openReport: (studentId: string, period?: "WEEKLY" | "MONTHLY") => void;
  setReportPeriod: (period: "WEEKLY" | "MONTHLY") => void;
  // parent
  openParentChildDetail: (studentId: string) => void;
  openParentLinkChild: () => void;
  reset: () => void;
}

export const useNav = create<NavState>((set) => ({
  view: "dashboard",
  selectedSubjectId: null,
  selectedTopicId: null,
  selectedLessonId: null,
  selectedExerciseId: null,
  selectedBossId: null,
  manageSubjectId: null,
  manageTopicId: null,
  manageLessonId: null,
  analyticsStudentId: null,
  reportStudentId: null,
  reportPeriod: "WEEKLY",
  parentSelectedChildId: null,
  setView: (v) => set({ view: v }),
  openSubject: (subjectId) =>
    set({
      view: "subjects",
      selectedSubjectId: subjectId,
      selectedLessonId: null,
      selectedExerciseId: null,
    }),
  backToSubjects: () =>
    set({
      view: "subjects",
      selectedSubjectId: null,
      selectedLessonId: null,
      selectedExerciseId: null,
    }),
  openLesson: (lessonId, subjectId) =>
    set({
      view: "learn",
      selectedLessonId: lessonId,
      selectedExerciseId: null,
      ...(subjectId ? { selectedSubjectId: subjectId } : {}),
    }),
  backToDashboard: () =>
    set({
      view: "dashboard",
      selectedLessonId: null,
      selectedExerciseId: null,
      selectedSubjectId: null,
    }),
  openExercise: (exerciseId) =>
    set({ view: "exercise", selectedExerciseId: exerciseId }),
  openProgress: () => set({ view: "progress" }),
  openProfile: () => set({ view: "profile" }),
  // games
  openGameHub: () => set({ view: "gameHub", selectedBossId: null }),
  openGame: (gameType) => set({ view: gameType, selectedBossId: null }),
  openBoss: (bossId) => set({ view: "gameBoss", selectedBossId: bossId }),
  openAchievements: () => set({ view: "achievements" }),
  openGameHistory: () => set({ view: "gameHistory" }),
  // tutor
  openManage: (subjectId) =>
    set({
      view: "manage",
      manageSubjectId: subjectId ?? null,
      manageTopicId: null,
      manageLessonId: null,
    }),
  backToManageList: () =>
    set({ manageSubjectId: null, manageTopicId: null, manageLessonId: null }),
  openManageTopic: (topicId) => set({ manageTopicId: topicId }),
  openManageLesson: (lessonId) => set({ manageLessonId: lessonId }),
  // analytics (Phase 3)
  openTutorAnalytics: () => set({ view: "tutorAnalytics" }),
  openStudentDetail: (studentId) =>
    set({ view: "studentDetail", analyticsStudentId: studentId }),
  openReport: (studentId, period) =>
    set({
      view: "report",
      reportStudentId: studentId,
      reportPeriod: period ?? "WEEKLY",
    }),
  setReportPeriod: (period) => set({ reportPeriod: period }),
  // parent
  openParentChildDetail: (studentId) =>
    set({ view: "parentChildDetail", parentSelectedChildId: studentId }),
  openParentLinkChild: () => set({ view: "parentLinkChild" }),
  reset: () =>
    set({
      view: "dashboard",
      selectedSubjectId: null,
      selectedTopicId: null,
      selectedLessonId: null,
      selectedExerciseId: null,
      selectedBossId: null,
      manageSubjectId: null,
      manageTopicId: null,
      manageLessonId: null,
      analyticsStudentId: null,
      reportStudentId: null,
      reportPeriod: "WEEKLY",
      parentSelectedChildId: null,
    }),
}));
