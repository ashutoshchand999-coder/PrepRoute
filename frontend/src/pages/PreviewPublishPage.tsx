import React, { useEffect, useMemo, useState } from "react";
import { Link as DomLink, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle, CheckCircle2, Clock, Pencil, BookOpen, AlertCircle, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { Toast } from "../components/ui/Toast";
import { fetchBulkQuestions, getErrorMessage, publishTest } from "../api";
import { useSubTopics, useTest, useTopics } from "../hooks/useTests";
import { PageHeader } from "../components/ui/PageHeader";
import { Question } from "../types";

export const PreviewPublishPage = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: test, isLoading } = useTest(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [publishedTimestamp, setPublishedTimestamp] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"success" | "error">("success");
  const [error, setError] = useState("");

  // Exam Simulator States
  const [activeIndex, setActiveIndex] = useState(0);
  const [simulatedAnswers, setSimulatedAnswers] = useState<Record<number, string>>({});
  const [showCorrect, setShowCorrect] = useState(false);
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set([0]));
  const [displayQuestions, setDisplayQuestions] = useState<Question[]>([]);

  const { data: topics = [] } = useTopics(test?.subject_id ?? "");
  const selectedTopicIds = useMemo(() => (test?.topics ?? []).filter(Boolean), [test?.topics]);
  const { data: subTopics = [] } = useSubTopics(selectedTopicIds);

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["questions", id, test?.questions],
    queryFn: () => fetchBulkQuestions(test?.questions ?? []),
    enabled: Boolean(test?.questions?.length),
  });

  // Load a subset of questions stable for this preview session
  useEffect(() => {
    if (questions.length > 0 && test?.total_questions) {
      const targetCount = Number(test.total_questions);
      if (questions.length > targetCount) {
        const shuffled = [...questions].sort(() => 0.5 - Math.random()).slice(0, targetCount);
        setDisplayQuestions(shuffled);
      } else {
        setDisplayQuestions(questions);
      }
    } else {
      setDisplayQuestions(questions);
    }
  }, [questions, test?.total_questions]);

  // Track visited questions indices
  useEffect(() => {
    if (displayQuestions.length > 0) {
      setVisitedIndices((prev) => {
        const next = new Set(prev);
        next.add(activeIndex);
        return next;
      });
    }
  }, [activeIndex, displayQuestions.length]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid navigating if user is typing in some input, textarea or contenteditable element
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.hasAttribute("contenteditable")
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        setActiveIndex((idx) => {
          if (idx > 0) {
            setShowCorrect(false);
            return idx - 1;
          }
          return idx;
        });
      } else if (e.key === "ArrowRight") {
        setActiveIndex((idx) => {
          if (idx < displayQuestions.length - 1) {
            setShowCorrect(false);
            return idx + 1;
          }
          return idx;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [displayQuestions.length]);

  const showToast = (message: string, tone: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastTone(tone);
    window.setTimeout(() => setToastMessage(""), 3000);
  };

  const publishMutation = useMutation({
    mutationFn: () => publishTest(id),
    onSuccess: () => {
      setConfirmOpen(false);
      setPublishedTimestamp(new Date().toLocaleString());
      setShowSuccessScreen(true);
      showToast("Test published successfully!", "success");
      // Invalidate queries so dashboard statistics and status are updated
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["tests", id] });
      window.setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const topicNames = useMemo(() => {
    return (test?.topics ?? []).map((tId) => topics.find((t) => t.id === tId)?.name ?? tId);
  }, [test?.topics, topics]);

  const subTopicNames = useMemo(() => {
    return (test?.sub_topics ?? []).map((sId) => subTopics.find((st) => st.id === sId)?.name ?? sId);
  }, [test?.sub_topics, subTopics]);

  const activeQuestion = displayQuestions[activeIndex];

  const handleSelectOption = (optKey: string) => {
    setSimulatedAnswers((prev) => ({
      ...prev,
      [activeIndex]: optKey,
    }));
  };

  if (isLoading || !test) {
    return (
      <AppShell compactRail>
        <PageWrapper compact>
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2 font-semibold">Loading preview...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  if (showSuccessScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 p-6 animate-fade-in">
        <div className="flex flex-col items-center max-w-md w-full text-center bg-white border border-slate-200 rounded-md p-10 shadow-soft">
          <div className="mb-6 rounded-full bg-emerald-50 p-4 animate-bounce">
            <CheckCircle className="h-16 w-16 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Test Published!</h1>
          
          <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded p-4 w-full mb-6 text-left text-xs font-semibold text-slate-600">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Test Name</span>
              <span className="text-slate-800 font-bold">{test.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Status</span>
              <Badge tone="green">Live</Badge>
            </div>
            <div className="flex justify-between">
              <span>Published At</span>
              <span className="text-slate-800 font-bold">{publishedTimestamp}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-bold flex items-center justify-center gap-2">
            <Spinner />
            <span>Redirecting to Dashboard in 3 seconds...</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShell compactRail>
      <PageWrapper compact>
        <PageHeader
          title="Student Exam Simulator"
          description="Review the test using a student exam interface before deployment."
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Questions", to: `/tests/${id}/questions` },
            { label: "Simulator Preview" },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_320px] mb-8 items-start">
          {/* Left panel: Active Question Display */}
          <div className="bg-white border border-slate-200 rounded-md p-6 shadow-sm flex flex-col min-h-[500px] lg:h-[calc(100vh-240px)] overflow-hidden">
            {isLoadingQuestions ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 font-semibold">
                <Spinner /> <span className="ml-2">Loading questions...</span>
              </div>
            ) : displayQuestions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 font-semibold text-sm">
                No questions found. Add questions in the previous step.
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                {/* Question Info Header - Sticky style */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 bg-white z-10 flex-shrink-0">
                  <span className="text-xs font-bold text-slate-400">
                    QUESTION {activeIndex + 1} OF {displayQuestions.length}
                  </span>
                  <div className="flex gap-1.5">
                    {activeQuestion.difficulty && (
                      <Badge tone={activeQuestion.difficulty === "easy" ? "green" : activeQuestion.difficulty === "medium" ? "yellow" : "red"}>
                        {activeQuestion.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Question Scrollable Body */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
                  {/* Question HTML Statement */}
                  <div
                    className="text-sm font-bold text-slate-800 leading-relaxed rich-content"
                    dangerouslySetInnerHTML={{ __html: activeQuestion.question }}
                  />

                  {/* Question Image */}
                  {activeQuestion.image_url && (
                    <div className="my-4 max-h-56 overflow-hidden rounded border border-slate-200 max-w-md bg-slate-50 flex-shrink-0">
                      <img src={activeQuestion.image_url} alt="Question Graphic" className="h-full w-full object-cover" />
                    </div>
                  )}

                  {/* Options List */}
                  <div className="grid gap-3">
                    {(["option1", "option2", "option3", "option4"] as const).map((optionKey, index) => {
                      const isSelected = simulatedAnswers[activeIndex] === optionKey;
                      const isCorrect = activeQuestion.correct_option === optionKey;
                      
                      let optionBg = "border-slate-200 hover:bg-slate-50/50 text-slate-700";
                      if (isSelected) {
                        optionBg = "border-[#6c7df7] bg-blue-50/50 text-[#2563eb] font-semibold";
                      }
                      if (showCorrect) {
                        if (isCorrect) {
                          optionBg = "border-emerald-300 bg-emerald-50 text-emerald-700 font-bold";
                        } else if (isSelected) {
                          optionBg = "border-rose-300 bg-rose-50 text-rose-700 font-semibold";
                        }
                      }

                      return (
                        <button
                          key={optionKey}
                          type="button"
                          onClick={() => handleSelectOption(optionKey)}
                          className={`w-full text-left rounded-md border p-3.5 text-xs transition flex items-center gap-3 ${optionBg}`}
                        >
                          <span className={`h-6 w-6 flex items-center justify-center rounded-full border text-[10px] font-bold flex-shrink-0 ${
                            isSelected ? "bg-[#2563eb] text-white border-transparent" : "border-slate-300 text-slate-500 bg-slate-50"
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{activeQuestion[optionKey]}</span>
                          {showCorrect && isCorrect && <Check className="ml-auto h-4 w-4 text-emerald-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Block */}
                  {showCorrect && activeQuestion.explanation && (
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded p-4 text-xs font-semibold text-slate-500 animate-fade-in">
                      <span className="text-slate-800 font-extrabold block mb-1">Explanation / Solution:</span>
                      {activeQuestion.explanation}
                    </div>
                  )}
                </div>

                {/* Question Footer controls - Sticky style */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-4 bg-white z-10 flex-shrink-0">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 px-3 text-xs"
                      disabled={activeIndex === 0}
                      onClick={() => {
                        setActiveIndex((idx) => idx - 1);
                        setShowCorrect(false);
                      }}
                      icon={<ChevronLeft className="h-4 w-4" />}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 px-3 text-xs"
                      disabled={activeIndex === displayQuestions.length - 1}
                      onClick={() => {
                        setActiveIndex((idx) => idx + 1);
                        setShowCorrect(false);
                      }}
                      icon={<ChevronRight className="h-4 w-4" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Question Navigation Palette */}
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm space-y-6 flex flex-col justify-between lg:sticky lg:top-[120px] h-fit">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <BookOpen className="h-4 w-4 text-slate-500" />
                <span>Question Palette</span>
              </h3>

              {displayQuestions.length === 0 ? (
                <span className="text-slate-400 text-xs font-semibold block">Palette empty</span>
              ) : (
                <div className="grid grid-cols-5 gap-2.5">
                  {displayQuestions.map((_: any, index: number) => {
                    const isAnswered = simulatedAnswers[index] !== undefined;
                    const isActive = activeIndex === index;
                    const isVisited = visitedIndices.has(index);

                    let btnColor = "";
                    if (isAnswered) {
                      btnColor = "bg-emerald-500 text-white border-transparent hover:bg-emerald-600";
                    } else if (isVisited) {
                      btnColor = "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300";
                    } else {
                      btnColor = "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100";
                    }

                    if (isActive) {
                      btnColor += " ring-2 ring-[#6c7df7] ring-offset-1 font-extrabold";
                    }

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setActiveIndex(index);
                          setShowCorrect(false);
                        }}
                        className={`h-9 w-9 rounded text-xs font-bold transition flex items-center justify-center border ${btnColor}`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded bg-slate-50 border border-slate-200 inline-block" />
                  <span>Not Visited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded bg-slate-200 border border-slate-300 inline-block" />
                  <span>Visited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded bg-emerald-500 inline-block" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded bg-slate-50 border border-slate-200 ring-2 ring-[#6c7df7] ring-offset-1 inline-block" />
                  <span>Current</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-4">
              <div>
                <span className="block text-[10px] font-extrabold text-slate-400 tracking-wide">TEST METRIC</span>
                <span className="text-xs font-bold text-slate-700 block mt-1">Total Marks: {test.total_marks ?? displayQuestions.length * test.correct_marks} Marks</span>
              </div>
              <div className="flex gap-2">
                {test.status !== "live" ? (
                  <>
                    <DomLink to={`/tests/${id}/questions`} className="w-1/2">
                      <Button variant="secondary" className="w-full h-10 px-2 text-xs">
                        Edit Q's
                      </Button>
                    </DomLink>
                    <Button
                      className="w-1/2 h-10 px-2 text-xs"
                      disabled={displayQuestions.length === 0}
                      onClick={() => setConfirmOpen(true)}
                    >
                      Publish Test
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full h-10 text-xs bg-emerald-50 hover:bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default font-bold flex items-center justify-center gap-1.5"
                    disabled
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-600" /> Test is Live
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Modal
          open={confirmOpen}
          title="Publish Test"
          onClose={() => setConfirmOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button disabled={publishMutation.isPending} onClick={() => publishMutation.mutate()}>
                {publishMutation.isPending ? "Publishing..." : "Confirm & Publish"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to publish <span className="font-bold">"{test.name}"</span>?
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Once published, the test status will become "Live" and it will be visible to students.
          </p>
          {error && <p className="mt-3 text-sm font-semibold text-rose-600 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{error}</p>}
        </Modal>

        {toastMessage && <Toast tone={toastTone}>{toastMessage}</Toast>}
      </PageWrapper>
    </AppShell>
  );
};
