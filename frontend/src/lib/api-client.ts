// API 客户端封装，统一处理错误、加载状态和toast提示
import { useToast } from "@/components/ui/Toast";

interface ApiOptions {
  showLoading?: boolean;
  showError?: boolean;
  showSuccess?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

class ApiClient {
  private loadingCount = 0;
  private loadingTimer: NodeJS.Timeout | null = null;

  async request<T>(
    url: string,
    options: RequestInit & ApiOptions = {},
    toast?: ReturnType<typeof useToast>
  ): Promise<T> {
    const {
      showLoading = true,
      showError = true,
      showSuccess = false,
      successMessage = "操作成功",
      errorMessage = "操作失败",
      ...fetchOptions
    } = options;

    // 显示加载状态
    if (showLoading) {
      this.showLoading();
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || errorMessage);
      }

      // 显示成功提示
      if (showSuccess && toast) {
        toast.success(successMessage);
      }

      return data;
    } catch (error) {
      // 显示错误提示
      if (showError && toast) {
        toast.error(error instanceof Error ? error.message : errorMessage);
      }

      // 网络错误处理
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error("网络连接失败，请检查网络设置");
      }

      throw error;
    } finally {
      // 隐藏加载状态
      if (showLoading) {
        this.hideLoading();
      }
    }
  }

  private showLoading() {
    this.loadingCount++;
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
    }
    this.loadingTimer = setTimeout(() => {
      // 显示全局加载指示器
      const loadingEl = document.getElementById("global-loading");
      if (loadingEl) {
        loadingEl.style.display = "flex";
      }
    }, 300); // 300ms后才显示，避免闪烁
  }

  private hideLoading() {
    this.loadingCount--;
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    if (this.loadingCount <= 0) {
      this.loadingCount = 0;
      const loadingEl = document.getElementById("global-loading");
      if (loadingEl) {
        loadingEl.style.display = "none";
      }
    }
  }
}

export const apiClient = new ApiClient();