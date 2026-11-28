import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { supabase } from "@/lib/supabase";
import { getDb } from "@/lib/database";
import {
  enforceRateLimit,
  sanitizeUserText,
  toSafeErrorMessage,
} from "@/lib/security";
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
    enforceRateLimit("auth_sign_in", 5, 60_000);
    dispatch({ type: "SET_LOADING", loading: true });
    let email = sanitizeUserText(emailOrUsername, 120);

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
      throw new Error(toSafeErrorMessage(error, "Invalid email or password."));
    }
  }

  async function signUp(
    email: string,
    password: string,
    username?: string
  ): Promise<void> {
    enforceRateLimit("auth_sign_up", 3, 60_000);
    dispatch({ type: "SET_LOADING", loading: true });
    const cleanEmail = sanitizeUserText(email, 120);
    const displayName =
      sanitizeUserText(username ?? "", 40) || cleanEmail.split("@")[0];
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
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
      throw new Error(
        toSafeErrorMessage(error, "Could not create account. Please try again.")
      );
    }
    if (data.user && displayName) {
      await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", data.user.id);
    }
    dispatch({ type: "SET_LOADING", loading: false });
  }

  async function signOut(): Promise<void> {
    dispatch({ type: "SET_LOADING", loading: true });
    const { error } = await supabase.auth.signOut();
    if (error) {
      dispatch({ type: "SET_LOADING", loading: false });
      throw new Error(toSafeErrorMessage(error, "Could not sign out."));
    }
  }

  async function deleteAccount(): Promise<void> {
    enforceRateLimit("auth_delete_account", 2, 60_000);
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 1. Attempt server-side SECURITY DEFINER RPC (Migration 003)
        const { error: rpcErr } = await supabase.rpc("delete_own_account");
        if (rpcErr) {
          // Fallback: delete user's rows allowed by RLS if RPC hasn't been migrated yet
          await supabase.from("forum_posts").delete().eq("author_id", user.id);
          await supabase
            .from("forum_replies")
            .delete()
            .eq("author_id", user.id);
        }
      }

      // 2. Wipe all local SQLite user data (pantry, saved recipes, companion, local likes/notifications)
      try {
        const db = await getDb();
        await db.runAsync("DELETE FROM pantry_ingredients WHERE 1=1");
        await db.runAsync("DELETE FROM saved_recipes WHERE 1=1");
        await db.runAsync("DELETE FROM db_meta WHERE key != 'version'");
      } catch {
        // ignore
      }

      // 3. Sign out and clear session token from SecureStore
      await supabase.auth.signOut();
      dispatch({ type: "SET_COMPANION", companion: null });
      dispatch({ type: "SET_SESSION", session: null });
    } catch (err) {
      dispatch({ type: "SET_LOADING", loading: false });
      throw new Error(
        toSafeErrorMessage(err, "Could not complete account deletion.")
      );
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
    deleteAccount,
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
