import 'fake-indexeddb/auto'; // Dexie cần IndexedDB trước khi module được nạp

// jsdom không có matchMedia (ngx-sonner/Zard Sonner cần); trình duyệt thật luôn có.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}
