import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import {
  getInitialRecipeCatalog,
  getMealById,
  getMealsByCategory,
  recipeToRow,
  rowToRecipe,
  searchMeals,
} from "@/lib/mealdb";
import { getDb } from "@/lib/database";
import type {
  CachedRecipeRow,
  Recipe,
  RecipeAction,
  RecipeContextValue,
  RecipeState,
} from "@/types/index";

const DEFAULT_CATEGORIES = [
  "All",
  "Filipino",
  "Chicken",
  "Beef",
  "Seafood",
  "Pasta",
  "Vegetarian",
  "Pork",
  "Dessert",
];

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: RecipeState = {
  results: [],
  catalog: [],
  categories: DEFAULT_CATEGORIES,
  selectedCategory: "All",
  selectedRecipe: null,
  savedRecipes: [],
  loading: false,
  catalogLoading: true,
  error: null,
};

function recipeReducer(state: RecipeState, action: RecipeAction): RecipeState {
  switch (action.type) {
    case "SEARCH":
      return { ...state, results: action.results, loading: false, error: null };
    case "SET_CATALOG":
      return {
        ...state,
        catalog: action.catalog,
        categories: action.categories,
        catalogLoading: false,
        error: null,
      };
    case "SET_CATEGORY":
      return { ...state, selectedCategory: action.category };
    case "SELECT_RECIPE":
      return {
        ...state,
        selectedRecipe: action.recipe,
        loading: false,
        error: null,
      };
    case "SET_SAVED":
      return { ...state, savedRecipes: action.recipes };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_CATALOG_LOADING":
      return { ...state, catalogLoading: action.loading };
    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
        loading: false,
        catalogLoading: false,
      };
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

  const loadCatalog = useCallback(async () => {
    dispatch({ type: "SET_CATALOG_LOADING", loading: true });
    try {
      const recipes = await getInitialRecipeCatalog();
      const db = await getDb();
      for (const recipe of recipes.slice(0, 80)) {
        const row = recipeToRow(recipe);
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
      }

      const dynamicCats = new Set<string>(DEFAULT_CATEGORIES);
      for (const r of recipes) {
        if (r.category) dynamicCats.add(r.category);
      }

      dispatch({
        type: "SET_CATALOG",
        catalog: recipes,
        categories: [...dynamicCats].slice(0, 12),
      });
    } catch (e: unknown) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "Failed to load recipe catalog.",
      });
    }
  }, []);

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

    loadCatalog();
  }, [loadCatalog]);

  const selectCategory = useCallback(
    async (category: string): Promise<void> => {
      dispatch({ type: "SET_CATEGORY", category });
      if (category === "All") return;

      // Check if we already have enough items for this category in catalog
      const matchingInCatalog = state.catalog.filter(
        (r) =>
          r.category.toLowerCase() === category.toLowerCase() ||
          r.area.toLowerCase() === category.toLowerCase() ||
          (r.tags ?? []).some((t) => t.toLowerCase() === category.toLowerCase())
      );

      if (matchingInCatalog.length >= 6) return;

      try {
        const extra = await getMealsByCategory(category);
        if (extra.length > 0) {
          const map = new Map<string, Recipe>();
          for (const r of [...state.catalog, ...extra]) {
            map.set(r.id, r);
          }
          dispatch({
            type: "SET_CATALOG",
            catalog: [...map.values()],
            categories: state.categories,
          });
        }
      } catch {
        // non-fatal
      }
    },
    [state.catalog, state.categories]
  );

  const search = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      dispatch({ type: "CLEAR_RESULTS" });
      return;
    }
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const recipes = await searchMeals(query);
      const db = await getDb();
      for (const recipe of recipes) {
        const row = recipeToRow(recipe);
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
      }
      dispatch({ type: "SEARCH", results: recipes });
    } catch (e: unknown) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "Search failed.",
      });
    }
  }, []);

  const loadRecipe = useCallback(
    async (id: string): Promise<void> => {
      dispatch({ type: "SET_LOADING", loading: true });
      try {
        // Check memory catalog first for rich metadata
        const inCatalog =
          state.catalog.find((r) => r.id === id) ??
          state.results.find((r) => r.id === id) ??
          state.savedRecipes.find((r) => r.id === id);
        if (inCatalog && inCatalog.instructions) {
          dispatch({ type: "SELECT_RECIPE", recipe: inCatalog });
          return;
        }

        const db = await getDb();
        const cached = await db.getFirstAsync<CachedRecipeRow>(
          "SELECT * FROM cached_recipes WHERE id = ?",
          [id]
        );

        if (cached) {
          dispatch({ type: "SELECT_RECIPE", recipe: rowToRecipe(cached) });
          return;
        }

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
        dispatch({ type: "SELECT_RECIPE", recipe });
      } catch (e: unknown) {
        dispatch({
          type: "SET_ERROR",
          error: e instanceof Error ? e.message : "Failed to load recipe.",
        });
      }
    },
    [state.catalog, state.results, state.savedRecipes]
  );

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

  const clearResults = useCallback((): void => {
    dispatch({ type: "CLEAR_RESULTS" });
  }, []);

  const value: RecipeContextValue = {
    ...state,
    search,
    loadCatalog,
    selectCategory,
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
