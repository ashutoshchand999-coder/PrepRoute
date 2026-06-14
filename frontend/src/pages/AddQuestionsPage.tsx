import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, BookOpen, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { Toast } from "../components/ui/Toast";
import { bulkCreateQuestions, fetchBulkQuestions, getErrorMessage, updateTest } from "../services/api";
import { getQuestions } from "../api";
import { useSubTopics, useTest, useTopics } from "../hooks/useTests";
import { Question, TestPayload } from "../types";

const stripHtml = (html?: string) => {
  if (!html) return "";
  return html.replace(/<\/?[^>]+(>|$)/g, " ");
};

const stringFromApiValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record.name ?? record.title ?? record.id ?? record._id;
    return typeof candidate === "string" ? candidate : "";
  }
  return "";
};

const stringArrayFromApiValue = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(stringFromApiValue).filter(Boolean);
};

export const AddQuestionsPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: test, isLoading } = useTest(id);
  const { data: topics = [] } = useTopics(test?.subject_id ?? "");
  const selectedTopicIds = useMemo(() => (test?.topics ?? []).filter(Boolean), [test?.topics]);
  const { data: subTopics = [] } = useSubTopics(selectedTopicIds);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [toast, setToast] = useState("");
  const [formError, setFormError] = useState("");

  // Question Bank Selector States
  const [bankSearch, setBankSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [bankDifficulty, setBankDifficulty] = useState("");
  const [bankTopicId, setBankTopicId] = useState("");
  const [bankSubTopicId, setBankSubTopicId] = useState("");
  const [bankPage, setBankPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"bank" | "selected">("bank");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(bankSearch);
      setBankPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [bankSearch]);

  // Scope available topics and subtopics to test configuration
  const testTopics = useMemo(() => {
    if (!test?.topics || test.topics.length === 0) return topics;
    return topics.filter(t => test.topics.includes(t.id));
  }, [topics, test?.topics]);

  const testSubTopics = useMemo(() => {
    if (!bankTopicId) {
      const parentTopicIds = testTopics.map(t => t.id);
      return subTopics.filter(st => parentTopicIds.includes(st.topic_id));
    }
    return subTopics.filter(st => st.topic_id === bankTopicId);
  }, [subTopics, testTopics, bankTopicId]);

  // Fetch questions matching current test subject, search, and filters
  const { data: bankData, isLoading: isBankQuestionsLoading } = useQuery({
    queryKey: ["bankQuestions", {
      question: debouncedSearch,
      difficulty: bankDifficulty,
      topic_id: bankTopicId,
      sub_topic_id: bankSubTopicId,
      subject_id: test?.subject_id || test?.subject,
      page: bankPage,
      limit: 10
    }],
    queryFn: () => getQuestions({
      question: debouncedSearch,
      difficulty: bankDifficulty,
      topic_id: bankTopicId,
      sub_topic_id: bankSubTopicId,
      subject_id: test?.subject_id || test?.subject,
      page: bankPage,
      limit: 10
    }),
    enabled: Boolean(test),
  });

  const bankQuestions = bankData?.data ?? [];
  const bankTotal = bankData?.total ?? 0;
  const bankTotalPages = Math.ceil(bankTotal / 10);

  // Load existing test questions on mount
  const { data: fetchedQuestions } = useQuery({
    queryKey: ["questions", id, test?.questions],
    queryFn: () => fetchBulkQuestions(test?.questions ?? []),
    enabled: Boolean(test?.questions?.length),
  });

  useEffect(() => {
    if (fetchedQuestions) {
      setQuestions(fetchedQuestions);
    }
  }, [fetchedQuestions]);

  const topicNames = useMemo(() => {
    return (test?.topics ?? []).map(topicId => {
      return topics.find(t => t.id === topicId)?.name ?? topicId;
    });
  }, [test?.topics, topics]);

  const subTopicNames = useMemo(() => {
    return (test?.sub_topics ?? []).map(subTopicId => {
      return subTopics.find(st => st.id === subTopicId)?.name ?? subTopicId;
    });
  }, [test?.sub_topics, subTopics]);

  // Selection state helpers
  const isSelected = (qId: string) => questions.some(q => q.id === qId);

  const toggleSelection = (q: Question) => {
    if (!q.id) return;
    if (isSelected(q.id)) {
      setQuestions(prev => prev.filter(item => item.id !== q.id));
    } else {
      setQuestions(prev => [...prev, { ...q, test_id: id }]);
    }
  };

  const pageQuestionIds = useMemo(() => bankQuestions.map(q => q.id).filter((qid): qid is string => !!qid), [bankQuestions]);
  const isAllPageSelected = useMemo(() => pageQuestionIds.length > 0 && pageQuestionIds.every(qId => isSelected(qId)), [pageQuestionIds, questions]);

  const toggleAllPage = () => {
    if (isAllPageSelected) {
      setQuestions(prev => prev.filter(q => !pageQuestionIds.includes(q.id ?? "")));
    } else {
      const toAdd: Question[] = [];
      bankQuestions.forEach(q => {
        if (q.id && !isSelected(q.id)) {
          toAdd.push({ ...q, test_id: id });
        }
      });
      setQuestions(prev => [...prev, ...toAdd]);
    }
  };

  const handleSelectAllMatching = async () => {
    try {
      const res = await getQuestions({
        question: debouncedSearch,
        difficulty: bankDifficulty,
        topic_id: bankTopicId,
        sub_topic_id: bankSubTopicId,
        subject_id: test?.subject_id || test?.subject,
        limit: 1000,
      });
      const matchingQuestions = res.data;
      const toAdd = matchingQuestions.filter(q => q.id && !isSelected(q.id)).map(q => ({ ...q, test_id: id }));
      
      if (toAdd.length === 0) {
        alert("All matching questions are already selected.");
        return;
      }
      
      const confirmed = window.confirm(`You are about to add ${toAdd.length} question(s) to the test. Continue?`);
      if (confirmed) {
        setQuestions(prev => [...prev, ...toAdd]);
        setToast(`${toAdd.length} questions added.`);
        window.setTimeout(() => setToast(""), 2000);
      }
    } catch (e) {
      alert("Failed to retrieve matching questions.");
    }
  };

  // Selected questions client-side pagination
  const [selectedPage, setSelectedPage] = useState(1);
  const selectedLimit = 10;
  const selectedTotalPages = Math.ceil(questions.length / selectedLimit);
  const paginatedSelectedQuestions = useMemo(() => {
    const start = (selectedPage - 1) * selectedLimit;
    return questions.slice(start, start + selectedLimit);
  }, [questions, selectedPage]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let questionsToSave = questions;
      const targetCount = Number(test?.total_questions || 0);
      if (targetCount > 0 && questions.length > targetCount) {
        questionsToSave = [...questions].sort(() => 0.5 - Math.random()).slice(0, targetCount);
        setQuestions(questionsToSave);
      }

      const created = await bulkCreateQuestions(id, questionsToSave);
      const questionIds = created.map((question) => question.id).filter((questionId): questionId is string => Boolean(questionId));
      if (!test) {
        throw new Error("Test details are unavailable.");
      }

      const subject = stringFromApiValue(test.subject) || stringFromApiValue(test.subject_id);
      const subjectId = stringFromApiValue(test.subject_id);

      const updatedTestPayload: TestPayload = {
        name: test.name,
        subject,
        subject_id: subjectId || undefined,
        type: test.type === "mock" || test.type === "previous_year" ? test.type : "practice",
        topics: stringArrayFromApiValue(test.topics),
        sub_topics: stringArrayFromApiValue(test.sub_topics),
        difficulty: test.difficulty === "medium" || test.difficulty === "hard" ? test.difficulty : "easy",
        correct_marks: test.correct_marks,
        wrong_marks: test.wrong_marks,
        unattempt_marks: test.unattempt_marks,
        total_time: test.total_time,
        total_questions: questionIds.length || questionsToSave.length,
        total_marks: test.total_marks ?? questionsToSave.length * test.correct_marks,
        status: test.status,
        questions: questionIds,
      };

      await updateTest(id, updatedTestPayload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tests", id] });
      navigate(`/tests/${id}/preview`);
    },
  });



  const saveAndContinue = async () => {
    setFormError("");
    if (questions.length === 0) {
      setFormError("Add at least one question before continuing.");
      return;
    }
    try {
      await saveMutation.mutateAsync();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  if (isLoading || !test) {
    return (
      <AppShell compactRail>
        <PageWrapper compact>
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Spinner /> <span className="ml-2">Loading test...</span>
          </div>
        </PageWrapper>
      </AppShell>
    );
  }

  return (
    <AppShell compactRail>
      <PageWrapper compact>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <Link to="/dashboard">Test Creation</Link>
            <span>/</span>
            <Link to={`/tests/${id}/edit`}>Create Test</Link>
            <span>/</span>
            <span>Chapter Wise</span>
          </div>
          <Link to={`/tests/${id}/preview`}>
            <Button>Publish</Button>
          </Link>
        </div>

        <section className="mb-9 rounded-md border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge tone="blue">Chapter Wise</Badge>
            <h1 className="font-bold text-slate-900">📚 Chapter 1</h1>
            <Badge tone="green">Easy</Badge>
          </div>
          <div className="grid gap-3 text-xs text-slate-500 md:grid-cols-[80px_1fr]">
            <span>Subject</span>
            <span className="text-slate-700">: {test.subject}</span>
            <span>Topic</span>
            <span className="flex flex-wrap gap-2">:
              {topicNames.length > 0 ? (
                topicNames.map((name) => (
                  <Badge key={name} tone="yellow">{name}</Badge>
                ))
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </span>
            <span>Sub Topic</span>
            <span className="flex flex-wrap gap-2">:
              {subTopicNames.length > 0 ? (
                subTopicNames.map((name) => (
                  <Badge key={name} tone="yellow">{name}</Badge>
                ))
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </span>
          </div>
          <div className="mt-4 flex justify-end gap-2 text-xs text-slate-500">
            <Badge>⌚ {test.total_time} Min</Badge>
            <Badge>□ {test.total_questions} Q's</Badge>
            <Badge>♙ {test.total_marks} Marks</Badge>
          </div>
        </section>

        {/* Selection Status Summary */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-md border bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Test Question Selection</h3>
            <p className="text-xs text-slate-500 mt-1">
              Required count: <span className="font-bold text-slate-700">{test.total_questions}</span>. Currently selected: <span className="font-bold text-slate-700">{questions.length}</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {questions.length > Number(test.total_questions || 0) && (
              <Badge tone="yellow">
                ⚠️ Random Selection Active: Only {test.total_questions} questions will be randomly selected on save.
              </Badge>
            )}
            {questions.length < Number(test.total_questions || 0) && (
              <Badge tone="blue">
                Select {Number(test.total_questions || 0) - questions.length} more question(s)
              </Badge>
            )}
            {questions.length === Number(test.total_questions || 0) && (
              <Badge tone="green">
                ✓ Perfect matches test requirements
              </Badge>
            )}
            <Button type="button" onClick={saveAndContinue} disabled={saveMutation.isPending}>
              Save & Continue
            </Button>
          </div>
        </div>

        {/* Tab Selection Header */}
        <div className="mb-6 flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("bank")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === "bank"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Question Bank (Available)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("selected")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === "selected"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Selected Questions ({questions.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "bank" ? (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-md border">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="h-10 pl-9 pr-3 w-full rounded border border-slate-200 bg-white text-xs outline-none focus:border-primary-500"
                />
              </div>
              <select
                value={bankDifficulty}
                onChange={(e) => { setBankDifficulty(e.target.value); setBankPage(1); }}
                className="h-10 rounded border border-slate-200 bg-white text-xs px-2 text-slate-700 outline-none focus:border-primary-500 w-36"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select
                value={bankTopicId}
                onChange={(e) => { setBankTopicId(e.target.value); setBankSubTopicId(""); setBankPage(1); }}
                className="h-10 rounded border border-slate-200 bg-white text-xs px-2 text-slate-700 outline-none focus:border-primary-500 w-48"
              >
                <option value="">All Configured Topics</option>
                {testTopics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                value={bankSubTopicId}
                onChange={(e) => { setBankSubTopicId(e.target.value); setBankPage(1); }}
                className="h-10 rounded border border-slate-200 bg-white text-xs px-2 text-slate-700 outline-none focus:border-primary-500 w-48"
                disabled={!bankTopicId && testTopics.length > 0}
              >
                <option value="">All Configured Subtopics</option>
                {testSubTopics.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
              <Button type="button" variant="secondary" className="h-10 text-xs px-3 font-semibold" onClick={handleSelectAllMatching}>
                Select All Matching ({bankTotal})
              </Button>
            </div>

            {/* Questions Table */}
            <div className="border rounded-md overflow-hidden bg-white shadow-sm">
              {isBankQuestionsLoading ? (
                <div className="flex h-64 items-center justify-center text-slate-500">
                  <Spinner /> <span className="ml-2">Loading bank questions...</span>
                </div>
              ) : bankQuestions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs">
                  No questions match your current search/filters in the Question Bank.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 uppercase tracking-wider text-[10px] font-bold text-slate-400 border-b">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={isAllPageSelected}
                          onChange={toggleAllPage}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                        />
                      </th>
                      <th className="px-4 py-3">Question Statement</th>
                      <th className="px-4 py-3 w-40">Topic / Subtopic</th>
                      <th className="px-4 py-3 w-24">Difficulty</th>
                      <th className="px-4 py-3 w-20 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bankQuestions.map((q) => {
                      const selected = isSelected(q.id ?? "");
                      const expanded = expandedQuestionId === q.id;
                      const topicName = topics.find(t => t.id === q.topic_id)?.name ?? q.topic_id ?? "-";
                      const subTopicName = subTopics.find(st => st.id === q.sub_topic_id)?.name ?? q.sub_topic_id ?? "-";

                      return (
                        <React.Fragment key={q.id}>
                          <tr className={`hover:bg-slate-50/50 transition cursor-pointer ${selected ? "bg-primary-50/10" : ""}`}>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSelection(q)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                              />
                            </td>
                            <td 
                              className="px-4 py-3 font-semibold text-slate-700 hover:text-primary-600 max-w-md"
                              onClick={() => setExpandedQuestionId(expanded ? null : (q.id ?? null))}
                            >
                              <div className="line-clamp-2">{stripHtml(q.question)}</div>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                  Used in {(q as any).usage_count || 0} Test{((q as any).usage_count || 0) === 1 ? "" : "s"}
                                </span>
                                {(q as any).is_published && (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                    Published Test
                                  </span>
                                )}
                                {(q as any).is_draft && (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                    Draft Test
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              <div className="font-semibold text-slate-700">{topicName}</div>
                              {subTopicName !== "-" && <div className="text-[10px] text-slate-400 mt-0.5">{subTopicName}</div>}
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone={q.difficulty === "easy" ? "green" : q.difficulty === "medium" ? "yellow" : "red"}>
                                {q.difficulty ?? "-"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setExpandedQuestionId(expanded ? null : (q.id ?? null))}
                                className="text-primary-500 hover:text-primary-700 font-bold select-none"
                              >
                                {expanded ? "Hide" : "Show"}
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="space-y-4 text-xs text-slate-700 max-w-3xl">
                                  <div>
                                    <span className="font-bold text-slate-900 block mb-1">Options:</span>
                                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                                      {(["option1", "option2", "option3", "option4"] as const).map(optKey => {
                                        const isCorrect = q.correct_option === optKey;
                                        return (
                                          <div key={optKey} className={`p-2.5 rounded border flex items-center gap-2 ${
                                            isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" : "bg-white border-slate-200"
                                          }`}>
                                            <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                              isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                                            }`}>
                                              {optKey.replace("option", "")}
                                            </span>
                                            <span>{q[optKey]}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  {q.explanation && (
                                    <div>
                                      <span className="font-bold text-slate-900 block mb-1">Solution Explanation:</span>
                                      <p className="bg-white p-3 rounded border border-slate-200 text-slate-600 mt-1 whitespace-pre-wrap">
                                        {stripHtml(q.explanation)}
                                      </p>
                                    </div>
                                  )}
                                  {q.media_url && (
                                    <div>
                                      <span className="font-bold text-slate-900 block mb-1">Attached Media:</span>
                                      <a href={q.media_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 font-bold hover:underline block mt-1">
                                        View Media Attachment
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {bankTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-semibold">
                  Page {bankPage} of {bankTotalPages} ({bankTotal} total questions)
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 text-xs px-2.5 font-semibold"
                    disabled={bankPage === 1}
                    onClick={() => { setBankPage(p => Math.max(1, p - 1)); setExpandedQuestionId(null); }}
                  >
                    ← Previous
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 text-xs px-2.5 font-semibold"
                    disabled={bankPage >= bankTotalPages}
                    onClick={() => { setBankPage(p => Math.min(bankTotalPages, p + 1)); setExpandedQuestionId(null); }}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Questions Table */}
            <div className="border rounded-md overflow-hidden bg-white shadow-sm">
              {questions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs">
                  No questions selected yet. Switch to the "Question Bank" tab to find and add questions to this test.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 uppercase tracking-wider text-[10px] font-bold text-slate-400 border-b">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <span className="text-slate-400">#</span>
                      </th>
                      <th className="px-4 py-3">Question Statement</th>
                      <th className="px-4 py-3 w-40">Topic / Subtopic</th>
                      <th className="px-4 py-3 w-24">Difficulty</th>
                      <th className="px-4 py-3 w-20 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedSelectedQuestions.map((q, idx) => {
                      const absoluteIdx = (selectedPage - 1) * selectedLimit + idx + 1;
                      const expanded = expandedQuestionId === q.id;
                      const topicName = topics.find(t => t.id === q.topic_id)?.name ?? q.topic_id ?? "-";
                      const subTopicName = subTopics.find(st => st.id === q.sub_topic_id)?.name ?? q.sub_topic_id ?? "-";

                      return (
                        <React.Fragment key={q.id}>
                          <tr className="hover:bg-slate-50/50 transition cursor-pointer bg-emerald-50/5">
                            <td className="px-4 py-3 font-semibold text-slate-500">
                              {absoluteIdx}
                            </td>
                            <td 
                              className="px-4 py-3 font-semibold text-slate-700 hover:text-primary-600 max-w-md"
                              onClick={() => setExpandedQuestionId(expanded ? null : (q.id ?? null))}
                            >
                              <div className="line-clamp-2">{stripHtml(q.question)}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              <div className="font-semibold text-slate-700">{topicName}</div>
                              {subTopicName !== "-" && <div className="text-[10px] text-slate-400 mt-0.5">{subTopicName}</div>}
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone={q.difficulty === "easy" ? "green" : q.difficulty === "medium" ? "yellow" : "red"}>
                                {q.difficulty ?? "-"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => toggleSelection(q)}
                                className="text-rose-500 hover:text-rose-700 font-bold select-none"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="space-y-4 text-xs text-slate-700 max-w-3xl">
                                  <div>
                                    <span className="font-bold text-slate-900 block mb-1">Options:</span>
                                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                                      {(["option1", "option2", "option3", "option4"] as const).map(optKey => {
                                        const isCorrect = q.correct_option === optKey;
                                        return (
                                          <div key={optKey} className={`p-2.5 rounded border flex items-center gap-2 ${
                                            isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold" : "bg-white border-slate-200"
                                          }`}>
                                            <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                              isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                                            }`}>
                                              {optKey.replace("option", "")}
                                            </span>
                                            <span>{q[optKey]}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  {q.explanation && (
                                    <div>
                                      <span className="font-bold text-slate-900 block mb-1">Solution Explanation:</span>
                                      <p className="bg-white p-3 rounded border border-slate-200 text-slate-600 mt-1 whitespace-pre-wrap">
                                        {stripHtml(q.explanation)}
                                      </p>
                                    </div>
                                  )}
                                  {q.media_url && (
                                    <div>
                                      <span className="font-bold text-slate-900 block mb-1">Attached Media:</span>
                                      <a href={q.media_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 font-bold hover:underline block mt-1">
                                        View Media Attachment
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Selected Questions Pagination Controls */}
            {selectedTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-semibold">
                  Page {selectedPage} of {selectedTotalPages} ({questions.length} selected questions)
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 text-xs px-2.5 font-semibold"
                    disabled={selectedPage === 1}
                    onClick={() => { setSelectedPage(p => Math.max(1, p - 1)); setExpandedQuestionId(null); }}
                  >
                    ← Previous
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 text-xs px-2.5 font-semibold"
                    disabled={selectedPage >= selectedTotalPages}
                    onClick={() => { setSelectedPage(p => Math.min(selectedTotalPages, p + 1)); setExpandedQuestionId(null); }}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {formError ? <p className="mt-4 text-sm font-semibold text-rose-600">{formError}</p> : null}
        {toast ? <Toast>{toast}</Toast> : null}
      </PageWrapper>
    </AppShell>
  );
};
