# SenseWorld 后台管理 UX 改进方案

**项目**: SenseWorld Admin Dashboard
**日期**: 2026-03-26
**问题**: 模型配置页面 UX 不友好，用户看不懂

---

## 一、问题诊断

### 1.1 核心问题

| 问题 | 当前状态 | 用户困惑 |
|------|----------|----------|
| **英文缩写** | LLM/ASR/TTS | "这是什么意思？" |
| **技术术语** | Provider、Config JSON | "我不知道怎么填" |
| **缺少引导** | 直接展示表单 | "我该填什么？" |
| **选项冗余** | 新增时就要选择"启用" | "这是干嘛的？" |

### 1.2 用户心智模型

**运维人员的真实需求**：
- "我想换个对话模型" → 不知道 LLM 是什么
- "我想配置语音" → 不知道 TTS 是什么
- "我要填 API Key" → 不知道 JSON 怎么写

---

## 二、改进原则

### 2.1 语言原则

| ❌ 不要用 | ✅ 要用 |
|----------|--------|
| LLM | 对话模型 |
| ASR | 语音识别 |
| TTS | 语音合成 |
| VD | 视频理解 |
| Provider | 服务商 |
| Config | 配置参数 |
| Model Name | 模型名称 |

### 2.2 简化原则

1. **分步引导**：不要一次展示所有选项
2. **智能默认**：新增配置默认启用，无需选择
3. **表单拆分**：按模型类型拆分表单，不混在一起
4. **可视化输入**：不用 JSON，用表单字段

---

## 三、页面重新设计

### 3.1 模型配置首页（改进后）

```
┌─────────────────────────────────────────────────────────────┐
│  模型配置                                                    │
│  配置 AI 对话、语音识别、语音合成等模型                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │   💬 对话模型 (LLM)                              2 个 │ │
│  │   让 AI 理解用户输入并生成回复                         │ │
│  │   [管理]                                              │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │   🎤 语音识别 (ASR)                               1 个 │ │
│  │   把用户的语音转换成文字                               │ │
│  │   [管理]                                              │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │   🔊 语音合成 (TTS)                               1 个 │ │
│  │   把 AI 的回复转成语音播放                             │ │
│  │   [管理]                                              │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │   📹 视频理解 (VD)                               0 个 │ │
│  │   让 AI 理解用户发送的视频内容                         │ │
│  │   [管理]                                              │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**改进点**：
1. 用中文 + 图标，一目了然
2. 每个类型有简短说明
3. 显示当前配置数量
4. 点击"管理"进入该类型的配置列表

### 3.2 对话模型管理页（改进后）

```
┌─────────────────────────────────────────────────────────────┐
│  ← 返回        对话模型配置                                  │
│                                                             │
│  让 AI 理解用户输入并生成回复                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  当前使用: 通义千问 (qwen-turbo)                            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ⭐ 默认                                                │ │
│  │ 通义千问 - qwen-turbo                                  │ │
│  │ 阿里云 DashScope                            ✅ 已启用  │ │
│  │ 上次测试: 通过 (延迟 230ms)                            │ │
│  │                          [测试] [编辑] [取消默认]      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │ GPT-4                                                  │ │
│  │ OpenAI                                     ⚪ 已禁用  │ │
│  │ 上次测试: 通过 (延迟 1.2s)                             │ │
│  │                     [测试] [编辑] [启用] [设为默认]    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [+ 添加新模型]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**改进点**：
1. 顶部显示当前使用的模型
2. 卡片式展示，信息清晰
3. 操作按钮明确：测试、编辑、启用/禁用、设为默认
4. 显示测试状态和延迟

### 3.3 添加对话模型（分步表单）

**第一步：选择服务商**

