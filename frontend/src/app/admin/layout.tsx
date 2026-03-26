"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BarChart3, FileText, LayoutDashboard, LogOut, Menu, Monitor, Settings, Sliders, X } from "lucide-react";
import { useAuthStore, useAuthHydration } from "@/stores/authStore";
import { AlertBadge } from "@/components/admin/AlertBadge";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "仪表盘" },
  { href: "/admin/models", icon: Settings, label: "模型配置" },
  { href: "/admin/usage", icon: BarChart3, label: "用量监控" },
  { href: "/admin/logs", icon: FileText, label: "请求日志" },
  { href: "/admin/settings", icon: Sliders, label: "系统设置" },
  { href: "/admin/terminals", icon: Monitor, label: "终端管理" },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/v1";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydration();
  const { token, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      setChecking(false);
      router.push("/admin");
      return;
    }

    // Verify admin status
    const verifyAdmin = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const user = await response.json();
          if (user.role !== "admin") {
            logout();
            router.push("/admin");
            return;
          }
        } else {
          logout();
          router.push("/admin");
          return;
        }
      } catch (error) {
        console.error("Admin verification failed:", error);
      } finally {
        setChecking(false);
      }
    };

    verifyAdmin();
  }, [hydrated, token, router, logout]);

  const handleLogout = () => {
    logout();
    router.push("/admin");
  };

  // 登录页不需要 admin layout
  if (pathname === "/admin") {
    return <>{children}</>;
  }

  if (!hydrated || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // 未登录时重定向到登录页（非登录页才执行）
  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform lg:translate-x-0 lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">管理后台</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="ml-4 lg:ml-0 font-semibold text-gray-900">
            {navItems.find((item) => item.href === pathname)?.label || "管理后台"}
          </h1>
          <div className="ml-auto">
            <AlertBadge token={token} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}