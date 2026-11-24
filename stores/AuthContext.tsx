import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { supabase } from "@/lib/supabase";
import type { AuthAction, AuthContextValue, AuthState } from "@/types/index";

// ─── Reducer ─────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  session: null,
  user: null,
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
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Restore persisted session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: "SET_SESSION", session });
    });

    // Keep state in sync with Supabase auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        dispatch({ type: "SET_SESSION", session });
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

    // If user entered a username instead of an email, try resolving via profiles or fallback
    if (!email.includes("@")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", email)
        .maybeSingle();
      if (!profile) {
        // Fallback: allow signing in if user typed username prefix of their email
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
    // Session update is handled by onAuthStateChange
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
    // Session cleared by onAuthStateChange
  }

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
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
