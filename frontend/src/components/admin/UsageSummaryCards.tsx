"use client";

import type { UsageSummary } from "@/services/adminApi";

interface UsageSummaryCardsProps {
  summary: UsageSummary | null;
}

export function UsageSummaryCards({ summary }: UsageSummaryCardsProps) {
  const cards = [
    { label: "总调用次数", value: summary?.total_calls ?? 0 },
    { label: "输入 Tokens", value: summary?.total_input_tokens ?? 0 },
    { label: "输出 Tokens", value: summary?.total_output_tokens ?? 0 },
    { label: "总费用 (元)", value: (summary?.total_cost ?? 0).toFixed(4) },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">{card.label}</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
