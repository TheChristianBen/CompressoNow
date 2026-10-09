import { useState } from "react";
import { Search, Send, Quote } from "lucide-react";
import type { ChatAnswer, NormalizedMessage } from "@/types";
import { askChat } from "@/lib/askChat";
import { formatTimestamp } from "@/lib/dateParser";

interface AskChatBoxProps {
  messages: NormalizedMessage[];
  onSelectMessage: (messageId: string) => void;
}

export function AskChatBox({ messages }: AskChatBoxProps) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<ChatAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = () => {
    if (!query.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const result = askChat(query, messages);
      setAnswer(result);
      setLoading(false);
    }, 200);
  };

  const citedMessages = answer?.sourceMessageIds
    ? messages.filter((m) => answer.sourceMessageIds.includes(m.id))
    : [];

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ask the chat</h3>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask a question about the chat..."
          className="input-field flex-1 px-3 py-2 rounded-lg text-sm"
        />
        <button
          onClick={handleAsk}
          disabled={loading || !query.trim()}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          Ask
        </button>
      </div>

      {answer && (
        <div className="animate-fade-in">
          {answer.found ? (
            <div className="space-y-2">
              <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                {answer.text}
              </div>
              {citedMessages.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Quote className="w-3 h-3" /> Citations
                  </p>
                  {citedMessages.map((m) => (
                    <div key={m.id} className="text-xs p-2 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-blue-600 dark:text-blue-400">{m.sender}</span>
                        <span className="text-slate-400">{formatTimestamp(m.timestamp)}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 truncate">{m.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400 italic p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              {answer.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
