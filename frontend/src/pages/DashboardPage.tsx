import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, Plus, Trash2, Eye, HelpCircle, BarChart2, CheckCircle, FileText, HelpCircle as HelpIcon, Calendar } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ChartTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Button } from "../components/ui/Button";
import { Toast } from "../components/ui/Toast";
import { deleteTest, getErrorMessage, getQuestions } from "../api";
import { useTests, useTopics } from "../hooks/useTests";
import { Test } from "../types";
import { PageHeader } from "../components/ui/PageHeader";
import { SearchBar } from "../components/ui/SearchBar";
import { AppTable, Column } from "../components/ui/AppTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";

export const DashboardPage = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const { data: tests = [], isLoading, error } = useTests();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"success" | "error">("success");

  // Sort and pagination states
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const queryClient = useQueryClient();

  // Load topics to resolve IDs to names
  const { data: mathTopics = [] } = useTopics("sub-1");
  const { data: physicsTopics = [] } = useTopics("sub-2");
  const { data: chemTopics = [] } = useTopics("sub-3");

  const allTopics = useMemo(() => [
    ...mathTopics,
    ...physicsTopics,
    ...chemTopics
  ], [mathTopics, physicsTopics, chemTopics]);

  // Sync status selector from URL search query if it changes
  React.useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus === "live" || urlStatus === "draft" || urlStatus === "all") {
      setStatus(urlStatus);
      setPage(1);
    }
  }, [searchParams]);

  const showToast = (message: string, tone: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastTone(tone);
    window.setTimeout(() => setToastMessage(""), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tests"] });
      const previousTests = queryClient.getQueryData<Test[]>(["tests"]);
      if (previousTests) {
        queryClient.setQueryData<Test[]>(
          ["tests"],
          previousTests.filter((test) => test.id !== id)
        );
      }
      setDeleteTarget(null);
      return { previousTests };
    },
    onSuccess: () => {
      showToast("Test deleted successfully", "success");
    },
    onError: (err, id, context) => {
      if (context?.previousTests) {
        queryClient.setQueryData(["tests"], context.previousTests);
      }
      showToast(getErrorMessage(err), "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });

  // Load questions for total count
  const { data: questionsData } = useQuery({
    queryKey: ["questions", "all"],
    queryFn: () => getQuestions({ limit: 10000 }),
  });

  // Calculate statistics metrics
  const stats = useMemo(() => {
    const total = tests.length;
    const drafts = tests.filter((t) => (t.status || "draft") === "draft").length;
    const published = tests.filter((t) => t.status === "live").length;
    const totalQs = questionsData?.total ?? 0;

    return { total, drafts, published, totalQs };
  }, [tests, questionsData]);

  // Resolve topic names helper
  const getTopicNamesForTest = (test: Test): string[] => {
    return (test.topics ?? []).map((tId) => allTopics.find((t) => t.id === tId)?.name ?? tId);
  };

  // Filter tests
  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      // Global Search: Matches Test Name or resolved Topic Names
      const resolvedTopicNames = getTopicNamesForTest(test);
      const matchesSearch =
        test.name.toLowerCase().includes(search.toLowerCase()) ||
        resolvedTopicNames.some((name) => name.toLowerCase().includes(search.toLowerCase()));

      // Status Filter
      const normalizedStatus = test.status || "draft";
      const matchesStatus = status === "all" || normalizedStatus === status;

      // Subject Filter
      const matchesSubject =
        subjectFilter === "all" ||
        test.subject_id === subjectFilter ||
        test.subject.toLowerCase() === subjectFilter.toLowerCase();

      // Difficulty Filter
      const matchesDifficulty =
        difficultyFilter === "all" ||
        test.difficulty?.toLowerCase() === difficultyFilter.toLowerCase();

      // Date Range Filter
      let matchesDate = true;
      if (startDate || endDate) {
        const testDate = new Date(test.created_at).getTime();
        if (startDate) {
          const start = new Date(startDate).getTime();
          if (testDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate).getTime() + 86400000; // include full day
          if (testDate > end) matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesSubject && matchesDifficulty && matchesDate;
    });
  }, [tests, search, status, subjectFilter, difficultyFilter, startDate, endDate, allTopics]);

  // Difficulty chart data
  const difficultyChartData = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0 };
    filteredTests.forEach((t) => {
      const diff = (t.difficulty || "easy").toLowerCase() as "easy" | "medium" | "hard";
      if (counts[diff] !== undefined) {
        counts[diff]++;
      }
    });

    return [
      { name: "Easy", value: counts.easy, color: "#10b981" },
      { name: "Medium", value: counts.medium, color: "#f59e0b" },
      { name: "Hard", value: counts.hard, color: "#ef4444" },
    ].filter((d) => d.value > 0);
  }, [filteredTests]);

  // Topics chart data
  const topicsChartData = useMemo(() => {
    const topicCounts: Record<string, number> = {};
    filteredTests.forEach((t) => {
      const topicNames = getTopicNamesForTest(t);
      topicNames.forEach((name) => {
        topicCounts[name] = (topicCounts[name] || 0) + 1;
      });
    });

    return Object.entries(topicCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 topics
  }, [filteredTests, allTopics]);

  // Sort tests
  const sortedTests = useMemo(() => {
    return [...filteredTests].sort((a, b) => {
      let aVal = a[sortKey as keyof Test] ?? "";
      let bVal = b[sortKey as keyof Test] ?? "";

      if (sortKey === "created_at") {
        return sortOrder === "asc"
          ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
          : new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortOrder === "asc" ? -1 : 1;
      if (aStr > bStr) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTests, sortKey, sortOrder]);

  // Paginated tests
  const paginatedTests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTests.slice(start, start + pageSize);
  }, [sortedTests, page]);

  const totalPages = Math.ceil(sortedTests.length / pageSize) || 1;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const columns: Column<Test>[] = [
    {
      header: "Test Name",
      accessorKey: "name",
      sortable: true,
      cell: (test) => (
        <span className="font-bold text-slate-800 hover:text-primary-600 transition">
          <Link to={`/tests/${test.id}/preview`}>{test.name}</Link>
        </span>
      ),
    },
    {
      header: "Subject",
      accessorKey: "subject",
      sortable: true,
      cell: (test) => <span className="text-slate-600 font-semibold">{test.subject}</span>,
    },
    {
      header: "Topics",
      accessorKey: "topics",
      cell: (test) => {
        const resolved = getTopicNamesForTest(test);
        if (resolved.length === 0) return <span className="text-slate-400">None</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {resolved.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600"
              >
                {name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      sortable: true,
      cell: (test) => <StatusBadge status={test.status} />,
    },
    {
      header: "Created Date",
      accessorKey: "created_at",
      sortable: true,
      cell: (test) => (
        <span className="text-slate-500 font-medium">
          {new Date(test.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (test) => (
        <div className="flex flex-wrap gap-2">
          {test.status === "live" ? (
            <Link to={`/tests/${test.id}/preview`}>
              <Button variant="secondary" className="h-9 px-3 text-xs" icon={<Eye className="h-3.5 w-3.5" />}>
                View
              </Button>
            </Link>
          ) : (
            <>
              <Link to={`/tests/${test.id}/preview`}>
                <Button variant="secondary" className="h-9 px-3 text-xs" icon={<Eye className="h-3.5 w-3.5" />}>
                  Preview
                </Button>
              </Link>
              <Link to={`/tests/${test.id}/edit`}>
                <Button variant="secondary" className="h-9 px-3 text-xs" icon={<Pencil className="h-3.5 w-3.5" />}>
                  Edit
                </Button>
              </Link>
              <Link to={`/tests/${test.id}/questions`}>
                <Button variant="secondary" className="h-9 px-3 text-xs" icon={<HelpCircle className="h-3.5 w-3.5" />}>
                  Add Q's
                </Button>
              </Link>
            </>
          )}
          <Button
            variant="ghost"
            className="h-9 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => setDeleteTarget(test)}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageWrapper>
        <PageHeader
          title="Test Management"
          description="Build, monitor, and deploy custom academic evaluations."
          breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }]}
          action={
            <Link to="/tests/create">
              <Button icon={<Plus className="h-4 w-4" />}>Create Test</Button>
            </Link>
          }
        />

        {/* Dashboard Statistics Grid */}
        <section className="grid gap-5 md:grid-cols-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-sm hover:shadow-soft transition duration-200">
            <div className="bg-primary-50 text-primary-600 rounded p-3">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Total Tests</span>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.total}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-sm hover:shadow-soft transition duration-200">
            <div className="bg-amber-50 text-amber-600 rounded p-3">
              <Pencil className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Draft Tests</span>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.drafts}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-sm hover:shadow-soft transition duration-200">
            <div className="bg-emerald-50 text-emerald-600 rounded p-3">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Published Tests</span>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.published}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4 shadow-sm hover:shadow-soft transition duration-200">
            <div className="bg-rose-50 text-rose-600 rounded p-3">
              <HelpIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">Total Questions</span>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{stats.totalQs}</h3>
            </div>
          </div>
        </section>

        {/* Analytics Charts Grid */}
        <section className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Difficulty Pie Chart */}
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <BarChart2 className="h-4 w-4 text-slate-500" />
              <span>Question Difficulty Distribution</span>
            </h3>
            <div className="h-56 flex items-center justify-center">
              {difficultyChartData.length === 0 ? (
                <span className="text-slate-400 text-xs font-semibold">No difficulty data available</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={difficultyChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {difficultyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-800 text-white text-xs font-bold rounded px-2.5 py-1.5 shadow">
                              {item.name}: {item.value} Test(s)
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {difficultyChartData.length > 0 && (
                <div className="flex flex-col gap-2 pl-4 text-xs font-semibold text-slate-600">
                  {difficultyChartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Topics Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <BarChart2 className="h-4 w-4 text-slate-500" />
              <span>Topic Distribution (Top 5)</span>
            </h3>
            <div className="h-56">
              {topicsChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                  No topic data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicsChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-800 text-white text-xs font-bold rounded px-2.5 py-1.5 shadow">
                              {payload[0].payload.name}: {payload[0].value} Test(s)
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="#6c7df7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* Search & Comprehensive Filters Panel */}
        <div className="mb-5 bg-white border border-slate-200 rounded-md p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search tests by name or topic..."
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-12 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary-500 focus:ring-3 focus:ring-primary-100"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-primary-500"
              >
                <option value="all">All Subjects</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Difficulty</label>
              <select
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 w-full rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-primary-500"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-10 text-xs px-3"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-10 text-xs px-3"
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-600 shadow-sm animate-fade-in">
            {getErrorMessage(error)}
          </div>
        ) : (
          <div className="animate-fade-in">
            <AppTable
              columns={columns}
              data={paginatedTests}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSort={handleSort}
              isLoading={isLoading}
              loadingRows={pageSize}
              emptyState={
                <EmptyState
                  title="No tests match search criteria"
                  description="No tests match your current search queries or dates filters. Clear filters to view all entries."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch("");
                        setStatus("all");
                        setSubjectFilter("all");
                        setDifficultyFilter("all");
                        setStartDate("");
                        setEndDate("");
                        setPage(1);
                      }}
                    >
                      Clear All Filters
                    </Button>
                  }
                />
              }
            />

            {/* Pagination Controls */}
            {!isLoading && sortedTests.length > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row px-1">
                <p className="text-xs font-semibold text-slate-500">
                  Showing <span className="text-slate-800">{Math.min(sortedTests.length, (page - 1) * pageSize + 1)}</span> to{" "}
                  <span className="text-slate-800">{Math.min(sortedTests.length, page * pageSize)}</span> of{" "}
                  <span className="text-slate-800">{sortedTests.length}</span> tests
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="h-9 px-3 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`h-9 w-9 rounded-md text-xs font-extrabold transition ${
                        page === i + 1
                          ? "bg-[#6c7df7] text-white"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <Button
                    variant="secondary"
                    className="h-9 px-3 text-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete Test"
          description={`Are you sure you want to delete "${deleteTarget?.name}"? This will permanently remove all associated questions. This action is irreversible.`}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          confirmText="Delete permanently"
          isLoading={deleteMutation.isPending}
          variant="danger"
        />

        {toastMessage && <Toast tone={toastTone}>{toastMessage}</Toast>}
      </PageWrapper>
    </AppShell>
  );
};
