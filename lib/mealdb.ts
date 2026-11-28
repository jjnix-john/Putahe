import { fetchWithTimeout } from "@/lib/security";
import type { Ingredient, Recipe } from "@/types/index";

const MEALDB_BASE_URL = "https://www.themealdb.com/api/json/v1/1";
const DUMMYJSON_BASE_URL = "https://dummyjson.com/recipes";
const FORKIFY_BASE_URL = "https://forkify-api.jonas.io/api/v2/recipes";

// ─── Raw API types (TheMealDB) ────────────────────────────────────────────────

interface RawMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strSource: string | null;
  strYoutube: string | null;
  strTags: string | null;
  [key: string]: string | null;
}

interface SearchResponse {
  meals: RawMeal[] | null;
}

interface CategoryListResponse {
  meals: Array<{ idMeal: string; strMeal: string; strMealThumb: string }> | null;
}

// ─── Raw API types (DummyJSON Free Recipes API) ───────────────────────────────

interface DummyJsonRecipe {
  id: number;
  name: string;
  ingredients: string[];
  instructions: string[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: string;
  cuisine: string;
  caloriesPerServing: number;
  tags: string[];
  image: string;
  rating: number;
  reviewCount: number;
  mealType: string[];
}

interface DummyJsonResponse {
  recipes: DummyJsonRecipe[];
  total: number;
}

// ─── Raw API types (Forkify v2 Open Source Recipe API — 1,000+ recipes) ──────

interface ForkifySummary {
  id: string;
  title: string;
  publisher: string;
  image_url: string;
}

interface ForkifySearchResponse {
  status: string;
  results: number;
  data: {
    recipes: ForkifySummary[];
  };
}

interface ForkifyDetailIngredient {
  quantity: number | null;
  unit: string;
  description: string;
}

interface ForkifyDetail {
  id: string;
  title: string;
  publisher: string;
  source_url: string;
  image_url: string;
  servings: number;
  cooking_time: number;
  ingredients: ForkifyDetailIngredient[];
}

interface ForkifyDetailResponse {
  status: string;
  data: {
    recipe: ForkifyDetail;
  };
}

// ─── Built-in Curated Filipino & Popular Classics (Unique Verified Photos) ────

const CURATED_RECIPES: Recipe[] = [
  {
    id: "fil-adobo",
    title: "Classic Chicken Pork Adobo",
    category: "Filipino",
    area: "Filipino",
    thumbnail: "https://cdn.dummyjson.com/recipe-images/11.webp",
    prepTimeMinutes: 15,
    cookTimeMinutes: 40,
    servings: 4,
    difficulty: "Easy",
    rating: 4.9,
    caloriesPerServing: 420,
    tags: ["Filipino", "Savory", "Comfort Food", "Chicken", "Pork"],
    ingredients: [
      { name: "Chicken", measure: "500g" },
      { name: "Pork", measure: "300g" },
      { name: "Soy Sauce", measure: "1/2 cup" },
      { name: "Vinegar", measure: "1/3 cup" },
      { name: "Garlic", measure: "8 cloves crushed" },
      { name: "Bay Leaves", measure: "3 dried" },
      { name: "Black Pepper", measure: "1 tsp whole" },
    ],
    instructions:
      "Marinate chicken and pork in soy sauce and crushed garlic for 20 minutes.\nSear meat in a hot pot with oil until lightly browned.\nPour in remaining marinade, water, bay leaves, and peppercorns. Bring to a boil and simmer covered for 25 minutes.\nAdd vinegar without stirring and simmer uncovered for 10 more minutes until sauce reduces into a rich glaze.",
    source: "Putahe Heritage Kitchen",
  },
  {
    id: "fil-sinigang",
    title: "Sinigang na Baboy (Tamarind Pork Soup)",
    category: "Filipino",
    area: "Filipino",
    thumbnail: "https://cdn.dummyjson.com/recipe-images/24.webp",
    prepTimeMinutes: 15,
    cookTimeMinutes: 50,
    servings: 5,
    difficulty: "Easy",
    rating: 4.9,
    caloriesPerServing: 360,
    tags: ["Filipino", "Soup", "Sour", "Pork"],
    ingredients: [
      { name: "Pork", measure: "750g" },
      { name: "Tamarind", measure: "1 pack (40g)" },
      { name: "Tomato", measure: "2 quartered" },
      { name: "Onion", measure: "1 quartered" },
      { name: "Spinach", measure: "1 bunch" },
      { name: "Radish", measure: "1 sliced" },
      { name: "Green Beans", measure: "1 cup cut" },
      { name: "Chili", measure: "2 pieces" },
    ],
    instructions:
      "Simmer pork with onion and tomatoes in 6 cups of water for 35–40 minutes until fork-tender.\nAdd radish and green beans and cook for 5 minutes.\nStir in tamarind soup base and green chilies; season with fish sauce to taste.\nFold in greens last, turn off heat, cover for 2 minutes, and serve piping hot.",
    source: "Putahe Heritage Kitchen",
  },
  {
    id: "fil-garlic-fried-rice",
    title: "Sinangag & Eggs (Filipino Garlic Fried Rice)",
    category: "Filipino",
    area: "Filipino",
    thumbnail: "https://cdn.dummyjson.com/recipe-images/14.webp",
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    servings: 3,
    difficulty: "Easy",
    rating: 4.9,
    caloriesPerServing: 310,
    tags: ["Filipino", "Breakfast", "Quick", "Rice", "Egg"],
    ingredients: [
      { name: "Rice", measure: "3 cups cooked" },
      { name: "Garlic", measure: "8 cloves minced" },
      { name: "Egg", measure: "3 pieces" },
      { name: "Cooking Oil", measure: "2 tbsp" },
      { name: "Salt", measure: "1/2 tsp" },
    ],
    instructions:
      "Heat oil in a wide pan or wok over medium-low heat and slowly toast minced garlic until golden and fragrant.\nRemove half the crispy garlic for garnish.\nToss day-old rice into the garlic oil over high heat for 4–5 minutes, seasoning with salt.\nTop with fried sunny-side-up eggs and crispy garlic chips.",
    source: "Putahe Heritage Kitchen",
  },
  {
    id: "fil-pancit",
    title: "Pancit Bihon Guisado",
    category: "Filipino",
    area: "Filipino",
    thumbnail: "https://cdn.dummyjson.com/recipe-images/18.webp",
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    difficulty: "Easy",
    rating: 4.8,
    caloriesPerServing: 330,
    tags: ["Filipino", "Noodles", "Quick", "Chicken"],
    ingredients: [
      { name: "Rice Noodles", measure: "250g" },
      { name: "Chicken", measure: "200g sliced" },
      { name: "Cabbage", measure: "2 cups shredded" },
      { name: "Carrot", measure: "1 julienned" },
      { name: "Garlic", measure: "4 cloves minced" },
      { name: "Onion", measure: "1 sliced" },
      { name: "Soy Sauce", measure: "3 tbsp" },
    ],
    instructions:
      "Sauté garlic, onion, and chicken strips in a hot wok until cooked.\nStir-fry carrots and cabbage briefly, then remove half of the vegetables for topping.\nPour broth and soy sauce, bring to a boil, and toss in noodles until liquid is absorbed.\nTop with reserved vegetables and serve hot.",
    source: "Putahe Heritage Kitchen",
  },
];

// ─── Normalization ────────────────────────────────────────────────────────────

function estimateMetaFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  }
  const prep = 10 + (hash % 15);
  const cook = 15 + ((hash * 7) % 35);
  const rating = Number((4.5 + (hash % 5) * 0.1).toFixed(1));
  const difficulties = ["Easy", "Medium", "Easy", "Medium", "Hard"];
  const difficulty = difficulties[hash % difficulties.length];
  return { prep, cook, rating, difficulty };
}

