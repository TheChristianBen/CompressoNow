import { useState } from "react";
import { Info, ChevronRight, CheckCircle2, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import type { ExtractedItem, NormalizedMessage } from "@/types";
import { formatDeadline, formatTimestamp } from "@/lib/dateParser";

interface BriefingItemProps {
  item: ExtractedItem;
  messages: NormalizedMessage[];
  onSelect: (item: ExtractedItem) => void;
  isSelected: boolean;
}

const CATEGORY_STYLES: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  needsAction: { label: "Needs Your Action", color: "text-red-700 dark:text-red-300", bgColor: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-200 dark:border-red-900" },
  decisions: { label: "Decisions Made", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50 dark:bg-emerald-950/30", borderColor: "border-emerald-200 dark:border-emerald-900" },
  deadlines: { label: "Upcoming Deadlines", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50 dark:bg-amber-950/30", borderColor: "border-amber-200 dark:border-amber-900" },
  fyi: { label: "FYI", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-200 dark:border-blue-900" },
  ignorable: { label: "Ignorable", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-50 dark:bg-slate-800/50", borderColor: "border-slate-200 dark:border-slate-700" },
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

export function BriefingItem({ item, messages, onSelect, isSelected }: BriefingItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const style = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.ignorable;
  const citedMessages = messages.filter((m) => item.sourceMessageIds.includes(m.id));

  return (
    <div
      className={`card p-4 border-l-4 cursor-pointer transition-all hover:shadow-md ${style.borderColor} ${
        isSelected ? "ring-2 ring-blue-400" : ""
      } ${!item.verified ? "opacity-60" : ""}`}
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bgColor} ${style.color}`}>
              {style.label}
            </span>
            {item.status === "resolved" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Resolved
              </span>
            )}
            {!item.verified && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Unverified
              </span>
            )}
            {item.confidence === "low" && item.verified && (
              <span className="text-xs text-slate-400 italic">Not enough evidence</span>
            )}
          </div>

          <p className="text-sm text-slate-800 dark:text-slate-100 font-medium leading-snug">
            {item.task}
          </p>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            {item.owner && (
              <span>Owner: <b className="text-slate-700 dark:text-slate-200">{item.owner}</b></span>
            )}
            {item.sender && (
              <span>From: {item.sender}</span>
            )}
            {item.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDeadline(item.deadline)}
              </span>
            )}
            <span className="text-slate-400">{citedMessages.length} source message(s)</span>
          </div>

          {item.verificationIssues && item.verificationIssues.length > 0 && !item.verified && (
            <div className="mt-2 flex items-start gap-1 text-xs text-orange-600 dark:text-orange-400">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{item.verificationIssues.join(" ")}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 relative">
            <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{item.priority}</span>
            <div className={`w-2 h-2 rounded-full ${PRIORITY_STYLES[item.priorityLevel]}`} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(!showTooltip);
              }}
              className="text-slate-400 hover:text-blue-500 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-8 z-20 w-64 card p-3 shadow-xl text-xs text-slate-600 dark:text-slate-300 animate-fade-in">
                <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">Why this ranking</p>
                <p className="leading-relaxed">{item.whyThisRanking}</p>
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </div>
  );
}

interface BriefingDashboardProps {
  items: ExtractedItem[];
  messages: NormalizedMessage[];
  selectedItem: ExtractedItem | null;
  onSelectItem: (item: ExtractedItem | null) => void;
}

export function BriefingDashboard({ items, messages, selectedItem, onSelectItem }: BriefingDashboardProps) {
  const categories: ExtractedItem["category"][] = ["needsAction", "deadlines", "decisions", "fyi", "ignorable"];

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;
        const style = CATEGORY_STYLES[cat];
        return (
          <div key={cat} className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <h3 className={`text-sm font-semibold ${style.color}`}>{style.label}</h3>
              <span className="text-xs text-slate-400">({catItems.length})</span>
            </div>
            <div className="space-y-2">
              {catItems.map((item) => (
                <BriefingItem
                  key={item.id}
                  item={item}
                  messages={messages}
                  onSelect={onSelectItem}
                  isSelected={selectedItem?.id === item.id}
                />
              ))}
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">No items extracted from the messages after the "last seen" point.</p>
        </div>
      )}
    </div>
  );
}
