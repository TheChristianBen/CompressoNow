import { useEffect, useState, useCallback, useMemo } from "react";
import { Moon, Sun, Settings as SettingsIcon, FlaskConical, RefreshCw, MessageCircle, Inbox } from "lucide-react";
import type { AppSettings, ChatFormat, ExtractedItem, NormalizedMessage } from "@/types";
import { DEFAULT_SETTINGS } from "@/config";
import { loadMessages, saveMessages, loadItems, saveItems, loadSettings, saveSettings, deleteAllData } from "@/lib/db";
import { processMessages } from "@/lib/processor";
import { isLLMAvailable, setLLMAvailable } from "@/lib/llm";

import { ImportPanel } from "@/components/ImportPanel";
import { LastSeenSelector } from "@/components/LastSeenSelector";
import { BriefingDashboard } from "@/components/BriefingDashboard";
import { MessageDetailPanel } from "@/components/MessageDetailPanel";
import { AskChatBox } from "@/components/AskChatBox";
import { PrivacyPanel } from "@/components/PrivacyPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { EvaluationPage } from "@/components/EvaluationPage";

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("catchup-dark");
    if (saved !== null) return saved === "true";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS, weights: { ...DEFAULT_SETTINGS.weights } });
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<ExtractedItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEval, setShowEval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedFormat, setImportedFormat] = useState<ChatFormat | "sample" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [networkRequestCount] = useState(0);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("catchup-dark", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    setLLMAvailable(false);
    (async () => {
      try {
        const [savedSettings, savedMessages, savedItems] = await Promise.all([
          loadSettings(),
          loadMessages(),
          loadItems(),
        ]);
        setSettings(savedSettings);
        if (savedMessages.length > 0) {
          setMessages(savedMessages);
          if (savedItems.length > 0) {
            setItems(savedItems);
          }
        }
      } catch {
        // DB might not be available in some contexts
      }
      setHasLoadedFromDB(true);
    })();
  }, []);

  const filteredMessages = useMemo(() => {
    if (lastSeenTimestamp === null) return messages;
    return messages.filter((m) => m.timestamp > lastSeenTimestamp);
  }, [messages, lastSeenTimestamp]);

  const processAndSave = useCallback(async (msgs: NormalizedMessage[], currentSettings: AppSettings) => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 50));
    const processed = processMessages(msgs, currentSettings);
    setItems(processed);
    try {
      await saveItems(processed);
    } catch {
      // ignore
    }
    setProcessing(false);
  }, []);

  const handleMessagesLoaded = useCallback(async (msgs: NormalizedMessage[], format: ChatFormat | "sample") => {
    setError(null);
    setMessages(msgs);
    setImportedFormat(format);
    setLastSeenTimestamp(null);
    setSelectedItem(null);
    try {
      await saveMessages(msgs);
    } catch {
      // ignore
    }
    await processAndSave(msgs, settings);
  }, [settings, processAndSave]);

  const handleLastSeenSelect = useCallback((ts: number) => {
    setLastSeenTimestamp(ts);
    setSelectedItem(null);
  }, []);

  const handleReprocess = useCallback(() => {
    const msgs = filteredMessages.length > 0 ? filteredMessages : messages;
    processAndSave(msgs, settings);
  }, [filteredMessages, messages, settings, processAndSave]);

  const handleSaveSettings = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      await saveSettings(newSettings);
    } catch {
      // ignore
    }
    const msgs = filteredMessages.length > 0 ? filteredMessages : messages;
    if (msgs.length > 0) {
      await processAndSave(msgs, newSettings);
    }
  }, [filteredMessages, messages, processAndSave]);

  const handleDeleteAll = useCallback(async () => {
    try {
      await deleteAllData();
    } catch {
      // ignore
    }
    setMessages([]);
    setItems([]);
    setLastSeenTimestamp(null);
    setSelectedItem(null);
    setImportedFormat(null);
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">Compresso</h1>
              <p className="text-xs text-slate-400 leading-none mt-0.5">What did I miss?</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasMessages && (
              <button
                onClick={handleReprocess}
                disabled={processing}
                className="btn-secondary px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${processing ? "animate-spin" : ""}`} />
                Reprocess
              </button>
            )}
            <button
              onClick={() => setShowEval(true)}
              className="btn-secondary px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Eval
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="btn-secondary p-2 rounded-lg"
              aria-label="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="btn-secondary p-2 rounded-lg"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {!hasMessages && hasLoadedFromDB ? (
          <div className="max-w-xl mx-auto pt-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Compress your chats</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Import a chat export and get a prioritized briefing of what you missed.
                All processing happens in your browser — no data leaves your device.
              </p>
            </div>
            {error && (
              <div className="card p-3 mb-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <ImportPanel onMessagesLoaded={handleMessagesLoaded} onError={setError} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Left: Briefing */}
            <div className="space-y-4 min-w-0">
              {error && (
                <div className="card p-3 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {importedFormat === "sample" ? "Sample Chat" : importedFormat ? importedFormat.charAt(0).toUpperCase() + importedFormat.slice(1) : "Chat"}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {messages.length} messages total
                      {lastSeenTimestamp !== null && ` · ${filteredMessages.length} after "last seen"`}
                    </p>
                  </div>
                </div>
                <LastSeenSelector
                  messages={messages}
                  lastSeenTimestamp={lastSeenTimestamp}
                  onSelect={handleLastSeenSelect}
                />
              </div>

              {processing ? (
                <div className="card p-8 text-center">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Processing messages...</p>
                </div>
              ) : (
                <BriefingDashboard
                  items={items}
                  messages={messages}
                  selectedItem={selectedItem}
                  onSelectItem={setSelectedItem}
                />
              )}

              <AskChatBox messages={messages} onSelectMessage={() => {}} />
            </div>

            {/* Right: Sidebar */}
            <div className="space-y-4">
              <PrivacyPanel
                networkRequestCount={networkRequestCount}
                onDeleteAll={handleDeleteAll}
                messageCount={messages.length}
                itemCount={items.length}
              />
            </div>
          </div>
        )}
      </main>

      {selectedItem && (
        <MessageDetailPanel
          item={selectedItem}
          messages={messages}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showEval && (
        <EvaluationPage settings={settings} onClose={() => setShowEval(false)} />
      )}
    </div>
  );
}
