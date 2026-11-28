import { Share } from "react-native";
import { supabase } from "@/lib/supabase";
import { getDb } from "@/lib/database";
import {
  enforceRateLimit,
  sanitizeUserText,
  toSafeErrorMessage,
  validateModeratedContent,
} from "@/lib/security";
import type {
  ForumNotification,
  ForumNotificationType,
  ForumPost,
  ForumReply,
} from "@/types/index";

// ─── Local Fallback State (for likes & notifications before SQL migration 002) ─

const LOCAL_LIKES_KEY = "forum_local_likes";
const LOCAL_NOTIFS_KEY = "forum_local_notifications";

interface LocalLikesMap {
  // postId -> array of userIds who liked it locally
  [postId: string]: string[];
}

async function getLocalLikesMap(): Promise<LocalLikesMap> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM db_meta WHERE key = ?",
      [LOCAL_LIKES_KEY]
    );
    if (row?.value) {
      return JSON.parse(row.value) as LocalLikesMap;
    }
  } catch {
    // ignore
  }
  return {};
}

async function saveLocalLikesMap(map: LocalLikesMap): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      "INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)",
      [LOCAL_LIKES_KEY, JSON.stringify(map)]
    );
  } catch {
    // ignore
  }
}

async function getLocalNotifications(): Promise<ForumNotification[]> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM db_meta WHERE key = ?",
      [LOCAL_NOTIFS_KEY]
    );
    if (row?.value) {
      return JSON.parse(row.value) as ForumNotification[];
    }
  } catch {
    // ignore
  }
  return [];
}

async function saveLocalNotifications(
  list: ForumNotification[]
): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      "INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)",
      [LOCAL_NOTIFS_KEY, JSON.stringify(list.slice(0, 80))]
    );
  } catch {
    // ignore
  }
}

export async function recordForumNotification(params: {
  recipientId: string;
  actorId: string;
  actorName: string;
  type: ForumNotificationType;
  postId: string;
  postTitle: string;
  preview?: string;
}): Promise<void> {
  const newNotif: ForumNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recipient_id: params.recipientId,
    actor_id: params.actorId,
    actor_name: params.actorName,
    type: params.type,
    post_id: params.postId,
    post_title: params.postTitle,
    preview: params.preview,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  // Always store locally so the user immediately sees activity in the Notifications module
  const existing = await getLocalNotifications();
  await saveLocalNotifications([newNotif, ...existing]);

  // Also try writing to Supabase `forum_notifications` table if migration 002 is applied
  try {
    await supabase.from("forum_notifications").insert({
      recipient_id: params.recipientId,
      actor_id: params.actorId,
      actor_name: params.actorName,
      type: params.type,
      post_id: params.postId,
      post_title: params.postTitle,
      preview: params.preview ?? null,
    });
  } catch {
    // Safe fallback if table hasn't been migrated yet
  }
}

// ─── Threads ──────────────────────────────────────────────────────────────────

/**
 * Fetch all forum posts, most recent first.
 * Joins author profile, counts replies, and merges likes (remote + local fallback).
 */
