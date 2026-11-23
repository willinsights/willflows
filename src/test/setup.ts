import "@testing-library/jest-dom";
import { vi } from "vitest";

// B4: Node >= 25 exposes its own global localStorage/sessionStorage, which is
// undefined without --localstorage-file and shadows jsdom's. Provide an
// in-memory Storage when the environment does not give a working one.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null; }
  key(index: number) { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
}
for (const name of ["localStorage", "sessionStorage"] as const) {
  let current: Storage | undefined;
  try { current = (globalThis as Record<string, unknown>)[name] as Storage | undefined; } catch { current = undefined; }
  if (!current || typeof current.clear !== "function") {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, name, { configurable: true, value: storage });
    if (typeof window !== "undefined") Object.defineProperty(window, name, { configurable: true, value: storage });
  }
}

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
(globalThis as any).ResizeObserver = vi.fn(class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
});

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = vi.fn(class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
});