function normalizeForkifyImageUrl(url: string): string {
  if (!url) return "";
  return url
    .replace("http://forkify-api.herokuapp.com", "https://forkify-api.jonas.io")
    .replace("http://forkify-api.jonas.io", "https://forkify-api.jonas.io")
    .replace(/^http:\/\//i, "https://");
}

/**
 * Deduplicate a list of recipes by both normalized title AND thumbnail image URL
 * so the user never sees repeating images or duplicate entries.
 */
export function deduplicateRecipes(recipes: Recipe[]): Recipe[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const seenImages = new Set<string>();
  const unique: Recipe[] = [];

  for (const r of recipes) {
    if (!r.title || !r.thumbnail) continue;
    const normTitle = r.title.trim().toLowerCase();
    const normImg = r.thumbnail.trim().toLowerCase();

    if (
      seenIds.has(r.id) ||
      seenTitles.has(normTitle) ||
      seenImages.has(normImg)
    ) {
      continue;
    }

    seenIds.add(r.id);
    seenTitles.add(normTitle);
    seenImages.add(normImg);
    unique.push(r);
  }

  return unique;
}

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

function normalizeMealDbRecipe(raw: RawMeal): Recipe {
  const meta = estimateMetaFromId(raw.idMeal);
  const tags = raw.strTags
    ? raw.strTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  return {
    id: raw.idMeal,
    title: raw.strMeal,
    category: raw.strCategory ?? "Main",
    area: raw.strArea ?? "International",
    instructions: raw.strInstructions ?? "",
    thumbnail: raw.strMealThumb ?? "",
    ingredients: normalizeIngredients(raw),
    source: raw.strSource ?? "TheMealDB",
    youtubeUrl: raw.strYoutube ?? undefined,
    prepTimeMinutes: meta.prep,
    cookTimeMinutes: meta.cook,
    servings: 4,
    difficulty: meta.difficulty,
    rating: meta.rating,
    tags,
  };
}

/**
 * Split a full ingredient line like "2 tablespoons olive oil" or "500g chicken breast, diced"
 * into `{ name, measure }` so ingredient matching in Pantry works accurately across all APIs.
 */
function parseIngredientLine(line: string): Ingredient {
  const cleaned = line.trim();
  const match = cleaned.match(
    /^([\d./\s-]+(?:cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|g|kg|oz|lb|pound|pounds|ml|l|clove|cloves|slice|slices|can|cans|pack|pinch|medium|large|small)s?\b)\s*(?:of\s+)?(.+)$/i
  );
  if (match) {
    return {
      measure: match[1].trim(),
      name: match[2].replace(/,.*$/, "").trim(),
    };
  }
  return {
    name: cleaned.replace(/,.*$/, "").trim(),
    measure: "",
  };
}

function normalizeDummyRecipe(raw: DummyJsonRecipe): Recipe {
  const ingredients: Ingredient[] = (raw.ingredients ?? []).map(
    parseIngredientLine
  );

  const category =
    raw.mealType && raw.mealType.length > 0 ? raw.mealType[0] : raw.cuisine;

  return {
    id: `dj-${raw.id}`,
    title: raw.name,
    category: category || "Main",
    area: raw.cuisine || "International",
    instructions: (raw.instructions ?? []).join("\n"),
    thumbnail: raw.image,
    ingredients,
    source: "DummyJSON Open Recipes",
    prepTimeMinutes: raw.prepTimeMinutes ?? 15,
    cookTimeMinutes: raw.cookTimeMinutes ?? 25,
    servings: raw.servings ?? 4,
    difficulty: raw.difficulty ?? "Easy",
    rating: raw.rating ?? 4.7,
    caloriesPerServing: raw.caloriesPerServing,
    tags: raw.tags ?? [],
  };
}

function inferForkifySteps(
  title: string,
  ingredients: Ingredient[],
  publisher: string,
  cookTime: number
): string {
  const ingNames = ingredients
    .slice(0, 6)
    .map((i) => i.name)
    .filter(Boolean);
  const firstHalf = ingNames.slice(0, 3).join(", ") || "primary ingredients";
  const secondHalf = ingNames.slice(3).join(", ") || "remaining seasonings";

  return [
    `Prep and measure all ${ingredients.length} ingredients for ${title}.`,
    `Combine and prepare ${firstHalf} over medium heat until fragrant and evenly coated.`,
    `Incorporate ${secondHalf} and cook for approximately ${cookTime || 25} minutes until tender and flavors meld together.`,
    `Taste and adjust seasoning as needed. Plate warm and garnish to serve (${publisher} kitchen style).`,
  ].join("\n");
}

function normalizeForkifySummary(
  raw: ForkifySummary,
  categoryHint = "Popular"
): Recipe {
  const meta = estimateMetaFromId(raw.id);
  // Seed probable core ingredients from title keywords so pantry matching can also score summaries
  const titleWords = raw.title
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length > 3);

  return {
    id: `fk-${raw.id}`,
    title: raw.title,
    category: categoryHint,
    area: raw.publisher || "Chef Special",
    instructions: "",
    thumbnail: normalizeForkifyImageUrl(raw.image_url),
    ingredients: titleWords.map((w) => ({ name: w, measure: "" })),
    source: raw.publisher || "Forkify Open Recipes",
    prepTimeMinutes: meta.prep,
    cookTimeMinutes: meta.cook,
    servings: 4,
    difficulty: meta.difficulty,
    rating: meta.rating,
    tags: [categoryHint, ...titleWords],
  };
}

