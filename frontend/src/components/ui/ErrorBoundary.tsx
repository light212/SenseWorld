"use client";

/**
 * React Error Boundary 组件
 * 
 * 用于捕获子组件树中的 JavaScript 错误，
 * 记录错误日志，并显示备用 UI。
 */

import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 自定义备用 UI */
  fallback?: ReactNode;
  /** 错误回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 是否显示错误详情（开发环境） */
  showDetails?: boolean;
  /** 重试回调 */
  onRetry?: () => void;
  /** 组件名称（用于日志） */
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误日志
    const { onError, componentName } = this.props;
    
    console.error(
      `[ErrorBoundary${componentName ? `:${componentName}` : ""}] Caught error:`,
      error,
      errorInfo
    );

    // 记录到远程日志服务（如 Sentry）
    this.logErrorToService(error, errorInfo);

    this.setState({ errorInfo });
    
    // 调用错误回调
    onError?.(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // TODO: 集成 Sentry 或其他错误追踪服务
    // 这里先记录到 localStorage 作为示例
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: typeof window !== "undefined" ? window.location.href : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      };
      
      const logs = JSON.parse(localStorage.getItem("errorLogs") || "[]");
      logs.push(errorLog);
      // 只保留最近 50 条
      if (logs.length > 50) logs.shift();
      localStorage.setItem("errorLogs", JSON.stringify(logs));
    } catch {
      // 忽略存储错误
    }
  }

  private handleRetry = (): void => {
    const { onRetry } = this.props;
    this.setState({ hasError: false, error: null, errorInfo: null });
    onRetry?.();
  };

  private handleGoHome = (): void => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails } = this.props;

    if (hasError) {
      // 如果提供了自定义 fallback，使用它
      if (fallback) {
        return fallback;
      }

      // 默认错误 UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              页面出现错误
            </h2>
            
            <p className="text-gray-500 mb-6">
              抱歉，页面遇到了一些问题。请尝试刷新页面或返回首页。
            </p>

            {/* 开发环境显示错误详情 */}
            {showDetails && error && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
                <p className="text-sm font-mono text-red-600 mb-2">
                  {error.message}
                </p>
                {errorInfo?.componentStack && (
                  <pre className="text-xs text-gray-500 overflow-auto max-h-32">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "transition-colors"
                )}
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
              
              <button
                onClick={this.handleGoHome}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  "transition-colors"
                )}
              >
                <Home className="w-4 h-4" />
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * 用于函数组件的错误边界 Hook
 * 注意：React 目前不支持 Hooks 版本的 Error Boundary
 * 这是一个包装器，提供更方便的使用方式
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
): React.FC<P> {
  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
