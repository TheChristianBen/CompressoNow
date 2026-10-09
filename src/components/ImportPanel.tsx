import { useRef, useState } from "react";
import { Upload, FileText, Sparkles, AlertCircle } from "lucide-react";
import type { ChatFormat, NormalizedMessage } from "@/types";
import { parseChat, validateAndClean } from "@/lib/parsers";
import { getSampleChat } from "@/lib/sampleChat";

interface ImportPanelProps {
  onMessagesLoaded: (messages: NormalizedMessage[], format: ChatFormat | "sample") => void;
  onError: (error: string) => void;
}

export function ImportPanel({ onMessagesLoaded, onError }: ImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      if (!text.trim()) {
        onError("This file is empty. Please select a valid chat export.");
        setLoading(false);
        return;
      }

      const messages = parseChat(text);
      if (messages.length === 0) {
        onError("Could not parse this file. Supported formats: WhatsApp .txt, Telegram JSON, Slack JSON.");
        setLoading(false);
        return;
      }

      const cleaned = validateAndClean(messages);
      if (cleaned.length === 0) {
        onError("No valid messages found after cleaning. The file may be malformed.");
        setLoading(false);
        return;
      }

      const format: ChatFormat = messages[0]?.sourceFormat ?? "whatsapp";
      onMessagesLoaded(cleaned, format);
    } catch (e) {
      onError(`Failed to read file: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
    setLoading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSampleLoad = () => {
    const { messages } = getSampleChat();
    onMessagesLoaded(messages, "sample");
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`card p-8 border-2 border-dashed cursor-pointer transition-all ${
          dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-slate-300 dark:border-slate-600"
        }`}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Upload className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {loading ? "Loading..." : "Drop your chat export here"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              WhatsApp .txt, Telegram JSON, or Slack JSON
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.json,text/plain,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSampleLoad}
          className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 flex-1"
        >
          <Sparkles className="w-4 h-4" />
          Load sample chat
        </button>
      </div>

      <div className="card p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-medium text-slate-700 dark:text-slate-200">All processing happens in your browser</p>
            <p>Your chat data never leaves this device. No network requests are made with your messages.</p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Supported formats</span>
        </div>
        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 ml-6 list-disc">
          <li><b>WhatsApp</b>: Export chat as .txt (with or without media)</li>
          <li><b>Telegram</b>: Export as JSON (Desktop {">"} Settings {">"} Advanced {">"} Export)</li>
          <li><b>Slack</b>: Export channel as JSON</li>
        </ul>
      </div>
    </div>
  );
}
