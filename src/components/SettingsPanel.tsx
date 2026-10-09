import { Settings as SettingsIcon, X, Sliders } from "lucide-react";
import { useState } from "react";
import type { AppSettings, PriorityWeights } from "@/types";
import { DEFAULT_WEIGHTS } from "@/config";

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

const WEIGHT_LABELS: Record<keyof PriorityWeights, { label: string; desc: string }> = {
  deadlineProximity: { label: "Deadline proximity", desc: "How close the deadline is" },
  directMention: { label: "Direct Mention", desc: "Whether you're @mentioned or asked directly" },
  senderImportance: { label: "Sender Importance", desc: "How active the sender is in the chat" },
  threadActivity: { label: "Thread Activity", desc: "How many replies the message thread has" },
  unresolved: { label: "Unresolved Status", desc: "Whether the task is still open" },
};

export function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [local, setLocal] = useState<AppSettings>({ ...settings, weights: { ...settings.weights } });

  const updateWeight = (key: keyof PriorityWeights, value: number) => {
    setLocal({ ...local, weights: { ...local.weights, [key]: value } });
  };

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const handleReset = () => {
    setLocal({ ...local, weights: { ...DEFAULT_WEIGHTS } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="card w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-500" />
            Settings
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-1.5">
              Your name (for mention detection)
            </label>
            <input
              type="text"
              value={local.userName}
              onChange={(e) => setLocal({ ...local, userName: e.target.value })}
              placeholder="e.g. Alex"
              className="input-field w-full px-3 py-2 rounded-lg text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">Messages directed at you will be flagged as high priority.</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Priority Weights</span>
              <button onClick={handleReset} className="ml-auto text-xs text-blue-500 hover:underline">
                Reset to defaults
              </button>
            </div>

            <div className="space-y-4">
              {(Object.keys(WEIGHT_LABELS) as (keyof PriorityWeights)[]).map((key) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {WEIGHT_LABELS[key].label}
                    </span>
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                      {local.weights[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={local.weights[key]}
                    onChange={(e) => updateWeight(key, parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-0.5">{WEIGHT_LABELS[key].desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={local.enableLLM}
                onChange={(e) => setLocal({ ...local, enableLLM: e.target.checked })}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                Enable on-device LLM (beta)
              </span>
            </label>
            <p className="text-xs text-slate-400 mt-1 ml-6">
              Uses an optional in-browser model to classify and rephrase items. Falls back to rule-based output if unavailable.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