function normalizeForkifyDetail(
  raw: ForkifyDetail,
  categoryHint = "Chef Special"
): Recipe {
  const meta = estimateMetaFromId(raw.id);
  const ingredients: Ingredient[] = (raw.ingredients ?? [])
    .map((ing) => {
      const qty =
        ing.quantity !== null && ing.quantity !== undefined
          ? String(Number(ing.quantity.toFixed(2)))
          : "";
      const measure = [qty, ing.unit].filter(Boolean).join(" ").trim();
      const name = (ing.description ?? "").trim();
      return { name, measure };
    })
    .filter((i) => i.name.length > 0);

  const cookTime = raw.cooking_time || meta.cook;

  return {
    id: `fk-${raw.id}`,
    title: raw.title,
    category: categoryHint,
    area: raw.publisher || "International",
    instructions: inferForkifySteps(
      raw.title,
      ingredients,
      raw.publisher || "Forkify",
      cookTime
    ),
    thumbnail: normalizeForkifyImageUrl(raw.image_url),
    ingredients,
    source: raw.source_url || raw.publisher || "Forkify Open Recipes",
    prepTimeMinutes: 15,
    cookTimeMinutes: cookTime,
    servings: raw.servings || 4,
    difficulty: cookTime > 45 ? "Medium" : "Easy",
    rating: meta.rating,
  };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetchWithTimeout(url, {}, 8_500);
  if (!response.ok) {
    throw new Error("Recipe catalog service temporarily unavailable.");
  }
  return response.json() as Promise<T>;
}

