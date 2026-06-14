import React, { useEffect, useMemo, useState, useRef } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save, AlertCircle } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { createTest, getErrorMessage, updateTest } from "../api";
import { useSubjects, useSubTopics, useTest, useTopics } from "../hooks/useTests";
import { TestPayload } from "../types";
import { testSchema, TestFormInput, TestFormValues } from "../utils/validators";
import { PageHeader } from "../components/ui/PageHeader";
import { FormField } from "../components/ui/FormField";
import { MultiSelect } from "../components/ui/MultiSelect";
import { Toast } from "../components/ui/Toast";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

const testTypeOptions = [
  { label: "Chapter Wise", value: "chapterwise" },
  { label: "Subject Wise", value: "subjectwise" },
  { label: "Full Test", value: "fulltest" },
  { label: "Practice Test", value: "practice" },
  { label: "Mock Test", value: "mock" },
  { label: "PYQ", value: "previous_year" },
];

export const CreateEditTestPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"success" | "error">("success");

  const [showExitBlocker, setShowExitBlocker] = useState(false);

  // Auto-Save States
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [secondsSinceSave, setSecondsSinceSave] = useState(0);

  const { data: subjects = [] } = useSubjects();
  const { data: existingTest, isLoading: isLoadingTest } = useTest(id);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState,
  } = useForm<TestFormInput, unknown, TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      name: "",
      subject: "",
      type: "chapterwise",
      topics: [],
      sub_topics: [],
      difficulty: "easy",
      correct_marks: 4,
      wrong_marks: -1,
      unattempt_marks: 0,
      total_time: 60,
      total_marks: 100,
      total_questions: 25,
    },
  });

  const { isDirty } = formState;

  const subjectId = watch("subject");
  const selectedTopics = watch("topics");
  const selectedDifficulty = watch("difficulty");
  const correctMarks = watch("correct_marks");
  const totalQuestions = watch("total_questions");

  const { data: topics = [] } = useTopics(subjectId);
  const { data: subTopics = [] } = useSubTopics(selectedTopics);

  useEffect(() => {
    const marks = Number(correctMarks);
    const questions = Number(totalQuestions);
    if (!isNaN(marks) && !isNaN(questions)) {
      setValue("total_marks", marks * questions, { shouldDirty: true, shouldValidate: true });
    }
  }, [correctMarks, totalQuestions, setValue]);

  useEffect(() => {
    if (existingTest) {
      reset({
        name: existingTest.name,
        subject: existingTest.subject_id ?? existingTest.subject,
        type: (existingTest.type as any) || "chapterwise",
        topics: existingTest.topics ?? [],
        sub_topics: existingTest.sub_topics ?? [],
        difficulty: (existingTest.difficulty as any) || "easy",
        correct_marks: existingTest.correct_marks,
        wrong_marks: existingTest.wrong_marks,
        unattempt_marks: existingTest.unattempt_marks,
        total_time: existingTest.total_time,
        total_marks: existingTest.total_marks,
        total_questions: existingTest.total_questions,
      });
    }
  }, [existingTest, reset]);

  const subjectName = useMemo(
    () => subjects.find((subject) => subject.id === subjectId)?.name ?? subjectId,
    [subjects, subjectId]
  );

  const showToast = (message: string, tone: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastTone(tone);
    window.setTimeout(() => setToastMessage(""), 3000);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: TestPayload) => (isEdit && id ? updateTest(id, payload) : createTest(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["tests", id] });
      }
    },
  });

  const buildPayload = (values: TestFormValues): TestPayload => ({
    ...values,
    sub_topics: values.sub_topics ?? [],
    subject: subjectName,
    subject_id: values.subject,
    status: existingTest?.status ?? "draft",
    questions: existingTest?.questions ?? [],
  });

  const submit =
    (goNext: boolean): SubmitHandler<TestFormValues> =>
    async (values) => {
      try {
        const payload = buildPayload(values);
        const result = await saveMutation.mutateAsync(payload);
        // Reset form state as clean
        reset(values);
        showToast(isEdit ? "Test updated successfully!" : "Test created successfully!", "success");
        window.setTimeout(() => {
          navigate(goNext ? `/tests/${result.id}/questions` : "/dashboard");
        }, 1000);
      } catch (error) {
        showToast(getErrorMessage(error), "error");
      }
    };

  // Browser BeforeUnload Block (Tab closures or full reloads)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // 30-Second Auto Save Timer
  useEffect(() => {
    const timer = setInterval(async () => {
      if (isDirty) {
        try {
          const values = getValues();
          const payload = buildPayload(values as TestFormValues);
          const result = await saveMutation.mutateAsync(payload);

          // If first draft save, silently update url path to edit mode
          if (!isEdit && result.id) {
            navigate(`/tests/${result.id}/edit`, { replace: true });
          }

          // Mark form as clean with current values
          reset(values);
          setLastSavedTime(new Date());
          setSecondsSinceSave(0);
        } catch (e) {
          console.error("Draft auto-save failure", e);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(timer);
  }, [isDirty, isEdit, reset, getValues, navigate, existingTest]);

  // Save Ticker Ticker
  useEffect(() => {
    if (!lastSavedTime) return;
    const interval = setInterval(() => {
      setSecondsSinceSave((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSavedTime]);

  const autoSaveStatusText = useMemo(() => {
    if (!lastSavedTime) return "";
    if (secondsSinceSave < 5) return "Draft saved just now";
    if (secondsSinceSave < 60) return `Draft saved ${secondsSinceSave}s ago`;
    return `Draft saved at ${lastSavedTime.toLocaleTimeString()}`;
  }, [lastSavedTime, secondsSinceSave]);

  const handleCancelClick = () => {
    if (isDirty) {
      setShowExitBlocker(true);
    } else {
      navigate("/dashboard");
    }
  };

  const showEditSkeleton = isEdit && isLoadingTest;

  return (
    <AppShell>
      <PageWrapper>
        <PageHeader
          title={isEdit ? "Edit Test Details" : "Create New Test"}
          description={isEdit ? "Modify configuration parameters and metadata for this test." : "Configure test details, topics, durations, and marking schemes."}
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: isEdit ? "Edit Test" : "Create Test" },
          ]}
          action={
            autoSaveStatusText ? (
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {autoSaveStatusText}
              </span>
            ) : null
          }
        />

        {showEditSkeleton ? (
          <div className="flex h-80 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2 font-semibold">Loading test details...</span>
          </div>
        ) : (
          <form className="space-y-8 bg-white border border-slate-200 rounded-md p-6 shadow-sm" onSubmit={handleSubmit(submit(true))}>
            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
              <FormField label="Name of Test" error={formState.errors.name?.message} required>
                <Input placeholder="Enter name of Test" {...register("name")} />
              </FormField>

              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormField label="Test Type" error={formState.errors.type?.message} required>
                    <Select
                      options={testTypeOptions}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormField>
                )}
              />

              <Controller
                name="subject"
                control={control}
                render={({ field }) => (
                  <FormField label="Subject" error={formState.errors.subject?.message} required>
                    <Select
                      options={[{ label: "Choose from Drop-down", value: "" }, ...subjects.map((sub) => ({ label: sub.name, value: sub.id }))]}
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e);
                        setValue("topics", []);
                        setValue("sub_topics", []);
                      }}
                    />
                  </FormField>
                )}
              />

              <Controller
                name="topics"
                control={control}
                render={({ field }) => (
                  <FormField label="Topics" error={formState.errors.topics?.message} required>
                    <MultiSelect
                      options={topics.map((topic) => ({ label: topic.name, value: topic.id }))}
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        setValue("sub_topics", []);
                      }}
                      placeholder="Select topics..."
                    />
                  </FormField>
                )}
              />

              <Controller
                name="sub_topics"
                control={control}
                render={({ field }) => (
                  <FormField label="Sub Topics" error={formState.errors.sub_topics?.message}>
                    <MultiSelect
                      options={subTopics.map((subTopic) => ({ label: subTopic.name, value: subTopic.id }))}
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select sub-topics..."
                    />
                  </FormField>
                )}
              />

              <FormField label="Duration (Minutes)" error={formState.errors.total_time?.message} required>
                <Input placeholder="Enter duration in minutes" type="number" {...register("total_time")} />
              </FormField>

              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <FormField label="Test Difficulty Level" error={formState.errors.difficulty?.message} required>
                    <div className="grid grid-cols-3 gap-4 h-12 items-center">
                      {(["easy", "medium", "hard"] as const).map((difficulty) => (
                        <label key={difficulty} className="flex items-center gap-3 text-sm font-semibold capitalize text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            checked={selectedDifficulty === difficulty}
                            onChange={() => field.onChange(difficulty)}
                            className="h-5 w-5 accent-[#6c7df7]"
                          />
                          {difficulty === "hard" ? "Difficult" : difficulty}
                        </label>
                      ))}
                    </div>
                  </FormField>
                )}
              />
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="mb-5 text-sm font-bold text-slate-800">Marking Scheme</h2>
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <FormField label="Correct Answer Marks" error={formState.errors.correct_marks?.message} required>
                  <Input type="number" step="any" {...register("correct_marks")} />
                </FormField>
                <FormField label="Wrong Answer Marks" error={formState.errors.wrong_marks?.message} required>
                  <Input type="number" step="any" {...register("wrong_marks")} />
                </FormField>
                <FormField label="Unattempted Marks" error={formState.errors.unattempt_marks?.message} required>
                  <Input type="number" step="any" {...register("unattempt_marks")} />
                </FormField>
                <FormField label="Number of Questions" error={formState.errors.total_questions?.message} required>
                  <Input type="number" {...register("total_questions")} />
                </FormField>
                <FormField label="Total Marks" error={formState.errors.total_marks?.message} required>
                  <Input type="number" readOnly {...register("total_marks")} className="bg-slate-50 cursor-not-allowed font-bold" />
                </FormField>
              </div>
            </div>

            <div className="flex justify-end gap-4 border-t border-slate-100 pt-6">
              <Button type="button" variant="secondary" onClick={handleCancelClick}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" disabled={saveMutation.isPending} onClick={handleSubmit(submit(false))}>
                Save as Draft
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Next: Add Questions
              </Button>
            </div>
          </form>
        )}

        <ConfirmDialog
          open={showExitBlocker}
          title="Unsaved Changes"
          description="You have unsaved changes on this form. Leaving this page will discard any modifications. Are you sure you want to exit?"
          onConfirm={() => {
            setShowExitBlocker(false);
            navigate("/dashboard");
          }}
          onCancel={() => setShowExitBlocker(false)}
          confirmText="Yes, exit"
          cancelText="No, stay here"
          variant="danger"
        />

        {toastMessage && <Toast tone={toastTone}>{toastMessage}</Toast>}
      </PageWrapper>
    </AppShell>
  );
};
