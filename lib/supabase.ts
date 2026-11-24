import { createClient } from "@supabase/supabase-js";
import type * as SecureStoreTypes from "expo-secure-store";

// Lazy-load expo-secure-store with an in-memory fallback if the native module
// is unavailable in the current client binary.
const _memStore = new Map<string, string>();
let _secureStore: typeof SecureStoreTypes | null | undefined;

function getSecureStore(): typeof SecureStoreTypes | null {
  if (_secureStore !== undefined) return _secureStore;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _secureStore = require("expo-secure-store") as typeof SecureStoreTypes;
  } catch {
    _secureStore = null;
  }
  return _secureStore;
}

async function safeGetItemAsync(key: string): Promise<string | null> {
  const store = getSecureStore();
  if (!store) return _memStore.get(key) ?? null;
  try {
    return await store.getItemAsync(key);
  } catch {
    return _memStore.get(key) ?? null;
  }
}

async function safeSetItemAsync(key: string, value: string): Promise<void> {
  const store = getSecureStore();
  if (!store) {
    _memStore.set(key, value);
    return;
  }
  try {
    await store.setItemAsync(key, value);
  } catch {
    _memStore.set(key, value);
  }
}

async function safeDeleteItemAsync(key: string): Promise<void> {
  const store = getSecureStore();
  if (!store) {
    _memStore.delete(key);
    return;
  }
  try {
    await store.deleteItemAsync(key);
  } catch {
    _memStore.delete(key);
  }
}

// LargeSecureStore adapter: expo-secure-store has a ~2KB value limit per key.
// Supabase session tokens exceed this, so we chunk large values across multiple keys.
const CHUNK_SIZE = 1900; // bytes, safely under the 2048-byte limit

const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const chunkCount = await safeGetItemAsync(`${key}.chunkCount`);
    if (chunkCount == null) {
      // Might be a small value stored without chunking
      return safeGetItemAsync(key);
    }
    const count = parseInt(chunkCount, 10);
    const chunks: string[] = [];
    for (let i = 0; i < count; i++) {
      const chunk = await safeGetItemAsync(`${key}.chunk.${i}`);
      if (chunk == null) return null;
      chunks.push(chunk);
    }
    return chunks.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await safeSetItemAsync(key, value);
      // Clear any stale chunks from a previous large value
      await safeDeleteItemAsync(`${key}.chunkCount`);
      return;
    }
    // Split into chunks
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < chunks.length; i++) {
      await safeSetItemAsync(`${key}.chunk.${i}`, chunks[i]);
    }
    await safeSetItemAsync(
      `${key}.chunkCount`,
      String(chunks.length)
    );
    // Remove any plain key that might exist from before
    await safeDeleteItemAsync(key);
  },

  async removeItem(key: string): Promise<void> {
    const chunkCount = await safeGetItemAsync(`${key}.chunkCount`);
    if (chunkCount != null) {
      const count = parseInt(chunkCount, 10);
      for (let i = 0; i < count; i++) {
        await safeDeleteItemAsync(`${key}.chunk.${i}`);
      }
      await safeDeleteItemAsync(`${key}.chunkCount`);
    }
    await safeDeleteItemAsync(key);
  },
};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: LargeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
