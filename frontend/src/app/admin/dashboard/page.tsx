"use client";

import { useEffect, useState } from "react";
import { Users, MessageCircle, Settings, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface Stats {
  total_users: number;
  total_conversations: number;
  total_messages: number;
}

export default function AdminDashboardPage() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:8000/v1/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  const statCards = [
    {
      label: "用户总数",
      value: stats?.total_users || 0,
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      label: "会话总数",
      value: stats?.total_conversations || 0,
      icon: MessageCircle,
      color: "from-purple-500 to-purple-600",
    },
    {
      label: "消息总数",
      value: stats?.total_messages || 0,
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
    },
    {
      label: "模型配置",
      value: "-",
      icon: Settings,
      color: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? "..." : stat.value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
            <div className="font-medium text-gray-900">配置 LLM 模型</div>
            <div className="text-sm text-gray-500 mt-1">管理大语言模型配置</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
            <div className="font-medium text-gray-900">配置 TTS 模型</div>
            <div className="text-sm text-gray-500 mt-1">管理语音合成配置</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
            <div className="font-medium text-gray-900">查看请求日志</div>
            <div className="text-sm text-gray-500 mt-1">分析系统使用情况</div>
          </button>
        </div>
      </div>
    </div>
  );
}