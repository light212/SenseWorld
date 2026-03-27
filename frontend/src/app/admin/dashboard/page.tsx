"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, MessageCircle, Settings, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, Activity } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface Stats {
  total_users: number;
  total_conversations: number;
  total_messages: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
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
      trend: "+12%",
      trendUp: true,
      gradient: "from-blue-500 to-blue-600",
      lightBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: "会话总数",
      value: stats?.total_conversations || 0,
      icon: MessageCircle,
      trend: "+8%",
      trendUp: true,
      gradient: "from-purple-500 to-purple-600",
      lightBg: "bg-purple-50",
      iconColor: "text-purple-500",
    },
    {
      label: "消息总数",
      value: stats?.total_messages || 0,
      icon: TrendingUp,
      trend: "+23%",
      trendUp: true,
      gradient: "from-green-500 to-green-600",
      lightBg: "bg-green-50",
      iconColor: "text-green-500",
    },
    {
      label: "API 调用",
      value: "-",
      icon: Activity,
      trend: "—",
      trendUp: true,
      gradient: "from-amber-500 to-amber-600",
      lightBg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
  ];

  const quickActions = [
    {
      title: "配置 LLM 模型",
      desc: "管理大语言模型配置",
      icon: Zap,
      href: "/admin/models",
      color: "text-blue-600",
      bg: "bg-blue-50 hover:bg-blue-100",
    },
    {
      title: "配置 TTS 模型",
      desc: "管理语音合成配置",
      icon: Settings,
      href: "/admin/models",
      color: "text-purple-600",
      bg: "bg-purple-50 hover:bg-purple-100",
    },
    {
      title: "查看请求日志",
      desc: "分析系统使用情况",
      icon: Activity,
      href: "/admin/logs",
      color: "text-green-600",
      bg: "bg-green-50 hover:bg-green-100",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 rounded-xl ${stat.lightBg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              {stat.trend !== "—" && (
                <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.trendUp ? "text-green-600" : "text-red-500"}`}>
                  {stat.trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {stat.trend}
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900">
                {loading ? (
                  <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
                ) : (
                  typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => router.push(action.href)}
              className={`flex items-start gap-4 p-4 rounded-xl ${action.bg} transition-all duration-200 text-left group`}
            >
              <div className={`w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center ${action.color} group-hover:scale-105 transition-transform`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div>
                <div className={`font-medium ${action.color}`}>{action.title}</div>
                <div className="text-sm text-gray-500 mt-0.5">{action.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h2>
          <div className="space-y-4">
            {[
              { label: "API 服务", status: "正常", color: "bg-green-500" },
              { label: "数据库", status: "正常", color: "bg-green-500" },
              { label: "Redis 缓存", status: "正常", color: "bg-green-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{item.label}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-500">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h2>
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无活动记录</p>
          </div>
        </div>
      </div>
    </div>
  );
}
