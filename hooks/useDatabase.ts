import { useCallback } from "react";
import { getDb } from "@/lib/database";
import type { CachedRecipeRow, PantryIngredientRow } from "@/types/index";

// ─── Recipe cache ─────────────────────────────────────────────────────────────

/** Insert or replace a recipe in the local cache. */
async function insertRecipe(recipe: CachedRecipeRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO cached_recipes
     (id, title, category, area, instructions, thumbnail, ingredients, source, cached_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recipe.id,
      recipe.title,
      recipe.category ?? null,
      recipe.area ?? null,
      recipe.instructions ?? null,
      recipe.thumbnail ?? null,
      recipe.ingredients ?? null,
      recipe.source ?? null,
      recipe.cached_at,
    ]
  );
}

/** Fetch a single recipe by ID from cache. Returns null on miss. */
async function getRecipeById(id: string): Promise<CachedRecipeRow | null> {
  const db = await getDb();
  return db.getFirstAsync<CachedRecipeRow>(
    "SELECT * FROM cached_recipes WHERE id = ?",
    [id]
  );
}

/** Full-text search over recipe titles in cache. */
async function searchRecipes(query: string): Promise<CachedRecipeRow[]> {
  const db = await getDb();
  return db.getAllAsync<CachedRecipeRow>(
    "SELECT * FROM cached_recipes WHERE title LIKE ? ORDER BY title ASC",
    [`%${query}%`]
  );
}

/** Remove recipes cached more than `maxAgeDays` days ago. */
async function clearOldCache(maxAgeDays = 7): Promise<void> {
  const db = await getDb();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  await db.runAsync("DELETE FROM cached_recipes WHERE cached_at < ?", [cutoff]);
}

// ─── Pantry ingredients ───────────────────────────────────────────────────────

/** Add a new ingredient to the pantry. */
async function addIngredient(
  name: string,
  quantity?: string,
  unit?: string
): Promise<PantryIngredientRow> {
  const db = await getDb();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const normalizedKey = name.trim().toLowerCase();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO pantry_ingredients (id, name, normalized_key, quantity, unit, is_active, added_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [id, name.trim(), normalizedKey, quantity ?? null, unit ?? null, now]
  );

  return {
    id,
    name: name.trim(),
    normalized_key: normalizedKey,
    quantity: quantity ?? null,
    unit: unit ?? null,
    is_active: 1,
    added_at: now,
  };
}

/** Remove an ingredient from the pantry by ID. */
async function removeIngredient(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM pantry_ingredients WHERE id = ?", [id]);
}

/** Toggle the active/inactive state of a pantry ingredient. */
async function toggleIngredient(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE pantry_ingredients SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?",
    [id]
  );
}

/** Fetch all pantry ingredients, ordered by most recently added. */
async function getAllIngredients(): Promise<PantryIngredientRow[]> {
  const db = await getDb();
  return db.getAllAsync<PantryIngredientRow>(
    "SELECT * FROM pantry_ingredients ORDER BY added_at DESC"
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Provides stable references to all SQLite CRUD operations.
 * Functions are memoized with useCallback so callers can safely
 * include them in dependency arrays.
 */
export function useDatabase() {
  return {
    insertRecipe: useCallback(insertRecipe, []),
    getRecipeById: useCallback(getRecipeById, []),
    searchRecipes: useCallback(searchRecipes, []),
    clearOldCache: useCallback(clearOldCache, []),
    addIngredient: useCallback(addIngredient, []),
    removeIngredient: useCallback(removeIngredient, []),
    toggleIngredient: useCallback(toggleIngredient, []),
    getAllIngredients: useCallback(getAllIngredients, []),
  };
}
