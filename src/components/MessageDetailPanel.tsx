import { X, MessageSquare } from "lucide-react";
import type { ExtractedItem, NormalizedMessage } from "@/types";
import { formatTimestamp } from "@/lib/dateParser";

interface MessageDetailPanelProps {
  item: ExtractedItem | null;
  messages: NormalizedMessage[];
  onClose: () => void;
}

export function MessageDetailPanel({ item, messages, onClose }: MessageDetailPanelProps) {
  if (!item) return null;

  const citedMessages = messages.filter((m) => item.sourceMessageIds.includes(m.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Source Messages
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3">
          <div className="card p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{item.task}</p>
            <div className="flex gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
              {item.owner && <span>Owner: {item.owner}</span>}
              {item.sender && <span>From: {item.sender}</span>}
              <span>Priority: {item.priority}</span>
            </div>
          </div>

          {citedMessages.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-lg border ${
                item.sourceMessageIds[0] === m.id
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className="font-medium text-blue-600 dark:text-blue-400">{m.sender}</span>
                <span className="text-slate-400">{formatTimestamp(m.timestamp)}</span>
                {item.sourceMessageIds[0] === m.id && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-medium">
                    Primary source
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{m.text}</p>
            </div>
          ))}

          {citedMessages.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No source messages found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
