import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { supabase } from "@/lib/supabase";
import { getDb } from "@/lib/database";
import type {
  AuthAction,
  AuthContextValue,
  AuthState,
  CookingCompanion,
} from "@/types/index";

// ─── Reducer ─────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  session: null,
  user: null,
  companion: null,
  loading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_SESSION":
      return {
        ...state,
        session: action.session,
        user: action.session?.user ?? null,
        loading: false,
      };
    case "SET_COMPANION":
      return {
        ...state,
        companion: action.companion,
      };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadLocalCompanion(): Promise<CookingCompanion | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM db_meta WHERE key = ?",
      ["cooking_companion"]
    );
    if (row?.value) {
      return JSON.parse(row.value) as CookingCompanion;
    }
  } catch {
    // ignore
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Load any locally saved companion immediately
    loadLocalCompanion().then((localComp) => {
      if (localComp) {
        dispatch({ type: "SET_COMPANION", companion: localComp });
      }
    });

    // Restore persisted session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      dispatch({ type: "SET_SESSION", session });
      const metaComp = session?.user?.user_metadata?.cooking_companion as
        | CookingCompanion
        | undefined;
      if (metaComp?.name && metaComp?.iconId) {
        dispatch({ type: "SET_COMPANION", companion: metaComp });
      }
    });

    // Keep state in sync with Supabase auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        dispatch({ type: "SET_SESSION", session });
        const metaComp = session?.user?.user_metadata?.cooking_companion as
          | CookingCompanion
          | undefined;
        if (metaComp?.name && metaComp?.iconId) {
          dispatch({ type: "SET_COMPANION", companion: metaComp });
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(
    emailOrUsername: string,
    password: string
  ): Promise<void> {
    dispatch({ type: "SET_LOADING", loading: true });
    let email = emailOrUsername.trim();

    if (!email.includes("@")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", email)
        .maybeSingle();
      if (!profile) {
        email = `${email}@putahe.app`;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      dispatch({ type: "SET_LOADING", loading: false });
      throw error;
    }
  }

  async function signUp(
    email: string,
    password: string,
    username?: string
  ): Promise<void> {
    dispatch({ type: "SET_LOADING", loading: true });
    const displayName = username?.trim() || email.split("@")[0];
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName,
          username: displayName,
        },
      },
    });
    if (error) {
      dispatch({ type: "SET_LOADING", loading: false });
      throw error;
    }
    if (data.user && username?.trim()) {
      await supabase
        .from("profiles")
        .update({ display_name: username.trim() })
        .eq("id", data.user.id);
    }
    dispatch({ type: "SET_LOADING", loading: false });
  }

  async function signOut(): Promise<void> {
    dispatch({ type: "SET_LOADING", loading: true });
    const { error } = await supabase.auth.signOut();
    if (error) {
      dispatch({ type: "SET_LOADING", loading: false });
      throw error;
    }
  }

  async function saveCompanion(companion: CookingCompanion): Promise<void> {
    const trimmed: CookingCompanion = {
      name: companion.name.trim(),
      iconId: companion.iconId,
    };

    // Save locally in SQLite / in-memory db_meta so it always works
    try {
      const db = await getDb();
      await db.runAsync(
        "INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)",
        ["cooking_companion", JSON.stringify(trimmed)]
      );
    } catch (e) {
      console.warn("Failed to persist companion locally:", e);
    }

    // Also sync to Supabase user metadata & profile if signed in
    if (state.session?.user) {
      try {
        await supabase.auth.updateUser({
          data: { cooking_companion: trimmed },
        });
        await supabase
          .from("profiles")
          .update({
            display_name: trimmed.name,
            avatar_url: trimmed.iconId,
          })
          .eq("id", state.session.user.id);
      } catch {
        // Non-fatal if offline or placeholder Supabase URL
      }
    }

    dispatch({ type: "SET_COMPANION", companion: trimmed });
  }

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    saveCompanion,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
