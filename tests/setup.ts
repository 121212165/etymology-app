import "@testing-library/jest-dom/vitest";

const store: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: (key: string) => (key in store ? store[key] : null),
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
  length: 0,
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(localStorageMock, "length", {
  get: () => Object.keys(store).length,
});
