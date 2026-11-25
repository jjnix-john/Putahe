import type { Session, User } from "@supabase/supabase-js";

// ─── Auth ────────────────────────────────────────────────────────────────────

export type { Session, User };

export interface CookingCompanion {
  name: string;
  iconId: string;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  companion: CookingCompanion | null;
  loading: boolean;
}

export type AuthAction =
  | { type: "SET_SESSION"; session: Session | null }
  | { type: "SET_COMPANION"; companion: CookingCompanion | null }
  | { type: "SET_LOADING"; loading: boolean };

export interface AuthContextValue extends AuthState {
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  saveCompanion: (companion: CookingCompanion) => Promise<void>;
}

// ─── Database ─────────────────────────────────────────────────────────────────

/** Row shape for the `cached_recipes` table. `ingredients` is a JSON string. */
export interface CachedRecipeRow {
  id: string;
  title: string;
  category: string | null;
  area: string | null;
  instructions: string | null;
  thumbnail: string | null;
  /** JSON-serialized Ingredient[] */
  ingredients: string | null;
  source: string | null;
  cached_at: number;
}

/** Row shape for the `pantry_ingredients` table. */
export interface PantryIngredientRow {
  id: string;
  name: string;
  normalized_key: string;
  quantity: string | null;
  unit: string | null;
  /** SQLite boolean: 1 = active, 0 = inactive */
  is_active: number;
  added_at: number;
}

// ─── Recipe (TheMealDB) ───────────────────────────────────────────────────────

/** A single ingredient with its measure, normalized from TheMealDB flat fields. */
export interface Ingredient {
  name: string;
  measure: string;
}

/** Normalized recipe shape used throughout the app. */
export interface Recipe {
  id: string;
  title: string;
  category: string;
  area: string;
  instructions: string;
  thumbnail: string;
  ingredients: Ingredient[];
  source: string;
  youtubeUrl?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  difficulty?: string;
  rating?: number;
  caloriesPerServing?: number;
  tags?: string[];
}

// ─── Recipe Context ───────────────────────────────────────────────────────────

export interface RecipeState {
  results: Recipe[];
  catalog: Recipe[];
  categories: string[];
  selectedCategory: string;
  selectedRecipe: Recipe | null;
  savedRecipes: Recipe[];
  loading: boolean;
  catalogLoading: boolean;
  error: string | null;
}

export type RecipeAction =
  | { type: "SEARCH"; results: Recipe[] }
  | { type: "SET_CATALOG"; catalog: Recipe[]; categories: string[] }
  | { type: "SET_CATEGORY"; category: string }
  | { type: "SELECT_RECIPE"; recipe: Recipe }
  | { type: "SET_SAVED"; recipes: Recipe[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_CATALOG_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "CLEAR_RESULTS" };

export interface RecipeContextValue extends RecipeState {
  search: (query: string) => Promise<void>;
  loadCatalog: (force?: boolean) => Promise<void>;
  selectCategory: (category: string) => Promise<void>;
  loadRecipe: (id: string) => Promise<void>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  removeSavedRecipe: (id: string) => Promise<void>;
  isRecipeSaved: (id: string) => boolean;
  clearResults: () => void;
}

// ─── Snap / Dish Reverse-Engineering ─────────────────────────────────────────

export interface SnapIngredient {
  name: string;
  quantity: string;
}

export interface SnapResult {
  is_food: boolean;
  dish_name: string;
  confidence_note: string;
  ingredients: SnapIngredient[];
  steps: string[];
}

// ─── Pantry / Ingredient Matching ─────────────────────────────────────────────

/** A pantry ingredient as it lives in app state (hydrated from SQLite row). */
export interface PantryIngredient {
  id: string;
  name: string;
  normalizedKey: string;
  quantity: string | null;
  unit: string | null;
  isActive: boolean;
  addedAt: number;
}

/** A recipe that is fully cookable with the current pantry. */
export interface ReadyMatch {
  recipe: Recipe;
  matchedCount: number;
  totalCount: number;
}

/** A recipe that is almost cookable — missing 1+ ingredients, sorted by highest match coverage. */
export interface AlmostMatch {
  recipe: Recipe;
  missing: string[];
  matchedCount: number;
  totalCount: number;
}

export interface MatchResults {
  ready: ReadyMatch[];
  almost: AlmostMatch[];
}

export interface PantryState {
  ingredients: PantryIngredient[];
  matchResults: MatchResults | null;
  loading: boolean;
  error: string | null;
}

export type PantryAction =
  | { type: "SET_INGREDIENTS"; ingredients: PantryIngredient[] }
  | { type: "ADD_INGREDIENT"; ingredient: PantryIngredient }
  | { type: "REMOVE_INGREDIENT"; id: string }
  | { type: "TOGGLE_INGREDIENT"; id: string }
  | { type: "SET_MATCH_RESULTS"; results: MatchResults }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null };

export interface PantryContextValue extends PantryState {
  addIngredient: (name: string, quantity?: string, unit?: string) => Promise<void>;
  removeIngredient: (id: string) => Promise<void>;
  toggleIngredient: (id: string) => Promise<void>;
  findMatches: () => Promise<void>;
}

// ─── Forum ────────────────────────────────────────────────────────────────────

export interface ForumProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ForumPost {
  id: string;
  author_id: string;
  title: string;
  body: string;
  recipe_tag: string | null;
  created_at: string;
  updated_at: string | null;
  /** Joined from profiles */
  profiles?: ForumProfile | null;
  /** Computed reply count */
  reply_count?: number;
}

export interface ForumReply {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  /** Joined from profiles */
  profiles?: ForumProfile | null;
}
