import { Shield, Wifi, WifiOff, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface PrivacyPanelProps {
  networkRequestCount: number;
  onDeleteAll: () => void;
  messageCount: number;
  itemCount: number;
}

export function PrivacyPanel({ networkRequestCount, onDeleteAll, messageCount, itemCount }: PrivacyPanelProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleDelete = async () => {
    if (!confirm("This will permanently delete all chat data, extracted items, and settings from this browser. Continue?")) {
      return;
    }
    setDeleting(true);
    await onDeleteAll();
    setDeleting(false);
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Privacy & Data</h3>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Network requests</span>
          <span className={`font-mono font-bold px-2 py-0.5 rounded ${
            networkRequestCount === 0
              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
              : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
          }`}>
            {networkRequestCount}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Connection</span>
          <span className={`flex items-center gap-1 font-medium ${
            isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Storage</span>
          <span className="font-medium text-slate-600 dark:text-slate-300">IndexedDB only</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Messages stored</span>
          <span className="font-mono text-slate-600 dark:text-slate-300">{messageCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Items extracted</span>
          <span className="font-mono text-slate-600 dark:text-slate-300">{itemCount}</span>
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        {deleting ? "Deleting..." : "Delete all data"}
      </button>
    </div>
  );
}
