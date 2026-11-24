import type { Ingredient, Recipe } from "@/types/index";

const BASE_URL = "https://www.themealdb.com/api/json/v1/1";

// ─── Raw API types ────────────────────────────────────────────────────────────

interface RawMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strSource: string | null;
  strYoutube: string | null;
  [key: string]: string | null;
}

interface SearchResponse {
  meals: RawMeal[] | null;
}

interface CategoryListResponse {
  meals: Array<{ idMeal: string; strMeal: string; strMealThumb: string }> | null;
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * TheMealDB returns ingredients/measures as 20 flat fields:
 *   strIngredient1..strIngredient20 / strMeasure1..strMeasure20
 * This collapses them into a typed array, dropping empty entries.
 */
function normalizeIngredients(raw: RawMeal): Ingredient[] {
  const ingredients: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = raw[`strIngredient${i}`]?.trim() ?? "";
    const measure = raw[`strMeasure${i}`]?.trim() ?? "";
    if (name) {
      ingredients.push({ name, measure });
    }
  }
  return ingredients;
}

function normalizeRecipe(raw: RawMeal): Recipe {
  return {
    id: raw.idMeal,
    title: raw.strMeal,
    category: raw.strCategory ?? "",
    area: raw.strArea ?? "",
    instructions: raw.strInstructions ?? "",
    thumbnail: raw.strMealThumb ?? "",
    ingredients: normalizeIngredients(raw),
    source: raw.strSource ?? "",
    youtubeUrl: raw.strYoutube ?? undefined,
  };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TheMealDB request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search meals by name. Returns an empty array when nothing matches.
 */
export async function searchMeals(query: string): Promise<Recipe[]> {
  if (!query.trim()) return [];
  const data = await fetchJson<SearchResponse>(
    `${BASE_URL}/search.php?s=${encodeURIComponent(query.trim())}`
  );
  return (data.meals ?? []).map(normalizeRecipe);
}

/**
 * Fetch a single meal by ID. Returns null when not found.
 */
export async function getMealById(id: string): Promise<Recipe | null> {
  const data = await fetchJson<SearchResponse>(
    `${BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`
  );
  const meals = data.meals ?? [];
  return meals.length > 0 ? normalizeRecipe(meals[0]) : null;
}

/**
 * Fetch all meals for a given category.
 * Note: the category-filter endpoint returns only id, name, thumbnail.
 * Full details must be fetched per-meal via getMealById.
 */
export async function getMealIdsByCategory(
  category: string
): Promise<string[]> {
  const data = await fetchJson<CategoryListResponse>(
    `${BASE_URL}/filter.php?c=${encodeURIComponent(category)}`
  );
  return (data.meals ?? []).map((m) => m.idMeal);
}

/**
 * Fetch full recipes for all meals in a category.
 * Batches individual getMealById calls; silently skips any that fail.
 */
export async function getMealsByCategory(category: string): Promise<Recipe[]> {
  const ids = await getMealIdsByCategory(category);
  const results = await Promise.allSettled(ids.map((id) => getMealById(id)));
  return results
    .filter(
      (r): r is PromiseFulfilledResult<Recipe> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

/**
 * Convert a Recipe to a CachedRecipeRow-compatible plain object
 * (ingredients serialized to JSON string).
 */
export function recipeToRow(recipe: Recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    area: recipe.area,
    instructions: recipe.instructions,
    thumbnail: recipe.thumbnail,
    ingredients: JSON.stringify(recipe.ingredients),
    source: recipe.source,
    cached_at: Date.now(),
  };
}

/**
 * Parse a CachedRecipeRow back into a Recipe, handling malformed JSON safely.
 */
export function rowToRecipe(row: {
  id: string;
  title: string;
  category: string | null;
  area: string | null;
  instructions: string | null;
  thumbnail: string | null;
  ingredients: string | null;
  source: string | null;
}): Recipe {
  let ingredients: Ingredient[] = [];
  try {
    ingredients = JSON.parse(row.ingredients ?? "[]") as Ingredient[];
  } catch {
    ingredients = [];
  }
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? "",
    area: row.area ?? "",
    instructions: row.instructions ?? "",
    thumbnail: row.thumbnail ?? "",
    ingredients,
    source: row.source ?? "",
  };
}
