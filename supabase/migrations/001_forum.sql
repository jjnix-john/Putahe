-- Putahe Forum — Migration 001
-- Apply via: supabase db push  (or paste into the Supabase SQL editor)

-- ─── profiles ─────────────────────────────────────────────────────────────────
-- One row per auth.users entry. Created automatically via trigger below.

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (needed to join author names on posts/replies)
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ─── Trigger: auto-create profile on sign-up ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── forum_posts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forum_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  recipe_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Enable Realtime UPDATE/DELETE events
ALTER TABLE forum_posts REPLICA IDENTITY FULL;

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_public"
  ON forum_posts FOR SELECT USING (true);

CREATE POLICY "posts_insert_own"
  ON forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_update_own"
  ON forum_posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "posts_delete_own"
  ON forum_posts FOR DELETE USING (auth.uid() = author_id);

-- ─── forum_replies ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forum_replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES forum_posts (id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE forum_replies REPLICA IDENTITY FULL;

ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "replies_select_public"
  ON forum_replies FOR SELECT USING (true);

CREATE POLICY "replies_insert_own"
  ON forum_replies FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "replies_update_own"
  ON forum_replies FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "replies_delete_own"
  ON forum_replies FOR DELETE USING (auth.uid() = author_id);
