import { supabase } from "@/lib/supabase";
import type { ForumPost, ForumReply } from "@/types/index";

// ─── Threads ──────────────────────────────────────────────────────────────────

/**
 * Fetch all forum posts, most recent first.
 * Joins the author's profile and counts replies inline.
 */
export async function getThreads(): Promise<ForumPost[]> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select(`
      id, author_id, title, body, recipe_tag, created_at, updated_at,
      profiles ( id, display_name, avatar_url, created_at ),
      forum_replies ( count )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    recipe_tag: row.recipe_tag ?? null,
    updated_at: row.updated_at ?? null,
    // forum_replies returns [{ count: n }] from the aggregate
    reply_count:
      Array.isArray(row.forum_replies) && row.forum_replies.length > 0
        ? (row.forum_replies[0] as { count: number }).count
        : 0,
  })) as unknown as ForumPost[];
}

/**
 * Fetch a single post by ID with its author profile.
 */
export async function getThreadById(id: string): Promise<ForumPost | null> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select(`
      id, author_id, title, body, recipe_tag, created_at, updated_at,
      profiles ( id, display_name, avatar_url, created_at )
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw error;
  }
  return data as unknown as ForumPost;
}

/**
 * Create a new forum thread. Requires an active auth session.
 */
export async function createThread(
  title: string,
  body: string,
  recipeTag?: string
): Promise<ForumPost> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("forum_posts")
    .insert({
      author_id: user.id,
      title: title.trim(),
      body: body.trim(),
      recipe_tag: recipeTag?.trim() || null,
    })
    .select(`
      id, author_id, title, body, recipe_tag, created_at, updated_at,
      profiles ( id, display_name, avatar_url, created_at )
    `)
    .single();

  if (error) throw error;
  return data as unknown as ForumPost;
}

/**
 * Delete a post by ID. RLS enforces ownership server-side.
 */
export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Replies ──────────────────────────────────────────────────────────────────

/**
 * Fetch all replies for a post, oldest first.
 */
export async function getReplies(postId: string): Promise<ForumReply[]> {
  const { data, error } = await supabase
    .from("forum_replies")
    .select(`
      id, post_id, author_id, body, created_at,
      profiles ( id, display_name, avatar_url, created_at )
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ForumReply[];
}

/**
 * Post a reply to a thread. Requires an active auth session.
 */
export async function createReply(
  postId: string,
  body: string
): Promise<ForumReply> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("forum_replies")
    .insert({
      post_id: postId,
      author_id: user.id,
      body: body.trim(),
    })
    .select(`
      id, post_id, author_id, body, created_at,
      profiles ( id, display_name, avatar_url, created_at )
    `)
    .single();

  if (error) throw error;
  return data as unknown as ForumReply;
}

/**
 * Delete a reply by ID. RLS enforces ownership server-side.
 */
export async function deleteReply(id: string): Promise<void> {
  const { error } = await supabase
    .from("forum_replies")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
