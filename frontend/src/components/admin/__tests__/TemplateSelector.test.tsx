import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelector } from '../TemplateSelector';

// 模拟localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock as any;

// 模拟模板数据
const mockTemplates = [
  {
    id: 'dashscope-voice',
    name: '阿里云语音对话',
    description: '基于阿里云的语音识别和合成',
    scene: 'voice-chat',
    configs: [
      {
        model_type: 'asr',
        model_name: 'qwen-asr-websocket',
        provider: 'dashscope',
        protocol: 'websocket',
        config: {},
        is_active: true,
      },
    ],
    createdAt: '2024-01-01',
    isSystem: true,
  },
  {
    id: 'user-template-1',
    name: '我的自定义模板',
    description: '自定义配置',
    scene: 'custom',
    configs: [
      {
        model_type: 'llm',
        model_name: 'gpt-3.5-turbo',
        provider: 'openai',
        protocol: 'openai_compatible',
        config: {},
        is_active: true,
      },
    ],
    createdAt: '2024-01-15',
    isSystem: false,
  },
];

describe('TemplateSelector', () => {
  const mockOnSelectTemplate = jest.fn();
  const mockOnSaveAsTemplate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('模板加载和显示', () => {
    it('应该渲染系统模板', () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      expect(screen.getByText('阿里云语音对话')).toBeInTheDocument();
      expect(screen.getByText('阿里云视频对话')).toBeInTheDocument();
      expect(screen.getByText('OpenAI语音对话')).toBeInTheDocument();
    });

    it('应该从localStorage加载用户模板', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTemplates.slice(1)));

      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      expect(screen.getByText('我的自定义模板')).toBeInTheDocument();
    });

    it('应该显示系统标签', () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const systemBadges = screen.getAllByText('系统');
      expect(systemBadges.length).toBeGreaterThan(0);
    });

    it('应该显示模型类型标签', () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      expect(screen.getByText('语音识别')).toBeInTheDocument();
      expect(screen.getByText('语音合成')).toBeInTheDocument();
    });
  });

  describe('模板选择功能', () => {
    it('点击模板应该选中并触发回调', async () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const templateCard = screen.getByText('阿里云语音对话').closest('div');
      expect(templateCard).not.toBeNull();

      await userEvent.click(screen.getByText('阿里云语音对话'));

      // 验证选中状态
      expect(templateCard?.classList.contains('border-blue-500')).toBe(true);
      expect(mockOnSelectTemplate).toHaveBeenCalledWith(expect.any(Object));
    });

    it('选择模板后应该显示预览', async () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      await userEvent.click(screen.getByText('阿里云语音对话'));

      expect(screen.getByText('模板预览')).toBeInTheDocument();
      expect(screen.getByText('qwen-asr-websocket')).toBeInTheDocument();
    });
  });

  describe('保存模板功能', () => {
    it('点击保存按钮应该打开对话框', async () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
          currentConfigs={[
            {
              model_type: 'llm',
              model_name: 'gpt-4',
              provider: 'openai',
              protocol: 'openai_compatible',
            },
          ]}
        />
      );

      const saveButton = screen.getByText('保存为模板');
      await userEvent.click(saveButton);

      expect(screen.getByText('保存配置模板')).toBeInTheDocument();
      expect(screen.getByLabelText('模板名称')).toBeInTheDocument();
      expect(screen.getByLabelText('描述')).toBeInTheDocument();
    });

    it('保存按钮应该在currentConfigs为空时禁用', () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const saveButton = screen.getByText('保存为模板');
      expect(saveButton).toBeDisabled();
    });

    it('应该可以输入模板名称和描述并保存', async () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
          currentConfigs={[
            {
              model_type: 'llm',
              model_name: 'gpt-4',
              provider: 'openai',
              protocol: 'openai_compatible',
            },
          ]}
        />
      );

      await userEvent.click(screen.getByText('保存为模板'));

      const nameInput = screen.getByLabelText('模板名称');
      const descriptionInput = screen.getByLabelText('描述');
      const saveConfirmButton = screen.getByText('保存');

      await userEvent.type(nameInput, '我的测试模板');
      await userEvent.type(descriptionInput, '这是一个测试模板');

      await userEvent.click(saveConfirmButton);

      // 验证本地存储被调用
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });

      // 验证模板列表更新
      expect(screen.getByText('我的测试模板')).toBeInTheDocument();
    });

    it('保存失败时应该不关闭对话框', async () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
          currentConfigs={[]}
        />
      );

      await userEvent.click(screen.getByText('保存为模板'));
      await userEvent.type(screen.getByLabelText('模板名称'), '空配置模板');
      await userEvent.click(screen.getByText('保存'));

      // 对话框应该仍然存在
      expect(screen.getByText('保存配置模板')).toBeInTheDocument();
    });
  });

  describe('删除模板功能', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTemplates.slice(1)));
    });

    it('非系统模板应该有删除按钮', () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const deleteButtons = screen.getAllByLabelText('删除模板');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('点击删除应该显示确认并删除模板', async () => {
      window.confirm = jest.fn(() => true);

      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const deleteButtons = screen.getAllByLabelText('删除模板');
      await userEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith('确定要删除模板"我的自定义模板"吗？');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('系统模板不应该有删除按钮', () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const systemTemplate = screen.getByText('阿里云语音对话').closest('div');
      const deleteButton = systemTemplate?.querySelector('[aria-label="删除模板"]');
      expect(deleteButton).toBeNull();
    });
  });

  describe('导出和导入功能', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTemplates.slice(1)));
    });

    it('点击导出按钮应该触发下载', async () => {
      const createObjectURL = jest.fn(() => 'blob:test-url');
      const revokeObjectURL = jest.fn();
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      const clickSpy = jest.fn();
      const linkMock = {
        href: '',
        download: '',
        click: clickSpy,
      } as any;

      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(linkMock);

      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const exportButtons = screen.getAllByLabelText('导出模板');
      await userEvent.click(exportButtons[0]);

      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');

      createElementSpy.mockRestore();
    });

    it('点击导入按钮应该触发文件选择', async () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'template-import';
      document.body.appendChild(fileInput);

      const clickSpy = jest.spyOn(fileInput, 'click');

      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const importButton = screen.getByText('导入模板');
      await userEvent.click(importButton);

      expect(clickSpy).toHaveBeenCalled();

      document.body.removeChild(fileInput);
      clickSpy.mockRestore();
    });

    it('应该处理导入的模板文件', async () => {
      const mockFile = new File(
        [JSON.stringify(mockTemplates[0])],
        'template.json',
        { type: 'application/json' }
      );

      const renderWithFile = () => {
        render(
          <TemplateSelector
            onSelectTemplate={mockOnSelectTemplate}
            onSaveAsTemplate={mockOnSaveAsTemplate}
          />
        );
      };

      renderWithFile();

      const fileInput = document.getElementById('template-import') as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      // 模拟文件选择
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);

      // 验证模板被导入
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理localStorage解析错误', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      // 不应该抛出错误
      expect(() => {
        render(
          <TemplateSelector
            onSelectTemplate={mockOnSelectTemplate}
            onSaveAsTemplate={mockOnSaveAsTemplate}
          />
        );
      }).not.toThrow();
    });

    it('应该处理导入文件解析错误', async () => {
      window.alert = jest.fn();

      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const fileInput = document.getElementById('template-import') as HTMLInputElement;
      const mockFile = new File(
        ['invalid json content'],
        'template.json',
        { type: 'application/json' }
      );

      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('导入失败：文件格式不正确');
      });
    });
  });

  describe('用户体验', () => {
    it('模板卡片应该有悬停效果', () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const templateCard = screen.getByText('阿里云语音对话').closest('div');
      expect(templateCard?.classList.contains('hover:shadow-md')).toBe(true);
    });

    it('按钮应该有禁用状态', () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      const saveButton = screen.getByText('保存为模板');
      expect(saveButton.classList.contains('disabled:opacity-50')).toBe(true);
    });

    it('应该显示创建时间', () => {
      render(
        <TemplateSelector
          onSelectTemplate={mockOnSelectTemplate}
          onSaveAsTemplate={mockOnSaveAsTemplate}
        />
      );

      expect(screen.getByText(/创建：2024-01-01/)).toBeInTheDocument();
    });
  });
});