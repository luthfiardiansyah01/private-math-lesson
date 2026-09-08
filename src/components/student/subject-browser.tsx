"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  CircleDashed,
  ChevronRight,
  Layers,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useNav } from "@/lib/store";
import {
  PageHeader,
  LoadingGrid,
  EmptyState,
  ErrorState,
} from "@/components/shared/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  colorClasses,
  subjectIcon,
  statusLabel,
  statusBadgeClass,
} from "@/lib/ui";
import type { SubjectDTO, TopicDTO, LessonDTO } from "@/lib/types";

type ProgressMap = Record<
  string,
  { status: string; completionPct: number; timeSpentSec: number }
>;

// Plain helper (not a component) — returns a React element for the subject icon.
// Using React.createElement avoids the `react-hooks/static-components` rule
// that flags assigning the result of `subjectIcon(name)` to a capitalized
// local variable inside a component body.
function renderSubjectIcon(name: string, className?: string) {
  return React.createElement(subjectIcon(name), { className });
}

export function SubjectBrowser() {
  const selectedSubjectId = useNav((s) => s.selectedSubjectId);

  if (!selectedSubjectId) return <SubjectList />;
  return <SubjectDetail subjectId={selectedSubjectId} />;
}

function SubjectList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api.listSubjects(),
  });
  const openSubject = useNav((s) => s.openSubject);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilih Materi"
        description="Jelajahi semua mata pelajaran yang tersedia."
      />

      {isLoading ? (
        <LoadingGrid count={6} />
      ) : isError ? (
        <ErrorState message={error?.message ?? "Gagal memuat materi"} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada materi"
          description="Materi belum ditambahkan oleh tutor. Coba lagi nanti."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((s) => {
            const c = colorClasses(s.color);
            return (
              <Card
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => openSubject(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openSubject(s.id);
                  }
                }}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all py-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className={`h-1.5 w-full rounded-t-xl ${c.dot}`} />
                <CardHeader className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>
                      {renderSubjectIcon(s.icon, "w-5 h-5")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate">{s.title}</CardTitle>
                      <CardDescription className="truncate">
                        {s.description || "Tidak ada deskripsi"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span className="truncate">{s.tutorName || "—"}</span>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    {s.topicsCount} Topik
                  </span>
                  <span className="mx-2">·</span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    {s.lessonsTotal} Pelajaran
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubjectDetail({ subjectId }: { subjectId: string }) {
  const { data: subject, isLoading, isError, error } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: () => api.getSubject(subjectId),
  });
  const { data: progress } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api.getProgress(),
  });

  const backToSubjects = useNav((s) => s.backToSubjects);
  const openLesson = useNav((s) => s.openLesson);

  if (isLoading) return <LoadingGrid count={4} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat detail materi"} />;
  if (!subject) return null;

  const progressMap: ProgressMap = {};
  for (const p of progress ?? []) {
    progressMap[p.lessonId] = {
      status: p.status,
      completionPct: p.completionPct,
      timeSpentSec: p.timeSpentSec,
    };
  }

  const c = colorClasses(subject.color);
  const totalLessons = subject.topics.reduce((n, t) => n + t.lessons.length, 0);
  const completedLessons = subject.topics.reduce(
    (n, t) => n + t.lessons.filter((l) => progressMap[l.id]?.status === "COMPLETED").length,
    0
  );

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={backToSubjects}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Materi
      </Button>

      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
          {renderSubjectIcon(subject.icon, "w-7 h-7")}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{subject.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">
            {subject.description || "Tidak ada deskripsi"}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="secondary" className="gap-1">
              <UserIcon className="w-3 h-3" />
              {subject.tutorName || "—"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Layers className="w-3 h-3" />
              {subject.topics.length} Topik
            </Badge>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {completedLessons}/{totalLessons} Selesai
            </Badge>
          </div>
        </div>
      </div>

      {subject.topics.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Belum ada topik"
          description="Tutor belum menambahkan topik pada materi ini."
        />
      ) : (
        <Accordion type="multiple" defaultValue={[subject.topics[0].id]} className="space-y-3">
          {subject.topics.map((topic) => (
            <TopicAccordion
              key={topic.id}
              topic={topic}
              subject={subject}
              progressMap={progressMap}
              onOpenLesson={(lesson) => openLesson(lesson.id, subject.id)}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}

function TopicAccordion({
  topic,
  subject,
  progressMap,
  onOpenLesson,
}: {
  topic: TopicDTO;
  subject: SubjectDTO;
  progressMap: ProgressMap;
  onOpenLesson: (lesson: LessonDTO) => void;
}) {
  const c = colorClasses(subject.color);
  const total = topic.lessons.length;
  const completed = topic.lessons.filter(
    (l) => progressMap[l.id]?.status === "COMPLETED"
  ).length;

  return (
    <Card className="py-0 overflow-hidden">
      <AccordionItem value={topic.id} className="border-b-0">
        <AccordionTrigger className="px-5 py-4 hover:no-underline">
          <div className="flex items-center gap-3 text-left flex-1 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{topic.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {topic.description || `${completed}/${total} pelajaran selesai`}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 mr-2">
              {completed}/{total}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-4">
          {topic.lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Belum ada pelajaran pada topik ini.
            </p>
          ) : (
            <ul className="space-y-2 pt-2">
              {topic.lessons
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    subject={subject}
                    progress={progressMap[lesson.id]}
                    onOpen={() => onOpenLesson(lesson)}
                  />
                ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>
    </Card>
  );
}

function LessonRow({
  lesson,
  subject,
  progress,
  onOpen,
}: {
  lesson: LessonDTO;
  subject: SubjectDTO;
  progress?: { status: string; completionPct: number; timeSpentSec: number };
  onOpen: () => void;
}) {
  const c = colorClasses(subject.color);
  const status = progress?.status ?? "NOT_STARTED";
  const completion = progress?.completionPct ?? 0;

  const StatusIcon =
    status === "COMPLETED" ? CheckCircle2 : status === "IN_PROGRESS" ? CircleDashed : Circle;

  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full text-left rounded-lg border p-4 hover:bg-accent/50 transition-colors flex items-start gap-3"
      >
        <StatusIcon className={`w-5 h-5 mt-0.5 shrink-0 ${c.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium truncate">{lesson.title}</p>
            <Badge className={`shrink-0 ${statusBadgeClass(status)}`}>
              {statusLabel(status)}
            </Badge>
          </div>
          {lesson.summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {lesson.summary}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lesson.durationMin} menit
            </span>
            {status === "IN_PROGRESS" && (
              <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                <Progress value={completion} className="h-1.5" />
                <span className="tabular-nums">{completion}%</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
      </button>
    </li>
  );
}

export default SubjectBrowser;
