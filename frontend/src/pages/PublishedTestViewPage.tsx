import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, FileText, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { fetchBulkQuestions } from "../api";
import { Question } from "../types";
import { useSubTopics, useTest, useTopics } from "../hooks/useTests";
import { PageHeader } from "../components/ui/PageHeader";

export const PublishedTestViewPage = () => {
  const { id = "" } = useParams<{ id: string }>();

  const { data: test, isLoading, error } = useTest(id);
  const { data: topics = [] } = useTopics(test?.subject_id ?? "");
  const selectedTopicIds = useMemo(() => (test?.topics ?? []).filter(Boolean), [test?.topics]);
  const { data: subTopics = [] } = useSubTopics(selectedTopicIds);

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["questions", id, test?.questions],
    queryFn: () => fetchBulkQuestions(test?.questions ?? []),
    enabled: Boolean(test?.questions?.length),
  });

  const topicNames = useMemo(() => {
    return (test?.topics ?? []).map((tId) => topics.find((t) => t.id === tId)?.name ?? tId);
  }, [test?.topics, topics]);

  const subTopicNames = useMemo(() => {
    return (test?.sub_topics ?? []).map((sId) => subTopics.find((st) => st.id === sId)?.name ?? sId);
  }, [test?.sub_topics, subTopics]);

  if (isLoading || !test) {
    return (
      <AppShell>
        <PageWrapper>
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2">Loading test...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageWrapper>
        <PageHeader
          title={test.name}
          description="Read-only view of published live test."
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Published Test View" },
          ]}
          action={
            <Link to="/dashboard">
              <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
                Back to Dashboard
              </Button>
            </Link>
          }
        />

        {/* Test Summary Dashboard Card */}
        <section className="mb-8 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge tone="green">Live / Published</Badge>
            <Badge tone="blue">{test.type}</Badge>
            <Badge tone="slate">{test.difficulty}</Badge>
          </div>
          <div className="grid gap-3 text-xs font-semibold text-slate-500 md:grid-cols-[120px_1fr] border-t border-slate-100 pt-4 mb-4">
            <span>Subject</span>
            <span className="text-slate-700">: {test.subject}</span>
            <span>Topics</span>
            <span className="flex flex-wrap gap-1.5">: 
              {topicNames.length > 0 ? (
                topicNames.map((name) => (
                  <span key={name} className="bg-slate-100 border border-slate-200 text-slate-600 rounded px-2 py-0.5">{name}</span>
                ))
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </span>
            <span>Sub Topics</span>
            <span className="flex flex-wrap gap-1.5">: 
              {subTopicNames.length > 0 ? (
                subTopicNames.map((name) => (
                  <span key={name} className="bg-slate-100 border border-slate-200 text-slate-600 rounded px-2 py-0.5">{name}</span>
                ))
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </span>
            <span>Marking Scheme</span>
            <span className="text-slate-700">: {test.correct_marks} Marks (Correct), {test.wrong_marks} Marks (Wrong), {test.unattempt_marks} Marks (Unattempted)</span>
            <span>Total Questions</span>
            <span className="text-slate-700">: {questions.length} Questions</span>
            <span>Total Marks</span>
            <span className="text-slate-700">: {test.total_marks ?? questions.length * test.correct_marks} Marks</span>
            <span>Duration</span>
            <span className="text-slate-700">: {test.total_time} Minutes</span>
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-between text-[10px] font-bold text-slate-400">
            <span>CREATED AT: {new Date(test.created_at).toLocaleString()}</span>
            <span>TEST ID: {test.id}</span>
          </div>
        </section>

        {/* List of All Questions */}
        <section className="space-y-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-slate-500" />
            <span>Questions list ({questions.length})</span>
          </h3>

          {isLoadingQuestions ? (
            <div className="flex items-center justify-center p-8 bg-white border border-slate-200 rounded-md">
              <Spinner /> <span className="ml-2">Loading questions...</span>
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded bg-slate-50 border border-slate-200 p-8 text-center text-slate-500 text-sm font-semibold">
              This published test does not contain any questions.
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((question: Question, index: number) => (
                <article key={question.id ?? `${question.question}-${index}`} className="bg-white border border-slate-200 rounded-md p-6 shadow-sm hover:shadow-soft transition duration-200">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 mb-4">
                    <span className="text-xs font-extrabold text-slate-400 flex items-center gap-1">
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                      <span>QUESTION {index + 1}</span>
                    </span>
                    {question.difficulty && (
                      <Badge tone={question.difficulty === "easy" ? "green" : question.difficulty === "medium" ? "yellow" : "red"}>
                        {question.difficulty}
                      </Badge>
                    )}
                  </div>

                  {/* Question rich HTML statement */}
                  <div
                    className="text-sm font-bold text-slate-800 leading-relaxed mb-4 rich-content"
                    dangerouslySetInnerHTML={{ __html: question.question }}
                  />

                  {/* Question Image */}
                  {question.image_url && (
                    <div className="my-4 max-h-56 overflow-hidden rounded border border-slate-200 max-w-md bg-slate-50">
                      <img src={question.image_url} alt={`Graphic Question ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                  )}

                  {/* Question options */}
                  <div className="grid gap-3 md:grid-cols-2 mt-4">
                    {(["option1", "option2", "option3", "option4"] as const).map((optionKey, optionIdx) => {
                      const isCorrect = question.correct_option === optionKey;
                      return (
                        <div
                          key={optionKey}
                          className={`rounded-md border px-4 py-3.5 text-xs transition flex items-center gap-3 ${
                            isCorrect
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-bold shadow-sm"
                              : "border-slate-200 text-slate-600 bg-slate-50/20"
                          }`}
                        >
                          <span className={`h-6 w-6 flex items-center justify-center rounded-full border text-[10px] font-bold ${
                            isCorrect
                              ? "bg-emerald-600 text-white border-transparent"
                              : "border-slate-300 text-slate-500 bg-slate-50"
                          }`}>
                            {String.fromCharCode(65 + optionIdx)}
                          </span>
                          <span>{question[optionKey]}</span>
                          {isCorrect && <CheckCircle2 className="ml-auto h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Solution block */}
                  {question.explanation && (
                    <div className="mt-5 bg-slate-50 border border-slate-100 rounded px-4 py-3 text-xs font-semibold text-slate-500">
                      <span className="text-slate-700 font-bold block mb-1">Solution explanation:</span>
                      {question.explanation}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </PageWrapper>
    </AppShell>
  );
};
