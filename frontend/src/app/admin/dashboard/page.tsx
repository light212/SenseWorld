"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, MessageCircle, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, Settings, FileText, BarChart3, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

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
    },
    {
      label: "会话总数",
      value: stats?.total_conversations || 0,
      icon: MessageCircle,
      trend: "+8%",
      trendUp: true,
    },
    {
      label: "消息总数",
      value: stats?.total_messages || 0,
      icon: TrendingUp,
      trend: "+23%",
      trendUp: true,
    },
    {
      label: "API 调用",
      value: "-",
      icon: Activity,
      trend: null,
      trendUp: true,
    },
  ];

  const quickActions = [
    {
      title: "AI 配置",
      desc: "配置对话、语音、视觉能力",
      icon: Settings,
      href: "/admin/ai-config",
    },
    {
      title: "费用与统计",
      desc: "查看用量和费用明细",
      icon: BarChart3,
      href: "/admin/billing",
    },
    {
      title: "问题排查",
      desc: "查看请求日志和错误",
      icon: FileText,
      href: "/admin/troubleshoot",
    },
  ];

  const systemStatus = [
    { label: "API 服务", status: "正常", ok: true },
    { label: "数据库", status: "正常", ok: true },
    { label: "Redis 缓存", status: "正常", ok: true },
    { label: "LLM 服务", status: "未配置", ok: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">概览</h1>
        <p className="text-gray-500 mt-1">系统运行状态一览</p>
      </div>

      {/* Stats Grid - 统一白色背景 + 灰色边框 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-5 h-5 text-gray-400" />
              {stat.trend && (
                <span className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  stat.trendUp ? "text-green-600" : "text-red-500"
                )}>
                  {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions - 列表式 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">快捷操作</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => router.push(action.href)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
            >
              <action.icon className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{action.title}</div>
                <div className="text-sm text-gray-500">{action.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* System Status - 合并到一个卡片 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">系统状态</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {systemStatus.map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-gray-600">{item.label}</span>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  item.ok ? "bg-green-500" : "bg-gray-300"
                )} />
                <span className={cn(
                  "text-sm",
                  item.ok ? "text-gray-600" : "text-gray-400"
                )}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
