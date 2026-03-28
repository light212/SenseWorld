"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { adminApi } from "@/services/adminApi";

interface AlertBadgeProps {
  token: string | null;
}

export function AlertBadge({ token }: AlertBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    adminApi.setToken(token || null);
    if (!token) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const data = await adminApi.getUnreadAlertCount();
        setCount(data.count || 0);
      } catch {
        setCount(0);
      }
    };

    fetchCount();
  const interval = setInterval(fetchCount, 60_000);
  return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="relative">
      <Bell className="w-5 h-5 text-gray-600" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}
