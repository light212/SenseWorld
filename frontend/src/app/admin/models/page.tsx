"use client";

import { useEffect, useState } from "react";
import { Trash2, Edit, Check, Loader2, ToggleLeft, ToggleRight, Star, Settings, Zap } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ModelConfig {
  id: string;
  model_type: string;
  model_name: string;
  provider: string;
  protocol: string;
  config: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface TestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

const modelTypes = ["llm", "asr", "tts", "vd"];
const providers = ["dashscope", "openai", "other"];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/v1";

const protocols = [
  { id: "openai_compatible", label: "OpenAI 兼容", description: "标准 Chat Completions API" },
  { id: "dashscope_sdk", label: "DashScope SDK", description: "阿里云 SDK 调用" },
  { id: "websocket", label: "WebSocket", description: "实时流式连接" },
  { id: "custom_http", label: "自定义 HTTP", description: "其他 REST API" },
];

// 模型类型中文映射
const modelTypeLabels: Record<string, string> = {
  llm: "大语言模型",
  asr: "语音识别",
  tts: "语音合成",
  vd: "视频理解",
};

// 场景配置
const SCENE_CONFIGS = {
  "voice-chat": {
    name: "语音对话",
    description: "实时语音对话，包含语音识别和语音合成",
    models: [
      { model_type: "asr", model_name: "qwen-asr-websocket", provider: "dashscope", config: { protocol: "websocket", format: "pcm", sample_rate: 16000 } },
      { model_type: "tts", model_name: "qwen-tts-websocket", provider: "dashscope", config: { protocol: "websocket", voice: "Cherry", format: "wav" } },
    ],
  },
  "video-chat": {
    name: "视频对话",
    description: "视频理解+语音对话，适合视频通话场景",
    models: [
      { model_type: "vd", model_name: "qwen-vd-websocket", provider: "dashscope", config: { protocol: "websocket", resolution: "720p", fps: 30 } },
      { model_type: "asr", model_name: "qwen-asr-websocket", provider: "dashscope", config: { protocol: "websocket", format: "pcm", sample_rate: 16000 } },
      { model_type: "tts", model_name: "qwen-tts-websocket", provider: "dashscope", config: { protocol: "websocket", voice: "Cherry", format: "wav" } },
    ],
  },
};

// 根据调用方式返回配置字段
const getProtocolFields = (protocol: string) => {
  switch (protocol) {
    case "openai_compatible":
      return [
        { key: "base_url", label: "API Base URL", placeholder: "https://api.openai.com/v1" },
        { key: "api_key", label: "API Key", placeholder: "sk-..." },
        { key: "model", label: "模型名称", placeholder: "gpt-4" },
      ];
    case "dashscope_sdk":
      return [
        { key: "api_key", label: "API Key", placeholder: "DashScope API Key" },
        { key: "model", label: "模型名称", placeholder: "qwen-turbo" },
      ];
    case "websocket":
      return [
        { key: "ws_url", label: "WebSocket URL", placeholder: "wss://..." },
        { key: "api_key", label: "API Key", placeholder: "认证密钥" },
      ];
    case "custom_http":
      return [
        { key: "url", label: "API URL", placeholder: "https://..." },
        { key: "auth_type", label: "认证方式", placeholder: "bearer / api_key" },
      ];
    default:
      return [];
  }
};

export default function AdminModelsPage() {
  const toast = useToast();
  const { token } = useAuthStore();
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSceneDialog, setShowSceneDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [configJson, setConfigJson] = useState("{}");
  const [formData, setFormData] = useState({
    model_type: "llm",
    model_name: "",
    provider: "dashscope",
    protocol: "openai_compatible",
    config: {} as Record<string, any>,
  });

  // 批量操作状态
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(new Set());

  // 操作 loading 状态
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [batchOperating, setBatchOperating] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, [token]);

  const fetchConfigs = async () => {
    try {
      const data = await apiClient.request<ModelConfig[]>(
        `${API_BASE_URL}/admin/models`,
        {
          headers: { Authorization: `Bearer ${token}` },
          showLoading: true,
          showError: true,
          errorMessage: "加载模型配置失败",
        },
        toast
      );
      setConfigs(data);
    } catch (error) {
      console.error("Failed to fetch configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!isFormValid()) {
      toast?.warning("请填写模型名称并确保 JSON 格式正确");
      return;
    }
    setSaving(true);
    try {
      const config = JSON.parse(configJson);
      await apiClient.request<ModelConfig>(
        `${API_BASE_URL}/admin/models`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...formData, config }),
          showSuccess: true,
          successMessage: "模型配置创建成功",
          errorMessage: "创建模型配置失败",
        },
        toast
      );
      setShowCreate(false);
      resetForm();
      fetchConfigs();
    } catch (error) {
      console.error("Failed to create config:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSceneConfigs = async (sceneId: string) => {
    const scene = SCENE_CONFIGS[sceneId as keyof typeof SCENE_CONFIGS];
    if (!scene) return;

    try {
      const createPromises = scene.models.map((modelConfig) =>
        fetch(`${API_BASE_URL}/admin/models`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(modelConfig),
        })
      );

      const results = await Promise.all(createPromises);
      const successCount = results.filter((r) => r.ok).length;

      if (successCount === scene.models.length) {
        toast?.success(`成功创建 ${successCount} 个模型配置`);
        setShowSceneDialog(false);
        fetchConfigs();
      } else {
        toast?.error(`部分配置创建失败: ${successCount}/${scene.models.length} 成功`);
      }
    } catch (error) {
      console.error("Failed to create scene configs:", error);
      toast?.error("批量创建失败");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const config = JSON.parse(configJson);
      await apiClient.request<ModelConfig>(
        `${API_BASE_URL}/admin/models/${id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...formData, config }),
          showSuccess: true,
          successMessage: "模型配置更新成功",
          errorMessage: "更新模型配置失败",
        },
        toast
      );
      setEditingId(null);
      resetForm();
      fetchConfigs();
    } catch (error) {
      console.error("Failed to update config:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/models/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast?.success("配置删除成功");
        setDeleteConfirm(null);
        fetchConfigs();
      } else {
        toast?.error("删除失败");
      }
    } catch (error) {
      console.error("Failed to delete config:", error);
      toast?.error("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (config: ModelConfig) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/models/${config.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !config.is_active }),
      });

      if (response.ok) {
        toast?.success(config.is_active ? "已禁用" : "已启用");
        fetchConfigs();
      } else {
        toast?.error("操作失败");
      }
    } catch (error) {
      console.error("Failed to toggle active:", error);
      toast?.error("操作失败");
    }
  };

  const handleSetDefault = async (config: ModelConfig) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/models/${config.id}/set-default`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast?.success("已设为默认配置");
        fetchConfigs();
      } else {
        toast?.error("设置默认失败");
      }
    } catch (error) {
      console.error("Failed to set default:", error);
      toast?.error("设置默认失败");
    }
  };

  const handleTest = async (config: ModelConfig) => {
    setTestingId(config.id);
    setTestResults((prev) => ({ ...prev, [config.id]: { success: false, message: "测试中..." } }));

    try {
      const response = await fetch(`${API_BASE_URL}/admin/models/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model_type: config.model_type,
          provider: config.provider,
          model_name: config.model_name,
          config: config.config,
        }),
      });

      const result = await response.json();
      setTestResults((prev) => ({ ...prev, [config.id]: result }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [config.id]: { success: false, message: "测试失败" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const startEdit = (config: ModelConfig) => {
    setEditingId(config.id);
    setFormData({
      model_type: config.model_type,
      model_name: config.model_name,
      provider: config.provider,
      protocol: config.protocol || "openai_compatible",
      config: config.config,
    });
    setConfigJson(JSON.stringify(config.config, null, 2));
  };

  const resetForm = () => {
    setFormData({
      model_type: "llm",
      model_name: "",
      provider: "dashscope",
      protocol: "openai_compatible",
      config: {},
    });
    setConfigJson("{}");
  };

  // 同步动态配置字段到 JSON
  const updateConfigField = (key: string, value: string) => {
    const newConfig = { ...formData.config, [key]: value };
    setFormData({ ...formData, config: newConfig });
    setConfigJson(JSON.stringify(newConfig, null, 2));
  };

  // 批量操作
  const handleBatchToggleActive = async (active: boolean) => {
    if (selectedConfigs.size === 0) return;
    setBatchOperating(true);
    try {
      const promises = Array.from(selectedConfigs).map(id =>
        fetch(`${API_BASE_URL}/admin/models/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ is_active: active }),
        })
      );
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;
      if (successCount === selectedConfigs.size) {
        toast?.success(`成功${active ? '启用' : '禁用'} ${successCount} 个配置`);
        setSelectedConfigs(new Set());
        fetchConfigs();
      } else {
        toast?.error(`部分操作失败: ${successCount}/${selectedConfigs.size} 成功`);
      }
    } catch (error) {
      toast?.error("批量操作失败");
    } finally {
      setBatchOperating(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedConfigs.size === 0) return;
    setBatchOperating(true);
    try {
      const promises = Array.from(selectedConfigs).map(id =>
        fetch(`${API_BASE_URL}/admin/models/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;
      if (successCount === selectedConfigs.size) {
        toast?.success(`成功删除 ${successCount} 个配置`);
        setSelectedConfigs(new Set());
        fetchConfigs();
      } else {
        toast?.error(`部分删除失败: ${successCount}/${selectedConfigs.size} 成功`);
      }
    } catch (error) {
      toast?.error("批量删除失败");
    } finally {
      setBatchOperating(false);
    }
  };

  // JSON 验证
  const isJsonValid = () => {
    try {
      JSON.parse(configJson);
      return true;
    } catch {
      return false;
    }
  };

  // 表单验证
  const isFormValid = () => {
    return isJsonValid() && formData.model_name.trim().length > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">模型配置</h1>
          <p className="text-sm text-gray-500 mt-1">管理 AI 模型的 API 配置</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* 批量操作 */}
          {selectedConfigs.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchToggleActive(true)}
                disabled={batchOperating}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                批量启用 ({selectedConfigs.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchToggleActive(false)}
                disabled={batchOperating}
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                批量禁用 ({selectedConfigs.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchDelete}
                disabled={batchOperating}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                批量删除 ({selectedConfigs.size})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConfigs(new Set())}
              >
                取消选择
              </Button>
            </>
          )}
          <Button onClick={() => setShowSceneDialog(true)}>
            <Zap className="w-4 h-4" />
            快速创建
          </Button>
          <Button variant="outline" onClick={() => { setShowCreate(true); resetForm(); }}>
            <Settings className="w-4 h-4" />
            高级创建
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <Settings className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{configs.length}</div>
          <div className="text-sm text-gray-500 mt-1">总配置数</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <ToggleRight className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">{configs.filter((c) => c.is_active).length}</div>
          <div className="text-sm text-gray-500 mt-1">启用配置</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{configs.filter((c) => c.is_default).length}</div>
          <div className="text-sm text-gray-500 mt-1">默认配置</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
            <Check className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {Object.values(testResults).filter((r) => r.success).length}/{configs.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">连接正常</div>
        </div>
      </div>

      {/* 场景选择对话框 */}
      <Dialog open={showSceneDialog} onOpenChange={setShowSceneDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>选择配置场景</DialogTitle>
            <DialogDescription>根据您的使用场景选择预置配置，快速创建模型</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {Object.entries(SCENE_CONFIGS).map(([id, scene]) => (
              <button
                key={id}
                type="button"
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-muted/50 transition-colors"
                onClick={() => handleCreateSceneConfigs(id)}
              >
                <div className="font-medium">{scene.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{scene.description}</div>
                <div className="flex gap-2 mt-2">
                  {scene.models.map((model, idx) => (
                    <Badge key={idx} variant="secondary">
                      {modelTypeLabels[model.model_type]}
                    </Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 创建/编辑对话框 */}
      <Dialog open={showCreate || !!editingId} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditingId(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showCreate ? "新增模型配置" : "编辑模型配置"}</DialogTitle>
            <DialogDescription>配置模型参数和调用方式</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 模型类型 */}
              <div className="space-y-2">
                <Label>模型类型</Label>
                <Select
                  value={formData.model_type}
                  onValueChange={(v) => v && setFormData({ ...formData, model_type: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {modelTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 提供商 */}
              <div className="space-y-2">
                <Label>提供商</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(v) => v && setFormData({ ...formData, provider: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 模型名称 */}
            <div className="space-y-2">
              <Label>模型名称</Label>
              <Input
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                placeholder="qwen3-tts-instruct-flash"
              />
            </div>

            {/* 调用方式 */}
            <div className="space-y-2">
              <Label>调用方式</Label>
              <div className="grid grid-cols-2 gap-2">
                {protocols.map((p) => (
                  <Button
                    key={p.id}
                    variant={formData.protocol === p.id ? "default" : "outline"}
                    className="h-auto py-3 justify-start"
                    onClick={() => setFormData({ ...formData, protocol: p.id })}
                  >
                    <div className="text-left">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs opacity-70">{p.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* 动态配置字段 */}
            <div className="space-y-2">
              <Label>配置参数</Label>
              <div className="grid grid-cols-2 gap-3">
                {getProtocolFields(formData.protocol).map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      placeholder={field.placeholder}
                      value={formData.config?.[field.key] || ""}
                      onChange={(e) => updateConfigField(field.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 高级配置 (JSON) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>高级配置 (JSON)</Label>
                <span className={cn("text-xs", isJsonValid() ? "text-green-600" : "text-red-600")}>
                  {isJsonValid() ? "✓ 有效JSON" : "✗ 无效JSON"}
                </span>
              </div>
              <Textarea
                value={configJson}
                onChange={(e) => {
                  setConfigJson(e.target.value);
                  // 尝试解析并同步到 formData
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setFormData(prev => ({ ...prev, config: parsed }));
                  } catch {
                    // 解析失败时不更新 formData
                  }
                }}
                rows={6}
                className={cn("font-mono text-sm", !isJsonValid() && "border-red-500")}
                placeholder='{"key": "value"}'
              />
              {!isJsonValid() && (
                <p className="text-xs text-red-600">JSON格式不正确，请检查语法</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); resetForm(); }}>
              取消
            </Button>
            <Button onClick={() => (showCreate ? handleCreate() : handleUpdate(editingId!))} disabled={!isFormValid() || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              <Check className="w-4 h-4" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 表格 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedConfigs.size === configs.length && configs.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedConfigs(new Set(configs.map((c) => c.id)));
                    } else {
                      setSelectedConfigs(new Set());
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </TableHead>
              <TableHead>类型</TableHead>
              <TableHead>模型名称</TableHead>
              <TableHead>提供商</TableHead>
              <TableHead>调用方式</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>默认</TableHead>
              <TableHead>测试</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  暂无配置，点击"快速创建"或"高级创建"添加
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedConfigs.has(config.id)}
                      onChange={() => {
                        const newSelection = new Set(selectedConfigs);
                        if (newSelection.has(config.id)) {
                          newSelection.delete(config.id);
                        } else {
                          newSelection.add(config.id);
                        }
                        setSelectedConfigs(newSelection);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        config.model_type === "llm"
                          ? "default"
                          : config.model_type === "asr"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {modelTypeLabels[config.model_type] || config.model_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{config.model_name}</TableCell>
                  <TableCell className="text-muted-foreground">{config.provider}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {protocols.find((p) => p.id === config.protocol)?.label || config.protocol}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(config)}
                      className={cn(config.is_active ? "text-green-600" : "text-muted-foreground")}
                    >
                      {config.is_active ? (
                        <>
                          <ToggleRight className="w-4 h-4 mr-1" />
                          启用
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 mr-1" />
                          禁用
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(config)}
                      className={cn(config.is_default ? "text-yellow-600" : "text-muted-foreground")}
                    >
                      <Star className={cn("w-4 h-4", config.is_default && "fill-yellow-500")} />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest(config)}
                      disabled={testingId === config.id}
                      className="text-blue-600"
                    >
                      {testingId === config.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : testResults[config.id]?.success ? (
                        <span className="text-green-600 text-xs">✓ {testResults[config.id].latency_ms}ms</span>
                      ) : testResults[config.id] ? (
                        <span className="text-red-600 text-xs">{testResults[config.id].message}</span>
                      ) : (
                        "测试"
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(config)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(config.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>确定要删除这个模型配置吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button variant="destructive" onClick={() => { if (deleteConfirm) handleDelete(deleteConfirm); }} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}