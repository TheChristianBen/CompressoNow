import type { AppSettings, ExtractedItem, NormalizedMessage } from "@/types";
import { DEFAULT_SETTINGS, STORE_ITEMS, STORE_KEY, STORE_MESSAGES, STORE_SETTINGS } from "@/config";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("catchup-db", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_ITEMS)) db.createObjectStore(STORE_ITEMS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMessages(messages: NormalizedMessage[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MESSAGES, "readwrite");
    const store = tx.objectStore(STORE_MESSAGES);
    store.clear();
    for (const m of messages) store.put(m);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadMessages(): Promise<NormalizedMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MESSAGES, "readonly");
    const store = tx.objectStore(STORE_MESSAGES);
    const req = store.getAll();
    req.onsuccess = () => { db.close(); resolve(req.result as NormalizedMessage[]); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function saveItems(items: ExtractedItem[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, "readwrite");
    const store = tx.objectStore(STORE_ITEMS);
    store.clear();
    for (const it of items) store.put(it);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadItems(): Promise<ExtractedItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, "readonly");
    const store = tx.objectStore(STORE_ITEMS);
    const req = store.getAll();
    req.onsuccess = () => { db.close(); resolve(req.result as ExtractedItem[]); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put(settings, STORE_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readonly");
    const req = tx.objectStore(STORE_SETTINGS).get(STORE_KEY);
    req.onsuccess = () => {
      db.close();
      resolve(req.result ?? { ...DEFAULT_SETTINGS, weights: { ...DEFAULT_SETTINGS.weights } });
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteAllData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_MESSAGES, STORE_ITEMS, STORE_SETTINGS], "readwrite");
    tx.objectStore(STORE_MESSAGES).clear();
    tx.objectStore(STORE_ITEMS).clear();
    tx.objectStore(STORE_SETTINGS).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
