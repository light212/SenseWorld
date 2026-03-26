/**
 * 接口路径到中文名称的映射工具
 */

// 接口路径到中文名称的映射
export const API_NAME_MAP: Record<string, string> = {
  // 认证相关
  "/v1/auth/login": "用户登录",
  "/v1/auth/register": "用户注册",
  "/v1/auth/me": "获取当前用户",
  "/v1/auth/refresh": "刷新令牌",
  // 对话相关
  "/v1/conversations": "会话列表",
  "/v1/messages": "消息列表",
  "/v1/chat": "发送消息",
  "/v1/speech/synthesize": "语音合成",
  "/v1/audio/transcribe": "语音识别",
  // Admin - 模型配置
  "/v1/admin/models": "模型配置列表",
  "/v1/admin/models/types": "模型类型列表",
  // Admin - 用量
  "/v1/admin/usage/summary": "用量统计",
  "/v1/admin/usage/trend": "用量趋势",
  "/v1/admin/usage/by-model": "按模型用量",
  // Admin - 日志
  "/v1/admin/logs": "请求日志列表",
  "/v1/admin/logs/latency-stats": "延迟统计",
  // Admin - 设置
  "/v1/admin/settings": "系统设置列表",
  // Admin - 告警
  "/v1/admin/alerts": "告警列表",
  "/v1/admin/alerts/unread-count": "未读告警数",
  "/v1/admin/alerts/read-all": "全部已读",
  // Admin - 终端
  "/v1/admin/terminals": "终端列表",
  // Admin - 统计
  "/v1/admin/stats": "仪表盘统计",
};

export interface ApiInfo {
  name: string;
  path: string;
  method: string;
}

/**
 * 获取接口的中文名称
 * @param requestType 请求类型，格式: "GET /v1/admin/models" 或旧格式 "models"
 */
export function getApiName(requestType: string): ApiInfo {
  // requestType 格式: "GET /v1/admin/models" 或旧格式 "models"
  const parts = requestType.split(" ");
  let method = "GET";
  let path = requestType;
  
  if (parts.length === 2) {
    method = parts[0];
    path = parts[1];
  }
  
  // 移除路径参数（如 /v1/admin/models/xxx）
  const basePath = path.replace(/\/[a-f0-9-]{36}$/i, "").replace(/\/\d+$/, "");
  
  // 查找映射
  let name = API_NAME_MAP[basePath];
  
  // 如果没有精确匹配，尝试模糊匹配
  if (!name) {
    for (const [key, value] of Object.entries(API_NAME_MAP)) {
      if (basePath.startsWith(key) || basePath.includes(key)) {
        name = value;
        break;
      }
    }
  }
  
  // 如果还是没有，使用路径最后一部分
  if (!name) {
    const lastPart = basePath.split("/").filter(Boolean).pop() || "unknown";
    name = lastPart;
  }
  
  return { name, path, method };
}

/**
 * 获取 HTTP 方法的样式类名
 */
export function getMethodStyle(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-blue-100 text-blue-700";
    case "POST":
      return "bg-green-100 text-green-700";
    case "PUT":
      return "bg-amber-100 text-amber-700";
    case "PATCH":
      return "bg-orange-100 text-orange-700";
    case "DELETE":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
