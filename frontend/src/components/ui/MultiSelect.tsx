import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  label?: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: string;
}

export const MultiSelect = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Choose from Drop-down",
  error,
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedOptions = options.filter((o) => value.includes(o.value));

  return (
    <div className="block w-full" ref={containerRef}>
      {label && <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>}
      <div className="relative">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`min-h-12 w-full cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2 pr-10 text-sm text-slate-700 outline-none transition flex flex-wrap gap-2 items-center focus-within:border-primary-500 focus-within:ring-3 focus-within:ring-primary-100 ${
            isOpen ? "border-primary-500 ring-3 ring-primary-100" : ""
          }`}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-slate-300">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1.5 rounded bg-primary-50 border border-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => removeOption(opt.value, e)}
                  className="rounded-full hover:bg-primary-100 p-0.5 text-primary-500 hover:text-primary-700 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-soft py-1">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 font-medium">No options available</div>
            ) : (
              options.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition select-none ${
                      isSelected ? "bg-primary-50/50 text-primary-950 font-semibold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary-600" />}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      {error && <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span>}
    </div>
  );
};
