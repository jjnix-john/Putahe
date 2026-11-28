-- Putahe Security, Moderation & Account Deletion — Migration 003
-- Enforces server-side input validation constraints, content reporting, and self-service account/data deletion.

-- ─── 1. Server-Side Input Length & Sanitization Constraints ──────────────────

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_length,
  ADD CONSTRAINT profiles_display_name_length
    CHECK (display_name IS NULL OR (char_length(btrim(display_name)) BETWEEN 1 AND 50));

ALTER TABLE forum_posts
  DROP CONSTRAINT IF EXISTS forum_posts_title_length,
  ADD CONSTRAINT forum_posts_title_length
    CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  DROP CONSTRAINT IF EXISTS forum_posts_body_length,
  ADD CONSTRAINT forum_posts_body_length
    CHECK (char_length(btrim(body)) BETWEEN 2 AND 2000),
  DROP CONSTRAINT IF EXISTS forum_posts_tag_length,
  ADD CONSTRAINT forum_posts_tag_length
    CHECK (recipe_tag IS NULL OR char_length(btrim(recipe_tag)) <= 60);

ALTER TABLE forum_replies
  DROP CONSTRAINT IF EXISTS forum_replies_body_length,
  ADD CONSTRAINT forum_replies_body_length
    CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000);

-- ─── 2. User-Generated Content Moderation & Reporting Table ──────────────────

CREATE TABLE IF NOT EXISTS forum_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reply')),
  target_id   UUID NOT NULL,
  reason      TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 300),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);

ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_authenticated"
  ON forum_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_own"
  ON forum_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- ─── 3. Self-Service Account & Personal Data Deletion RPC ────────────────────
-- Allows an authenticated user to permanently delete their own profile, posts,
-- replies, likes, notifications, and auth.users record (GDPR / privacy compliance).

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Cascading delete removes profiles, forum_posts, forum_replies, forum_likes, forum_notifications, forum_reports
  DELETE FROM public.profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
