import { useState } from "react";
import { Clock, ChevronDown, Check } from "lucide-react";
import type { NormalizedMessage } from "@/types";
import { formatTimestamp } from "@/lib/dateParser";

interface LastSeenSelectorProps {
  messages: NormalizedMessage[];
  lastSeenTimestamp: number | null;
  onSelect: (timestamp: number) => void;
}

export function LastSeenSelector({ messages, lastSeenTimestamp, onSelect }: LastSeenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = messages.filter((m) =>
    m.text.toLowerCase().includes(search.toLowerCase()) ||
    m.sender.toLowerCase().includes(search.toLowerCase())
  );

  const selected = messages.find((m) => m.timestamp === lastSeenTimestamp);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary w-full px-4 py-2.5 rounded-lg text-sm flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2 truncate">
          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {selected ? (
            <span className="truncate">
              Last seen: {formatTimestamp(selected.timestamp)} - {selected.sender}
            </span>
          ) : (
            <span>Select "last seen" point</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full card shadow-xl max-h-96 overflow-hidden flex flex-col animate-fade-in">
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <input
              type="text"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full px-3 py-2 rounded-md text-sm"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && (
              <p className="p-4 text-sm text-slate-400 text-center">No messages found</p>
            )}
            {filtered.slice(0, 50).map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onSelect(m.timestamp);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors flex items-start gap-2 border-b border-slate-100 dark:border-slate-800"
              >
                {m.timestamp === lastSeenTimestamp && (
                  <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{m.sender}</span>
                    <span className="text-slate-400">{formatTimestamp(m.timestamp)}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 truncate mt-0.5">{m.text}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
