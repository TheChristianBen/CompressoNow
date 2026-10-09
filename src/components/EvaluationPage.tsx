import { useState } from "react";
import { FlaskConical, Play, Loader2 } from "lucide-react";
import type { EvalResult, SampleChat } from "@/types";
import { evaluateAll } from "@/lib/evaluation";
import { getEvalSampleChats } from "@/lib/sampleChat";
import type { AppSettings } from "@/types";

interface EvaluationPageProps {
  settings: AppSettings;
  onClose: () => void;
}

function MetricCard({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {(value * 100).toFixed(1)}{suffix ?? "%"}
      </p>
    </div>
  );
}

export function EvaluationPage({ settings, onClose }: EvaluationPageProps) {
  const [results, setResults] = useState<{ chat: SampleChat; result: EvalResult }[] | null>(null);
  const [aggregate, setAggregate] = useState<EvalResult | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      const { results, aggregate } = evaluateAll(settings);
      setResults(results);
      setAggregate(aggregate);
      setRunning(false);
    }, 300);
  };

  const sampleChats = getEvalSampleChats();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center animate-fade-in p-4" onClick={onClose}>
      <div
        className="card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-500" />
            Evaluation
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-sm">
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          <div className="card p-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Run extraction against {sampleChats.length} labeled sample chats with known ground-truth action items.
              Metrics are computed by comparing extracted items against ground truth labels.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sampleChats.map((c) => (
                <span key={c.id} className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {c.label} ({c.messages.length} msgs)
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={running}
            className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 w-full justify-center disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "Running evaluation..." : "Run evaluation"}
          </button>

          {aggregate && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in">
              <MetricCard label="Precision" value={aggregate.precision} color="text-blue-600 dark:text-blue-400" />
              <MetricCard label="Recall" value={aggregate.recall} color="text-emerald-600 dark:text-emerald-400" />
              <MetricCard label="F1 Score" value={aggregate.f1} color="text-indigo-600 dark:text-indigo-400" />
              <MetricCard label="Hallucination Rate" value={aggregate.hallucinationRate} color="text-red-600 dark:text-red-400" />
              <MetricCard label="Processing Time" value={aggregate.processingTimeMs / 1000} suffix="s" color="text-amber-600 dark:text-amber-400" />
              <div className="card p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">True Positives</p>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{aggregate.truePositives}</p>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-2 animate-fade-in">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Per-chat results</h4>
              {results.map(({ chat, result }) => (
                <div key={chat.id} className="card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{chat.label}</span>
                    <span className="text-xs text-slate-400">{result.processingTimeMs.toFixed(1)}ms</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <span className="text-slate-400">P</span>
                      <p className="font-mono font-medium text-blue-600 dark:text-blue-400">{(result.precision * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-400">R</span>
                      <p className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{(result.recall * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-400">F1</span>
                      <p className="font-mono font-medium text-indigo-600 dark:text-indigo-400">{(result.f1 * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-400">Hallu.</span>
                      <p className="font-mono font-medium text-red-600 dark:text-red-400">{(result.hallucinationRate * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
