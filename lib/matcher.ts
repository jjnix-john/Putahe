import type {
  AlmostMatch,
  MatchResults,
  PantryIngredient,
  ReadyMatch,
  Recipe,
} from "@/types/index";

// Common kitchen staples that every home kitchen is assumed to have so they
// don't block a recipe from matching when the user enters main ingredients.
const PANTRY_STAPLES = new Set([
  "water",
  "warm water",
  "cold water",
  "hot water",
  "boiling water",
  "ice",
  "salt",
  "sea salt",
  "kosher salt",
  "table salt",
  "pinch of salt",
  "pepper",
  "black pepper",
  "ground black pepper",
  "white pepper",
  "salt and pepper",
  "kosher salt and black pepper",
  "oil",
  "cooking oil",
  "vegetable oil",
  "canola oil",
  "olive oil",
  "extra virgin olive oil",
  "sugar",
  "white sugar",
  "brown sugar",
]);

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize an ingredient name for fuzzy comparison:
 * lowercase, strip quantities/units/parentheticals, strip descriptors, singularize.
 */
export function normalizeIngredientName(name: string): string {
  return (
    name
      .toLowerCase()
      // Remove parenthetical notes like "(optional)" or "(diced)"
      .replace(/\([^)]*\)/g, " ")
      // Remove leading numbers, fractions, and common units
      .replace(
        /^[\d./\s-]+(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|g|kg|oz|lb|pound|pounds|ml|l|clove|cloves|slice|slices|can|cans|pack|pinch|bunch|head|piece|pieces)s?\b\s*(of\s+)?/i,
        " "
      )
      // Remove common preparation descriptors
      .replace(
        /\b(fresh|freshly|dried|ground|sliced|chopped|minced|diced|crushed|grated|shredded|peeled|boneless|skinless|whole|large|small|medium|organic|raw|cooked|toasted|melted|softened|optional|to taste|for garnish|for serving|finely|thinly|roughly)\b/g,
        " "
      )
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/ies$/, "y")
      .replace(/oes$/, "o")
      .replace(/s$/, "")
  );
}

/**
 * Break an ingredient string into meaningful word tokens (length >= 3).
 */
function getIngredientTokens(normalized: string): string[] {
  return normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function isStapleIngredient(normalized: string): boolean {
  if (!normalized) return true;
  if (PANTRY_STAPLES.has(normalized)) return true;
  return (
    normalized === "salt" ||
    normalized === "pepper" ||
    normalized === "water" ||
    normalized === "oil"
  );
}

function doesPantryMatchIngredient(
  recipeIngRaw: string,
  pantryKeys: string[],
  pantryTokens: Set<string>
): boolean {
  const norm = normalizeIngredientName(recipeIngRaw);
  if (!norm) return true;

  for (const pKey of pantryKeys) {
    if (!pKey) continue;
    if (norm === pKey || norm.includes(pKey) || pKey.includes(norm)) {
      return true;
    }
  }

  // Check token overlap (e.g., pantry "chicken" matches recipe "6 oz chicken breast")
  const ingTokens = getIngredientTokens(norm);
  for (const tok of ingTokens) {
    if (pantryTokens.has(tok)) {
      return true;
    }
  }

  return false;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * Match a pantry ingredient list against a set of recipes.
 *
 * Returns:
 *   ready  — recipes where ALL non-staple ingredients are covered by the pantry
 *            (or missing <= 1 minor ingredient when at least 2 pantry items match)
 *   almost — recipes that match at least 1 active pantry ingredient, sorted by
 *            fewest missing ingredients and highest match coverage percentage!
 */
export function matchRecipes(
  pantryIngredients: PantryIngredient[],
  recipes: Recipe[]
): MatchResults {
  const activePantry = pantryIngredients.filter((i) => i.isActive);
  if (activePantry.length === 0) {
    return { ready: [], almost: [] };
  }

  const pantryKeys = activePantry
    .map((i) => normalizeIngredientName(i.name || i.normalizedKey))
    .filter(Boolean);

  const pantryTokens = new Set<string>();
  for (const key of pantryKeys) {
    for (const tok of getIngredientTokens(key)) {
      pantryTokens.add(tok);
    }
  }

  const ready: ReadyMatch[] = [];
  const almost: AlmostMatch[] = [];

  for (const recipe of recipes) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) continue;

    const missing: string[] = [];
    let matchedCount = 0;
    let nonStapleTotal = 0;

    for (const ing of recipe.ingredients) {
      const norm = normalizeIngredientName(ing.name);
      const matched = doesPantryMatchIngredient(
        ing.name,
        pantryKeys,
        pantryTokens
      );

      if (matched) {
        matchedCount++;
        nonStapleTotal++;
      } else if (!isStapleIngredient(norm)) {
        nonStapleTotal++;
        missing.push(ing.name);
      }
    }

    // Also check if recipe title directly matches a pantry item (great for summary items)
    const titleMatched = doesPantryMatchIngredient(
      recipe.title,
      pantryKeys,
      pantryTokens
    );
    if (titleMatched && matchedCount === 0) {
      matchedCount = 1;
    }

    if (matchedCount === 0) continue;

    const totalCount = Math.max(nonStapleTotal, matchedCount + missing.length, 1);

    if (missing.length === 0) {
      ready.push({
        recipe,
        matchedCount,
        totalCount,
      });
    } else if (missing.length <= 8) {
      almost.push({
        recipe,
        missing,
        matchedCount,
        totalCount,
      });
    }
  }

  // Sort ready by highest matched ingredient count
  ready.sort((a, b) => b.matchedCount - a.matchedCount);

  // Sort almost by:
  // 1. Highest match ratio (matchedCount / totalCount)
  // 2. Most pantry ingredients matched
  // 3. Fewest missing ingredients
  almost.sort((a, b) => {
    const ratioA = a.matchedCount / Math.max(1, a.totalCount);
    const ratioB = b.matchedCount / Math.max(1, b.totalCount);
    if (Math.abs(ratioB - ratioA) > 0.12) return ratioB - ratioA;
    if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
    return a.missing.length - b.missing.length;
  });

  return {
    ready: ready.slice(0, 25),
    almost: almost.slice(0, 40),
  };
}