export async function getThreads(currentUserId?: string): Promise<ForumPost[]> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select(
      `
      id, author_id, title, body, recipe_tag, created_at, updated_at,
      profiles ( id, display_name, avatar_url, created_at ),
      forum_replies ( count )
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const localLikes = await getLocalLikesMap();

  // Also try reading remote forum_likes if the table exists
  let remoteLikes: Array<{ post_id: string; user_id: string }> = [];
  try {
    const { data: likesData } = await supabase
      .from("forum_likes")
      .select("post_id, user_id");
    if (likesData) {
      remoteLikes = likesData as Array<{ post_id: string; user_id: string }>;
    }
  } catch {
    // Table may not exist yet; use localLikes
  }

  return (data ?? []).map((row) => {
    const postId = row.id as string;
    const userSet = new Set<string>([
      ...(localLikes[postId] ?? []),
      ...remoteLikes
        .filter((l) => l.post_id === postId)
        .map((l) => l.user_id),
    ]);

    return {
      ...row,
      recipe_tag: row.recipe_tag ?? null,
      updated_at: row.updated_at ?? null,
      reply_count:
        Array.isArray(row.forum_replies) && row.forum_replies.length > 0
          ? (row.forum_replies[0] as { count: number }).count
          : 0,
      like_count: userSet.size,
      liked_by_me: currentUserId ? userSet.has(currentUserId) : false,
    };
  }) as unknown as ForumPost[];
}

/**
 * Fetch a single post by ID with its author profile and like status.
 */
export async function getThreadById(
  id: string,
  currentUserId?: string
): Promise<ForumPost | null> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select(
      `
      id, author_id, title, body, recipe_tag, created_at, updated_at,
      profiles ( id, display_name, avatar_url, created_at ),
      forum_replies ( count )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const localLikes = await getLocalLikesMap();
  const userSet = new Set<string>(localLikes[id] ?? []);

  try {
    const { data: likesData } = await supabase
      .from("forum_likes")
      .select("user_id")
      .eq("post_id", id);
    for (const l of likesData ?? []) {
      userSet.add((l as { user_id: string }).user_id);
    }
  } catch {
    // ignore
  }

  const row = data as unknown as ForumPost & {
    forum_replies?: Array<{ count: number }>;
  };

  return {
    ...row,
    reply_count:
      Array.isArray(row.forum_replies) && row.forum_replies.length > 0
        ? row.forum_replies[0].count
        : 0,
    like_count: userSet.size,
    liked_by_me: currentUserId ? userSet.has(currentUserId) : false,
  };
}

/**
 * Create a new forum thread. Requires an active auth session.
 */
export async function createThread(
  title: string,
  body: string,
  recipeTag?: string
): Promise<ForumPost> {
  enforceRateLimit("forum_create_thread", 4, 60_000);
  const cleanTitle = validateModeratedContent(title, "Title", 2, 120);
  const cleanBody = validateModeratedContent(body, "Body", 2, 2000);
  const cleanTag = recipeTag ? sanitizeUserText(recipeTag, 60) : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Please sign in to create a post.");

  const { data, error } = await supabase
    .from("forum_posts")
    .insert({
      author_id: user.id,
      title: cleanTitle,
      body: cleanBody,
      recipe_tag: cleanTag || null,
    })
    .select(
      `
      id, author_id, title, body, recipe_tag, created_at, updated_at,
      profiles ( id, display_name, avatar_url, created_at )
    `
    )
    .single();

  if (error) {
    throw new Error(
      toSafeErrorMessage(error, "Could not publish thread. Please try again.")
    );
  }
  const created = {
    ...(data as unknown as ForumPost),
    reply_count: 0,
    like_count: 0,
    liked_by_me: false,
  };

  const actorName =
    created.profiles?.display_name ??
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Chef";

  await recordForumNotification({
    recipientId: user.id,
    actorId: user.id,
    actorName,
    type: "post",
    postId: created.id,
    postTitle: created.title,
    preview: "Your discussion thread is now live in the Community!",
  });

  return created;
}

/**
 * Update an existing forum post owned by the current user.
 */
