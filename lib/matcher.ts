import type {
  AlmostMatch,
  MatchResults,
  PantryIngredient,
  ReadyMatch,
  Recipe,
} from "@/types/index";

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize an ingredient name for fuzzy comparison:
 * lowercase, trim, strip trailing "s" for simple plurals, collapse spaces.
 */
export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    // Strip common quantity descriptors that sometimes leak into names
    .replace(/\b(fresh|dried|ground|sliced|chopped|minced|whole|large|small|medium)\b/g, "")
    .trim()
    // Simple plural: strip trailing "es" or "s" (e.g. "tomatoes" → "tomato", "eggs" → "egg")
    .replace(/oes$/, "o")
    .replace(/s$/, "");
}

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * Match a pantry ingredient list against a set of recipes.
 *
 * Only active ingredients are considered.
 * Matching uses normalized keys so "Chicken Breast" matches "chicken".
 *
 * Returns:
 *   ready  — recipes where ALL ingredients are covered by the pantry
 *   almost — recipes where exactly 1 or 2 ingredients are missing
 */
export function matchRecipes(
  pantryIngredients: PantryIngredient[],
  recipes: Recipe[]
): MatchResults {
  // Build a set of normalized active pantry keys for O(1) lookup
  const pantrySet = new Set(
    pantryIngredients
      .filter((i) => i.isActive)
      .map((i) => normalizeIngredientName(i.normalizedKey))
  );

  const ready: ReadyMatch[] = [];
  const almost: AlmostMatch[] = [];

  for (const recipe of recipes) {
    if (recipe.ingredients.length === 0) continue;

    const missing: string[] = [];

    for (const ing of recipe.ingredients) {
      const normalized = normalizeIngredientName(ing.name);
      // Check exact match first, then substring match for compound names
      const matched =
        pantrySet.has(normalized) ||
        [...pantrySet].some(
          (p) => normalized.includes(p) || p.includes(normalized)
        );
      if (!matched) {
        missing.push(ing.name);
      }
    }

    if (missing.length === 0) {
      ready.push({ recipe });
    } else if (missing.length <= 2) {
      almost.push({ recipe, missing });
    }
  }

  return { ready, almost };
}
