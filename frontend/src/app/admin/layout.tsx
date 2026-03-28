"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BarChart3, FileText, LayoutDashboard, LogOut, Menu, Monitor, Settings, Sliders } from "lucide-react";
import { useAuthStore, useAuthHydration } from "@/stores/authStore";
import { AlertBadge } from "@/components/admin/AlertBadge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "概览" },
  { href: "/admin/ai-config", icon: Settings, label: "AI 配置" },
  { href: "/admin/billing", icon: BarChart3, label: "费用与统计" },
  { href: "/admin/troubleshoot", icon: FileText, label: "问题排查" },
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
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // 未登录时重定向到登录页（非登录页才执行）
  if (!token) {
    return null;
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-sm">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">SenseWorld</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <button
              key={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              onClick={() => {
                router.push(item.href);
                setSidebarOpen(false);
              }}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 bg-white shadow-sm flex-col">
        <NavContent />
      </aside>

      {/* Mobile Sidebar using Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-60 p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>导航菜单</SheetTitle>
          </SheetHeader>
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white shadow-xs flex items-center px-4 lg:px-6 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="ml-4 lg:ml-0 text-lg font-semibold text-gray-900">
            {navItems.find((item) => item.href === pathname)?.label || "管理后台"}
          </h1>
          <div className="ml-auto">
            <AlertBadge token={token} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}