```
┌─────────────────────────────────────────────┐
│  添加对话模型                               │
│  步骤 1/2: 选择服务商                       │
├─────────────────────────────────────────────┤
│                                             │
│  选择 AI 服务的提供商：                     │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🇨🇳 阿里云通义千问                  │   │
│  │ 国内服务，速度快，中文效果好        │   │
│  │ 推荐                                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🇺🇸 OpenAI                          │   │
│  │ 国际服务，效果优秀，需科学上网      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🇨🇳 百度文心一言                    │   │
│  │ 国内服务，中文能力强                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 其他服务商                          │   │
│  │ 自定义配置                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**第二步：填写配置**

```
┌─────────────────────────────────────────────┐
│  添加对话模型                               │
│  步骤 2/2: 填写配置                         │
│  已选: 阿里云通义千问                       │
├─────────────────────────────────────────────┤
│                                             │
│  选择模型                                   │
│  ┌─────────────────────────────────────┐   │
│  │ qwen-turbo                      ▼   │   │
│  │ 快速响应，适合日常对话               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  API Key *                                  │
│  ┌─────────────────────────────────────┐   │
│  │ sk-xxxxxxxxxxxxxxxx           👁️   │   │
│  └─────────────────────────────────────┘   │
│  💡 在阿里云控制台获取 API Key             │
│                                             │
│  ────────── 高级选项 (可选) ──────────      │
│                                             │
│  温度 (Temperature)                         │
│  ├───────●─────────────────────┤ 0.7       │
│  较低 = 更稳定，较高 = 更有创意             │
│                                             │
│  最大回复长度                               │
│  ├───────────────────●───────┤ 2048        │
│  单次回复的最大 token 数                    │
│                                             │
│  ────────────────────────────────────────  │
│                                             │
│        [上一步]        [测试并保存]        │
│                                             │
└─────────────────────────────────────────────┘
```

**改进点**：
1. **分步引导**：先选服务商，再填配置
2. **中文说明**：每个选项都有解释
3. **表单字段**：不用 JSON，用可视化输入
4. **智能默认**：高级选项折叠，不干扰
5. **即时反馈**：测试并保存，一步到位

---

## 四、术语对照表

### 4.1 模型类型

| 英文缩写 | 中文名称 | 说明 | 图标 |
|----------|----------|------|------|
| LLM | 对话模型 | 让 AI 理解用户输入并生成回复 | 💬 |
| ASR | 语音识别 | 把用户的语音转换成文字 | 🎤 |
| TTS | 语音合成 | 把 AI 的回复转成语音播放 | 🔊 |
| VD | 视频理解 | 让 AI 理解用户发送的视频内容 | 📹 |

### 4.2 服务商

| Provider ID | 显示名称 | 说明 |
|-------------|----------|------|
| dashscope | 阿里云通义千问 | 国内服务，速度快，中文效果好 |
| openai | OpenAI | 国际服务，效果优秀 |
| baidu | 百度文心一言 | 国内服务，中文能力强 |
| zhipu | 智谱 AI | 国内服务，GLM 系列模型 |
| other | 其他 | 自定义配置 |

### 4.3 配置参数

| 参数名 | 中文名称 | 说明 |
|--------|----------|------|
| api_key | API 密钥 | 在服务商控制台获取 |
| temperature | 温度 | 控制回复的随机性，0-1 |
| max_tokens | 最大回复长度 | 单次回复的最大 token 数 |
| top_p | 采样范围 | 控制回复的多样性 |
| voice | 音色 | 语音合成的音色选择 |
| speed | 语速 | 语音播放的速度 |

---

## 五、组件改进代码

### 5.1 模型类型卡片组件

```tsx
// components/admin/ModelTypeCard.tsx
interface ModelTypeCardProps {
  type: 'llm' | 'asr' | 'tts' | 'vd';
  count: number;
  onManage: () => void;
}

const modelTypeConfig = {
  llm: {
    icon: '💬',
    name: '对话模型',
    description: '让 AI 理解用户输入并生成回复',
  },
  asr: {
    icon: '🎤',
    name: '语音识别',
    description: '把用户的语音转换成文字',
  },
  tts: {
    icon: '🔊',
    name: '语音合成',
    description: '把 AI 的回复转成语音播放',
  },
  vd: {
    icon: '📹',
    name: '视频理解',
    description: '让 AI 理解用户发送的视频内容',
  },
};

