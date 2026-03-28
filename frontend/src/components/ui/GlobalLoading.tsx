import { useEffect, useState } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export function GlobalLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleShowLoading = () => {
      setVisible(true);
    };

    const handleHideLoading = () => {
      setVisible(false);
    };

    // 监听自定义事件
    window.addEventListener("show-global-loading", handleShowLoading);
    window.addEventListener("hide-global-loading", handleHideLoading);

    return () => {
      window.removeEventListener("show-global-loading", handleShowLoading);
      window.removeEventListener("hide-global-loading", handleHideLoading);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-gray-700 font-medium">正在处理...</p>
        <p className="text-sm text-gray-500">请稍候</p>
      </div>
    </div>
  );
}