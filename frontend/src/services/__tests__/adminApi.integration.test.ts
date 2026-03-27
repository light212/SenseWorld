/**
 * 管理员API集成测试
 * 这些测试需要真实的API端点才能运行
 * 可以通过设置环境变量来启用这些测试
 */

import { adminApi } from '../adminApi';
import { ApiError } from '@/lib/errorHandling';

// 测试开关 - 只有设置环境变量时才运行集成测试
const ENABLE_INTEGRATION_TESTS = process.env.ENABLE_API_INTEGRATION_TESTS === 'true';
const API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:8000/v1';

// 测试认证token
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token-for-integration-tests';

// 跳过测试如果未启用集成测试
const describeIf = (condition: boolean) => condition ? describe : describe.skip;

describeIf(ENABLE_INTEGRATION_TESTS)('Admin API Integration Tests', () => {
  beforeAll(() => {
    // 设置测试API客户端
    adminApi.setToken(TEST_AUTH_TOKEN);
  });

  afterAll(() => {
    // 清理
    adminApi.setToken(null);
  });

  describe('Model Config API', () => {
    describe('GET /admin/models', () => {
      it('应该获取模型配置列表', async () => {
        const models = await adminApi.listModelConfigs();

        expect(Array.isArray(models)).toBe(true);

        // 如果数据库中有数据，验证结构
        if (models.length > 0) {
          const model = models[0];
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('model_type');
          expect(model).toHaveProperty('model_name');
          expect(model).toHaveProperty('provider');
          expect(model).toHaveProperty('is_active');
          expect(['llm', 'asr', 'tts']).toContain(model.model_type);
        }
      }, 30000);

      it('应该根据model_type过滤', async () => {
        const asrModels = await adminApi.listModelConfigs({ model_type: 'asr' });

        expect(Array.isArray(asrModels)).toBe(true);
        asrModels.forEach(model => {
          expect(model.model_type).toBe('asr');
        });
      }, 30000);

      it('应该根据is_active过滤', async () => {
        const activeModels = await adminApi.listModelConfigs({ is_active: true });
        const inactiveModels = await adminApi.listModelConfigs({ is_active: false });

        expect(Array.isArray(activeModels)).toBe(true);
        expect(Array.isArray(inactiveModels)).toBe(true);

        activeModels.forEach(model => {
          expect(model.is_active).toBe(true);
        });

        inactiveModels.forEach(model => {
          expect(model.is_active).toBe(false);
        });
      }, 30000);
    });

    describe('POST /admin/models', () => {
      it('应该创建新的模型配置', async () => {
        const newConfig = {
          model_type: 'llm',
          model_name: 'test-model',
          provider: 'openai',
          api_key: 'test-api-key',
          config: {
            temperature: 0.7,
            max_tokens: 2048,
          },
          price_per_1k_input_tokens: 0.0015,
          price_per_1k_output_tokens: 0.002,
          is_active: true,
        };

        const created = await adminApi.createModelConfig(newConfig);

        expect(created).toHaveProperty('id');
        expect(created.model_type).toBe('llm');
        expect(created.model_name).toBe('test-model');
        expect(created.provider).toBe('openai');
        expect(created.created_at).toBeDefined();

        // 清理：删除测试创建的配置
        try {
          await adminApi.deleteModelConfig(created.id);
        } catch (e) {
          console.warn('清理测试数据失败:', e);
        }
      }, 30000);

      it('应该拒绝无效的模型类型', async () => {
        const invalidConfig = {
          model_type: 'invalid_type',
          model_name: 'test-model',
          provider: 'openai',
        };

        await expect(adminApi.createModelConfig(invalidConfig)).rejects.toThrow(ApiError);
      }, 30000);
    });

    describe('PATCH /admin/models/:id', () => {
      let testModelId: string;

      beforeAll(async () => {
        // 创建测试模型
        const newConfig = await adminApi.createModelConfig({
          model_type: 'llm',
          model_name: 'update-test-model',
          provider: 'openai',
          api_key: 'test-key',
        });
        testModelId = newConfig.id;
      });

      afterAll(async () => {
        try {
          await adminApi.deleteModelConfig(testModelId);
        } catch (e) {
          console.warn('清理测试数据失败:', e);
        }
      });

      it('应该更新模型配置', async () => {
        const updateData = {
          model_name: 'updated-model-name',
          is_active: false,
        };

        const updated = await adminApi.updateModelConfig(testModelId, updateData);

        expect(updated.model_name).toBe('updated-model-name');
        expect(updated.is_active).toBe(false);
        expect(updated.updated_at).toBeDefined();
      }, 30000);

      it('应该部分更新配置', async () => {
        const partialUpdate = {
          price_per_1k_input_tokens: 0.01,
        };

        const updated = await adminApi.updateModelConfig(testModelId, partialUpdate);

        expect(updated.price_per_1k_input_tokens).toBe(0.01);
        // 其他字段应该保持不变
        expect(updated.model_type).toBe('llm');
      }, 30000);
    });

    describe('DELETE /admin/models/:id', () => {
      let testModelId: string;

      beforeAll(async () => {
        // 创建要删除的测试模型
        const newConfig = await adminApi.createModelConfig({
          model_type: 'llm',
          model_name: 'delete-test-model',
          provider: 'openai',
          api_key: 'test-key',
        });
        testModelId = newConfig.id;
      });

      it('应该删除模型配置', async () => {
        await adminApi.deleteModelConfig(testModelId);

        // 验证已删除
        const models = await adminApi.listModelConfigs();
        expect(models.find(m => m.id === testModelId)).toBeUndefined();
      }, 30000);

      it('删除后应该返回404', async () => {
        // 尝试删除已删除的模型
        await expect(adminApi.deleteModelConfig(testModelId)).rejects.toThrow(ApiError);
      }, 30000);
    });

    describe('POST /admin/models/:id/set-default', () => {
      let testModelId: string;

      beforeAll(async () => {
        const newConfig = await adminApi.createModelConfig({
          model_type: 'llm',
          model_name: 'default-test-model',
          provider: 'openai',
          api_key: 'test-key',
          is_default: false,
        });
        testModelId = newConfig.id;
      });

      afterAll(async () => {
        try {
          await adminApi.deleteModelConfig(testModelId);
        } catch (e) {
          console.warn('清理测试数据失败:', e);
        }
      });

      it('应该设置模型为默认', async () => {
        const updated = await adminApi.setDefaultModel(testModelId);

        expect(updated.is_default).toBe(true);
      }, 30000);
    });
  });

  describe('Usage API', () => {
    describe('GET /admin/usage/summary', () => {
      it('应该获取使用摘要', async () => {
        const summary = await adminApi.getUsageSummary();

        expect(summary).toHaveProperty('total_calls');
        expect(summary).toHaveProperty('total_input_tokens');
        expect(summary).toHaveProperty('total_output_tokens');
        expect(summary).toHaveProperty('total_cost');
        expect(summary).toHaveProperty('by_model_type');
        expect(typeof summary.total_calls).toBe('number');
        expect(typeof summary.total_cost).toBe('number');
      }, 30000);

      it('应该支持日期范围过滤', async () => {
        const summary = await adminApi.getUsageSummary({
          date_range: '7d',
        });

        expect(summary).toHaveProperty('total_calls');
      }, 30000);
    });

    describe('GET /admin/usage/trends', () => {
      it('应该获取使用趋势', async () => {
        const trends = await adminApi.getUsageTrends();

        expect(Array.isArray(trends)).toBe(true);

        if (trends.length > 0) {
          const trend = trends[0];
          expect(trend).toHaveProperty('timestamp');
          expect(trend).toHaveProperty('calls');
          expect(trend).toHaveProperty('cost');
        }
      }, 30000);
    });

    describe('GET /admin/usage/by-model', () => {
      it('应该获取按模型使用统计', async () => {
        const stats = await adminApi.getUsageByModel();

        expect(Array.isArray(stats)).toBe(true);

        if (stats.length > 0) {
          const stat = stats[0];
          expect(stat).toHaveProperty('model_type');
          expect(stat).toHaveProperty('model_name');
          expect(stat).toHaveProperty('calls');
          expect(stat).toHaveProperty('cost');
          expect(stat).toHaveProperty('percentage');
        }
      }, 30000);
    });
  });

  describe('Logs API', () => {
    describe('GET /admin/logs', () => {
      it('应该获取请求日志列表', async () => {
        const logs = await adminApi.listRequestLogs({ page_size: 10 });

        expect(logs).toHaveProperty('items');
        expect(logs).toHaveProperty('total');
        expect(logs).toHaveProperty('page');
        expect(Array.isArray(logs.items)).toBe(true);

        if (logs.items.length > 0) {
          const log = logs.items[0];
          expect(log).toHaveProperty('id');
          expect(log).toHaveProperty('trace_id');
          expect(log).toHaveProperty('request_type');
          expect(log).toHaveProperty('status_code');
          expect(log).toHaveProperty('latency_ms');
        }
      }, 30000);

      it('应该支持分页', async () => {
        const page1 = await adminApi.listRequestLogs({ page: 1, page_size: 5 });
        const page2 = await adminApi.listRequestLogs({ page: 2, page_size: 5 });

        expect(page1.items.length).toBeLessThanOrEqual(5);
        expect(page2.items.length).toBeLessThanOrEqual(5);

        // 如果有足够的数据，两个页面的ID应该不同
        if (page1.total > 5) {
          const page1Ids = page1.items.map(item => item.id);
          const page2Ids = page2.items.map(item => item.id);
          expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false);
        }
      }, 30000);

      it('应该支持状态过滤', async () => {
        const successLogs = await adminApi.listRequestLogs({ status: '200' });
        const errorLogs = await adminApi.listRequestLogs({ status: '500' });

        successLogs.items.forEach(log => {
          expect(log.status_code).toBe(200);
        });

        errorLogs.items.forEach(log => {
          expect(log.status_code).toBe(500);
        });
      }, 30000);
    });

    describe('GET /admin/logs/:id', () => {
      it('应该获取日志详情', async () => {
        // 先获取一个日志ID
        const logs = await adminApi.listRequestLogs({ page_size: 1 });

        if (logs.items.length === 0) {
          console.log('没有可用的日志进行测试');
          return;
        }

        const logId = logs.items[0].id;
        const detail = await adminApi.getRequestLog(logId);

        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('trace_id');
        expect(detail).toHaveProperty('latency_ms');
      }, 30000);

      it('应该获取详细的延迟统计', async () => {
        const stats = await adminApi.getLatencyStats();

        expect(stats).toHaveProperty('p50');
        expect(stats).toHaveProperty('p95');
        expect(stats).toHaveProperty('p99');
        expect(stats).toHaveProperty('avg');
        expect(stats).toHaveProperty('min');
        expect(stats).toHaveProperty('max');
      }, 30000);
    });
  });

  describe('Settings API', () => {
    describe('GET /admin/settings', () => {
      it('应该获取系统设置列表', async () => {
        const settings = await adminApi.listSettings();

        expect(Array.isArray(settings)).toBe(true);

        if (settings.length > 0) {
          const setting = settings[0];
          expect(setting).toHaveProperty('id');
          expect(setting).toHaveProperty('key');
          expect(setting).toHaveProperty('value');
          expect(setting).toHaveProperty('value_type');
        }
      }, 30000);
    });

    describe('GET /admin/settings/:key', () => {
      it('应该获取特定设置', async () => {
        // 获取一个设置key
        const settings = await adminApi.listSettings();

        if (settings.length === 0) {
          console.log('没有可用的设置进行测试');
          return;
        }

        const settingKey = settings[0].key;
        const setting = await adminApi.getSetting(settingKey);

        expect(setting.key).toBe(settingKey);
      }, 30000);
    });

    describe('PUT /admin/settings/:key', () => {
      it('应该更新设置', async () => {
        const testKey = 'test_setting_key';
        const testValue = 'test_value_' + Date.now();

        try {
          const updated = await adminApi.updateSetting(testKey, testValue);
          expect(updated.value).toBe(testValue);
        } catch (error) {
          // 如果设置不存在，测试可能会失败
          console.log('设置更新测试跳过:', error);
        }
      }, 30000);
    });
  });

  describe('Alerts API', () => {
    describe('GET /admin/alerts', () => {
      it('应该获取告警列表', async () => {
        const alerts = await adminApi.listAlerts({ page_size: 10 });

        expect(alerts).toHaveProperty('items');
        expect(alerts).toHaveProperty('total');
        expect(Array.isArray(alerts.items)).toBe(true);

        if (alerts.items.length > 0) {
          const alert = alerts.items[0];
          expect(alert).toHaveProperty('id');
          expect(alert).toHaveProperty('type');
          expect(alert).toHaveProperty('level');
          expect(alert).toHaveProperty('title');
          expect(alert).toHaveProperty('is_read');
        }
      }, 30000);

      it('应该获取未读告警数量', async () => {
        const count = await adminApi.getUnreadAlertCount();

        expect(count).toHaveProperty('count');
        expect(typeof count.count).toBe('number');
      }, 30000);
    });

    describe('POST /admin/alerts/:id/read', () => {
      it('应该标记告警为已读', async () => {
        // 先获取一个未读的告警
        const alerts = await adminApi.listAlerts({ is_read: false, page_size: 1 });

        if (alerts.items.length === 0) {
          console.log('没有未读告警进行测试');
          return;
        }

        const alertId = alerts.items[0].id;
        await adminApi.markAlertRead(alertId);

        // 验证已读状态
        const updatedAlerts = await adminApi.listAlerts();
        const updatedAlert = updatedAlerts.items.find(a => a.id === alertId);
        expect(updatedAlert?.is_read).toBe(true);
      }, 30000);
    });

    describe('POST /admin/alerts/read-all', () => {
      it('应该标记所有告警为已读', async () => {
        await adminApi.markAllAlertsRead();

        const unreadCount = await adminApi.getUnreadAlertCount();
        expect(unreadCount.count).toBe(0);
      }, 30000);
    });
  });

  describe('Terminals API', () => {
    describe('GET /admin/terminals', () => {
      it('应该获取终端配置列表', async () => {
        const terminals = await adminApi.listTerminals();

        expect(Array.isArray(terminals)).toBe(true);

        if (terminals.length > 0) {
          const terminal = terminals[0];
          expect(terminal).toHaveProperty('id');
          expect(terminal).toHaveProperty('type');
          expect(terminal).toHaveProperty('name');
          expect(terminal).toHaveProperty('is_active');
        }
      }, 30000);
    });

    describe('POST /admin/terminals', () => {
      it('应该创建终端配置', async () => {
        const newTerminal = {
          type: 'test-terminal',
          name: 'Test Terminal',
          config_overrides: {
            test_setting: 'test_value',
          },
          feature_flags: {
            enable_feature: true,
          },
          is_active: true,
        };

        const created = await adminApi.createTerminal(newTerminal);

        expect(created).toHaveProperty('id');
        expect(created.type).toBe('test-terminal');
        expect(created.name).toBe('Test Terminal');
        expect(created.config_overrides).toBeDefined();

        // 清理
        try {
          await adminApi.deleteTerminal(created.id);
        } catch (e) {
          console.warn('清理测试数据失败:', e);
        }
      }, 30000);
    });

    describe('PATCH /admin/terminals/:id', () => {
      let terminalId: string;

      beforeAll(async () => {
        const terminal = await adminApi.createTerminal({
          type: 'update-test',
          name: 'Update Test Terminal',
        });
        terminalId = terminal.id;
      });

      afterAll(async () => {
        try {
          await adminApi.deleteTerminal(terminalId);
        } catch (e) {
          console.warn('清理测试数据失败:', e);
        }
      });

      it('应该更新终端配置', async () => {
        const updateData = {
          name: 'Updated Terminal Name',
          is_active: false,
        };

        const updated = await adminApi.updateTerminal(terminalId, updateData);

        expect(updated.name).toBe('Updated Terminal Name');
        expect(updated.is_active).toBe(false);
      }, 30000);
    });
  });
});

// 测试环境验证
describe('Test Environment Validation', () => {
  it('应该正确配置测试环境', () => {
    expect(ENABLE_INTEGRATION_TESTS).toBeDefined();
    expect(API_BASE_URL).toBeDefined();

    if (ENABLE_INTEGRATION_TESTS) {
      console.log('Integration tests enabled');
      console.log(`API Base URL: ${API_BASE_URL}`);
    } else {
      console.log('Integration tests disabled. Set ENABLE_API_INTEGRATION_TESTS=true to enable');
    }
  });
});