export function ModelTypeCard({ type, count, onManage }: ModelTypeCardProps) {
  const config = modelTypeConfig[type];
  
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h3 className="font-medium text-gray-900">{config.name}</h3>
            <p className="text-sm text-gray-500">{count} 个配置</p>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">{config.description}</p>
      <button
        onClick={onManage}
        className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        管理
      </button>
    </div>
  );
}
```

### 5.2 服务商选择组件

```tsx
// components/admin/ProviderSelect.tsx
interface Provider {
  id: string;
  name: string;
  icon: string;
  description: string;
  recommended?: boolean;
}

const providers: Provider[] = [
  {
    id: 'dashscope',
    name: '阿里云通义千问',
    icon: '🇨🇳',
    description: '国内服务，速度快，中文效果好',
    recommended: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🇺🇸',
    description: '国际服务，效果优秀，需科学上网',
  },
  {
    id: 'baidu',
    name: '百度文心一言',
    icon: '🇨🇳',
    description: '国内服务，中文能力强',
  },
];

export function ProviderSelect({ value, onChange }: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-2">选择 AI 服务的提供商：</p>
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => onChange(provider.id)}
          className={cn(
            "w-full p-4 text-left border rounded-xl transition-all",
            value === provider.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{provider.icon}</span>
              <div>
                <div className="font-medium text-gray-900">{provider.name}</div>
                <div className="text-sm text-gray-500">{provider.description}</div>
              </div>
            </div>
            {provider.recommended && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                推荐
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
```

### 5.3 分步表单组件

```tsx
// components/admin/AddModelWizard.tsx
import { useState } from "react";

export function AddModelWizard({ type, onClose, onSuccess }: {
  type: 'llm' | 'asr' | 'tts' | 'vd';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState('');
  const [formData, setFormData] = useState({
    model: '',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
  });
  const [testing, setTesting] = useState(false);

  const handleTestAndSave = async () => {
    setTesting(true);
    try {
      // 测试连接
      // 保存配置
      onSuccess();
    } catch (error) {
      alert('配置失败，请检查 API Key');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">添加{getModelTypeName(type)}</h2>
          <p className="text-sm text-gray-500">
            步骤 {step}/2: {step === 1 ? '选择服务商' : '填写配置'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <ProviderSelect value={provider} onChange={setProvider} />
          ) : (
            <ModelConfigForm
              provider={provider}
              type={type}
              data={formData}
              onChange={setFormData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-gray-600">
                取消
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!provider}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
              >
                下一步
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600">
                上一步
              </button>
              <button
                onClick={handleTestAndSave}
                disabled={testing || !formData.apiKey}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    测试中...
                  </>
                ) : (
                  '测试并保存'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getModelTypeName(type: string): string {
  const names: Record<string, string> = {
    llm: '对话模型',
    asr: '语音识别',
    tts: '语音合成',
    vd: '视频理解',
  };
  return names[type] || type;
}
```

---

## 六、改进实施计划

### 阶段一：术语中文化（1 天）

- [ ] 修改页面标题和说明文字
- [ ] 添加模型类型中文名称和说明
- [ ] 更新表格列标题

### 阶段二：分步表单（2 天）

- [ ] 实现服务商选择组件
- [ ] 实现配置表单组件（不用 JSON）
- [ ] 实现分步向导流程

### 阶段三：体验优化（1 天）

- [ ] 添加测试按钮和反馈
- [ ] 优化空状态提示
- [ ] 添加帮助链接

---

## 七、验收标准

| 验收标准 | 改进方案 | 能否达成 |
|----------|----------|----------|
| 普通用户能看懂 | 中文 + 图标 + 说明 | ✅ |
| 用户知道怎么填 | 分步引导 + 智能默认 | ✅ |
| 用户能快速配置 | 测试并保存一步到位 | ✅ |
| 减少认知负担 | 高级选项折叠，不干扰 | ✅ |

---

**改进方案完成，可提交开发实现。**