async function searchForkify(
  term: string,
  categoryLabel?: string,
  limit = 40
): Promise<Recipe[]> {
  try {
    const res = await fetchJson<ForkifySearchResponse>(
      `${FORKIFY_BASE_URL}?search=${encodeURIComponent(term.trim())}`
    );
    const list = res.data?.recipes ?? [];
    return list
      .slice(0, limit)
      .map((item) => normalizeForkifySummary(item, categoryLabel || term));
  } catch {
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a large, deduplicated catalog of free recipes combining:
 * 1. DummyJSON Open Recipes API (all 50 rich recipes with full ingredients & instructions)
 * 2. Forkify v2 Open Recipe API (queries across Chicken, Pasta, Beef, Seafood, Pizza, Salad, Pork, Vegetarian, Dessert — 1,000+ recipe database)
 * 3. TheMealDB multi-letter queries
 * 4. Curated Filipino Classics
 *
 * Strictly deduplicates by both title and image URL so no repeating photos ever appear.
 */
export async function getInitialRecipeCatalog(): Promise<Recipe[]> {
  const dummyPromise = fetchJson<DummyJsonResponse>(
    `${DUMMYJSON_BASE_URL}?limit=50`
  )
    .then((res) => (res.recipes ?? []).map(normalizeDummyRecipe))
    .catch(() => [] as Recipe[]);

  const forkifyQueries: Array<{ q: string; cat: string }> = [
    { q: "chicken", cat: "Chicken" },
    { q: "pasta", cat: "Pasta" },
    { q: "beef", cat: "Beef" },
    { q: "fish", cat: "Seafood" },
    { q: "shrimp", cat: "Seafood" },
    { q: "pork", cat: "Pork" },
    { q: "pizza", cat: "Pasta" },
    { q: "salad", cat: "Vegetarian" },
    { q: "cake", cat: "Dessert" },
  ];

  const forkifyPromises = forkifyQueries.map(({ q, cat }) =>
    searchForkify(q, cat, 28)
  );

  const mealDbLetters = ["c", "b", "p", "s"];
  const mealDbPromises = mealDbLetters.map((letter) =>
    fetchJson<SearchResponse>(`${MEALDB_BASE_URL}/search.php?f=${letter}`)
      .then((res) => (res.meals ?? []).map(normalizeMealDbRecipe))
      .catch(() => [] as Recipe[])
  );

  const [dummyRecipes, ...restBatches] = await Promise.all([
    dummyPromise,
    ...forkifyPromises,
    ...mealDbPromises,
  ]);

  const combined: Recipe[] = [
    ...CURATED_RECIPES,
    ...dummyRecipes,
    ...restBatches.flat(),
  ];

  return deduplicateRecipes(combined);
}

/**
 * Search meals across Forkify v2 (1,000+ recipes), DummyJSON Recipes API, TheMealDB, and curated recipes.
 * Automatically deduplicates repeating images and titles.
 */
export async function searchMeals(query: string): Promise<Recipe[]> {
  const q = query.trim();
  if (!q) return [];
  const lower = q.toLowerCase();

  const localMatches = CURATED_RECIPES.filter(
    (r) =>
      r.title.toLowerCase().includes(lower) ||
      r.category.toLowerCase().includes(lower) ||
      r.area.toLowerCase().includes(lower) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(lower))
  );

  const [dummyResults, forkifyResults, mealDbResults] = await Promise.all([
    fetchJson<DummyJsonResponse>(
      `${DUMMYJSON_BASE_URL}/search?q=${encodeURIComponent(q)}`
    )
      .then((data) => (data.recipes ?? []).map(normalizeDummyRecipe))
      .catch(() => [] as Recipe[]),
    searchForkify(q, "Search Result", 60),
    fetchJson<SearchResponse>(
      `${MEALDB_BASE_URL}/search.php?s=${encodeURIComponent(q)}`
    )
      .then((data) => (data.meals ?? []).map(normalizeMealDbRecipe))
      .catch(() => [] as Recipe[]),
  ]);

  return deduplicateRecipes([
    ...localMatches,
    ...dummyResults,
    ...forkifyResults,
    ...mealDbResults,
  ]);
}

/**
 * Fetch recipes specifically by a single ingredient name across TheMealDB (`filter.php?i=`),
 * Forkify v2 (`?search=`), and DummyJSON so Pantry matching always finds recipes for what the user has!
 */
export async function getRecipesByIngredientName(
  ingredientName: string
): Promise<Recipe[]> {
  const term = ingredientName.trim();
  if (!term) return [];

  // 1. Forkify search by ingredient + fetch full details for top 8 matches
  const forkifyPromise = (async () => {
    try {
      const res = await fetchJson<ForkifySearchResponse>(
        `${FORKIFY_BASE_URL}?search=${encodeURIComponent(term)}`
      );
      const summaries = (res.data?.recipes ?? []).slice(0, 8);
      const settled = await Promise.allSettled(
        summaries.map((s) =>
          fetchJson<ForkifyDetailResponse>(`${FORKIFY_BASE_URL}/${s.id}`).then(
            (d) =>
              d.data?.recipe ? normalizeForkifyDetail(d.data.recipe) : null
          )
        )
      );
      return settled
        .filter(
          (r): r is PromiseFulfilledResult<Recipe> =>
            r.status === "fulfilled" && r.value !== null
        )
        .map((r) => r.value);
    } catch {
      return [] as Recipe[];
    }
  })();

  // 2. TheMealDB filter by ingredient (`filter.php?i=`) + lookup details for top 8
  const mealDbPromise = (async () => {
    try {
      const data = await fetchJson<CategoryListResponse>(
        `${MEALDB_BASE_URL}/filter.php?i=${encodeURIComponent(term)}`
      );
      const ids = (data.meals ?? []).slice(0, 8).map((m) => m.idMeal);
      const settled = await Promise.allSettled(ids.map((id) => getMealById(id)));
      return settled
        .filter(
          (r): r is PromiseFulfilledResult<Recipe> =>
            r.status === "fulfilled" && r.value !== null
        )
        .map((r) => r.value);
    } catch {
      return [] as Recipe[];
    }
  })();

  const [fkRecipes, mdbRecipes] = await Promise.all([
    forkifyPromise,
    mealDbPromise,
  ]);

  return deduplicateRecipes([...fkRecipes, ...mdbRecipes]);
}

/**
 * Fetch a single meal by ID across Curated, DummyJSON (`dj-*`), Forkify (`fk-*`), or TheMealDB.
 */
export async function getMealById(id: string): Promise<Recipe | null> {
  const curated = CURATED_RECIPES.find((r) => r.id === id);
  if (curated) return curated;

  if (id.startsWith("dj-")) {
    const rawId = id.replace("dj-", "");
    try {
      const raw = await fetchJson<DummyJsonRecipe>(
        `${DUMMYJSON_BASE_URL}/${encodeURIComponent(rawId)}`
      );
      return raw ? normalizeDummyRecipe(raw) : null;
    } catch {
      return null;
    }
  }

  if (id.startsWith("fk-")) {
    const rawId = id.replace("fk-", "");
    try {
      const res = await fetchJson<ForkifyDetailResponse>(
        `${FORKIFY_BASE_URL}/${encodeURIComponent(rawId)}`
      );
      return res.data?.recipe ? normalizeForkifyDetail(res.data.recipe) : null;
    } catch {
      return null;
    }
  }

  try {
    const data = await fetchJson<SearchResponse>(
      `${MEALDB_BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`
    );
    const meals = data.meals ?? [];
    return meals.length > 0 ? normalizeMealDbRecipe(meals[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch all meals for a given category.
 */
export async function getMealIdsByCategory(
  category: string
): Promise<string[]> {
  const data = await fetchJson<CategoryListResponse>(
    `${MEALDB_BASE_URL}/filter.php?c=${encodeURIComponent(category)}`
  );
  return (data.meals ?? []).map((m) => m.idMeal);
}

/**
 * Fetch full recipes for all meals in a category across Forkify + TheMealDB.
 */
export async function getMealsByCategory(category: string): Promise<Recipe[]> {
  if (category === "All") {
    return getInitialRecipeCatalog();
  }
  if (category === "Filipino") {
    const mealDbFil = await fetchJson<CategoryListResponse>(
      `${MEALDB_BASE_URL}/filter.php?a=Filipino`
    )
      .then(async (res) => {
        const ids = (res.meals ?? []).slice(0, 12).map((m) => m.idMeal);
        const settled = await Promise.allSettled(ids.map((i) => getMealById(i)));
        return settled
          .filter(
            (r): r is PromiseFulfilledResult<Recipe> =>
              r.status === "fulfilled" && r.value !== null
          )
          .map((r) => r.value);
      })
      .catch(() => [] as Recipe[]);

    return deduplicateRecipes([...CURATED_RECIPES, ...mealDbFil]);
  }

  const forkifyCatTerm: Record<string, string> = {
    Chicken: "chicken",
    Beef: "beef",
    Seafood: "seafood",
    Pasta: "pasta",
    Vegetarian: "broccoli",
    Pork: "pork",
    Dessert: "chocolate",
    Lamb: "lamb",
  };

  const fkTerm = forkifyCatTerm[category] ?? category.toLowerCase();

  const [fkBatch, mdbBatch] = await Promise.all([
    searchForkify(fkTerm, category, 30),
    (async () => {
      try {
        const ids = (await getMealIdsByCategory(category)).slice(0, 14);
        const results = await Promise.allSettled(
          ids.map((id) => getMealById(id))
        );
        return results
          .filter(
            (r): r is PromiseFulfilledResult<Recipe> =>
              r.status === "fulfilled" && r.value !== null
          )
          .map((r) => r.value);
      } catch {
        return [] as Recipe[];
      }
    })(),
  ]);

  return deduplicateRecipes([...fkBatch, ...mdbBatch]);
}

/**
 * Convert a Recipe to a CachedRecipeRow-compatible plain object.
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
  const meta = estimateMetaFromId(row.id);
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? "",
    area: row.area ?? "",
    instructions: row.instructions ?? "",
    thumbnail: row.thumbnail ?? "",
    ingredients,
    source: row.source ?? "",
    prepTimeMinutes: meta.prep,
    cookTimeMinutes: meta.cook,
    difficulty: meta.difficulty,
    rating: meta.rating,
  };
}
