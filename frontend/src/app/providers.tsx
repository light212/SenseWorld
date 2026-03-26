"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { setupGlobalErrorHandlers, logger } from "@/lib/errorHandling";
import { ReactNode, useEffect } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // 初始化全局错误处理
  useEffect(() => {
    setupGlobalErrorHandlers();
    logger.info("App providers initialized");
  }, []);

  return (
    <ErrorBoundary
      componentName="App"
      showDetails={process.env.NODE_ENV === "development"}
      onError={(error, errorInfo) => {
        logger.error("App Error Boundary caught error", error, {
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </ErrorBoundary>
  );
}
