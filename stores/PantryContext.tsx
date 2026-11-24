import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { getDb } from "@/lib/database";
import { getMealsByCategory, recipeToRow, rowToRecipe } from "@/lib/mealdb";
import { matchRecipes } from "@/lib/matcher";
import type {
  PantryAction,
  PantryContextValue,
  PantryIngredient,
  PantryIngredientRow,
  PantryState,
} from "@/types/index";

// ─── Categories to fetch for matching pool ────────────────────────────────────

const MATCH_CATEGORIES = [
  "Chicken",
  "Beef",
  "Seafood",
  "Vegetarian",
  "Pasta",
  "Lamb",
  "Pork",
];

// ─── Row ↔ state conversion ───────────────────────────────────────────────────

function rowToIngredient(row: PantryIngredientRow): PantryIngredient {
  return {
    id: row.id,
    name: row.name,
    normalizedKey: row.normalized_key,
    quantity: row.quantity,
    unit: row.unit,
    isActive: row.is_active === 1,
    addedAt: row.added_at,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: PantryState = {
  ingredients: [],
  matchResults: null,
  loading: false,
  error: null,
};

function pantryReducer(state: PantryState, action: PantryAction): PantryState {
  switch (action.type) {
    case "SET_INGREDIENTS":
      return { ...state, ingredients: action.ingredients };
    case "ADD_INGREDIENT":
      return {
        ...state,
        ingredients: [action.ingredient, ...state.ingredients],
      };
    case "REMOVE_INGREDIENT":
      return {
        ...state,
        ingredients: state.ingredients.filter((i) => i.id !== action.id),
      };
    case "TOGGLE_INGREDIENT":
      return {
        ...state,
        ingredients: state.ingredients.map((i) =>
          i.id === action.id ? { ...i, isActive: !i.isActive } : i
        ),
      };
    case "SET_MATCH_RESULTS":
      return { ...state, matchResults: action.results, loading: false, error: null };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PantryContext = createContext<PantryContextValue | undefined>(undefined);

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(pantryReducer, initialState);

  // Load persisted ingredients from SQLite on mount
  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const rows = await db.getAllAsync<PantryIngredientRow>(
          "SELECT * FROM pantry_ingredients ORDER BY added_at DESC"
        );
        dispatch({
          type: "SET_INGREDIENTS",
          ingredients: rows.map(rowToIngredient),
        });
      } catch (e) {
        console.error("Failed to load pantry from SQLite:", e);
      }
    })();
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function addIngredient(
    name: string,
    quantity?: string,
    unit?: string
  ): Promise<void> {
    const db = await getDb();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const normalizedKey = name.trim().toLowerCase();
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO pantry_ingredients (id, name, normalized_key, quantity, unit, is_active, added_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [id, name.trim(), normalizedKey, quantity ?? null, unit ?? null, now]
    );

    dispatch({
      type: "ADD_INGREDIENT",
      ingredient: {
        id,
        name: name.trim(),
        normalizedKey,
        quantity: quantity ?? null,
        unit: unit ?? null,
        isActive: true,
        addedAt: now,
      },
    });
  }

  async function removeIngredient(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM pantry_ingredients WHERE id = ?", [id]);
    dispatch({ type: "REMOVE_INGREDIENT", id });
  }

  async function toggleIngredient(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "UPDATE pantry_ingredients SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?",
      [id]
    );
    dispatch({ type: "TOGGLE_INGREDIENT", id });
  }

  /**
   * Fetch recipes across multiple categories, cache them, then run ingredient matching.
   */
  async function findMatches(): Promise<void> {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const db = await getDb();
      const recipeMap = new Map<string, ReturnType<typeof rowToRecipe>>();

      for (const category of MATCH_CATEGORIES) {
        const meals = await getMealsByCategory(category);
        for (const recipe of meals) {
          if (!recipeMap.has(recipe.id)) {
            recipeMap.set(recipe.id, recipe);
            // Cache in SQLite
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
        }
      }

      const allRecipes = [...recipeMap.values()];
      const results = matchRecipes(state.ingredients, allRecipes);
      dispatch({ type: "SET_MATCH_RESULTS", results });
    } catch (e: unknown) {
      dispatch({
        type: "SET_ERROR",
        error: e instanceof Error ? e.message : "Matching failed.",
      });
    }
  }

  const value: PantryContextValue = {
    ...state,
    addIngredient,
    removeIngredient,
    toggleIngredient,
    findMatches,
  };

  return (
    <PantryContext.Provider value={value}>{children}</PantryContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePantry(): PantryContextValue {
  const ctx = useContext(PantryContext);
  if (!ctx) {
    throw new Error("usePantry must be used inside <PantryProvider>");
  }
  return ctx;
}
