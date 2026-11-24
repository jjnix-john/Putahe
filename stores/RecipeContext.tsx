import React, { createContext, useContext, useEffect, useReducer } from "react";
import { searchMeals, getMealById, recipeToRow, rowToRecipe } from "@/lib/mealdb";
import { getDb } from "@/lib/database";
import type {
  CachedRecipeRow,
  Recipe,
  RecipeAction,
  RecipeContextValue,
  RecipeState,
} from "@/types/index";

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: RecipeState = {
  results: [],
  selectedRecipe: null,
  savedRecipes: [],
  loading: false,
  error: null,
};

function recipeReducer(state: RecipeState, action: RecipeAction): RecipeState {
  switch (action.type) {
    case "SEARCH":
      return { ...state, results: action.results, loading: false, error: null };
    case "SELECT_RECIPE":
      return { ...state, selectedRecipe: action.recipe, loading: false, error: null };
    case "SET_SAVED":
      return { ...state, savedRecipes: action.recipes };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };
    case "CLEAR_RESULTS":
      return { ...state, results: [], error: null };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const RecipeContext = createContext<RecipeContextValue | undefined>(undefined);

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(recipeReducer, initialState);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const rows = await db.getAllAsync<CachedRecipeRow>(
          "SELECT * FROM saved_recipes ORDER BY cached_at DESC"
        );
        dispatch({ type: "SET_SAVED", recipes: rows.map(rowToRecipe) });
      } catch (e) {
        console.error("Failed to load saved recipes:", e);
      }
    })();
  }, []);

  /**
   * Search TheMealDB by keyword. Results are written to SQLite cache.
   */
  async function search(query: string): Promise<void> {
    if (!query.trim()) {
      dispatch({ type: "CLEAR_RESULTS" });
      return;
    }
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const recipes = await searchMeals(query);
      // Cache each result
      const db = await getDb();
      for (const recipe of recipes) {
        const row = recipeToRow(recipe);
        await db.runAsync(
          `INSERT OR REPLACE INTO cached_recipes
           (id, title, category, area, instructions, thumbnail, ingredients, source, cached_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id, row.title, row.category, row.area,
            row.instructions, row.thumbnail, row.ingredients,
            row.source, row.cached_at,
          ]
        );
      }
      dispatch({ type: "SEARCH", results: recipes });
    } catch (e: unknown) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "Search failed.",
      });
    }
  }

  /**
   * Load a recipe by ID. Checks SQLite cache first; falls back to API.
   */
  async function loadRecipe(id: string): Promise<void> {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      // 1. Try cache
      const db = await getDb();
      const cached = await db.getFirstAsync<{
        id: string; title: string; category: string | null;
        area: string | null; instructions: string | null;
        thumbnail: string | null; ingredients: string | null;
        source: string | null; cached_at: number;
      }>("SELECT * FROM cached_recipes WHERE id = ?", [id]);

      if (cached) {
        dispatch({ type: "SELECT_RECIPE", recipe: rowToRecipe(cached) });
        return;
      }

      // 2. Fetch from API and cache
      const recipe = await getMealById(id);
      if (!recipe) {
        dispatch({ type: "SET_ERROR", error: "Recipe not found." });
        return;
      }
      const row = recipeToRow(recipe);
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_recipes
         (id, title, category, area, instructions, thumbnail, ingredients, source, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id, row.title, row.category, row.area,
          row.instructions, row.thumbnail, row.ingredients,
          row.source, row.cached_at,
        ]
      );
      dispatch({ type: "SELECT_RECIPE", recipe });
    } catch (e: unknown) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "Failed to load recipe.",
      });
    }
  }

  async function saveRecipe(recipe: Recipe): Promise<void> {
    const db = await getDb();
    const row = recipeToRow(recipe);
    await db.runAsync(
      `INSERT OR REPLACE INTO saved_recipes
       (id, title, category, area, instructions, thumbnail, ingredients, source, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.title,
        row.category,
        row.area,
        row.instructions,
        row.thumbnail,
        row.ingredients,
        row.source,
        row.cached_at,
      ]
    );
    await db.runAsync(
      `INSERT OR REPLACE INTO cached_recipes
       (id, title, category, area, instructions, thumbnail, ingredients, source, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.title,
        row.category,
        row.area,
        row.instructions,
        row.thumbnail,
        row.ingredients,
        row.source,
        row.cached_at,
      ]
    );
    const updated = [
      recipe,
      ...state.savedRecipes.filter((r) => r.id !== recipe.id),
    ];
    dispatch({ type: "SET_SAVED", recipes: updated });
  }

  async function removeSavedRecipe(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM saved_recipes WHERE id = ?", [id]);
    dispatch({
      type: "SET_SAVED",
      recipes: state.savedRecipes.filter((r) => r.id !== id),
    });
  }

  function isRecipeSaved(id: string): boolean {
    return state.savedRecipes.some((r) => r.id === id);
  }

  function clearResults(): void {
    dispatch({ type: "CLEAR_RESULTS" });
  }

  const value: RecipeContextValue = {
    ...state,
    search,
    loadRecipe,
    saveRecipe,
    removeSavedRecipe,
    isRecipeSaved,
    clearResults,
  };

  return (
    <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRecipes(): RecipeContextValue {
  const ctx = useContext(RecipeContext);
  if (!ctx) {
    throw new Error("useRecipes must be used inside <RecipeProvider>");
  }
  return ctx;
}
