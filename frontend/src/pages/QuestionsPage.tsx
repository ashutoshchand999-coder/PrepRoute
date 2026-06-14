import React, { useState, useEffect, useMemo } from "react";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionUsage,
  bulkDeleteQuestions,
  bulkAssignTopic,
  bulkAssignDifficulty,
  bulkCreateQuestionBank,
} from "../api/question.api";
import { useSubjects, useAllTopics, useAllSubTopics } from "../hooks/useTests";
import { Question, Subject, Topic, SubTopic } from "../types";
import { CSVUpload } from "../components/ui/CSVUpload";
import { uploadImage } from "../services/imagekit.service";
import {
  ClipboardList,
  Sparkles,
  Search,
  Filter,
  X,
  Edit,
  Eye,
  Copy,
  Trash2,
  Download,
  BookOpen,
  PieChart as PieIcon,
  BarChart2 as BarIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const DIFFICULTY_COLORS = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard: "bg-rose-50 text-rose-700 border-rose-200",
};

const CHART_COLORS = ["#6c7df7", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#f472b6"];

// Helper to strip HTML tags for question previews
const stripHtml = (html?: string) => {
  if (!html) return "";
  return html.replace(/<\/?[^>]+(>|$)/g, " ");
};

export const QuestionsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSubTopic, setSelectedSubTopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Delete validation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [deleteUsageTests, setDeleteUsageTests] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // Bulk Operations State Modals
  const [bulkTopicOpen, setBulkTopicOpen] = useState(false);
  const [bulkDifficultyOpen, setBulkDifficultyOpen] = useState(false);
  const [bulkTopicId, setBulkTopicId] = useState("");
  const [bulkSubTopicId, setBulkSubTopicId] = useState("");
  const [bulkDifficulty, setBulkDifficulty] = useState("");

  // Form edit states (since we want simple & extremely robust edit form)
  const [formStatement, setFormStatement] = useState("");
  const [formOption1, setFormOption1] = useState("");
  const [formOption2, setFormOption2] = useState("");
  const [formOption3, setFormOption3] = useState("");
  const [formOption4, setFormOption4] = useState("");
  const [formCorrectOption, setFormCorrectOption] = useState<"option1" | "option2" | "option3" | "option4">("option1");
  const [formExplanation, setFormExplanation] = useState("");
  const [formDifficulty, setFormDifficulty] = useState("easy");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTopicId, setFormTopicId] = useState("");
  const [formSubTopicId, setFormSubTopicId] = useState("");
  const [formMediaUrl, setFormMediaUrl] = useState("");

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load master lists
  const { data: subjects = [] } = useSubjects();
  const { data: topics = [] } = useAllTopics();
  const { data: subtopics = [] } = useAllSubTopics();

  // Load all questions (for metrics and analytics charts)
  const { data: allQuestionsRes, refetch: refetchAll } = useQuery({
    queryKey: ["questions", "all"],
    queryFn: () => getQuestions({ limit: 10000 }),
  });
  const allQuestions = allQuestionsRes?.data ?? [];

  // Load paginated list of questions matching filters
  const { data: paginatedData, isLoading: isListLoading, refetch: refetchList } = useQuery({
    queryKey: [
      "questions",
      "paginated",
      { debouncedSearch, selectedDifficulty, selectedTopic, selectedSubTopic, selectedSubject, page, limit },
    ],
    queryFn: () =>
      getQuestions({
        question: debouncedSearch,
        difficulty: selectedDifficulty,
        topic_id: selectedTopic,
        sub_topic_id: selectedSubTopic,
        subject_id: selectedSubject,
        page,
        limit,
      }),
  });

  const paginatedQuestions = paginatedData?.data ?? [];
  const totalCount = paginatedData?.total ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Subject -> Topic -> Subtopic Cascading
  const filteredTopics = useMemo(() => {
    if (!selectedSubject) return topics;
    return topics.filter((t) => t.subject_id === selectedSubject);
  }, [topics, selectedSubject]);

  const filteredSubTopics = useMemo(() => {
    if (!selectedTopic) return subtopics;
    return subtopics.filter((st) => st.topic_id === selectedTopic);
  }, [subtopics, selectedTopic]);

  // Modals cascades
  const formFilteredTopics = useMemo(() => {
    if (!formSubjectId) return topics;
    return topics.filter((t) => t.subject_id === formSubjectId);
  }, [topics, formSubjectId]);

  const formFilteredSubTopics = useMemo(() => {
    if (!formTopicId) return subtopics;
    return subtopics.filter((st) => st.topic_id === formTopicId);
  }, [subtopics, formTopicId]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setSelectedSubject("");
    setSelectedTopic("");
    setSelectedSubTopic("");
    setSelectedDifficulty("");
    setPage(1);
  };

  // Checkbox interactions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedQuestions.map((q) => q.id).filter((id): id is string => !!id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = paginatedQuestions.map((q) => q.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = allQuestions.length;
    const easy = allQuestions.filter((q) => q.difficulty === "easy").length;
    const medium = allQuestions.filter((q) => q.difficulty === "medium").length;
    const hard = allQuestions.filter((q) => q.difficulty === "hard").length;
    return { total, easy, medium, hard };
  }, [allQuestions]);

  // Analytics Chart Data
  const difficultyChartData = useMemo(() => {
    const counts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    allQuestions.forEach((q) => {
      if (q.difficulty) {
        counts[q.difficulty] = (counts[q.difficulty] || 0) + 1;
      }
    });
    return Object.keys(counts).map((key) => ({
      name: key.toUpperCase(),
      value: counts[key],
    }));
  }, [allQuestions]);

  const subjectChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    allQuestions.forEach((q) => {
      const topicObj = topics.find((t) => t.id === q.topic_id);
      const subName = subjects.find((s) => s.id === topicObj?.subject_id)?.name ?? "Unknown";
      counts[subName] = (counts[subName] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({
      name: key,
      questions: counts[key],
    }));
  }, [allQuestions, topics, subjects]);

  const topicChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    allQuestions.forEach((q) => {
      const topicName = topics.find((t) => t.id === q.topic_id)?.name ?? "Unknown";
      counts[topicName] = (counts[topicName] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({
      name: key,
      questions: counts[key],
    }));
  }, [allQuestions, topics]);

  // Actions
  const handleOpenCreate = () => {
    setIsCreateMode(true);
    setEditQuestion(null);
    setFormStatement("");
    setFormOption1("");
    setFormOption2("");
    setFormOption3("");
    setFormOption4("");
    setFormCorrectOption("option1");
    setFormExplanation("");
    setFormDifficulty("easy");
    setFormSubjectId(subjects[0]?.id ?? "");
    setFormTopicId("");
    setFormSubTopicId("");
    setFormMediaUrl("");
  };

  const handleOpenEdit = (q: Question) => {
    setIsCreateMode(false);
    setEditQuestion(q);
    setFormStatement(q.question);
    setFormOption1(q.option1);
    setFormOption2(q.option2);
    setFormOption3(q.option3);
    setFormOption4(q.option4);
    setFormCorrectOption(q.correct_option);
    setFormExplanation(q.explanation ?? "");
    setFormDifficulty(q.difficulty ?? "easy");

    // Resolve Subject
    const topicObj = topics.find((t) => t.id === q.topic_id);
    setFormSubjectId(topicObj?.subject_id ?? "");
    setFormTopicId(q.topic_id ?? "");
    setFormSubTopicId(q.sub_topic_id ?? "");
    setFormMediaUrl(q.media_url ?? "");
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const imageUrl = await uploadImage(file, (progress) => {
        setUploadProgress(progress);
      });
      setFormMediaUrl(imageUrl);
      alert("Image uploaded successfully!");
    } catch (err: any) {
      alert(err?.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!formStatement || !formOption1 || !formOption2 || !formOption3 || !formOption4) {
      alert("Please enter the question statement and all four options.");
      return;
    }

    const payload: Partial<Question> = {
      type: "mcq",
      question: formStatement,
      option1: formOption1,
      option2: formOption2,
      option3: formOption3,
      option4: formOption4,
      correct_option: formCorrectOption,
      explanation: formExplanation,
      difficulty: formDifficulty,
      topic_id: formTopicId || undefined,
      sub_topic_id: formSubTopicId || undefined,
      media_url: formMediaUrl || undefined,
      status: "active",
    };

    try {
      if (isCreateMode) {
        await createQuestion(payload);
        alert("Question created successfully!");
      } else if (editQuestion?.id) {
        await updateQuestion(editQuestion.id, payload);
        alert("Question updated successfully!");
      }
      setEditQuestion(null);
      setIsCreateMode(false);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      refetchList();
      refetchAll();
    } catch (e) {
      alert("An error occurred while saving the question.");
    }
  };

  const handleImportCSV = async (questions: Question[]) => {
    try {
      await bulkCreateQuestionBank(questions);
      alert(`${questions.length} questions imported successfully into the Question Bank!`);
      setIsImportModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      refetchList();
      refetchAll();
    } catch (e) {
      alert("Failed to import questions. Please check your data.");
    }
  };

  const handleDuplicate = async (q: Question) => {
    try {
      const payload: Partial<Question> = {
        ...q,
        id: undefined,
        question: `${q.question} (Copy)`,
        created_at: new Date().toISOString(),
        created_by: "Alex Wando",
        status: "active",
      };
      await createQuestion(payload);
      alert("Question duplicated successfully!");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      refetchList();
      refetchAll();
    } catch (e) {
      alert("An error occurred while duplicating the question.");
    }
  };

  const handleDeleteClick = async (id: string) => {
    setDeleteQuestionId(id);
    setBulkDeleteMode(false);
    setIsLoadingUsage(true);
    try {
      const usage = await getQuestionUsage(id);
      setDeleteUsageTests(usage.tests);
      setDeleteConfirmOpen(true);
    } catch (e) {
      alert("Failed to retrieve usage stats");
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleBulkDeleteClick = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteMode(true);
    setIsLoadingUsage(true);
    try {
      // Aggregate usage across all selected questions
      const results = await Promise.all(selectedIds.map((id) => getQuestionUsage(id)));
      const testMap: Record<string, string> = {};
      results.forEach((res) => {
        res.tests.forEach((t) => {
          testMap[t.id] = t.name;
        });
      });
      const uniqueTests = Object.entries(testMap).map(([id, name]) => ({ id, name }));
      setDeleteUsageTests(uniqueTests);
      setDeleteConfirmOpen(true);
    } catch (e) {
      alert("Failed to retrieve bulk usage stats");
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const confirmDelete = async () => {
    try {
      if (bulkDeleteMode) {
        await bulkDeleteQuestions(selectedIds);
        alert("Selected questions deleted successfully!");
        setSelectedIds([]);
      } else if (deleteQuestionId) {
        await deleteQuestion(deleteQuestionId);
        alert("Question deleted successfully!");
      }
      setDeleteConfirmOpen(false);
      setDeleteQuestionId(null);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      refetchList();
      refetchAll();
    } catch (e) {
      alert("Failed to delete question(s).");
    }
  };

  // Bulk assign handlers
  const handleBulkAssignTopic = async () => {
    if (!bulkTopicId) {
      alert("Please select a topic.");
      return;
    }
    try {
      await bulkAssignTopic(selectedIds, bulkTopicId, bulkSubTopicId || undefined);
      alert("Topic assigned to selected questions successfully!");
      setBulkTopicOpen(false);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      refetchList();
      refetchAll();
    } catch (e) {
      alert("Failed to perform bulk topic assignment.");
    }
  };

  const handleBulkAssignDifficulty = async () => {
    if (!bulkDifficulty) {
      alert("Please select a difficulty.");
      return;
    }
    try {
      await bulkAssignDifficulty(selectedIds, bulkDifficulty);
      alert("Difficulty assigned to selected questions successfully!");
      setBulkDifficultyOpen(false);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      refetchList();
      refetchAll();
    } catch (e) {
      alert("Failed to perform bulk difficulty assignment.");
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (selectedIds.length === 0) return;
    const questionsToExport = allQuestions.filter((q) => q.id && selectedIds.includes(q.id));

    const headers = [
      "ID",
      "Question",
      "Option 1",
      "Option 2",
      "Option 3",
      "Option 4",
      "Correct Option",
      "Explanation",
      "Difficulty",
      "Topic ID",
      "Subtopic ID",
      "Created At",
    ];

    const rows = questionsToExport.map((q) => [
      q.id,
      stripHtml(q.question),
      q.option1,
      q.option2,
      q.option3,
      q.option4,
      q.correct_option,
      q.explanation || "",
      q.difficulty || "",
      q.topic_id || "",
      q.sub_topic_id || "",
      q.created_at || "",
    ]);

    const csvString = [headers.join(","), ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `question_bank_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary-500" />
              Centralized Question Bank
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Add, manage, search, and import questions to your exam question database.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => setIsImportModalOpen(true)}>
              Import CSV
            </Button>
            <Button variant="primary" icon={<Sparkles className="h-4 w-4" />} onClick={handleOpenCreate}>
              + Add Question
            </Button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 bg-primary-50 rounded-full flex items-center justify-center text-primary-500">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Questions</p>
              <h3 className="text-2xl font-bold text-slate-800">{metrics.total}</h3>
            </div>
          </div>
          <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              <span className="font-bold text-lg">E</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Easy Questions</p>
              <h3 className="text-2xl font-bold text-slate-800">{metrics.easy}</h3>
            </div>
          </div>
          <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <span className="font-bold text-lg">M</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Medium Questions</p>
              <h3 className="text-2xl font-bold text-slate-800">{metrics.medium}</h3>
            </div>
          </div>
          <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <span className="font-bold text-lg">H</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hard Questions</p>
              <h3 className="text-2xl font-bold text-slate-800">{metrics.hard}</h3>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("list")}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition ${
              activeTab === "list"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Questions List
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`py-3 px-6 font-semibold text-sm border-b-2 transition ${
              activeTab === "analytics"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            Analytics & Insights
          </button>
        </div>

        {activeTab === "list" ? (
          <div className="space-y-6">
            {/* Search & Filter Toolbar */}
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by question text..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-11 pl-10 pr-4 w-full rounded-md border border-slate-200 bg-white text-sm outline-none transition placeholder:text-slate-400 focus:border-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setSelectedTopic("");
                      setSelectedSubTopic("");
                      setPage(1);
                    }}
                    className="h-11 rounded-md border border-slate-200 bg-white text-sm px-3 text-slate-700 focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedTopic}
                    onChange={(e) => {
                      setSelectedTopic(e.target.value);
                      setSelectedSubTopic("");
                      setPage(1);
                    }}
                    className="h-11 rounded-md border border-slate-200 bg-white text-sm px-3 text-slate-700 focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">All Topics</option>
                    {filteredTopics.map((top) => (
                      <option key={top.id} value={top.id}>
                        {top.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedSubTopic}
                    onChange={(e) => {
                      setSelectedSubTopic(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-md border border-slate-200 bg-white text-sm px-3 text-slate-700 focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">All Subtopics</option>
                    {filteredSubTopics.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedDifficulty}
                    onChange={(e) => {
                      setSelectedDifficulty(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-md border border-slate-200 bg-white text-sm px-3 text-slate-700 focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedIds.length > 0 && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 animate-fadeIn">
                <span className="text-sm font-semibold text-primary-800">
                  {selectedIds.length} questions selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" icon={<Edit className="h-4 w-4" />} onClick={() => setBulkTopicOpen(true)}>
                    Assign Topic
                  </Button>
                  <Button variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setBulkDifficultyOpen(true)}>
                    Assign Difficulty
                  </Button>
                  <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handleExportCSV}>
                    Export CSV
                  </Button>
                  <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={handleBulkDeleteClick}>
                    Delete Selected
                  </Button>
                  <Button variant="ghost" onClick={() => setSelectedIds([])}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Datatable */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 uppercase tracking-wider text-[11px] font-bold text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 w-12">
                        <input
                          type="checkbox"
                          checked={
                            paginatedQuestions.length > 0 &&
                            paginatedQuestions.every((q) => q.id && selectedIds.includes(q.id))
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                        />
                      </th>
                      <th className="px-6 py-4">Question Preview</th>
                      <th className="px-6 py-4 w-28">Subject</th>
                      <th className="px-6 py-4 w-36">Topic</th>
                      <th className="px-6 py-4 w-36">Subtopic</th>
                      <th className="px-6 py-4 w-28">Difficulty</th>
                      <th className="px-6 py-4 w-32">Created Date</th>
                      <th className="px-6 py-4 w-36 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isListLoading ? (
                      Array.from({ length: limit }).map((_, rIdx) => (
                        <tr key={rIdx} className="animate-pulse">
                          <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-4"></div></td>
                          <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-4/5"></div></td>
                          <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                          <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                          <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                          <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                          <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                          <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-28 mx-auto"></div></td>
                        </tr>
                      ))
                    ) : paginatedQuestions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No questions matching the filter criteria found in the question bank.
                        </td>
                      </tr>
                    ) : (
                      paginatedQuestions.map((q) => {
                        // Taxonomy resolvers
                        const topicObj = topics.find((t) => t.id === q.topic_id);
                        const subjectObj = subjects.find((s) => s.id === topicObj?.subject_id);
                        const subtopicObj = subtopics.find((st) => st.id === q.sub_topic_id);

                        return (
                          <tr key={q.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={!!q.id && selectedIds.includes(q.id)}
                                onChange={(e) => q.id && handleSelectOne(q.id, e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-6 py-4 max-w-md">
                              <div className="font-semibold text-slate-700 line-clamp-2">
                                {stripHtml(q.question)}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {q.media_url && (
                                  <span className="inline-flex text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border font-bold">
                                    With Image
                                  </span>
                                )}
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                  Used in {(q as any).usage_count || 0} Test{((q as any).usage_count || 0) === 1 ? "" : "s"}
                                </span>
                                {(q as any).is_published && (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                    Published Test
                                  </span>
                                )}
                                {(q as any).is_draft && (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                    Draft Test
                                  </span>
                                )}
                                {!((q as any).usage_count) && (
                                  <span className="bg-slate-50 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                    Never Used
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-500">{subjectObj?.name ?? "-"}</td>
                            <td className="px-6 py-4 font-semibold text-slate-500">{topicObj?.name ?? "-"}</td>
                            <td className="px-6 py-4 font-semibold text-slate-500">{subtopicObj?.name ?? "-"}</td>
                            <td className="px-6 py-4">
                              {q.difficulty && (
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-bold border rounded-full capitalize ${
                                    DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS]
                                  }`}
                                >
                                  {q.difficulty}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-400 text-xs">
                              {q.created_at ? new Date(q.created_at).toLocaleDateString() : "-"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center items-center gap-1.5">
                                <button
                                  onClick={() => setViewQuestion(q)}
                                  className="h-8 w-8 text-slate-500 hover:text-primary-500 hover:bg-primary-50 flex items-center justify-center rounded transition"
                                  title="View"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(q)}
                                  className="h-8 w-8 text-slate-500 hover:text-amber-500 hover:bg-amber-50 flex items-center justify-center rounded transition"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDuplicate(q)}
                                  className="h-8 w-8 text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 flex items-center justify-center rounded transition"
                                  title="Duplicate"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => q.id && handleDeleteClick(q.id)}
                                  className="h-8 w-8 text-slate-500 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center rounded transition"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center border-t border-slate-100 px-6 py-4 bg-slate-50">
                  <div className="text-xs text-slate-400 font-semibold">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} questions
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`h-8 w-8 rounded text-xs font-bold border transition ${
                          page === i + 1
                            ? "bg-primary-500 text-white border-primary-500"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-8 w-8 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Analytics & Insights Tab */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
              <h2 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-1.5">
                <PieIcon className="h-4 w-4 text-primary-500" />
                Difficulty Distribution
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={difficultyChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {difficultyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
              <h2 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-1.5">
                <BarIcon className="h-4 w-4 text-primary-500" />
                Subject Distribution
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="questions" fill="#6c7df7">
                      {subjectChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col md:col-span-2">
              <h2 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-1.5">
                <BarIcon className="h-4 w-4 text-primary-500" />
                Topic-wise Question Count
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="questions" fill="#34d399">
                      {topicChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: View Question Preview */}
        {viewQuestion && (
          <Modal open={true} title="Question Details Preview" onClose={() => setViewQuestion(null)}>
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-full border">
                  ID: {viewQuestion.id}
                </span>
                {viewQuestion.difficulty && (
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold border rounded-full capitalize ${
                      DIFFICULTY_COLORS[viewQuestion.difficulty as keyof typeof DIFFICULTY_COLORS]
                    }`}
                  >
                    {viewQuestion.difficulty}
                  </span>
                )}
                {viewQuestion.topic_id && (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    Topic: {topics.find((t) => t.id === viewQuestion.topic_id)?.name ?? viewQuestion.topic_id}
                  </span>
                )}
                {viewQuestion.sub_topic_id && (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    Subtopic: {subtopics.find((st) => st.id === viewQuestion.sub_topic_id)?.name ?? viewQuestion.sub_topic_id}
                  </span>
                )}
              </div>

              {/* Question body */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Question Text</h3>
                <div
                  className="p-4 bg-slate-50 border rounded-md text-slate-800 text-sm font-semibold prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: viewQuestion.question }}
                />
              </div>

              {/* Question Image (ImageKit URL) */}
              {viewQuestion.media_url && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Question Image</h3>
                  <div className="border rounded-md overflow-hidden bg-slate-50 p-2 max-w-sm">
                    <img
                      src={viewQuestion.media_url}
                      alt="Question attachment"
                      className="max-h-60 max-w-full object-contain mx-auto"
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(["option1", "option2", "option3", "option4"] as const).map((key) => {
                    const isCorrect = viewQuestion.correct_option === key;
                    const labelMap = { option1: "A", option2: "B", option3: "C", option4: "D" };
                    return (
                      <div
                        key={key}
                        className={`p-3 border rounded-md flex items-center gap-3 transition ${
                          isCorrect ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200"
                        }`}
                      >
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {labelMap[key]}
                        </span>
                        <span className="text-sm font-semibold">{viewQuestion[key]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation */}
              {viewQuestion.explanation && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Explanation</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 p-4 border rounded-md font-semibold">
                    {viewQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* MODAL: Create or Edit Question */}
        {(isCreateMode || editQuestion) && (
          <Modal
            open={true}
            title={isCreateMode ? "Add New Question" : "Edit Question"}
            onClose={() => {
              setIsCreateMode(false);
              setEditQuestion(null);
            }}
            footer={
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsCreateMode(false);
                    setEditQuestion(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveQuestion}>
                  Save Question
                </Button>
              </div>
            }
          >
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
              {/* Subject, Topic, Subtopic Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Subject</span>
                  <select
                    value={formSubjectId}
                    onChange={(e) => {
                      setFormSubjectId(e.target.value);
                      setFormTopicId("");
                      setFormSubTopicId("");
                    }}
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Topic</span>
                  <select
                    value={formTopicId}
                    onChange={(e) => {
                      setFormTopicId(e.target.value);
                      setFormSubTopicId("");
                    }}
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500"
                  >
                    <option value="">Select Topic</option>
                    {formFilteredTopics.map((top) => (
                      <option key={top.id} value={top.id}>
                        {top.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Subtopic</span>
                  <select
                    value={formSubTopicId}
                    onChange={(e) => setFormSubTopicId(e.target.value)}
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500"
                  >
                    <option value="">Select Subtopic</option>
                    {formFilteredSubTopics.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Difficulty & Image URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Difficulty</span>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Question Image</span>
                  {isUploading ? (
                    <div className="h-12 border border-slate-200 rounded-md bg-slate-50 flex items-center px-4 gap-3">
                      <div className="h-4 w-4 border-2 border-primary-500 border-t-transparent animate-spin rounded-full shrink-0" />
                      <div className="flex-1 bg-slate-200 h-2 rounded overflow-hidden">
                        <div className="bg-primary-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-500 shrink-0">{uploadProgress}%</span>
                    </div>
                  ) : formMediaUrl ? (
                    <div className="h-12 border border-slate-200 rounded-md bg-slate-50 flex items-center justify-between px-3">
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <img src={formMediaUrl} alt="Preview" className="h-8 w-8 object-cover rounded border bg-white shrink-0" />
                        <span className="text-xs text-slate-500 truncate font-semibold">{formMediaUrl}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormMediaUrl("")}
                        className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded transition shrink-0"
                        title="Remove Image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative h-12">
                      <label className="h-full border border-slate-300 border-dashed rounded-md bg-white hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer transition">
                        <Upload className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">Choose Image or Drop File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Question Statement Quill Editor */}
              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Question Statement</span>
                <div className="h-44 mb-12">
                  <ReactQuill theme="snow" value={formStatement} onChange={setFormStatement} className="h-32" />
                </div>
              </div>

              {/* MCQ Options */}
              <div className="space-y-4">
                <span className="block text-sm font-semibold text-slate-700">MCQ Options</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Option A"
                    placeholder="Enter option A"
                    value={formOption1}
                    onChange={(e) => setFormOption1(e.target.value)}
                  />
                  <Input
                    label="Option B"
                    placeholder="Enter option B"
                    value={formOption2}
                    onChange={(e) => setFormOption2(e.target.value)}
                  />
                  <Input
                    label="Option C"
                    placeholder="Enter option C"
                    value={formOption3}
                    onChange={(e) => setFormOption3(e.target.value)}
                  />
                  <Input
                    label="Option D"
                    placeholder="Enter option D"
                    value={formOption4}
                    onChange={(e) => setFormOption4(e.target.value)}
                  />
                </div>
              </div>

              {/* Correct Option Selector */}
              <div className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Correct Option</span>
                <select
                  value={formCorrectOption}
                  onChange={(e) => setFormCorrectOption(e.target.value as any)}
                  className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500"
                >
                  <option value="option1">Option A (Correct)</option>
                  <option value="option2">Option B (Correct)</option>
                  <option value="option3">Option C (Correct)</option>
                  <option value="option4">Option D (Correct)</option>
                </select>
              </div>

              {/* Explanation */}
              <Input
                label="Explanation"
                placeholder="Explain the solution..."
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
              />
            </div>
          </Modal>
        )}

        {/* MODAL: Delete Warning / Confirm */}
        {deleteConfirmOpen && (
          <Modal
            open={true}
            title={bulkDeleteMode ? "Bulk Delete Questions" : "Delete Question"}
            onClose={() => setDeleteConfirmOpen(false)}
            footer={
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmDelete}>
                  Confirm Delete
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              {isLoadingUsage ? (
                <div className="py-4 text-center text-sm font-semibold text-slate-500">
                  Scanning database for test usage...
                </div>
              ) : deleteUsageTests.length > 0 ? (
                <>
                  <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded text-rose-800 text-sm font-bold flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-rose-500 shrink-0" />
                    Warning: The question(s) you are trying to delete are linked to active test templates!
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    Deleting will automatically remove these questions from the following tests:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm font-semibold text-slate-800">
                    {deleteUsageTests.map((t) => (
                      <li key={t.id}>{t.name}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-rose-600 font-semibold italic mt-2">
                    Are you absolutely sure you want to proceed? This will update the test metrics as well.
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-slate-700">
                  Are you sure you want to delete this question? This action will permanently remove it from the Question Bank.
                </p>
              )}
            </div>
          </Modal>
        )}

        {/* MODAL: Bulk Assign Topic */}
        {bulkTopicOpen && (
          <Modal
            open={true}
            title="Bulk Assign Topic"
            onClose={() => setBulkTopicOpen(false)}
            footer={
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setBulkTopicOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleBulkAssignTopic}>
                  Assign Topic
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-semibold">
                Assign a topic and subtopic to all {selectedIds.length} selected questions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Topic</span>
                  <select
                    value={bulkTopicId}
                    onChange={(e) => {
                      setBulkTopicId(e.target.value);
                      setBulkSubTopicId("");
                    }}
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500"
                  >
                    <option value="">Select Topic</option>
                    {topics.map((top) => (
                      <option key={top.id} value={top.id}>
                        {top.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Subtopic</span>
                  <select
                    value={bulkSubTopicId}
                    onChange={(e) => setBulkSubTopicId(e.target.value)}
                    className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500"
                  >
                    <option value="">Select Subtopic</option>
                    {subtopics
                      .filter((st) => st.topic_id === bulkTopicId)
                      .map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL: Bulk Assign Difficulty */}
        {bulkDifficultyOpen && (
          <Modal
            open={true}
            title="Bulk Assign Difficulty"
            onClose={() => setBulkDifficultyOpen(false)}
            footer={
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setBulkDifficultyOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleBulkAssignDifficulty}>
                  Assign Difficulty
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-semibold">
                Set difficulty levels for all {selectedIds.length} selected questions.
              </p>
              <div className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Difficulty</span>
                <select
                  value={bulkDifficulty}
                  onChange={(e) => setBulkDifficulty(e.target.value)}
                  className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-primary-500"
                >
                  <option value="">Select Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL: Import CSV */}
        {isImportModalOpen && (
          <Modal
            open={true}
            title="Bulk Import Questions via CSV"
            onClose={() => setIsImportModalOpen(false)}
          >
            <div className="max-h-[75vh] overflow-y-auto pr-1">
              <CSVUpload onImport={handleImportCSV} />
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
};
