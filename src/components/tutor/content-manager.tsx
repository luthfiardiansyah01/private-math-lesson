"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  BookOpen,
  Layers,
  FileText,
  PenTool,
  ListChecks,
  Clock,
  Loader2,
  Eye,
  Check,
  X,
  CircleDot,
  Paperclip,
  Upload,
  Download,
  Image,
  Sparkles,
  AlertTriangle,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { colorClasses, subjectIcon } from "@/lib/ui";
import type {
  SubjectDTO,
  TopicDTO,
  LessonDTO,
  ExerciseDTO,
  QuestionDTO,
  ExerciseType,
  AttachmentDTO,
} from "@/lib/types";

// ---------- constants ----------

const COLOR_OPTIONS = [
  "emerald",
  "orange",
  "rose",
  "violet",
  "amber",
  "teal",
] as const;

const ICON_OPTIONS = [
  "BookOpen",
  "Calculator",
  "Atom",
  "Languages",
  "FlaskConical",
  "Brain",
  "Music",
  "Palette",
  "Code",
  "Globe",
] as const;

const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: "MCQ", label: "Pilihan Ganda" },
  { value: "TRUE_FALSE", label: "Benar / Salah" },
  { value: "SHORT_ANSWER", label: "Isian Singkat" },
];

// ---------- helpers ----------

// Render a dynamic Lucide icon without triggering the
// `react-hooks/static-components` lint rule (which forbids assigning the
// result of a hook-shaped call like `subjectIcon(name)` to a capitalized
// local variable inside a component body).
function renderSubjectIcon(name: string, className?: string) {
  return React.createElement(subjectIcon(name), { className });
}

function exerciseTypeLabel(t: string): string {
  return EXERCISE_TYPES.find((x) => x.value === t)?.label ?? t;
}

// Find a lesson (and its parent topic) inside a fetched subject detail.
function findLessonContext(
  subject: SubjectDTO | null | undefined,
  lessonId: string
): { topic: TopicDTO; lesson: LessonDTO } | null {
  if (!subject) return null;
  for (const topic of subject.topics) {
    const lesson = topic.lessons.find((l) => l.id === lessonId);
    if (lesson) return { topic, lesson };
  }
  return null;
}

// ============================================================
// Main dispatcher
// ============================================================

export function ContentManager() {
  const manageSubjectId = useNav((s) => s.manageSubjectId);
  const manageLessonId = useNav((s) => s.manageLessonId);

  if (manageLessonId && manageSubjectId) {
    return <LessonDetailLevel subjectId={manageSubjectId} lessonId={manageLessonId} />;
  }
  if (manageSubjectId) {
    return <SubjectDetailLevel subjectId={manageSubjectId} />;
  }
  return <SubjectListLevel />;
}

export default ContentManager;

// ============================================================
// Level 1 — Subject list + create/edit
// ============================================================

