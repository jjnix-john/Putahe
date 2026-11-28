import { Platform } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";
import type { CachedRecipeRow, PantryIngredientRow } from "@/types/index";

// ─── Database version — bump this to trigger future migrations ───────────────
const DB_VERSION = 1;

let _db: SQLiteDatabase | null = null;
let _nativeUnavailable = false;

// In-memory fallback store when the native ExpoSQLite binary is missing
const _memRecipes = new Map<string, CachedRecipeRow>();
const _memPantry = new Map<string, PantryIngredientRow>();
const _memMeta = new Map<string, string>();
const _memSaved = new Map<string, CachedRecipeRow>();

const memoryDb = {
  async execAsync(_source: string): Promise<void> {
    // No-op for DDL in memory mode
  },
  async runAsync(source: string, params: unknown[] = []): Promise<unknown> {
    const sql = source.trim().toUpperCase();
    if (sql.startsWith("INSERT OR REPLACE INTO CACHED_RECIPES")) {
      const [
        id,
        title,
        category,
        area,
        instructions,
        thumbnail,
        ingredients,
        sourceUrl,
        cached_at,
      ] = params as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number,
      ];
      _memRecipes.set(id, {
        id,
        title,
        category,
        area,
        instructions,
        thumbnail,
        ingredients,
        source: sourceUrl,
        cached_at,
      });
    } else if (sql.startsWith("INSERT OR REPLACE INTO SAVED_RECIPES")) {
      const [
        id,
        title,
        category,
        area,
        instructions,
        thumbnail,
        ingredients,
        sourceUrl,
        saved_at,
      ] = params as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number,
      ];
      _memSaved.set(id, {
        id,
        title,
        category,
        area,
        instructions,
        thumbnail,
        ingredients,
        source: sourceUrl,
        cached_at: saved_at,
      });
    } else if (sql.startsWith("DELETE FROM SAVED_RECIPES")) {
      const [id] = params as [string];
      _memSaved.delete(id);
    } else if (sql.startsWith("DELETE FROM CACHED_RECIPES")) {
      const [cutoff] = params as [number];
      for (const [k, v] of _memRecipes.entries()) {
        if (v.cached_at < cutoff) _memRecipes.delete(k);
      }
    } else if (sql.startsWith("INSERT INTO PANTRY_INGREDIENTS")) {
      const [id, name, normalized_key, quantity, unit, added_at] = params as [
        string,
        string,
        string,
        string | null,
        string | null,
        number,
      ];
      _memPantry.set(id, {
        id,
        name,
        normalized_key,
        quantity,
        unit,
        is_active: 1,
        added_at,
      });
    } else if (sql.startsWith("DELETE FROM PANTRY_INGREDIENTS")) {
      const [id] = params as [string];
      _memPantry.delete(id);
    } else if (sql.startsWith("UPDATE PANTRY_INGREDIENTS")) {
      const [id] = params as [string];
      const existing = _memPantry.get(id);
      if (existing) {
        existing.is_active = existing.is_active === 1 ? 0 : 1;
      }
    } else if (
      sql.startsWith("INSERT INTO DB_META") ||
      sql.startsWith("INSERT OR REPLACE INTO DB_META")
    ) {
      const [key, value] = params as [string, string];
      _memMeta.set(key, value);
    }
    return { changes: 1, lastInsertRowId: 0 };
  },
  async getFirstAsync<T>(
    source: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const sql = source.trim().toUpperCase();
    if (sql.includes("FROM CACHED_RECIPES WHERE ID =")) {
      const [id] = params as [string];
      return (_memRecipes.get(id) as unknown as T) ?? null;
    }
    if (sql.includes("FROM SAVED_RECIPES WHERE ID =")) {
      const [id] = params as [string];
      return (_memSaved.get(id) as unknown as T) ?? null;
    }
    if (sql.includes("FROM DB_META WHERE KEY =")) {
      const [key] = params as [string];
      const val = _memMeta.get(key);
      return val !== undefined ? ({ value: val } as unknown as T) : null;
    }
    return null;
  },
  async getAllAsync<T>(
    source: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const sql = source.trim().toUpperCase();
    if (sql.includes("FROM PANTRY_INGREDIENTS")) {
      return [..._memPantry.values()].sort(
        (a, b) => b.added_at - a.added_at
      ) as unknown as T[];
    }
    if (sql.includes("FROM SAVED_RECIPES")) {
      return [..._memSaved.values()].sort(
        (a, b) => b.cached_at - a.cached_at
      ) as unknown as T[];
    }
    if (sql.includes("FROM CACHED_RECIPES WHERE TITLE LIKE")) {
      const [pattern] = params as [string];
      const needle = (pattern ?? "").replace(/%/g, "").toLowerCase();
      return [..._memRecipes.values()]
        .filter((r) => r.title.toLowerCase().includes(needle))
        .sort((a, b) => a.title.localeCompare(b.title)) as unknown as T[];
    }
    return [];
  },
} as unknown as SQLiteDatabase;

export async function getDb(): Promise<SQLiteDatabase> {
  if (_db) return _db;
  if (_nativeUnavailable || Platform.OS === "web") {
    _nativeUnavailable = true;
    return memoryDb;
  }

  try {
    // Lazy-require expo-sqlite so a missing native module does not crash at bundle load time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLite = require("expo-sqlite") as typeof import("expo-sqlite");
    _db = await SQLite.openDatabaseAsync("putahe.db");
    return _db;
  } catch {
    _nativeUnavailable = true;
    return memoryDb;
  }
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const CREATE_CACHED_RECIPES = `
  CREATE TABLE IF NOT EXISTS cached_recipes (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    category    TEXT,
    area        TEXT,
    instructions TEXT,
    thumbnail   TEXT,
    ingredients TEXT,
    source      TEXT,
    cached_at   INTEGER NOT NULL
  );
`;

const CREATE_PANTRY_INGREDIENTS = `
  CREATE TABLE IF NOT EXISTS pantry_ingredients (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    normalized_key TEXT NOT NULL,
    quantity       TEXT,
    unit           TEXT,
    is_active      INTEGER NOT NULL DEFAULT 1,
    added_at       INTEGER NOT NULL
  );
`;

const CREATE_DB_META = `
  CREATE TABLE IF NOT EXISTS db_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const CREATE_SAVED_RECIPES = `
  CREATE TABLE IF NOT EXISTS saved_recipes (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    category    TEXT,
    area        TEXT,
    instructions TEXT,
    thumbnail   TEXT,
    ingredients TEXT,
    source      TEXT,
    cached_at   INTEGER NOT NULL
  );
`;

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  const db = await getDb();

  // Create tables
  await db.execAsync(CREATE_CACHED_RECIPES);
  await db.execAsync(CREATE_PANTRY_INGREDIENTS);
  await db.execAsync(CREATE_DB_META);
  await db.execAsync(CREATE_SAVED_RECIPES);

  // Simple version tracking for future migrations
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM db_meta WHERE key = ?",
    ["version"]
  );

  if (!row) {
    await db.runAsync(
      "INSERT INTO db_meta (key, value) VALUES (?, ?)",
      ["version", String(DB_VERSION)]
    );
  }
  // Future: compare row.value to DB_VERSION and run incremental migrations
}
