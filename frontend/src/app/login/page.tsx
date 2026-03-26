"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic, Video, Zap, Eye, EyeOff, Mail, Lock, ArrowRight, User } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegisterParam = searchParams.get("register") === "true";
  
  const { setToken, setUserId } = useAuthStore();
  
  const [mode, setMode] = useState<"login" | "register">(isRegisterParam ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 同步 URL 参数
  useEffect(() => {
    if (searchParams.get("register") === "true") {
      setMode("register");
    }
  }, [searchParams]);

  // 错误消息翻译
  const translateError = (msg: string): string => {
    const errorMap: Record<string, string> = {
      "String should have at least 8 characters": "密码至少需要8位",
      "value is not a valid email address": "邮箱格式不正确",
      "Field required": "此字段必填",
      "该邮箱已被注册": "该邮箱已被注册",
      "邮箱或密码错误": "邮箱或密码错误",
      "账号已被禁用": "账号已被禁用",
    };
    return errorMap[msg] || msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/v1/auth/login" : "/v1/auth/register";
      const body = mode === "login"
        ? { email, password }
        : { email, password, display_name: displayName || email.split("@")[0] };

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.detail)) {
          const msg = data.detail[0]?.msg || "请求失败";
          throw new Error(translateError(msg));
        }
        throw new Error(translateError(data.detail) || "请求失败");
      }

      setToken(data.access_token);
      setUserId(data.user.id);
      router.push("/chat");
    } catch (err: any) {
      setError(err.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* 左侧：品牌展示（仅桌面端） */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-xl">SenseWorld</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            语音+视频
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              多模态 AI 对话
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            像与真人对话一样自然
          </p>
        </div>

        <div className="space-y-4">
          <FeatureItem icon={<Mic className="w-5 h-5" />} text="开口即聊，无需打字" />
          <FeatureItem icon={<Video className="w-5 h-5" />} text="拍视频让 AI 理解画面" />
          <FeatureItem icon={<Zap className="w-5 h-5" />} text="实时语音响应，边生成边听" />
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-gray-400 text-sm italic">
            "像打电话一样，和 AI 自然交流"
          </p>
        </div>
      </div>

      {/* 右侧：表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* 移动端品牌 */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg">SenseWorld</span>
            </div>
            <p className="text-gray-500 text-sm">语音+视频 AI 对话</p>
          </div>

          {/* 标题 */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h2>
          <p className="text-gray-500 mb-8">
            {mode === "login" 
              ? "登录后开始与 AI 对话" 
              : "注册后体验语音+视频 AI 对话"}
          </p>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  昵称
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="你的昵称（可选）"
                    className="w-full py-3 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                邮箱
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full py-3 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                密码
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="至少 8 位"
                  className="w-full py-3 pl-11 pr-11 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* 切换模式 */}
          <p className="text-center text-gray-500 mt-8">
            {mode === "login" ? "没有账号？" : "已有账号？"}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-blue-600 hover:underline ml-1 font-medium"
            >
              {mode === "login" ? "立即注册" : "立即登录"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-400">
        {icon}
      </div>
      <span className="text-gray-300">{text}</span>
    </div>
  );
}