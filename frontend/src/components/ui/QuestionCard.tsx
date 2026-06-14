import React from "react";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { Question } from "../../types";

interface QuestionCardProps {
  question: Question;
  index: number;
  onEdit?: () => void;
  onDelete?: () => void;
  extraActions?: React.ReactNode;
}

export const QuestionCard = ({ question, index, onEdit, onDelete, extraActions }: QuestionCardProps) => {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        {extraActions && <div className="flex-shrink-0 pt-1">{extraActions}</div>}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-extrabold text-slate-400">QUESTION {index + 1}</span>
            {question.difficulty && (
              <Badge tone={question.difficulty === "easy" ? "green" : question.difficulty === "medium" ? "yellow" : "red"}>
                {question.difficulty}
              </Badge>
            )}
            {question.source && (
              <Badge tone={question.source === "bank" ? "purple" : "blue"}>
                {question.source === "bank" ? "Question Bank" : "Manual"}
              </Badge>
            )}
          </div>
          <div 
            className="text-sm font-bold text-slate-800 leading-snug rich-content" 
            dangerouslySetInnerHTML={{ __html: question.question }} 
          />
          
          {/* Question Image Preview */}
          {question.image_url && (
            <div className="mt-3 max-h-48 overflow-hidden rounded border border-slate-100 max-w-sm">
              <img 
                src={question.image_url} 
                alt={`Question ${index + 1}`} 
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button type="button" variant="secondary" className="h-8 px-2.5 text-xs" onClick={onEdit} icon={<Pencil className="h-3.5 w-3.5" />}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button type="button" variant="ghost" className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700" onClick={onDelete} icon={<Trash2 className="h-3.5 w-3.5" />}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(["option1", "option2", "option3", "option4"] as const).map((optKey) => {
          const isCorrect = question.correct_option === optKey;
          return (
            <div
              key={optKey}
              className={`rounded-md border px-3 py-2.5 text-xs transition ${
                isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold" : "border-slate-200 text-slate-600"
              }`}
            >
              <span className="mr-1.5 font-bold uppercase">{optKey.replace("option", "")}:</span>
              {question[optKey]}
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 flex flex-wrap justify-between items-center gap-2">
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5" /> Correct: {question.correct_option.replace("option", "Option ")}
        </p>
        {question.explanation && (
          <p className="text-xs text-slate-500 font-medium italic">
            Solution: {question.explanation}
          </p>
        )}
      </div>
    </div>
  );
};
