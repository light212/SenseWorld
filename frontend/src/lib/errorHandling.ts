/**
 * 前端日志与错误处理工具
 * 
 * 提供:
 * - 统一的日志记录接口
 * - 错误分类与处理
 * - 远程日志上报（可选）
 * - 性能监控埋点
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  url?: string;
  sessionId?: string;
}

interface ErrorReport {
  message: string;
  stack?: string;
  type: string;
  url: string;
  timestamp: string;
  userAgent: string;
  sessionId: string;
  context?: Record<string, unknown>;
}

// 会话 ID（用于追踪同一用户的操作）
let sessionId: string | null = null;

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  
  if (!sessionId) {
    sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("sessionId", sessionId);
    }
  }
  return sessionId;
}

// 日志级别开关
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 生产环境只输出 warn 和 error
const MIN_LOG_LEVEL = process.env.NODE_ENV === "production" ? "warn" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

/**
 * 统一日志接口
 */
export const logger = {
  debug(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, data || "");
    }
  },

  info(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("info")) {
      console.info(`[INFO] ${message}`, data || "");
    }
  },

  warn(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, data || "");
    }
  },

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    if (shouldLog("error")) {
      console.error(`[ERROR] ${message}`, error, data || "");
    }
    
    // 自动上报错误
    if (error instanceof Error) {
      reportError(error, { ...data, message });
    }
  },
};

/**
 * API 错误类型
 */
export class ApiError extends Error {
  code: string;
  status: number;
  traceId?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    status: number = 500,
    traceId?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.traceId = traceId;
    this.details = details;
  }

  static fromResponse(response: unknown): ApiError {
    if (typeof response === "object" && response !== null && "error" in response) {
      const err = (response as { error: { code?: string; message?: string; trace_id?: string; details?: Record<string, unknown> } }).error;
      return new ApiError(
        err.message || "请求失败",
        err.code || "UNKNOWN_ERROR",
        500,
        err.trace_id,
        err.details
      );
    }
    return new ApiError("请求失败");
  }
}

/**
 * 错误分类
 */
export const ErrorTypes = {
  NETWORK: "NETWORK_ERROR",
  AUTH: "AUTH_ERROR",
  VALIDATION: "VALIDATION_ERROR",
  SERVER: "SERVER_ERROR",
  CLIENT: "CLIENT_ERROR",
  UNKNOWN: "UNKNOWN_ERROR",
} as const;

/**
 * 判断错误类型
 */
export function classifyError(error: unknown): keyof typeof ErrorTypes {
  if (error instanceof ApiError) {
    if (error.code.startsWith("AUTH_")) return "AUTH";
    if (error.code.startsWith("VAL_")) return "VALIDATION";
    if (error.code.startsWith("SYS_")) return "SERVER";
  }
  
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "NETWORK";
  }
  
  if (error instanceof Error) {
    if (error.message.includes("network") || error.message.includes("Network")) {
      return "NETWORK";
    }
    if (error.message.includes("401") || error.message.includes("unauthorized")) {
      return "AUTH";
    }
  }
  
  return "UNKNOWN";
}

/**
 * 获取用户友好的错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    const type = classifyError(error);
    
    switch (type) {
      case "NETWORK":
        return "网络连接失败，请检查网络后重试";
      case "AUTH":
        return "登录已过期，请重新登录";
      case "VALIDATION":
        return error.message || "输入内容有误，请检查后重试";
      case "SERVER":
        return "服务器繁忙，请稍后重试";
      default:
        return error.message || "操作失败，请重试";
    }
  }
  
  return "发生未知错误，请重试";
}

/**
 * 上报错误到远程服务
 */
export function reportError(
  error: Error,
  context?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    type: error.name,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    sessionId: getSessionId(),
    context,
  };
  
  // 存储到本地（作为备份）
  try {
    const reports = JSON.parse(localStorage.getItem("errorReports") || "[]");
    reports.push(report);
    if (reports.length > 100) reports.shift();
    localStorage.setItem("errorReports", JSON.stringify(reports));
  } catch {
    // 忽略存储错误
  }
  
  // TODO: 发送到远程日志服务
  // fetch("/api/log/error", {
  //   method: "POST",
  //   body: JSON.stringify(report),
  // }).catch(() => {});
  
  logger.debug("Error reported", report);
}

/**
 * 性能监控 - 记录操作耗时
 */
export function measurePerformance<T>(
  name: string,
  operation: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  const logDuration = () => {
    const duration = performance.now() - start;
    logger.debug(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  };
  
  try {
    const result = operation();
    
    if (result instanceof Promise) {
      return result.finally(logDuration);
    }
    
    logDuration();
    return result;
  } catch (error) {
    logDuration();
    throw error;
  }
}

/**
 * 全局未捕获错误处理设置
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;
  
  // 捕获未处理的 Promise 拒绝
  window.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled Promise rejection", event.reason);
    reportError(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
      { type: "unhandledrejection" }
    );
  });
  
  // 捕获全局错误
  window.addEventListener("error", (event) => {
    if (event.error) {
      logger.error("Global error", event.error);
      reportError(event.error, { type: "global" });
    }
  });
  
  logger.info("Global error handlers initialized");
}

export default {
  logger,
  ApiError,
  ErrorTypes,
  classifyError,
  getErrorMessage,
  reportError,
  measurePerformance,
  setupGlobalErrorHandlers,
};
