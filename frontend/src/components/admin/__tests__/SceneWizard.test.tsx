import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneWizard, SceneDetail } from '../SceneWizard';

describe('SceneWizard', () => {
  const mockOnSelectScene = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('场景选择界面', () => {
    it('应该渲染场景选择器', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      expect(screen.getByText('选择配置场景')).toBeInTheDocument();
      expect(screen.getByText('根据您的使用场景选择预置配置，快速创建模型')).toBeInTheDocument();
    });

    it('应该显示所有场景选项', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      expect(screen.getByText('语音对话')).toBeInTheDocument();
      expect(screen.getByText('视频对话')).toBeInTheDocument();
      expect(screen.getByText('自定义配置')).toBeInTheDocument();
    });

    it('场景选项应该显示描述信息', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      expect(screen.getByText('实时语音对话，包含语音识别和语音合成')).toBeInTheDocument();
      expect(screen.getByText('实时视频对话，包含视频理解和语音处理')).toBeInTheDocument();
      expect(screen.getByText('手动配置模型参数，适合高级用户')).toBeInTheDocument();
    });

    it('场景选项应该显示模型数量', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      expect(screen.getByText('2个模型')).toBeInTheDocument();
      expect(screen.getByText('3个模型')).toBeInTheDocument();
      expect(screen.getByText('1个模型')).toBeInTheDocument();
    });

    it('场景图标应该正确显示', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const icons = screen.getAllByText(/[🎤📹⚙️]/);
      expect(icons.length).toBe(3);
    });
  });

  describe('场景选择交互', () => {
    it('点击场景选项应该选中', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const voiceChatOption = screen.getByText('语音对话').closest('div');
      fireEvent.click(voiceChatOption!);

      expect(voiceChatOption?.classList.contains('border-blue-500')).toBe(true);
    });

    it('点击场景应该高亮显示', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const videoChatOption = screen.getByText('视频对话').closest('div');
      fireEvent.click(videoChatOption!);

      expect(videoChatOption?.classList.contains('bg-blue-50')).toBe(true);
    });

    it('选择场景后下一步按钮应该启用', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const nextButton = screen.getByText('下一步');
      expect(nextButton).toBeDisabled();

      const voiceChatOption = screen.getByText('语音对话').closest('div');
      fireEvent.click(voiceChatOption!);

      expect(nextButton).not.toBeDisabled();
    });

    it('点击取消按钮应该调用onCancel', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('点击下一步应该调用onSelectScene并传入sceneId', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const voiceChatOption = screen.getByText('语音对话').closest('div');
      fireEvent.click(voiceChatOption!);

      const nextButton = screen.getByText('下一步');
      fireEvent.click(nextButton);

      expect(mockOnSelectScene).toHaveBeenCalledWith('voice-chat');
    });

    it('未选择场景时下一步按钮应该禁用', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const nextButton = screen.getByText('下一步');
      expect(nextButton).toBeDisabled();

      fireEvent.click(nextButton);

      expect(mockOnSelectScene).not.toHaveBeenCalled();
    });
  });

  describe('场景详情界面', () => {
    const mockOnConfirm = jest.fn();
    const mockOnBack = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('语音对话场景应该显示正确配置', () => {
      render(
        <SceneDetail
          sceneId="voice-chat"
          onConfirm={mockOnConfirm}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('语音对话')).toBeInTheDocument();
      expect(screen.getByText('qwen-asr')).toBeInTheDocument();
      expect(screen.getByText('qwen-tts')).toBeInTheDocument();
    });

    it('视频对话场景应该显示正确配置', () => {
      render(
        <SceneDetail
          sceneId="video-chat"
          onConfirm={mockOnConfirm}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('视频对话')).toBeInTheDocument();
      expect(screen.getByText('qwen-vd')).toBeInTheDocument();
      expect(screen.getByText('qwen-asr')).toBeInTheDocument();
      expect(screen.getByText('qwen-tts')).toBeInTheDocument();
    });

    it('每个配置应该显示模型类型', () => {
      render(
        <SceneDetail
          sceneId="voice-chat"
          onConfirm={mockOnConfirm}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText(/ASR - dashscope/)).toBeInTheDocument();
      expect(screen.getByText(/TTS - dashscope/)).toBeInTheDocument();
    });

    it('配置应该显示JSON格式', () => {
      render(
        <SceneDetail
          sceneId="voice-chat"
          onConfirm={mockOnConfirm}
          onBack={mockOnBack}
        />
      );

      const jsonPre = screen.getAllByText(/format/);
      expect(jsonPre.length).toBeGreaterThan(0);
    });
  });

  describe('场景详情交互', () => {
    const mockOnConfirm = jest.fn();
    const mockOnBack = jest.fn();

    it('点击上一步应该调用onBack', () => {
      render(
        <SceneDetail
          sceneId="voice-chat"
          onConfirm={mockOnConfirm}
          onBack={mockOnBack}
        />
      );

      const backButton = screen.getByText('上一步');
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('点击确认创建应该调用onConfirm并传入configs', () => {
      render(
        <SceneDetail
          sceneId="voice-chat"
          onConfirm={mockOnConfirm}
          onBack={mockOnBack}
        />
      );

      const confirmButton = screen.getByText('确认创建');
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          model_type: 'asr',
          model_name: 'qwen-asr',
          provider: 'dashscope',
        }),
        expect.objectContaining({
          model_type: 'tts',
          model_name: 'qwen-tts',
          provider: 'dashscope',
        }),
      ]));
    });

    it('确认创建应该传递正确的配置结构', () => {
      render(
        <SceneDetail
          sceneId="video-chat"
          onConfirm={mockOnConfirm}
          onBack={mockOnBack}
        />
      );

      const confirmButton = screen.getByText('确认创建');
      fireEvent.click(confirmButton);

      const configs = mockOnConfirm.mock.calls[0][0];
      expect(configs).toHaveLength(3);
      expect(configs[0]).toHaveProperty('protocol', 'websocket');
      expect(configs[0]).toHaveProperty('config', expect.any(Object));
    });
  });

  describe('组件结构', () => {
    it('应该使用正确的布局类', () => {
      const { container } = render(
        <SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />
      );

      // 检查主要容器
      const mainContainer = container.querySelector('div[class*="bg-black/50"]');
      expect(mainContainer).not.toBeNull();
    });

    it('应该使用正确的按钮样式', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByText('取消');
      expect(cancelButton.classList.contains('border-gray-200')).toBe(true);

      const nextButton = screen.getByText('下一步');
      expect(nextButton.classList.contains('bg-blue-500')).toBe(true);
    });

    it('场景卡片应该有悬停效果', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const voiceChatOption = screen.getByText('语音对话').closest('div');
      expect(voiceChatOption?.classList.contains('hover:shadow-md')).toBe(true);
    });
  });

  describe('辅助功能', () => {
    it('按钮应该可访问', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByText('取消');
      expect(cancelButton.tagName).toBe('BUTTON');

      const nextButton = screen.getByText('下一步');
      expect(nextButton.tagName).toBe('BUTTON');
    });

    it('场景选项应该可点击', () => {
      render(<SceneWizard onSelectScene={mockOnSelectScene} onCancel={mockOnCancel} />);

      const voiceChatOption = screen.getByText('语音对话').closest('div');
      expect(voiceChatOption?.getAttribute('role')).toBe('button');
    });
  });
});

describe('SceneWizard - 自定义场景', () => {
  it('自定义场景应该有设置图标', () => {
    const { container } = render(
      <SceneWizard onSelectScene={jest.fn()} onCancel={jest.fn()} />
    );

    const gearIcons = container.querySelectorAll('div[class*="⚙️"]');
    expect(gearIcons.length).toBeGreaterThan(0);
  });

  it('自定义场景描述应该正确', () => {
    render(
      <SceneWizard onSelectScene={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByText('手动配置模型参数，适合高级用户')).toBeInTheDocument();
  });
});