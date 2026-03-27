import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigValidator } from '../ConfigValidator';

describe('ConfigValidator', () => {
  const mockOnValidationChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基础验证功能', () => {
    it('应该渲染验证器组件', () => {
      render(
        <ConfigValidator
          config={{}}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );
      expect(screen.getByText('验证状态：')).toBeInTheDocument();
    });

    it('websocket协议 - 空配置应该显示错误', () => {
      render(
        <ConfigValidator
          config={{}}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('WebSocket URL不能为空')).toBeInTheDocument();
      expect(screen.getByText('API Key不能为空')).toBeInTheDocument();
      expect(screen.getByText('验证状态：失败')).toBeInTheDocument();
    });

    it('websocket协议 - 有效配置应该通过验证', () => {
      render(
        <ConfigValidator
          config={{
            ws_url: 'ws://example.com',
            api_key: 'valid-api-key-long-enough',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('配置格式正确')).toBeInTheDocument();
      expect(screen.getByText('验证状态：通过')).toBeInTheDocument();
    });

    it('openai_compatible协议 - 空配置应该显示错误', () => {
      render(
        <ConfigValidator
          config={{}}
          protocol="openai_compatible"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('API Base URL不能为空')).toBeInTheDocument();
      expect(screen.getByText('API Key不能为空')).toBeInTheDocument();
      expect(screen.getByText('模型名称不能为空')).toBeInTheDocument();
    });

    it('openai_compatible协议 - 有效配置应该通过验证', () => {
      render(
        <ConfigValidator
          config={{
            base_url: 'https://api.openai.com',
            api_key: 'sk-valid-key',
            model: 'gpt-3.5-turbo',
          }}
          protocol="openai_compatible"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('配置格式正确')).toBeInTheDocument();
    });
  });

  describe('自定义验证规则', () => {
    it('ASR模型 - 无效采样率应该显示错误', () => {
      render(
        <ConfigValidator
          config={{
            model_type: 'asr',
            sample_rate: 12345,
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('采样率必须是8000、16000或44100')).toBeInTheDocument();
    });

    it('ASR模型 - 有效采样率应该通过验证', () => {
      render(
        <ConfigValidator
          config={{
            model_type: 'asr',
            sample_rate: 16000,
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.queryByText('采样率必须是8000、16000或44100')).not.toBeInTheDocument();
    });

    it('TTS模型 - 无效格式应该显示错误', () => {
      render(
        <ConfigValidator
          config={{
            model_type: 'tts',
            format: 'invalid-format',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('格式必须是wav、mp3或pcm')).toBeInTheDocument();
    });

    it('VD模型 - 无效分辨率应该显示错误', () => {
      render(
        <ConfigValidator
          config={{
            model_type: 'vd',
            resolution: 'invalid-res',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('分辨率必须是480p、720p或1080p')).toBeInTheDocument();
    });

    it('VD模型 - 无效帧率应该显示错误', () => {
      render(
        <ConfigValidator
          config={{
            model_type: 'vd',
            fps: 100,
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('帧率必须在1到60之间')).toBeInTheDocument();
    });
  });

  describe('JSON配置验证', () => {
    it('无效JSON应该显示错误', () => {
      render(
        <ConfigValidator
          config={{
            config_text: '{ invalid json }',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('JSON配置格式不正确')).toBeInTheDocument();
    });

    it('有效JSON应该通过验证', () => {
      render(
        <ConfigValidator
          config={{
            config_text: '{"key": "value"}',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.queryByText('JSON配置格式不正确')).not.toBeInTheDocument();
    });
  });

  describe('连接测试功能', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('应该禁用测试按钮当配置无效时', () => {
      render(
        <ConfigValidator
          config={{}}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      const testButton = screen.getByText('测试连接');
      expect(testButton).toBeDisabled();
    });

    it('应该执行连接测试并显示成功结果', async () => {
      render(
        <ConfigValidator
          config={{
            ws_url: 'ws://example.com',
            api_key: 'valid-api-key-long-enough',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      const testButton = screen.getByText('测试连接');
      fireEvent.click(testButton);

      // 显示加载状态
      expect(screen.getByText('测试中')).toBeInTheDocument();

      // 等待测试完成
      jest.advanceTimersByTime(2000);
      await waitFor(() => {
        expect(screen.getByText('连接测试成功，延迟 45ms')).toBeInTheDocument();
      });
    });

    it('应该执行连接测试并显示失败结果', async () => {
      // 模拟Math.random返回0（总是失败）
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0);

      render(
        <ConfigValidator
          config={{
            ws_url: 'ws://example.com',
            api_key: 'valid-api-key-long-enough',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      const testButton = screen.getByText('测试连接');
      fireEvent.click(testButton);

      jest.advanceTimersByTime(2000);
      await waitFor(() => {
        expect(screen.getByText('连接失败：无法连接到服务器')).toBeInTheDocument();
      });

      Math.random = originalRandom;
    });
  });

  describe('验证结果回调', () => {
    it('配置变化时应该调用onValidationChange', () => {
      const { rerender } = render(
        <ConfigValidator
          config={{}}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(mockOnValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          errors: expect.arrayContaining([expect.any(String)]),
        })
      );

      // 更新为有效配置
      rerender(
        <ConfigValidator
          config={{
            ws_url: 'ws://example.com',
            api_key: 'valid-api-key-long-enough',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(mockOnValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          errors: [],
        })
      );
    });
  });

  describe('边界条件测试', () => {
    it('URL格式验证 - 应该拒绝无效URL', () => {
      render(
        <ConfigValidator
          config={{
            ws_url: 'not-a-url',
            api_key: 'valid-key',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('WebSocket URL格式不正确')).toBeInTheDocument();
    });

    it('API Key格式验证 - 短于10字符应该失败', () => {
      render(
        <ConfigValidator
          config={{
            ws_url: 'ws://example.com',
            api_key: 'short',
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('API Key格式不正确')).toBeInTheDocument();
    });

    it('应该处理null和undefined值', () => {
      render(
        <ConfigValidator
          config={{
            ws_url: null,
            api_key: undefined,
          }}
          protocol="websocket"
          onValidationChange={mockOnValidationChange}
        />
      );

      expect(screen.getByText('WebSocket URL不能为空')).toBeInTheDocument();
      expect(screen.getByText('API Key不能为空')).toBeInTheDocument();
    });
  });
});