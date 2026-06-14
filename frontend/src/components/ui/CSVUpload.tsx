import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, Download, Trash2, AlertTriangle, CheckCircle, Edit, Save, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { Question, CorrectOption } from "../../types";

interface CSVQuestionRow {
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: string;
  explanation?: string;
  difficulty?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
}

interface ParsedQuestionItem {
  id: string;
  data: CSVQuestionRow;
  errors: string[];
}

interface CSVUploadProps {
  onImport: (questions: Question[]) => void;
}

export const CSVUpload = ({ onImport }: CSVUploadProps) => {
  const [importMethod, setImportMethod] = useState<"file" | "text">("file");
  const [csvText, setCsvText] = useState("");
  const [items, setItems] = useState<ParsedQuestionItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<CSVQuestionRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadSampleCSV = () => {
    const csvContent =
      "question,option1,option2,option3,option4,correct_option,explanation,difficulty,subject,topic,subtopic\n" +
      "What is the value of <b>x² + y²</b> when x=2 and y=3?,11,13,5,6,option2,Calculation: 2^2 + 3^2 = 4 + 9 = 13,medium,Mathematics,Algebra,Quadratic Equations\n" +
      "Which particle has a positive electric charge?,Electron,Neutron,Proton,Positron,option3,Protons are positive,easy,Physics,Mechanics,Kinematics";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_questions.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateRow = (row: CSVQuestionRow): string[] => {
    const errors: string[] = [];
    if (!row.question || !row.question.trim()) {
      errors.push("Question text is required");
    }
    if (!row.option1 || !row.option1.trim()) errors.push("Option 1 is required");
    if (!row.option2 || !row.option2.trim()) errors.push("Option 2 is required");
    if (!row.option3 || !row.option3.trim()) errors.push("Option 3 is required");
    if (!row.option4 || !row.option4.trim()) errors.push("Option 4 is required");

    const validOptions = ["option1", "option2", "option3", "option4"];
    if (!row.correct_option || !validOptions.includes(row.correct_option.trim())) {
      errors.push("Correct option must be option1, option2, option3, or option4");
    }

    const validDifficulty = ["easy", "medium", "hard"];
    if (row.difficulty && !validDifficulty.includes(row.difficulty.trim().toLowerCase())) {
      errors.push("Difficulty must be easy, medium, or hard");
    }

    return errors;
  };

  const processCSVContent = (content: string) => {
    Papa.parse<CSVQuestionRow>(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          alert("No question rows detected in CSV.");
          return;
        }
        const parsedItems: ParsedQuestionItem[] = results.data.map((row, idx) => {
          const normalizedRow = {
            question: row.question || "",
            option1: row.option1 || "",
            option2: row.option2 || "",
            option3: row.option3 || "",
            option4: row.option4 || "",
            correct_option: row.correct_option || "",
            explanation: row.explanation || "",
            difficulty: row.difficulty || "easy",
            subject: row.subject || "",
            topic: row.topic || "",
            subtopic: row.subtopic || "",
          };
          return {
            id: `csv-${Date.now()}-${idx}`,
            data: normalizedRow,
            errors: validateRow(normalizedRow),
          };
        });
        setItems(parsedItems);
      },
      error: (err: any) => {
        alert(`Error parsing CSV: ${err.message}`);
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<CSVQuestionRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedItems: ParsedQuestionItem[] = results.data.map((row, idx) => {
          const normalizedRow = {
            question: row.question || "",
            option1: row.option1 || "",
            option2: row.option2 || "",
            option3: row.option3 || "",
            option4: row.option4 || "",
            correct_option: row.correct_option || "",
            explanation: row.explanation || "",
            difficulty: row.difficulty || "easy",
            subject: row.subject || "",
            topic: row.topic || "",
            subtopic: row.subtopic || "",
          };
          return {
            id: `csv-${Date.now()}-${idx}`,
            data: normalizedRow,
            errors: validateRow(normalizedRow),
          };
        });
        setItems(parsedItems);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: (err: any) => {
        alert(`Error parsing CSV: ${err.message}`);
      },
    });
  };

  const handleTextParse = () => {
    if (!csvText.trim()) {
      alert("Please paste some CSV content first.");
      return;
    }
    processCSVContent(csvText);
  };

  const handleEditStart = (item: ParsedQuestionItem) => {
    setEditingId(item.id);
    setEditValues({ ...item.data });
  };

  const handleEditSave = (id: string) => {
    if (!editValues) return;

    setItems((current) =>
      current.map((item) => {
        if (item.id === id) {
          const errors = validateRow(editValues);
          return {
            ...item,
            data: editValues,
            errors,
          };
        }
        return item;
      })
    );
    setEditingId(null);
    setEditValues(null);
  };

  const handleRowDelete = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleImportClick = () => {
    const validQuestions: Question[] = items
      .filter((item) => item.errors.length === 0)
      .map((item) => ({
        type: "mcq",
        question: item.data.question,
        option1: item.data.option1,
        option2: item.data.option2,
        option3: item.data.option3,
        option4: item.data.option4,
        correct_option: item.data.correct_option.trim() as CorrectOption,
        explanation: item.data.explanation || undefined,
        difficulty: item.data.difficulty?.trim().toLowerCase() || "easy",
        test_id: "",
        subject: item.data.subject || undefined,
        topic: item.data.topic || undefined,
        subtopic: item.data.subtopic || undefined,
      }));

    if (validQuestions.length === 0) {
      alert("No valid questions found to import.");
      return;
    }

    onImport(validQuestions);
    setItems([]);
    setCsvText("");
  };

  const totalErrors = items.reduce((sum, item) => sum + item.errors.length, 0);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-6 mt-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800">CSV Bulk Import Tool</h4>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Import multiple questions quickly via a CSV file upload or direct text pasting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" className="h-9 px-3 text-xs" onClick={downloadSampleCSV} icon={<Download className="h-4 w-4" />}>
            Sample CSV Template
          </Button>
        </div>
      </div>

      {/* Navigation tabs for File upload vs Raw Text */}
      <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-2">
        <button
          type="button"
          className={`flex items-center gap-1.5 text-xs font-bold pb-2 border-b-2 transition ${
            importMethod === "file" ? "border-[#6c7df7] text-[#6c7df7]" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
          onClick={() => setImportMethod("file")}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> CSV File Upload
        </button>
        <button
          type="button"
          className={`flex items-center gap-1.5 text-xs font-bold pb-2 border-b-2 transition ${
            importMethod === "text" ? "border-[#6c7df7] text-[#6c7df7]" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
          onClick={() => setImportMethod("text")}
        >
          <FileText className="h-3.5 w-3.5" /> Paste CSV Text
        </button>
      </div>

      {/* Import Methods Components */}
      {importMethod === "file" ? (
        <div 
          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-md p-6 bg-white hover:bg-slate-50/50 hover:border-slate-300 transition cursor-pointer mb-4" 
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-slate-400 mb-2" />
          <span className="text-xs font-bold text-slate-700">Click to upload CSV File</span>
          <span className="text-[10px] text-slate-400 mt-1">Accepts standard .csv table format</span>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          <textarea
            className="w-full h-36 rounded-md border border-slate-200 p-3 text-xs font-mono outline-none focus:border-[#6c7df7] focus:ring-1 focus:ring-[#6c7df7] bg-white resize-y"
            placeholder="question,option1,option2,option3,option4,correct_option,explanation,difficulty&#10;What is the capital of India?,Mumbai,New Delhi,Kolkata,Chennai,option2,New Delhi is the capital.,easy"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              className="h-9 px-4 text-xs"
              onClick={handleTextParse}
            >
              Parse CSV Text
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Parsed <span className="text-slate-900 font-bold">{items.length}</span> rows
            </span>
            {totalErrors > 0 ? (
              <span className="flex items-center gap-1.5 text-xs text-rose-600 font-bold">
                <AlertTriangle className="h-4 w-4" /> Resolve {totalErrors} issues before importing
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                <CheckCircle className="h-4 w-4" /> All rows valid! Ready to import.
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Question Statement</th>
                  <th className="p-3">Options (1-4)</th>
                  <th className="p-3">Correct</th>
                  <th className="p-3">Difficulty</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Topic</th>
                  <th className="p-3">Subtopic</th>
                  <th className="p-3">Status / Errors</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id} className={`${item.errors.length > 0 ? "bg-rose-25" : "hover:bg-slate-50/50"}`}>
                      <td className="p-3 max-w-[200px]">
                        {isEditing ? (
                          <textarea
                            className="w-full rounded border border-slate-300 p-1 text-xs outline-none focus:border-primary-500"
                            value={editValues?.question}
                            onChange={(e) => setEditValues((val) => val && { ...val, question: e.target.value })}
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.data.question }} />
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-1 max-w-[240px]">
                            {["option1", "option2", "option3", "option4"].map((opt) => (
                              <input
                                key={opt}
                                className="rounded border border-slate-300 p-0.5 text-xs outline-none focus:border-primary-500"
                                value={(editValues as any)?.[opt]}
                                placeholder={opt}
                                onChange={(e) => setEditValues((val) => val && { ...val, [opt]: e.target.value })}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">
                            1: {item.data.option1} | 2: {item.data.option2} | 3: {item.data.option3} | 4: {item.data.option4}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <select
                            className="rounded border border-slate-300 p-1 text-xs outline-none focus:border-primary-500"
                            value={editValues?.correct_option}
                            onChange={(e) => setEditValues((val) => val && { ...val, correct_option: e.target.value })}
                          >
                            <option value="option1">Option 1</option>
                            <option value="option2">Option 2</option>
                            <option value="option3">Option 3</option>
                            <option value="option4">Option 4</option>
                          </select>
                        ) : (
                          <span className="font-bold text-emerald-600">{item.data.correct_option}</span>
                        )}
                      </td>
                      <td className="p-3 capitalize">
                        {isEditing ? (
                          <select
                            className="rounded border border-slate-300 p-1 text-xs outline-none focus:border-primary-500"
                            value={editValues?.difficulty}
                            onChange={(e) => setEditValues((val) => val && { ...val, difficulty: e.target.value })}
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        ) : (
                          <Badge tone={item.data.difficulty === "easy" ? "green" : item.data.difficulty === "medium" ? "yellow" : "red"}>
                            {item.data.difficulty ?? "easy"}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            className="w-full min-w-[80px] rounded border border-slate-300 p-1 text-xs outline-none focus:border-primary-500"
                            value={editValues?.subject || ""}
                            onChange={(e) => setEditValues((val) => val && { ...val, subject: e.target.value })}
                            placeholder="Subject"
                          />
                        ) : (
                          <span className="text-slate-700 font-medium">{item.data.subject || "-"}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            className="w-full min-w-[80px] rounded border border-slate-300 p-1 text-xs outline-none focus:border-primary-500"
                            value={editValues?.topic || ""}
                            onChange={(e) => setEditValues((val) => val && { ...val, topic: e.target.value })}
                            placeholder="Topic"
                          />
                        ) : (
                          <span className="text-slate-700 font-medium">{item.data.topic || "-"}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            className="w-full min-w-[80px] rounded border border-slate-300 p-1 text-xs outline-none focus:border-primary-500"
                            value={editValues?.subtopic || ""}
                            onChange={(e) => setEditValues((val) => val && { ...val, subtopic: e.target.value })}
                            placeholder="Subtopic"
                          />
                        ) : (
                          <span className="text-slate-700 font-medium">{item.data.subtopic || "-"}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {item.errors.length > 0 ? (
                          <div className="text-rose-600 font-semibold flex flex-col gap-0.5">
                            {item.errors.map((err, errIdx) => (
                              <span key={errIdx} className="flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-rose-600" /> {err}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Valid
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => handleEditSave(item.id)}
                              className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEditStart(item)}
                              className="p-1.5 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRowDelete(item.id)}
                            className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setItems([])}>
              Clear
            </Button>
            <Button type="button" onClick={handleImportClick} disabled={totalErrors > 0}>
              Import Valid Questions ({items.filter((i) => i.errors.length === 0).length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