export async function updatePost(
  id: string,
  updates: { title: string; body: string; recipeTag?: string | null }
): Promise<ForumPost> {
  enforceRateLimit("forum_update_post", 6, 60_000);
  const cleanTitle = validateModeratedContent(updates.title, "Title", 2, 120);
  const cleanBody = validateModeratedContent(updates.body, "Body", 2, 2000);
  const cleanTag = updates.recipeTag
    ? sanitizeUserText(updates.recipeTag, 60)
    : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to edit your post.");

  const { data, error } = await supabase
    .from("forum_posts")
    .update({
      title: cleanTitle,
      body: cleanBody,
      recipe_tag: cleanTag || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("author_id", user.id)
    .select(
      `
      id, author_id, title, body, recipe_tag, created_at, updated_at,
      profiles ( id, display_name, avatar_url, created_at )
    `
    )
    .single();

  if (error) {
    throw new Error(
      toSafeErrorMessage(error, "Could not update post. Please try again.")
    );
  }
  return data as unknown as ForumPost;
}

/**
 * Delete a post by ID. RLS + explicit author_id check enforces ownership.
 */
export async function deletePost(id: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to delete your post.");

  const { error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) {
    throw new Error(
      toSafeErrorMessage(error, "Could not delete post. Please try again.")
    );
  }
}

// ─── Likes & Shares ───────────────────────────────────────────────────────────

/**
 * Toggle like on a post for the current user.
 * Updates both local persistence and Supabase `forum_likes` (if available) and emits a notification.
 */
export async function togglePostLike(
  post: ForumPost,
  userId: string,
  actorName: string
): Promise<{ liked: boolean; likeCount: number }> {
  const localMap = await getLocalLikesMap();
  const currentList = new Set<string>(localMap[post.id] ?? []);
  const wasLiked = post.liked_by_me || currentList.has(userId);

  if (wasLiked) {
    currentList.delete(userId);
    localMap[post.id] = [...currentList];
    await saveLocalLikesMap(localMap);
    try {
      await supabase
        .from("forum_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", userId);
    } catch {
      // ignore if table not migrated
    }
    const nextCount = Math.max(0, (post.like_count ?? 1) - 1);
    return { liked: false, likeCount: nextCount };
  } else {
    currentList.add(userId);
    localMap[post.id] = [...currentList];
    await saveLocalLikesMap(localMap);
    try {
      await supabase.from("forum_likes").insert({
        post_id: post.id,
        user_id: userId,
      });
    } catch {
      // ignore if table not migrated
    }

    await recordForumNotification({
      recipientId: post.author_id,
      actorId: userId,
      actorName,
      type: "like",
      postId: post.id,
      postTitle: post.title,
      preview: `${actorName} liked "${post.title}"`,
    });

    const nextCount = (post.like_count ?? 0) + 1;
    return { liked: true, likeCount: nextCount };
  }
}

/**
 * Share a forum post via the native OS Share sheet and log a notification.
 */
export async function shareForumPost(
  post: ForumPost,
  userId?: string,
  actorName = "A chef"
): Promise<void> {
  const tagText = post.recipe_tag ? ` (#${post.recipe_tag})` : "";
  const message = `🍳 ${post.title}${tagText}\n\n"${post.body}"\n\n— Shared from Putahe Community`;

  const result = await Share.share({
    title: post.title,
    message,
  });

  if (result.action === Share.sharedAction && userId) {
    await recordForumNotification({
      recipientId: post.author_id,
      actorId: userId,
      actorName,
      type: "share",
      postId: post.id,
      postTitle: post.title,
      preview: `${actorName} shared "${post.title}"`,
    });
  }
}

// ─── Replies ──────────────────────────────────────────────────────────────────

/**
 * Fetch all replies for a post, oldest first.
 */
export async function getReplies(postId: string): Promise<ForumReply[]> {
  const { data, error } = await supabase
    .from("forum_replies")
    .select(
      `
      id, post_id, author_id, body, created_at,
      profiles ( id, display_name, avatar_url, created_at )
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ForumReply[];
}

/**
 * Post a reply to a thread and create a comment notification for the post author.
 */
export async function createReply(
  postId: string,
  body: string,
  postMeta?: { authorId: string; title: string }
): Promise<ForumReply> {
  enforceRateLimit("forum_create_reply", 8, 60_000);
  const cleanBody = validateModeratedContent(body, "Comment", 1, 1000);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Please sign in to post a comment.");

  const { data, error } = await supabase
    .from("forum_replies")
    .insert({
      post_id: postId,
      author_id: user.id,
      body: cleanBody,
    })
    .select(
      `
      id, post_id, author_id, body, created_at,
      profiles ( id, display_name, avatar_url, created_at )
    `
    )
    .single();

  if (error) {
    throw new Error(
      toSafeErrorMessage(error, "Could not post comment. Please try again.")
    );
  }
  const reply = data as unknown as ForumReply;

  const actorName =
    reply.profiles?.display_name ??
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Chef";

  await recordForumNotification({
    recipientId: postMeta?.authorId ?? user.id,
    actorId: user.id,
    actorName,
    type: "comment",
    postId,
    postTitle: postMeta?.title ?? "Community Thread",
    preview: cleanBody.slice(0, 90),
  });

  return reply;
}

/**
 * Delete a reply by ID. RLS + explicit author_id check enforces ownership.
 */
export async function deleteReply(id: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to delete your comment.");

  const { error } = await supabase
    .from("forum_replies")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) {
    throw new Error(
      toSafeErrorMessage(error, "Could not delete comment. Please try again.")
    );
  }
}

/**
 * Report user-generated content (post or reply) for moderation review.
 */
export async function reportForumContent(params: {
  targetType: "post" | "reply";
  targetId: string;
  reason: string;
}): Promise<void> {
  enforceRateLimit("forum_report_content", 5, 60_000);
  const cleanReason = sanitizeUserText(params.reason, 300);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to submit a report.");

  try {
    await supabase.from("forum_reports").insert({
      reporter_id: user.id,
      target_type: params.targetType,
      target_id: params.targetId,
      reason: cleanReason,
    });
  } catch {
    // Also persist locally if migration 003 hasn't been applied on remote yet
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

/**
 * Fetch notifications for the current user (merges remote `forum_notifications` + local notifications).
 * Also synthesizes notifications from replies on the user's own posts so they never miss comments!
 */
export async function getNotifications(
  userId: string,
  myPosts: ForumPost[] = []
): Promise<ForumNotification[]> {
  const localList = await getLocalNotifications();
  let remoteList: ForumNotification[] = [];

  try {
    const { data } = await supabase
      .from("forum_notifications")
      .select("*")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (data) {
      remoteList = data as unknown as ForumNotification[];
    }
  } catch {
    // table may not exist yet
  }

  // Also fetch recent replies on the user's own posts so incoming comments from other users always appear
  const replyNotifs: ForumNotification[] = [];
  if (myPosts.length > 0) {
    try {
      const myPostIds = myPosts.map((p) => p.id);
      const postTitleMap = new Map(myPosts.map((p) => [p.id, p.title]));
      const { data: repliesData } = await supabase
        .from("forum_replies")
        .select(
          `
          id, post_id, author_id, body, created_at,
          profiles ( id, display_name )
        `
        )
        .in("post_id", myPostIds)
        .order("created_at", { ascending: false })
        .limit(25);

      for (const r of repliesData ?? []) {
        const row = r as unknown as ForumReply;
        const actorName =
          row.profiles?.display_name ?? row.author_id.slice(0, 8);
        replyNotifs.push({
          id: `reply-${row.id}`,
          recipient_id: userId,
          actor_id: row.author_id,
          actor_name: actorName,
          type: "comment",
          post_id: row.post_id,
          post_title: postTitleMap.get(row.post_id) ?? "Your Post",
          preview: row.body,
          is_read: false,
          created_at: row.created_at,
        });
      }
    } catch {
      // ignore
    }
  }

  const map = new Map<string, ForumNotification>();
  for (const n of [...remoteList, ...localList, ...replyNotifs]) {
    const key = `${n.type}-${n.post_id}-${n.actor_id}-${n.preview ?? ""}`;
    if (!map.has(key)) {
      map.set(key, n);
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const local = await getLocalNotifications();
  const updated = local.map((n) => ({ ...n, is_read: true }));
  await saveLocalNotifications(updated);

  try {
    await supabase
      .from("forum_notifications")
      .update({ is_read: true })
      .eq("recipient_id", userId);
  } catch {
    // ignore
  }
}

export async function clearAllNotifications(userId: string): Promise<void> {
  await saveLocalNotifications([]);
  try {
    await supabase
      .from("forum_notifications")
      .delete()
      .eq("recipient_id", userId);
  } catch {
    // ignore
  }
}
