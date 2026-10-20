import { SurahDetail } from "@/types";

const DB_NAME = "noor_islamic_db";
const DB_VERSION = 1;
const STORE_SURAHS = "cached_surahs";
const STORE_ACTIVITY_LOG = "spiritual_activity_logs";

export interface SpiritualActivityEntry {
  id: string;
  dateKey: string;
  type: "quran-wird" | "adhkar-complete" | "tasbeeh-milestone";
  titleAr: string;
  detailsAr: string;
  timestamp: string;
}

function openNoorDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_SURAHS)) {
          db.createObjectStore(STORE_SURAHS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_ACTIVITY_LOG)) {
          const logStore = db.createObjectStore(STORE_ACTIVITY_LOG, { keyPath: "id" });
          logStore.createIndex("dateKey", "dateKey", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function cacheSurahInIndexedDB(surah: SurahDetail): Promise<void> {
  const db = await openNoorDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SURAHS, "readwrite");
      tx.objectStore(STORE_SURAHS).put(surah);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getCachedSurahFromIndexedDB(surahId: number): Promise<SurahDetail | null> {
  const db = await openNoorDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SURAHS, "readonly");
      const req = tx.objectStore(STORE_SURAHS).get(surahId);
      req.onsuccess = () => resolve((req.result as SurahDetail) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function logSpiritualActivity(
  entry: Omit<SpiritualActivityEntry, "id" | "timestamp">
): Promise<void> {
  const db = await openNoorDB();
  if (!db) return;

  const fullEntry: SpiritualActivityEntry = {
    ...entry,
    id: `${entry.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ACTIVITY_LOG, "readwrite");
      tx.objectStore(STORE_ACTIVITY_LOG).put(fullEntry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getSpiritualActivityLogs(limit = 30): Promise<SpiritualActivityEntry[]> {
  const db = await openNoorDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ACTIVITY_LOG, "readonly");
      const req = tx.objectStore(STORE_ACTIVITY_LOG).getAll();
      req.onsuccess = () => {
        const items = (req.result as SpiritualActivityEntry[]) || [];
        items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        resolve(items.slice(0, limit));
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function clearIndexedDBData(): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  const db = await openNoorDB();
  if (db) {
    try {
      const tx = db.transaction([STORE_SURAHS, STORE_ACTIVITY_LOG], "readwrite");
      tx.objectStore(STORE_SURAHS).clear();
      tx.objectStore(STORE_ACTIVITY_LOG).clear();
    } catch {
      // ignore
    }
  }
}
