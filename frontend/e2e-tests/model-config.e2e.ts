/**
 * Model Configuration Module E2E Tests
 *
 * 使用Playwright进行端到端测试
 * 测试完整的用户流程和交互
 */

import { test, expect, Page } from '@playwright/test';

// 测试配置
const TEST_CONFIG = {
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  admin: {
    username: process.env.E2E_ADMIN_USERNAME || 'admin',
    password: process.env.E2E_ADMIN_PASSWORD || 'password',
  },
};

test.describe('Model Configuration E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // 创建新的页面上下文
    const context = await browser.newContext({
      baseURL: TEST_CONFIG.baseURL,
    });

    page = await context.newPage();

    // 设置认证token（如果有）
    if (TEST_CONFIG.admin.username && TEST_CONFIG.admin.password) {
      await page.evaluate((token) => {
        localStorage.setItem('auth_token', token);
      }, TEST_CONFIG.admin.password);
    }
  });

  test.describe('场景向导流程', () => {
    test('完整的场景选择流程 - 语音对话', async () => {
      await page.goto('/admin/models');

      // 点击创建新配置按钮
      await page.click('button:has-text("创建新配置")');

      // 选择场景向导
      await page.click('button:has-text("场景向导")');

      // 选择语音对话场景
      await page.click('div:has-text("语音对话")');

      // 点击下一步
      await page.click('button:has-text("下一步")');

      // 验证场景详情
      await expect(page.locator('h2:text("语音对话")')).toBeVisible();
      await expect(page.locator('text=qwen-asr')).toBeVisible();
      await expect(page.locator('text=qwen-tts')).toBeVisible();

      // 确认创建
      await page.click('button:has-text("确认创建")');

      // 验证创建成功
      await expect(page.locator('text=配置创建成功')).toBeVisible();
      await expect(page.url()).toContain('/admin/models');
    });

    test('完整的场景选择流程 - 视频对话', async () => {
      await page.goto('/admin/models');

      await page.click('button:has-text("创建新配置")');
      await page.click('button:has-text("场景向导")');
      await page.click('div:has-text("视频对话")');
      await page.click('button:has-text("下一步")');
      await page.click('button:has-text("确认创建")');

      // 验证包含3个模型
      const modelCards = page.locator('.model-config-card');
      await expect(modelCards).toHaveCount(3);
    });
  });

  test.describe('模板管理流程', () => {
    test('保存当前配置为模板', async () => {
      await page.goto('/admin/models');

      // 先创建一个配置
      await page.click('button:has-text("创建新配置")');
      await page.click('button:has-text("场景向导")');
      await page.click('div:has-text("语音对话")');
      await page.click('button:has-text("下一步")');
      await page.click('button:has-text("确认创建")');

      // 保存为模板
      await page.click('button:has-text("保存为模板")');

      // 填写模板信息
      await page.fill('input[placeholder="输入模板名称"]', 'E2E测试模板');
      await page.fill('input[placeholder="输入模板描述"]', '这是一个E2E测试模板');

      await page.click('button:has-text("保存")');

      // 验证模板保存成功
      await expect(page.locator('text=保存成功')).toBeVisible();
    });

    test('使用模板创建配置', async () => {
      await page.goto('/admin/models');

      // 打开模板选择器
      await page.click('button:has-text("从模板创建")');

      // 选择之前保存的模板
      await page.click('div:has-text("E2E测试模板")');

      // 验证配置被加载
      await expect(page.locator('text=E2E测试模板')).toBeVisible();
    });

    test('导入导出模板', async () => {
      await page.goto('/admin/models');

      // 导出模板
      await page.click('button:has-text("导入/导出")');
      await page.click('button:has-text("导出模板")');

      // 验证文件下载
      const download = await page.waitForEvent('download');
      expect(download.suggestedFilename()).toMatch(/template.*\.json/);

      // 导入模板
      await page.click('button:has-text("导入模板")');
      await page.setInputFiles('input[type="file"]', download.path());

      // 验证导入成功
      await expect(page.locator('text=导入成功')).toBeVisible();
    });
  });

  test.describe('配置验证流程', () => {
    test('创建配置时的实时验证', async () => {
      await page.goto('/admin/models');
      await page.click('button:has-text("创建新配置")');

      // 选择协议但不填写必填字段
      await page.selectOption('select[name="protocol"]', 'websocket');

      // 验证实时错误提示
      await expect(page.locator('text=WebSocket URL不能为空')).toBeVisible();
      await expect(page.locator('text=API Key不能为空')).toBeVisible();
    });

    test('测试连接功能', async () => {
      await page.goto('/admin/models');
      await page.click('button:has-text("创建新配置")');

      // 填写有效配置
      await page.fill('input[name="ws_url"]', 'ws://example.com');
      await page.fill('input[name="api_key"]', 'valid-api-key');

      // 点击测试连接
      await page.click('button:has-text("测试连接")');

      // 验证测试结果
      await expect(page.locator('text=连接测试')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('配置管理完整流程', () => {
    test('完整的CRUD流程', async () => {
      // 创建配置
      await page.goto('/admin/models');
      await page.click('button:has-text("创建新配置")');

      // 手动填写配置
      await page.selectOption('select[name="model_type"]', 'llm');
      await page.fill('input[name="model_name"]', 'E2E测试模型');
      await page.selectOption('select[name="provider"]', 'openai');
      await page.selectOption('select[name="protocol"]', 'openai_compatible');
      await page.fill('input[name="base_url"]', 'https://api.openai.com');
      await page.fill('input[name="api_key"]', 'sk-test-key');
      await page.fill('input[name="model"]', 'gpt-3.5-turbo');

      await page.click('button:has-text("保存")');
      await expect(page.locator('text=保存成功')).toBeVisible();

      // 编辑配置
      await page.click('button:has-text("编辑")');
      await page.fill('input[name="model_name"]', 'E2E测试模型-已编辑');
      await page.click('button:has-text("保存")');
      await expect(page.locator('text=保存成功')).toBeVisible();

      // 设置为默认
      await page.click('button:has-text("设为默认")');
      await expect(page.locator('text=设置成功')).toBeVisible();

      // 删除配置
      await page.click('button:has-text("删除")');
      await page.click('button:has-text("确认删除")');
      await expect(page.locator('text=删除成功')).toBeVisible();
    });
  });

  test.describe('错误场景测试', () => {
    test('网络错误处理', async () => {
      // 模拟网络错误
      await page.route('**/admin/models', (route) => {
        route.abort('connectionfailed');
      });

      await page.goto('/admin/models');

      // 验证错误提示
      await expect(page.locator('text=网络连接失败')).toBeVisible();
    });

    test('认证错误处理', async () => {
      // 模拟认证错误
      await page.route('**/admin/models', (route) => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: { message: '认证失败' } }),
        });
      });

      await page.goto('/admin/models');

      // 验证重定向到登录或错误提示
      await expect(page.url()).toContain('/login');
    });

    test('表单验证错误', async () => {
      await page.goto('/admin/models');
      await page.click('button:has-text("创建新配置")');

      // 提交空表单
      await page.click('button:has-text("保存")');

      // 验证所有错误提示
      await expect(page.locator('text=不能为空')).toHaveCount(4);
    });
  });

  test.describe('性能和大批量数据测试', () => {
    test('处理大量配置数据', async () => {
      await page.goto('/admin/models');

      // 验证页面加载时间
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(5000); // 页面加载应该在5秒内完成
    });

    test('搜索和过滤性能', async () => {
      await page.goto('/admin/models');

      // 测试搜索性能
      const startTime = Date.now();
      await page.fill('input[placeholder="搜索"]', 'test');
      await page.waitForResponse('**/admin/models*');
      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(1000); // 搜索应该在1秒内完成
    });
  });

  test.describe('响应式设计测试', () => {
    test('移动端布局', async () => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/admin/models');

      // 验证移动端布局
      await expect(page.locator('button:has-text("创建新配置")')).toBeVisible();

      // 测试移动端表单
      await page.click('button:has-text("创建新配置")');
      await expect(page.locator('div:has-text("场景向导")')).toBeVisible();
    });

    test('平板布局', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/admin/models');

      // 验证表格布局
      await expect(page.locator('.model-config-table')).toBeVisible();
    });
  });

  test.describe('无障碍测试', () => {
    test('键盘导航', async () => {
      await page.goto('/admin/models');

      // 测试Tab导航
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // 验证焦点状态
      await expect(page.locator('button:focus')).toBeVisible();
    });

    test('屏幕阅读器支持', async () => {
      await page.goto('/admin/models');

      // 验证按钮有适当的aria标签
      await expect(page.locator('button[aria-label]')).toBeVisible();

      // 验证表单字段有标签
      await expect(page.locator('label')).toHaveCount(4);
    });
  });

  test.describe('用户偏好设置', () => {
    test('记住用户选择', async () => {
      await page.goto('/admin/models');

      // 选择过滤器
      await page.selectOption('select[name="model_type_filter"]', 'llm');

      // 刷新页面
      await page.reload();

      // 验证选择被记住
      await expect(page.locator('select[name="model_type_filter"]')).toHaveValue('llm');
    });

    test('暗色模式支持', async () => {
      await page.goto('/admin/models');

      // 切换暗色模式
      await page.click('button:has-text("切换主题")');

      // 验证暗色模式生效
      const bodyClass = await page.evaluate(() => document.body.className);
      expect(bodyClass).toContain('dark');
    });
  });
});

// 测试结果报告
test.afterAll(async ({}) => {
  console.log('E2E测试完成');
  console.log(`测试时间: ${new Date().toISOString()}`);
});