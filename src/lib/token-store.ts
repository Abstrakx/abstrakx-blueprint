import { LazyStore } from '@tauri-apps/plugin-store';

const STORE_PATH = 'abstrakx_tokens.json';

// In-memory or localStorage fallback for web dev mode
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let tauriStore: LazyStore | null = null;
if (isTauri) {
  try {
    tauriStore = new LazyStore(STORE_PATH);
  } catch (err) {
    console.error('Failed to initialize Tauri LazyStore:', err);
  }
}

export async function saveToken(key: string, value: string): Promise<void> {
  if (isTauri && tauriStore) {
    await tauriStore.set(key, value);
    await tauriStore.save();
  } else {
    localStorage.setItem(key, value);
  }
}

export async function getToken(key: string): Promise<string | null> {
  if (isTauri && tauriStore) {
    const val = await tauriStore.get(key);
    return typeof val === 'string' ? val : null;
  } else {
    return localStorage.getItem(key);
  }
}

export async function removeToken(key: string): Promise<void> {
  if (isTauri && tauriStore) {
    await tauriStore.delete(key);
    await tauriStore.save();
  } else {
    localStorage.removeItem(key);
  }
}

export async function clearAllTokens(): Promise<void> {
  if (isTauri && tauriStore) {
    await tauriStore.clear();
    await tauriStore.save();
  } else {
    localStorage.clear();
  }
}
