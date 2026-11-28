-- Putahe Forum — Migration 002 (Likes & Notifications)
-- Apply via: supabase db push (or paste into the Supabase SQL editor)

-- ─── forum_likes ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forum_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES forum_posts (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE forum_likes REPLICA IDENTITY FULL;
ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select_public"
  ON forum_likes FOR SELECT USING (true);

CREATE POLICY "likes_insert_own"
  ON forum_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete_own"
  ON forum_likes FOR DELETE USING (auth.uid() = user_id);

-- ─── forum_notifications ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forum_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  actor_id     UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  actor_name   TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('like', 'comment', 'share', 'post')),
  post_id      UUID NOT NULL REFERENCES forum_posts (id) ON DELETE CASCADE,
  post_title   TEXT NOT NULL,
  preview      TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE forum_notifications REPLICA IDENTITY FULL;
ALTER TABLE forum_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON forum_notifications FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "notifications_insert_authenticated"
  ON forum_notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "notifications_update_own"
  ON forum_notifications FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "notifications_delete_own"
  ON forum_notifications FOR DELETE USING (auth.uid() = recipient_id);
