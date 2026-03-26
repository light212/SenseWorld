"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "请选择",
  className,
  size = "md",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // 计算下拉方向
  const calculateDropDirection = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(options.length * 36 + 8, 248); // 每项约36px + padding
    
    // 如果下方空间不足且上方空间更多，则向上展开
    setDropUp(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
  }, [options.length]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen) {
      calculateDropDirection();
    }
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    } else if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      const currentIdx = options.findIndex((opt) => opt.value === value);
      const nextIdx = Math.min(currentIdx + 1, options.length - 1);
      onChange(options[nextIdx].value);
    } else if (e.key === "ArrowUp" && isOpen) {
      e.preventDefault();
      const currentIdx = options.findIndex((opt) => opt.value === value);
      const prevIdx = Math.max(currentIdx - 1, 0);
      onChange(options[prevIdx].value);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex items-center justify-between gap-2 border border-gray-200 rounded-lg bg-white text-left transition-all duration-150",
          "hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
          isOpen && "border-blue-500 ring-2 ring-blue-500/20",
          size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-gray-400")}>
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={cn(
            "shrink-0 text-gray-400 transition-transform duration-200",
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden",
            "transition-all duration-100",
            dropUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top"
          )}
          style={{ animation: dropUp ? "selectDropdownUp 100ms ease-out" : "selectDropdown 100ms ease-out" }}
        >
          <div className="max-h-60 overflow-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                  size === "sm" ? "text-xs" : "text-sm",
                  option.value === value
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {option.icon}
                <span className="truncate">{option.label}</span>
                {option.value === value && (
                  <svg
                    className={cn("ml-auto shrink-0 text-blue-600", size === "sm" ? "h-3 w-3" : "h-4 w-4")}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