function SubjectListLevel() {
  const qc = useQueryClient();
  const openManage = useNav((s) => s.openManage);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api.listSubjects(),
  });

  // Create / edit dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectDTO | null>(null);

  // Delete confirm state
  const [deleting, setDeleting] = useState<SubjectDTO | null>(null);

  const createMut = useMutation({
    mutationFn: (v: { title: string; description?: string; color?: string; icon?: string }) =>
      api.createSubject(v),
    onSuccess: () => {
      toast.success("Mata pelajaran dibuat");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["tutor-dashboard"] });
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal membuat mata pelajaran"),
  });

  const updateMut = useMutation({
    mutationFn: (args: { id: string; data: Partial<{ title: string; description: string; color: string; icon: string }> }) =>
      api.updateSubject(args.id, args.data),
    onSuccess: () => {
      toast.success("Mata pelajaran diperbarui");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["tutor-dashboard"] });
      setFormOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal memperbarui mata pelajaran"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteSubject(id),
    onSuccess: () => {
      toast.success("Mata pelajaran dihapus");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["tutor-dashboard"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menghapus mata pelajaran"),
  });

  const handleSubmit = (v: { title: string; description: string; color: string; icon: string }) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data: v });
    } else {
      createMut.mutate(v);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Materi"
        description="Buat dan kelola mata pelajaran kamu."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Tambah Mata Pelajaran
          </Button>
        }
      />

      {isLoading ? (
        <LoadingGrid count={6} />
      ) : isError ? (
        <ErrorState message={error?.message ?? "Gagal memuat materi"} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada mata pelajaran"
          description="Mulai dengan membuat mata pelajaran pertamamu."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Buat Mata Pelajaran
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((s) => {
            const c = colorClasses(s.color);
            return (
              <Card key={s.id} className="overflow-hidden py-0 flex flex-col">
                <div className={`h-1.5 w-full ${c.dot}`} />
                <CardHeader className="pt-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}
                    >
                      {renderSubjectIcon(s.icon, "w-5 h-5")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate">{s.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {s.description || "Tidak ada deskripsi"}
                      </CardDescription>
                    </div>
                    <SubjectCardMenu
                      onEdit={() => {
                        setEditing({
                          id: s.id,
                          title: s.title,
                          description: s.description,
                          color: s.color,
                          icon: s.icon,
                          tutorId: "",
                          tutorName: s.tutorName,
                          topics: [],
                        });
                        setFormOpen(true);
                      }}
                      onDelete={() =>
                        setDeleting({
                          id: s.id,
                          title: s.title,
                          description: s.description,
                          color: s.color,
                          icon: s.icon,
                          tutorId: "",
                          tutorName: s.tutorName,
                          topics: [],
                        })
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      {s.topicsCount} Topik
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {s.lessonsTotal} Pelajaran
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => openManage(s.id)}
                  >
                    Kelola Materi
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <SubjectFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        initial={
          editing
            ? {
                title: editing.title,
                description: editing.description ?? "",
                color: editing.color,
                icon: editing.icon,
              }
            : undefined
        }
        onSubmit={handleSubmit}
        submitting={createMut.isPending || updateMut.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Hapus Mata Pelajaran?"
        description={`"${deleting?.title}" akan dihapus beserta semua topik, pelajaran, latihan, dan soal di dalamnya. Tindakan ini tidak dapat dibatalkan.`}
        confirming={deleteMut.isPending}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
      />
    </div>
  );
}

function SubjectCardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Aksi">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="w-4 h-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================
// Level 2 — Subject detail (topics + lessons)
// ============================================================

function SubjectDetailLevel({ subjectId }: { subjectId: string }) {
  const qc = useQueryClient();
  const backToManageList = useNav((s) => s.backToManageList);
  const openManageLesson = useNav((s) => s.openManageLesson);

  const { data: subject, isLoading, isError, error } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: () => api.getSubject(subjectId),
  });

  // Subject edit dialog
  const [editOpen, setEditOpen] = useState(false);

  // Topic create/edit dialog
  const [topicFormOpen, setTopicFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicDTO | null>(null);

  // Lesson create/edit dialog (lives inside each topic accordion item)
  const [lessonFormForTopic, setLessonFormForTopic] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonDTO | null>(null);

  // Delete confirmations
  const [deletingTopic, setDeletingTopic] = useState<TopicDTO | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<LessonDTO | null>(null);

  const updateSubjectMut = useMutation({
    mutationFn: (args: { id: string; data: Partial<{ title: string; description: string; color: string; icon: string }> }) =>
      api.updateSubject(args.id, args.data),
    onSuccess: () => {
      toast.success("Mata pelajaran diperbarui");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      qc.invalidateQueries({ queryKey: ["tutor-dashboard"] });
      setEditOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal memperbarui"),
  });

  const createTopicMut = useMutation({
    mutationFn: (v: { subjectId: string; title: string; description?: string }) =>
      api.createTopic(v),
    onSuccess: () => {
      toast.success("Topik dibuat");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setTopicFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal membuat topik"),
  });

  const updateTopicMut = useMutation({
    mutationFn: (args: { id: string; data: Partial<{ title: string; description: string }> }) =>
      api.updateTopic(args.id, args.data),
    onSuccess: () => {
      toast.success("Topik diperbarui");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      setTopicFormOpen(false);
      setEditingTopic(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal memperbarui topik"),
  });

  const deleteTopicMut = useMutation({
    mutationFn: (id: string) => api.deleteTopic(id),
    onSuccess: () => {
      toast.success("Topik dihapus");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setDeletingTopic(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menghapus topik"),
  });

  const createLessonMut = useMutation({
    mutationFn: (v: { topicId: string; title: string; content: string; summary?: string; durationMin?: number }) =>
      api.createLesson(v),
    onSuccess: () => {
      toast.success("Pelajaran dibuat");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setLessonFormForTopic(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal membuat pelajaran"),
  });

  const updateLessonMut = useMutation({
    mutationFn: (args: { id: string; data: Partial<{ title: string; content: string; summary: string; durationMin: number }> }) =>
      api.updateLesson(args.id, args.data),
    onSuccess: () => {
      toast.success("Pelajaran diperbarui");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      setEditingLesson(null);
      setLessonFormForTopic(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal memperbarui pelajaran"),
  });

  const deleteLessonMut = useMutation({
    mutationFn: (id: string) => api.deleteLesson(id),
    onSuccess: () => {
      toast.success("Pelajaran dihapus");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setDeletingLesson(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menghapus pelajaran"),
  });

  if (isLoading) return <LoadingGrid count={4} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat detail materi"} />;
  if (!subject) return null;

  const c = colorClasses(subject.color);

  const handleTopicSubmit = (v: { title: string; description: string }) => {
    if (editingTopic) {
      updateTopicMut.mutate({ id: editingTopic.id, data: v });
    } else {
      createTopicMut.mutate({ subjectId: subject.id, ...v });
    }
  };

  const handleLessonSubmit = (v: { title: string; content: string; summary: string; durationMin: number }) => {
    if (editingLesson) {
      updateLessonMut.mutate({ id: editingLesson.id, data: v });
    } else if (lessonFormForTopic) {
      createLessonMut.mutate({ topicId: lessonFormForTopic, ...v });
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={backToManageList}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Semua Mata Pelajaran
      </Button>

      {/* Subject header */}
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
          {renderSubjectIcon(subject.icon, "w-7 h-7")}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{subject.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">
            {subject.description || "Tidak ada deskripsi"}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="outline" className="gap-1">
              <Layers className="w-3 h-3" />
              {subject.topics.length} Topik
            </Badge>
            <Badge variant="outline" className="gap-1">
              <BookOpen className="w-3 h-3" />
              {subject.topics.reduce((n, t) => n + t.lessons.length, 0)} Pelajaran
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-7"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Topics section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Topik
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingTopic(null);
              setTopicFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Tambah Topik
          </Button>
        </div>

        {subject.topics.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Belum ada topik"
            description="Tambahkan topik untuk mulai menyusun pelajaran."
            action={
              <Button
                onClick={() => {
                  setEditingTopic(null);
                  setTopicFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Tambah Topik
              </Button>
            }
          />
        ) : (
          <Accordion type="multiple" defaultValue={[subject.topics[0].id]} className="space-y-3">
            {subject.topics
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((topic) => (
                <TopicAccordion
                  key={topic.id}
                  topic={topic}
                  subject={subject}
                  onEditTopic={() => {
                    setEditingTopic(topic);
                    setTopicFormOpen(true);
                  }}
                  onDeleteTopic={() => setDeletingTopic(topic)}
                  onAddLesson={() => {
                    setEditingLesson(null);
                    setLessonFormForTopic(topic.id);
                  }}
                  onEditLesson={(lesson) => {
                    setEditingLesson(lesson);
                    setLessonFormForTopic(topic.id);
                  }}
                  onDeleteLesson={(lesson) => setDeletingLesson(lesson)}
                  onOpenLesson={(lesson) => openManageLesson(lesson.id)}
                />
              ))}
          </Accordion>
        )}
      </section>

      {/* Dialogs */}
      <SubjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{
          title: subject.title,
          description: subject.description ?? "",
          color: subject.color,
          icon: subject.icon,
        }}
        onSubmit={(v) =>
          updateSubjectMut.mutate({ id: subject.id, data: v })
        }
        submitting={updateSubjectMut.isPending}
      />

      <TopicFormDialog
        open={topicFormOpen}
        onOpenChange={(v) => {
          setTopicFormOpen(v);
          if (!v) setEditingTopic(null);
        }}
        initial={
          editingTopic
            ? {
                title: editingTopic.title,
                description: editingTopic.description ?? "",
              }
            : undefined
        }
        onSubmit={handleTopicSubmit}
        submitting={createTopicMut.isPending || updateTopicMut.isPending}
      />

      <LessonFormDialog
        open={!!lessonFormForTopic}
        onOpenChange={(v) => {
          if (!v) {
            setLessonFormForTopic(null);
            setEditingLesson(null);
          }
        }}
        initial={
          editingLesson
            ? {
                title: editingLesson.title,
                content: editingLesson.content,
                summary: editingLesson.summary ?? "",
                durationMin: editingLesson.durationMin,
              }
            : undefined
        }
        onSubmit={handleLessonSubmit}
        submitting={createLessonMut.isPending || updateLessonMut.isPending}
      />

      <DeleteConfirmDialog
        open={!!deletingTopic}
        onOpenChange={(v) => !v && setDeletingTopic(null)}
        title="Hapus Topik?"
        description={`"${deletingTopic?.title}" beserta semua pelajaran di dalamnya akan dihapus.`}
        confirming={deleteTopicMut.isPending}
        onConfirm={() => deletingTopic && deleteTopicMut.mutate(deletingTopic.id)}
      />

      <DeleteConfirmDialog
        open={!!deletingLesson}
        onOpenChange={(v) => !v && setDeletingLesson(null)}
        title="Hapus Pelajaran?"
        description={`"${deletingLesson?.title}" beserta semua latihan dan soal di dalamnya akan dihapus.`}
        confirming={deleteLessonMut.isPending}
        onConfirm={() => deletingLesson && deleteLessonMut.mutate(deletingLesson.id)}
      />
    </div>
  );
}

function TopicAccordion({
  topic,
  subject,
  onEditTopic,
  onDeleteTopic,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onOpenLesson,
}: {
  topic: TopicDTO;
  subject: SubjectDTO;
  onEditTopic: () => void;
  onDeleteTopic: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: LessonDTO) => void;
  onDeleteLesson: (lesson: LessonDTO) => void;
  onOpenLesson: (lesson: LessonDTO) => void;
}) {
  const c = colorClasses(subject.color);
  return (
    <Card className="py-0 overflow-hidden">
      <AccordionItem value={topic.id} className="border-b-0">
        <div className="flex items-center pr-2">
          <AccordionTrigger className="px-5 py-4 hover:no-underline flex-1">
            <div className="flex items-center gap-3 text-left flex-1 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{topic.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {topic.description || `${topic.lessons.length} pelajaran`}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 mr-2">
                {topic.lessons.length} pelajaran
              </Badge>
            </div>
          </AccordionTrigger>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Aksi topik">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditTopic}>
                <Pencil className="w-4 h-4" />
                Edit Topik
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddLesson}>
                <Plus className="w-4 h-4" />
                Tambah Pelajaran
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDeleteTopic}>
                <Trash2 className="w-4 h-4" />
                Hapus Topik
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <AccordionContent className="px-5 pb-4">
          {topic.lessons.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Belum ada pelajaran pada topik ini.
              </p>
              <Button size="sm" variant="outline" onClick={onAddLesson}>
                <Plus className="w-4 h-4" />
                Tambah Pelajaran
              </Button>
            </div>
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
                    onOpen={() => onOpenLesson(lesson)}
                    onEdit={() => onEditLesson(lesson)}
                    onDelete={() => onDeleteLesson(lesson)}
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
  onOpen,
  onEdit,
  onDelete,
}: {
  lesson: LessonDTO;
  subject: SubjectDTO;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = colorClasses(subject.color);
  return (
    <li className="rounded-lg border p-4 flex items-start gap-3">
      <button onClick={onOpen} className="flex-1 text-left min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">{lesson.title}</p>
          <Badge variant="outline" className={`shrink-0 ${c.text}`}>
            {lesson.exercises.length} latihan
          </Badge>
        </div>
        {lesson.summary && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lesson.summary}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lesson.durationMin} menit
          </span>
        </div>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpen} aria-label="Buka pelajaran">
          <ChevronDown className="w-4 h-4 -rotate-90" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi pelajaran">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>
              <FileText className="w-4 h-4" />
              Buka
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

// ============================================================
// GeneratedQuestionsImporter — select exercise and bulk-add questions
// ============================================================

function GeneratedQuestionsImporter({
  questions,
  exercises,
  onSuccess,
}: {
  questions: { text: string; options: string[]; correctAnswer: string; explanation: string }[];
  exercises: ExerciseDTO[];
  onSuccess: () => void;
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!selectedExerciseId || questions.length === 0) return;
    setImporting(true);
    try {
      for (const q of questions) {
        await api.createQuestion({
          exerciseId: selectedExerciseId,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        });
      }
      toast.success(`${questions.length} soal berhasil ditambahkan ke latihan`);
      onSuccess();
    } catch (e) {
      toast.error((e as Error).message || "Gagal menambahkan soal");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Pilih latihan..." />
        </SelectTrigger>
        <SelectContent>
          {exercises.map((ex) => (
            <SelectItem key={ex.id} value={ex.id}>
              {ex.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleImport} disabled={!selectedExerciseId || importing}>
        {importing && <Loader2 className="w-4 h-4 animate-spin" />}
        Tambah ke Latihan
      </Button>
    </div>
  );
}

// ============================================================
// Level 3 — Lesson detail editor (content + exercises + questions)
// ============================================================

function LessonDetailLevel({ subjectId, lessonId }: { subjectId: string; lessonId: string }) {
  const qc = useQueryClient();
  const openManage = useNav((s) => s.openManage);

  const { data: subject, isLoading, isError, error } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: () => api.getSubject(subjectId),
  });

  // Lesson edit (title/summary/duration) dialog
  const [lessonEditOpen, setLessonEditOpen] = useState(false);

  // Exercise create/edit dialog
  const [exerciseFormOpen, setExerciseFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseDTO | null>(null);

  // Question create/edit dialog (per exercise)
  const [questionFormForExercise, setQuestionFormForExercise] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ exercise: ExerciseDTO; question: QuestionDTO } | null>(null);

  // Delete confirmations
  const [deletingExercise, setDeletingExercise] = useState<ExerciseDTO | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<{ exercise: ExerciseDTO; question: QuestionDTO } | null>(null);

  const updateLessonMut = useMutation({
    mutationFn: (args: { id: string; data: Partial<{ title: string; content: string; summary: string; durationMin: number }> }) =>
      api.updateLesson(args.id, args.data),
    onSuccess: () => {
      toast.success("Pelajaran diperbarui");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setLessonEditOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal memperbarui pelajaran"),
  });

  const saveContentMut = useMutation({
    mutationFn: (args: { id: string; content: string }) =>
      api.updateLesson(args.id, { content: args.content }),
    onSuccess: () => {
      toast.success("Konten pelajaran disimpan");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menyimpan konten"),
  });

  const createExerciseMut = useMutation({
    mutationFn: (v: { lessonId: string; title: string; type: string }) =>
      api.createExercise(v),
    onSuccess: () => {
      toast.success("Latihan dibuat");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      setExerciseFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal membuat latihan"),
  });

  const updateExerciseMut = useMutation({
    mutationFn: (args: { id: string; data: Partial<{ title: string; type: string }> }) =>
      api.updateExercise(args.id, args.data),
    onSuccess: () => {
      toast.success("Latihan diperbarui");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      setExerciseFormOpen(false);
      setEditingExercise(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal memperbarui latihan"),
  });

  const deleteExerciseMut = useMutation({
    mutationFn: (id: string) => api.deleteExercise(id),
    onSuccess: () => {
      toast.success("Latihan dihapus");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      setDeletingExercise(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menghapus latihan"),
  });

  const createQuestionMut = useMutation({
    mutationFn: (v: { exerciseId: string; text: string; options?: string[]; correctAnswer: string; explanation?: string; points?: number }) =>
      api.createQuestion(v),
    onSuccess: () => {
      toast.success("Soal dibuat");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      setQuestionFormForExercise(null);
      setEditingQuestion(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal membuat soal"),
  });

  const updateQuestionMut = useMutation({
    mutationFn: (args: { id: string; data: Partial<{ text: string; options: string[]; correctAnswer: string; explanation: string; points: number }> }) =>
      api.updateQuestion(args.id, args.data),
    onSuccess: () => {
      toast.success("Soal diperbarui");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      setQuestionFormForExercise(null);
      setEditingQuestion(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal memperbarui soal"),
  });

  const deleteQuestionMut = useMutation({
    mutationFn: (id: string) => api.deleteQuestion(id),
    onSuccess: () => {
      toast.success("Soal dihapus");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      setDeletingQuestion(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menghapus soal"),
  });

  // Generate from references
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<
    { text: string; options: string[]; correctAnswer: string; explanation: string }[] | null
  >(null);
  const [generatePreviewOpen, setGeneratePreviewOpen] = useState(false);
  const [generateQuestionsPreviewOpen, setGenerateQuestionsPreviewOpen] = useState(false);

  const generateContentMut = useMutation({
    mutationFn: (lessonId: string) => api.generateFromReferences(lessonId, "content"),
    onSuccess: (data) => {
      setGeneratedContent(data.generated);
      setGeneratePreviewOpen(true);
      toast.success(`Materi dibuat dari ${data.referencesUsed.length} referensi`);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal membuat materi dari referensi"),
  });

  const generateQuestionsMut = useMutation({
    mutationFn: (lessonId: string) => api.generateFromReferences(lessonId, "questions"),
    onSuccess: (data) => {
      try {
        const jsonMatch = data.generated.match(/```json\n?([\s\S]*?)\n?```/);
        const raw = jsonMatch ? jsonMatch[1] : data.generated;
        const parsed = JSON.parse(raw);
        setGeneratedQuestions(Array.isArray(parsed) ? parsed : null);
        setGenerateQuestionsPreviewOpen(true);
        toast.success(`${Array.isArray(parsed) ? parsed.length : 0} soal dibuat dari referensi`);
      } catch {
        toast.error("Format soal tidak valid dari AI");
      }
    },
    onError: (e: Error) => toast.error(e.message || "Gagal membuat soal dari referensi"),
  });

  const applyGeneratedContentMut = useMutation({
    mutationFn: (content: string) => api.updateLesson(lessonId, { content }),
    onSuccess: () => {
      toast.success("Konten pelajaran berhasil diperbarui dari referensi");
      qc.invalidateQueries({ queryKey: ["subject", subjectId] });
      setGeneratePreviewOpen(false);
      setGeneratedContent(null);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menyimpan konten"),
  });

  // Resolve the lesson + topic from the cached subject detail.
  const ctx = useMemo(
    () => findLessonContext(subject, lessonId),
    [subject, lessonId]
  );

  if (isLoading) return <LoadingGrid count={3} />;
  if (isError) return <ErrorState message={error?.message ?? "Gagal memuat pelajaran"} />;
  if (!subject || !ctx) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openManage(subjectId)}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Topik
        </Button>
        <ErrorState message="Pelajaran tidak ditemukan." />
      </div>
    );
  }

  const { topic, lesson } = ctx;
  const hasAttachments = (lesson.attachments?.length ?? 0) > 0;
  const c = colorClasses(subject.color);

  const handleExerciseSubmit = (v: { title: string; type: ExerciseType }) => {
    if (editingExercise) {
      updateExerciseMut.mutate({ id: editingExercise.id, data: { title: v.title, type: v.type } });
    } else {
      createExerciseMut.mutate({ lessonId: lesson.id, title: v.title, type: v.type });
    }
  };

  const handleQuestionSubmit = (v: {
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
  }) => {
    if (editingQuestion) {
      updateQuestionMut.mutate({ id: editingQuestion.question.id, data: v });
    } else if (questionFormForExercise) {
      createQuestionMut.mutate({ exerciseId: questionFormForExercise, ...v });
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openManage(subjectId)}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Topik
      </Button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`} />
        <span className="truncate">
          {subject.title}
          <span className="mx-2">›</span>
          {topic.title}
        </span>
      </div>

      {/* Lesson header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{lesson.title}</h1>
          {lesson.summary && (
            <p className="text-muted-foreground mt-2 text-sm lg:text-base">{lesson.summary}</p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {lesson.durationMin} menit
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <PenTool className="w-3.5 h-3.5" />
              {lesson.exercises.length} latihan
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasAttachments && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  disabled={generateContentMut.isPending || generateQuestionsMut.isPending}
                >
                  {(generateContentMut.isPending || generateQuestionsMut.isPending) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {generateContentMut.isPending ? "Membuat materi..." : generateQuestionsMut.isPending ? "Membuat soal..." : "Buat dari Referensi"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => generateContentMut.mutate(lesson.id)}
                  disabled={generateContentMut.isPending}
                >
                  <FileText className="w-4 h-4" />
                  Buat Materi / Penjelasan
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => generateQuestionsMut.mutate(lesson.id)}
                  disabled={generateQuestionsMut.isPending}
                >
                  <PenTool className="w-4 h-4" />
                  Buat Soal Latihan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" onClick={() => setLessonEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Edit Pelajaran
          </Button>
        </div>
      </div>

      {/* No-reference warning */}
      {!hasAttachments && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Belum ada referensi diunggah. Upload buku atau dokumen di bagian <strong>Lampiran Materi</strong> agar materi dan soal dapat dibuat secara otomatis dari referensi tersebut.
          </span>
        </div>
      )}

      {/* Content editor */}
      <LessonContentEditor
        key={lesson.id}
        lessonId={lesson.id}
        initialContent={lesson.content}
        saving={saveContentMut.isPending}
        onSave={(content) => saveContentMut.mutate({ id: lesson.id, content })}
      />

      {/* Attachments section */}
      <AttachmentsSection
        lessonId={lesson.id}
        attachments={lesson.attachments ?? []}
        onRefresh={() => qc.invalidateQueries({ queryKey: ["subject", subjectId] })}
      />

      {/* Exercises section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PenTool className="w-4 h-4 text-primary" />
            Latihan
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingExercise(null);
              setExerciseFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Tambah Latihan
          </Button>
        </div>

        {lesson.exercises.length === 0 ? (
          <EmptyState
            icon={PenTool}
            title="Belum ada latihan"
            description="Tambahkan latihan untuk menguji pemahaman siswa."
            action={
              <Button
                onClick={() => {
                  setEditingExercise(null);
                  setExerciseFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Tambah Latihan
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {lesson.exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onEdit={() => {
                  setEditingExercise(ex);
                  setExerciseFormOpen(true);
                }}
                onDelete={() => setDeletingExercise(ex)}
                onAddQuestion={() => {
                  setEditingQuestion(null);
                  setQuestionFormForExercise(ex.id);
                }}
                onEditQuestion={(q) => {
                  setEditingQuestion({ exercise: ex, question: q });
                  setQuestionFormForExercise(ex.id);
                }}
                onDeleteQuestion={(q) => setDeletingQuestion({ exercise: ex, question: q })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Dialogs */}
      <LessonFormDialog
        open={lessonEditOpen}
        onOpenChange={setLessonEditOpen}
        initial={{
          title: lesson.title,
          content: lesson.content,
          summary: lesson.summary ?? "",
          durationMin: lesson.durationMin,
        }}
        onSubmit={(v) => updateLessonMut.mutate({ id: lesson.id, data: v })}
        submitting={updateLessonMut.isPending}
      />

      <ExerciseFormDialog
        open={exerciseFormOpen}
        onOpenChange={(v) => {
          setExerciseFormOpen(v);
          if (!v) setEditingExercise(null);
        }}
        initial={
          editingExercise
            ? { title: editingExercise.title, type: editingExercise.type as ExerciseType }
            : undefined
        }
        onSubmit={handleExerciseSubmit}
        submitting={createExerciseMut.isPending || updateExerciseMut.isPending}
      />

      <QuestionFormDialog
        open={!!questionFormForExercise}
        onOpenChange={(v) => {
          if (!v) {
            setQuestionFormForExercise(null);
            setEditingQuestion(null);
          }
        }}
        initial={
          editingQuestion
            ? {
                text: editingQuestion.question.text,
                options: editingQuestion.question.options,
                correctAnswer: editingQuestion.question.correctAnswer,
                explanation: editingQuestion.question.explanation ?? "",
                points: editingQuestion.question.points,
                exerciseType: editingQuestion.exercise.type,
              }
            : undefined
        }
        exerciseType={editingExercise?.type ?? editingQuestion?.exercise.type ?? "MCQ"}
        onSubmit={handleQuestionSubmit}
        submitting={createQuestionMut.isPending || updateQuestionMut.isPending}
      />

      <DeleteConfirmDialog
        open={!!deletingExercise}
        onOpenChange={(v) => !v && setDeletingExercise(null)}
        title="Hapus Latihan?"
        description={`"${deletingExercise?.title}" beserta semua soalnya akan dihapus.`}
        confirming={deleteExerciseMut.isPending}
        onConfirm={() => deletingExercise && deleteExerciseMut.mutate(deletingExercise.id)}
      />

      <DeleteConfirmDialog
        open={!!deletingQuestion}
        onOpenChange={(v) => !v && setDeletingQuestion(null)}
        title="Hapus Soal?"
        description="Soal ini akan dihapus secara permanen."
        confirming={deleteQuestionMut.isPending}
        onConfirm={() => deletingQuestion && deleteQuestionMut.mutate(deletingQuestion.question.id)}
      />

      {/* Preview: generated content */}
      <Dialog open={generatePreviewOpen} onOpenChange={(v) => { setGeneratePreviewOpen(v); if (!v) setGeneratedContent(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Pratinjau Materi dari Referensi
            </DialogTitle>
            <DialogDescription>
              Periksa konten yang dihasilkan. Klik <strong>Terapkan</strong> untuk mengganti konten pelajaran yang ada.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm font-mono whitespace-pre-wrap min-h-0">
            {generatedContent ?? ""}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button
              onClick={() => generatedContent && applyGeneratedContentMut.mutate(generatedContent)}
              disabled={applyGeneratedContentMut.isPending}
            >
              {applyGeneratedContentMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Terapkan ke Pelajaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview: generated questions */}
      <Dialog open={generateQuestionsPreviewOpen} onOpenChange={(v) => { setGenerateQuestionsPreviewOpen(v); if (!v) setGeneratedQuestions(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Pratinjau Soal dari Referensi ({generatedQuestions?.length ?? 0} soal)
            </DialogTitle>
            <DialogDescription>
              Pilih latihan yang ingin diisi, lalu klik <strong>Tambah ke Latihan</strong>. Atau buat latihan baru terlebih dahulu.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            {(generatedQuestions ?? []).map((q, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <p className="font-medium text-sm">{i + 1}. {q.text}</p>
                <ul className="space-y-1">
                  {q.options?.map((opt, j) => (
                    <li key={j} className={`text-sm px-2 py-1 rounded ${opt === q.correctAnswer ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium" : "text-muted-foreground"}`}>
                      {opt}
                    </li>
                  ))}
                </ul>
                {q.explanation && (
                  <p className="text-xs text-muted-foreground italic border-t pt-2">
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline">Tutup</Button>
            </DialogClose>
            {lesson.exercises.length > 0 && (
              <GeneratedQuestionsImporter
                questions={generatedQuestions ?? []}
                exercises={lesson.exercises}
                onSuccess={() => {
                  qc.invalidateQueries({ queryKey: ["subject", subjectId] });
                  setGenerateQuestionsPreviewOpen(false);
                  setGeneratedQuestions(null);
                }}
              />
            )}
            <Button
              variant="outline"
              onClick={() => {
                setGenerateQuestionsPreviewOpen(false);
                setExerciseFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Buat Latihan Baru Dulu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Attachments section (tutor side)
// ============================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  return FileText;
}

function AttachmentsSection({
  lessonId,
  attachments,
  onRefresh,
}: {
  lessonId: string;
  attachments: AttachmentDTO[];
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";
    setUploading(true);
    try {
      await api.uploadAttachment(lessonId, file);
      toast.success(`"${file.name}" berhasil diunggah`);
      onRefresh();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || "Gagal mengunggah file");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteAttachment(id);
      toast.success("Lampiran dihapus");
      onRefresh();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || "Gagal menghapus lampiran");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const confirmItem = attachments.find((a) => a.id === confirmDeleteId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Paperclip className="w-4 h-4 text-primary" />
              Lampiran Materi
            </CardTitle>
            <CardDescription className="text-xs">
              Upload PDF atau gambar sebagai materi pendukung pelajaran
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Mengunggah..." : "Upload File"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Paperclip className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada lampiran.</p>
            <p className="text-xs text-muted-foreground mt-1">PDF atau gambar (maks. 10 MB)</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {attachments.map((a) => {
              const Icon = attachmentIcon(a.mimeType);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.filename}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(a.sizeBytes)}</p>
                  </div>
                  <a
                    href={`/uploads/${a.storedName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Lihat file">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    aria-label="Hapus lampiran"
                    disabled={deletingId === a.id}
                    onClick={() => setConfirmDeleteId(a.id)}
                  >
                    {deletingId === a.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(v) => !v && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Lampiran?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmItem ? `"${confirmItem.filename}" akan dihapus secara permanen.` : "Lampiran ini akan dihapus."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function LessonContentEditor({
  lessonId,
  initialContent,
  saving,
  onSave,
}: {
  lessonId: string;
  initialContent: string;
  saving: boolean;
  onSave: (content: string) => void;
}) {
  // Lazy initializer — only runs once when this component mounts (per lessonId
  // thanks to the `key={lesson.id}` prop set by the parent). Avoids the
  // `react-hooks/set-state-in-effect` lint rule by not syncing from props
  // in an effect.
  const [content, setContent] = useState(() => initialContent);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const dirty = content !== initialContent;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-primary" />
              Konten Pelajaran
            </CardTitle>
            <CardDescription className="text-xs">
              Tulis konten pelajaran dengan format Markdown
            </CardDescription>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "edit" | "preview")}>
            <TabsList className="h-8">
              <TabsTrigger value="edit" className="text-xs gap-1">
                <Pencil className="w-3 h-3" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs gap-1">
                <Eye className="w-3 h-3" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "edit" | "preview")}>
          <TabsContent value="edit" className="mt-0">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis konten pelajaran dalam Markdown..."
              className="min-h-96 font-mono text-sm resize-y"
            />
            <div className="flex items-center justify-between gap-3 mt-3">
              <p className="text-xs text-muted-foreground">
                {dirty ? (
                  <span className="text-amber-600 dark:text-amber-400">Perubahan belum disimpan</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Tersimpan
                  </span>
                )}
              </p>
              <Button
                size="sm"
                onClick={() => onSave(content)}
                disabled={!dirty || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan Konten
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="preview" className="mt-0">
            <div className="prose-edu max-w-none min-h-96 rounded-lg border p-4">
              {content.trim() ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Belum ada konten untuk ditampilkan.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ExerciseCard({
  exercise,
  onEdit,
  onDelete,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
}: {
  exercise: ExerciseDTO;
  onEdit: () => void;
  onDelete: () => void;
  onAddQuestion: () => void;
  onEditQuestion: (q: QuestionDTO) => void;
  onDeleteQuestion: (q: QuestionDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-3 p-4">
          <CollapsibleTrigger asChild>
            <button className="flex-1 text-left min-w-0" aria-label="Toggle questions">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <PenTool className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{exercise.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="mr-1.5 text-[10px] py-0 h-4">
                        {exerciseTypeLabel(exercise.type)}
                      </Badge>
                      {exercise.questions.length} soal
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
          </CollapsibleTrigger>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Aksi latihan">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddQuestion}>
                <Plus className="w-4 h-4" />
                Tambah Soal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CollapsibleContent>
          <Separator />
          <div className="p-4 space-y-3">
            {exercise.questions.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Belum ada soal pada latihan ini.
                </p>
                <Button size="sm" variant="outline" onClick={onAddQuestion}>
                  <Plus className="w-4 h-4" />
                  Tambah Soal
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {exercise.questions
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((q, idx) => (
                    <QuestionRow
                      key={q.id}
                      index={idx}
                      question={q}
                      exerciseType={exercise.type}
                      onEdit={() => onEditQuestion(q)}
                      onDelete={() => onDeleteQuestion(q)}
                    />
                  ))}
              </ul>
            )}
            {exercise.questions.length > 0 && (
              <Button size="sm" variant="outline" className="w-full" onClick={onAddQuestion}>
                <Plus className="w-4 h-4" />
                Tambah Soal
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function QuestionRow({
  index,
  question,
  exerciseType,
  onEdit,
  onDelete,
}: {
  index: number;
  question: QuestionDTO;
  exerciseType: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium whitespace-pre-wrap break-words">{question.text}</p>
          {exerciseType === "MCQ" && question.options && question.options.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {question.options.map((opt, i) => {
                const isCorrect = opt === question.correctAnswer;
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-1.5 ${
                      isCorrect ? "text-emerald-700 dark:text-emerald-400 font-medium" : ""
                    }`}
                  >
                    {isCorrect ? (
                      <Check className="w-3 h-3 shrink-0" />
                    ) : (
                      <CircleDot className="w-3 h-3 shrink-0 opacity-40" />
                    )}
                    <span className="break-words">{opt}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {exerciseType !== "MCQ" && (
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3 shrink-0" />
              Jawaban: <span className="font-medium">{question.correctAnswer}</span>
            </p>
          )}
          {question.explanation && (
            <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
              Pembahasan: {question.explanation}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] py-0 h-4">{question.points} poin</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} aria-label="Edit soal">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} aria-label="Hapus soal">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}

// ============================================================
// Form dialogs
// ============================================================

function SubjectFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: { title: string; description: string; color: string; icon: string };
  onSubmit: (v: { title: string; description: string; color: string; icon: string }) => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Only render the form when open so each open mounts fresh state */}
        {open && (
          <SubjectForm
            initial={initial}
            onSubmit={onSubmit}
            submitting={submitting}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubjectForm({
  initial,
  onSubmit,
  submitting,
  onOpenChange,
}: {
  initial?: { title: string; description: string; color: string; icon: string };
  onSubmit: (v: { title: string; description: string; color: string; icon: string }) => void;
  submitting: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Lazy initializer — runs once on mount (form is mounted fresh each open).
  const [title, setTitle] = useState(() => initial?.title ?? "");
  const [description, setDescription] = useState(() => initial?.description ?? "");
  const [color, setColor] = useState(() => initial?.color ?? "emerald");
  const [icon, setIcon] = useState(() => initial?.icon ?? "BookOpen");

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {initial ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
        </DialogTitle>
        <DialogDescription>Isi detail mata pelajaran kamu.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="subj-title">Judul</Label>
          <Input
            id="subj-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="cth. Matematika"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subj-desc">Deskripsi</Label>
          <Textarea
            id="subj-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi singkat mata pelajaran..."
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Warna</Label>
          <div className="grid grid-cols-6 gap-2">
            {COLOR_OPTIONS.map((c) => {
              const cc = colorClasses(c);
              const active = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-9 rounded-lg flex items-center justify-center border-2 transition ${
                    cc.bg
                  } ${active ? cc.border : "border-transparent hover:opacity-80"}`}
                  aria-label={`Warna ${c}`}
                  aria-pressed={active}
                >
                  <span className={`w-4 h-4 rounded-full ${cc.dot}`} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Ikon</Label>
          <div className="grid grid-cols-5 gap-2">
            {ICON_OPTIONS.map((name) => {
              const cc = colorClasses(color);
              const active = icon === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon(name)}
                  className={`h-10 rounded-lg flex items-center justify-center border-2 transition ${
                    active
                      ? `${cc.bg} ${cc.border} ${cc.text}`
                      : "border-border hover:bg-accent text-muted-foreground"
                  }`}
                  aria-label={`Ikon ${name}`}
                  aria-pressed={active}
                >
                  {renderSubjectIcon(name, "w-5 h-5")}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={submitting}>
            Batal
          </Button>
        </DialogClose>
        <Button
          onClick={() => onSubmit({ title: title.trim(), description: description.trim(), color, icon })}
          disabled={!title.trim() || submitting}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan
        </Button>
      </DialogFooter>
    </>
  );
}

function TopicFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: { title: string; description: string };
  onSubmit: (v: { title: string; description: string }) => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <TopicForm
            initial={initial}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TopicForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: { title: string; description: string };
  onSubmit: (v: { title: string; description: string }) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState(() => initial?.title ?? "");
  const [description, setDescription] = useState(() => initial?.description ?? "");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit Topik" : "Tambah Topik"}</DialogTitle>
        <DialogDescription>Kelompokkan pelajaran ke dalam topik.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="topic-title">Judul Topik</Label>
          <Input
            id="topic-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="cth. Aljabar"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="topic-desc">Deskripsi</Label>
          <Textarea
            id="topic-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi singkat topik..."
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={submitting}>
            Batal
          </Button>
        </DialogClose>
        <Button
          onClick={() => onSubmit({ title: title.trim(), description: description.trim() })}
          disabled={!title.trim() || submitting}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan
        </Button>
      </DialogFooter>
    </>
  );
}

function LessonFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: { title: string; content: string; summary: string; durationMin: number };
  onSubmit: (v: { title: string; content: string; summary: string; durationMin: number }) => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && (
          <LessonForm
            initial={initial}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LessonForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: { title: string; content: string; summary: string; durationMin: number };
  onSubmit: (v: { title: string; content: string; summary: string; durationMin: number }) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState(() => initial?.title ?? "");
  const [content, setContent] = useState(() => initial?.content ?? "");
  const [summary, setSummary] = useState(() => initial?.summary ?? "");
  const [durationMin, setDurationMin] = useState(() =>
    initial?.durationMin ? String(initial.durationMin) : "15"
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit Pelajaran" : "Tambah Pelajaran"}</DialogTitle>
        <DialogDescription>
          {initial
            ? "Perbarui detail pelajaran."
            : "Buat pelajaran baru di dalam topik ini."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="lesson-title">Judul Pelajaran</Label>
          <Input
            id="lesson-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="cth. Pertidaksamaan Linear"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lesson-summary">Ringkasan</Label>
          <Input
            id="lesson-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Ringkasan singkat pelajaran..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lesson-duration">Durasi (menit)</Label>
            <Input
              id="lesson-duration"
              type="number"
              min={1}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lesson-content">Konten (Markdown)</Label>
          <Textarea
            id="lesson-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis konten pelajaran dalam format Markdown..."
            rows={8}
            className="font-mono text-sm"
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={submitting}>
            Batal
          </Button>
        </DialogClose>
        <Button
          onClick={() =>
            onSubmit({
              title: title.trim(),
              content,
              summary: summary.trim(),
              durationMin: parseInt(durationMin, 10) || 15,
            })
          }
          disabled={!title.trim() || submitting}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan
        </Button>
      </DialogFooter>
    </>
  );
}

function ExerciseFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: { title: string; type: ExerciseType };
  onSubmit: (v: { title: string; type: ExerciseType }) => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <ExerciseForm
            initial={initial}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ExerciseForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: { title: string; type: ExerciseType };
  onSubmit: (v: { title: string; type: ExerciseType }) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState(() => initial?.title ?? "");
  const [type, setType] = useState<ExerciseType>(() => initial?.type ?? "MCQ");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit Latihan" : "Tambah Latihan"}</DialogTitle>
        <DialogDescription>
          Latihan berisi kumpulan soal untuk menguji pemahaman.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ex-title">Judul Latihan</Label>
          <Input
            id="ex-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="cth. Latihan Pertidaksamaan Linear"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tipe Latihan</Label>
          <Select value={type} onValueChange={(v) => setType(v as ExerciseType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXERCISE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={submitting}>
            Batal
          </Button>
        </DialogClose>
        <Button
          onClick={() => onSubmit({ title: title.trim(), type })}
          disabled={!title.trim() || submitting}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan
        </Button>
      </DialogFooter>
    </>
  );
}

function QuestionFormDialog({
  open,
  onOpenChange,
  initial,
  exerciseType,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: {
    text: string;
    options: string[] | null;
    correctAnswer: string;
    explanation: string;
    points: number;
    exerciseType: ExerciseType;
  };
  exerciseType: ExerciseType;
  onSubmit: (v: {
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
  }) => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && (
          <QuestionForm
            initial={initial}
            exerciseType={exerciseType}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuestionForm({
  initial,
  exerciseType,
  onSubmit,
  submitting,
}: {
  initial?: {
    text: string;
    options: string[] | null;
    correctAnswer: string;
    explanation: string;
    points: number;
    exerciseType: ExerciseType;
  };
  exerciseType: ExerciseType;
  onSubmit: (v: {
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
  }) => void;
  submitting: boolean;
}) {
  // When exercise type is MCQ, manage an options array. Otherwise, no options.
  const isMcq = exerciseType === "MCQ";
  const isTrueFalse = exerciseType === "TRUE_FALSE";

  const [text, setText] = useState(() => initial?.text ?? "");
  // MCQ options state — starts with at least 2 empty fields.
  const [options, setOptions] = useState<string[]>(() => {
    if (initial?.options && initial.options.length > 0) return [...initial.options];
    return ["", ""];
  });
  // For MCQ, correctAnswer is the value of the selected option.
  // For TRUE_FALSE, correctAnswer is "Benar" or "Salah".
  // For SHORT_ANSWER, correctAnswer is a free-text string.
  const [correctAnswer, setCorrectAnswer] = useState(() => {
    if (initial?.correctAnswer) return initial.correctAnswer;
    if (isTrueFalse) return "Benar";
    return "";
  });
  const [explanation, setExplanation] = useState(() => initial?.explanation ?? "");
  const [points, setPoints] = useState(() =>
    initial?.points ? String(initial.points) : "1"
  );

  const updateOption = (idx: number, val: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };
  const addOption = () => setOptions((prev) => [...prev, ""]);
  const removeOption = (idx: number) =>
    setOptions((prev) => {
      if (prev.length <= 2) return prev;
      const removed = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      // If the removed option was the correct answer, reset.
      if (removed === correctAnswer) setCorrectAnswer("");
      return next;
    });

  const handleSubmit = () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    if (isMcq) {
      const validOptions = options.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2 || !validOptions.includes(correctAnswer.trim())) return;
      onSubmit({
        text: trimmedText,
        options: validOptions,
        correctAnswer: correctAnswer.trim(),
        explanation: explanation.trim(),
        points: parseInt(points, 10) || 1,
      });
    } else if (isTrueFalse) {
      onSubmit({
        text: trimmedText,
        correctAnswer,
        explanation: explanation.trim(),
        points: parseInt(points, 10) || 1,
      });
    } else {
      // SHORT_ANSWER
      if (!correctAnswer.trim()) return;
      onSubmit({
        text: trimmedText,
        correctAnswer: correctAnswer.trim(),
        explanation: explanation.trim(),
        points: parseInt(points, 10) || 1,
      });
    }
  };

  const canSubmit = (() => {
    if (!text.trim()) return false;
    if (isMcq) {
      const valid = options.map((o) => o.trim()).filter(Boolean);
      return valid.length >= 2 && valid.includes(correctAnswer.trim());
    }
    if (isTrueFalse) return !!correctAnswer;
    return !!correctAnswer.trim();
  })();

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit Soal" : "Tambah Soal"}</DialogTitle>
        <DialogDescription>
          Tipe: <span className="font-medium">{exerciseTypeLabel(exerciseType)}</span>
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className="space-y-1.5">
          <Label htmlFor="q-text">Pertanyaan</Label>
          <Textarea
            id="q-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis pertanyaan di sini..."
            rows={3}
          />
        </div>

        {isMcq && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Opsi Jawaban</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addOption} className="h-7 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Tambah Opsi
              </Button>
            </div>
            <div className="space-y-2">
              {options.map((opt, idx) => {
                const checked = opt.trim() !== "" && opt.trim() === correctAnswer.trim();
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => opt.trim() && setCorrectAnswer(opt.trim())}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                        checked
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted-foreground/30 hover:border-emerald-500/50"
                      }`}
                      aria-label={`Pilih sebagai jawaban benar`}
                      aria-pressed={checked}
                      disabled={!opt.trim()}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </button>
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Opsi ${idx + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(idx)}
                      disabled={options.length <= 2}
                      aria-label="Hapus opsi"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Klik lingkaran hijau untuk menandai jawaban benar.
            </p>
          </div>
        )}

        {isTrueFalse && (
          <div className="space-y-1.5">
            <Label>Jawaban Benar</Label>
            <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Benar">Benar</SelectItem>
                <SelectItem value="Salah">Salah</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {!isMcq && !isTrueFalse && (
          <div className="space-y-1.5">
            <Label htmlFor="q-answer">Jawaban Benar</Label>
            <Input
              id="q-answer"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="Jawaban yang diharapkan..."
            />
            <p className="text-xs text-muted-foreground">
              Jawaban siswa akan dinilai case-insensitive setelah di-trim.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="q-explanation">Pembahasan (opsional)</Label>
          <Textarea
            id="q-explanation"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Penjelasan jawaban yang ditampilkan setelah siswa submit..."
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="q-points">Poin</Label>
          <Input
            id="q-points"
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-24"
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={submitting}>
            Batal
          </Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan
        </Button>
      </DialogFooter>
    </>
  );
}

// ============================================================
// Generic delete confirmation dialog
// ============================================================

function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirming,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirming: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={confirming}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirming && <Loader2 className="w-4 h-4 animate-spin" />}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
