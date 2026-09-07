/**
 * Minimal browser globals for the persistence and store tests.
 *
 * The app only needs `window.localStorage`, so a small in-memory stub is
 * enough — no jsdom, and the suite stays fast.
 */

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, "window", {
  value: { localStorage: storage, scrollTo: () => {} },
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  writable: true,
  configurable: true,
});

/** Call between tests to start from a clean browser. */
export function clearStorage(): void {
  storage.clear();
}
