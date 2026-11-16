import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Minimal in-memory `localStorage` implementation so the persistent
 * Khatmah (30-Juz completion) logic can be exercised in the Node test env.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const storage = new MemoryStorage();

vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", {
  localStorage: storage,
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

const {
  completeQuranJuzInKhatmah,
  getQuranKhatmahJuzState,
  STORAGE_KEYS,
} = await import("@/lib/storage/local-storage");

describe("5. تسجيل إتمام الأجزاء الثلاثين (الختمة) في LocalStorage", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("يسجل إتمام الجزء ويحفظه بصورة مستمرة بين مرات القراءة", () => {
    const first = completeQuranJuzInKhatmah(1);
    expect(first.isJuzCompletedNow).toBe(true);
    expect(first.khatmahJustCompleted).toBe(false);
    expect(first.state.completedJuzIds).toEqual([1]);

    // Re-reading the stored state (browser restart) keeps the completion
    expect(getQuranKhatmahJuzState().completedJuzIds).toEqual([1]);

    const second = completeQuranJuzInKhatmah(5);
    expect(second.state.completedJuzIds).toEqual([1, 5]);
    expect(getQuranKhatmahJuzState().completedJuzIds).toEqual([1, 5]);
  });

  it("يتجاهل أرقام الأجزاء غير الصحيحة (أقل من ١ أو أكثر من ٣٠)", () => {
    completeQuranJuzInKhatmah(0);
    completeQuranJuzInKhatmah(31);
    completeQuranJuzInKhatmah(Number.NaN);
    expect(getQuranKhatmahJuzState().completedJuzIds).toEqual([]);
  });

  it("يعيد ضبط الأجزاء الثلاثين تلقائيًا بعد إتمام الختمة كاملة ويزيد عدّاد الختمات", () => {
    for (let juz = 1; juz <= 29; juz++) {
      const res = completeQuranJuzInKhatmah(juz);
      expect(res.khatmahJustCompleted).toBe(false);
    }

    const last = completeQuranJuzInKhatmah(30);
    expect(last.khatmahJustCompleted).toBe(true);
    expect(last.state.completedJuzIds).toEqual([]);
    expect(last.state.completedKhatmahCount).toBe(1);

    // The reset is persisted, so every Juz button is back to its default caption
    const persisted = getQuranKhatmahJuzState();
    expect(persisted.completedJuzIds).toEqual([]);
    expect(persisted.completedKhatmahCount).toBe(1);
    expect(storage.getItem(STORAGE_KEYS.QURAN_COMPLETED_JUZS)).toContain(
      '"completedJuzIds":[]'
    );
  });

  it("لا يفقـد الأجزاء المكررة عند التسجيل المتكرر لنفس الجزء", () => {
    completeQuranJuzInKhatmah(7);
    completeQuranJuzInKhatmah(7);
    const state = getQuranKhatmahJuzState();
    expect(state.completedJuzIds).toEqual([7]);
    expect(state.completedKhatmahCount).toBe(0);
  });
});
