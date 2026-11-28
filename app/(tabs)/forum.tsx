import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/stores/AuthContext";
import {
  clearAllNotifications,
  deletePost,
  getNotifications,
  getThreads,
  markAllNotificationsRead,
  reportForumContent,
  shareForumPost,
  togglePostLike,
  updatePost,
} from "@/lib/forum";
import { toSafeErrorMessage } from "@/lib/security";
import { supabase } from "@/lib/supabase";
import { getCompanionOption } from "@/lib/companions";
import { ThreadCard } from "@/components/ThreadCard";
import { CompanionReaction } from "@/components/CompanionReaction";
import { SystemBackground } from "@/components/SystemBackground";
import type { ForumNotification, ForumPost } from "@/types/index";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ForumSectionTab = "feed" | "profile" | "notifications";

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ForumScreen() {
  const {
    session,
    companion,
    loading: authLoading,
    signOut,
    deleteAccount,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<ForumSectionTab>("feed");
  const [threads, setThreads] = useState<ForumPost[]>([]);
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Edit Own Post Modal state
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTag, setEditTag] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const userId = session?.user.id;
  const companionOpt = getCompanionOption(companion?.iconId);
  const displayName =
    companion?.name ||
    (session?.user.user_metadata?.display_name as string | undefined) ||
    session?.user.email?.split("@")[0] ||
    "Chef";

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/(auth)/sign-in");
    }
  }, [authLoading, session]);

  const loadAllForumData = useCallback(
    async (silent = false) => {
      if (!userId) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const fetchedThreads = await getThreads(userId);
        setThreads(fetchedThreads);
        const ownPosts = fetchedThreads.filter((p) => p.author_id === userId);
        const fetchedNotifs = await getNotifications(userId, ownPosts);
        setNotifications(fetchedNotifs);
      } catch (e: unknown) {
        setError(toSafeErrorMessage(e, "Failed to load community."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!session || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        const fetchedThreads = await getThreads(userId);
        if (!cancelled) {
          setThreads(fetchedThreads);
          setError(null);
        }
        const ownPosts = fetchedThreads.filter((p) => p.author_id === userId);
        const fetchedNotifs = await getNotifications(userId, ownPosts);
        if (!cancelled) {
          setNotifications(fetchedNotifs);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(toSafeErrorMessage(e, "Failed to load community."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    const channel = supabase
      .channel("forum_realtime_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_posts" },
        () => {
          loadAllForumData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_replies" },
        () => {
          loadAllForumData(true);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [session, userId, loadAllForumData]);

  // ─── Derived Lists & Stats ──────────────────────────────────────────────────

  const myPosts = useMemo(
    () => threads.filter((t) => t.author_id === userId),
    [threads, userId]
  );

  const myStats = useMemo(() => {
    let totalLikes = 0;
    let totalComments = 0;
    for (const p of myPosts) {
      totalLikes += p.like_count ?? 0;
      totalComments += p.reply_count ?? 0;
    }
    return {
      postCount: myPosts.length,
      totalLikes,
      totalComments,
    };
  }, [myPosts]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // ─── Social & Management Handlers ───────────────────────────────────────────

  async function handleToggleLike(post: ForumPost) {
    if (!userId) return;
    const { liked, likeCount } = await togglePostLike(
      post,
      userId,
      displayName
    );
    setThreads((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? { ...item, liked_by_me: liked, like_count: likeCount }
          : item
      )
    );
    const updatedNotifs = await getNotifications(userId, myPosts);
    setNotifications(updatedNotifs);
  }

  async function handleShare(post: ForumPost) {
    await shareForumPost(post, userId, displayName);
    if (userId) {
      const updatedNotifs = await getNotifications(userId, myPosts);
      setNotifications(updatedNotifs);
    }
  }

  function handleOpenEdit(post: ForumPost) {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditTag(post.recipe_tag ?? "");
  }

  async function handleSaveEdit() {
    if (!editingPost || !editTitle.trim() || !editBody.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await updatePost(editingPost.id, {
        title: editTitle,
        body: editBody,
        recipeTag: editTag,
      });
      setThreads((prev) =>
        prev.map((p) =>
          p.id === editingPost.id
            ? {
                ...p,
                title: updated.title,
                body: updated.body,
                recipe_tag: updated.recipe_tag,
                updated_at: updated.updated_at,
              }
            : p
        )
      );
      setEditingPost(null);
    } catch (e: unknown) {
      Alert.alert(
        "Update Failed",
        toSafeErrorMessage(e, "Could not update post.")
      );
    } finally {
      setSavingEdit(false);
    }
  }

  function handleConfirmDelete(post: ForumPost) {
    Alert.alert(
      "Delete Post",
      `Are you sure you want to permanently delete "${post.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePost(post.id);
              setThreads((prev) => prev.filter((p) => p.id !== post.id));
            } catch (e: unknown) {
              Alert.alert(
                "Error",
                toSafeErrorMessage(e, "Failed to delete post.")
              );
            }
          },
        },
      ]
    );
  }

  function handleReportPost(post: ForumPost) {
    Alert.alert(
      "Report Content",
      `Report "${post.title}" for inappropriate, spam, or unsafe content?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            try {
              await reportForumContent({
                targetType: "post",
                targetId: post.id,
                reason: "Flagged by community user",
              });
              Alert.alert(
                "Report Submitted",
                "Thank you for helping keep the Putahe community safe. Our moderation system has logged your report."
              );
            } catch (e: unknown) {
              Alert.alert(
                "Notice",
                toSafeErrorMessage(e, "Unable to submit report right now.")
              );
            }
          },
        },
      ]
    );
  }

  async function handleSelectTab(tab: ForumSectionTab) {
    setActiveTab(tab);
    if (tab === "notifications" && userId && unreadCount > 0) {
      await markAllNotificationsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

  function handleClearNotifications() {
    if (!userId) return;
    Alert.alert(
      "Clear Notifications",
      "Are you sure you want to clear all activity notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearAllNotifications(userId);
            setNotifications([]);
          },
        },
      ]
    );
  }

  function handleConfirmDeleteAccount() {
    Alert.alert(
      "Delete Account & Data",
      "This will permanently delete your account, profile, forum posts, comments, likes, and local saved recipes. This action is irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteAccount();
              router.replace("/(auth)/sign-in");
            } catch (e: unknown) {
              setDeletingAccount(false);
              Alert.alert(
                "Deletion Failed",
                toSafeErrorMessage(
                  e,
                  "Could not complete account deletion. Please try again."
                )
              );
            }
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  }

  if (authLoading || !session) {
    return (
      <SystemBackground>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#57E165" />
        </View>
      </SystemBackground>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Community",
          headerRight: () => (
            <View style={styles.headerRightRow}>
              {/* Header Notification Bell Shortcut */}
              <Pressable
                onPress={() => handleSelectTab("notifications")}
                style={styles.bellHeaderBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={
                    activeTab === "notifications"
                      ? "notifications"
                      : "notifications-outline"
                  }
                  size={20}
                  color="#504B3A"
                />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={handleSignOut}
                disabled={signingOut}
                style={styles.signOutPill}
              >
                <Text style={styles.signOutText}>
                  {signingOut ? "…" : "Sign Out"}
                </Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <SystemBackground>
        <View style={styles.root}>
          {/* 3-Module Segmented Navigation Bar: Feed | My Profile | Notifications */}
          <View style={styles.moduleNavWrapper}>
            <View style={styles.moduleNav}>
              <Pressable
                onPress={() => handleSelectTab("feed")}
                style={[
                  styles.moduleTab,
                  activeTab === "feed" && styles.moduleTabActive,
                ]}
              >
                <Ionicons
                  name="globe-outline"
                  size={15}
                  color={activeTab === "feed" ? "#504B3A" : "#646F58"}
                />
                <Text
                  style={[
                    styles.moduleTabText,
                    activeTab === "feed" && styles.moduleTabTextActive,
                  ]}
                >
                  Feed
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSelectTab("profile")}
                style={[
                  styles.moduleTab,
                  activeTab === "profile" && styles.moduleTabActive,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={activeTab === "profile" ? "#504B3A" : "#646F58"}
                />
                <Text
                  style={[
                    styles.moduleTabText,
                    activeTab === "profile" && styles.moduleTabTextActive,
                  ]}
                >
                  My Profile ({myPosts.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSelectTab("notifications")}
                style={[
                  styles.moduleTab,
                  activeTab === "notifications" && styles.moduleTabActive,
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={15}
                  color={activeTab === "notifications" ? "#504B3A" : "#646F58"}
                />
                <Text
                  style={[
                    styles.moduleTabText,
                    activeTab === "notifications" && styles.moduleTabTextActive,
                  ]}
                >
                  Alerts
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.tabUnreadDot}>
                    <Text style={styles.tabUnreadText}>{unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* ─── MODULE 1: COMMUNITY FEED ───────────────────────────────────── */}
          {activeTab === "feed" && (
            <View style={styles.flexOne}>
              <View style={styles.newThreadBar}>
                <Pressable
                  style={styles.newThreadBtn}
                  onPress={() => router.push("/forum/new")}
                >
                  <Ionicons name="create-outline" size={18} color="#504B3A" />
                  <Text style={styles.newThreadBtnText}>
                    Start a New Discussion
                  </Text>
                </Pressable>
              </View>

              {loading ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="large" color="#57E165" />
                </View>
              ) : error ? (
                <View style={styles.centerBox}>
                  <View style={styles.stateCard}>
                    <CompanionReaction
                      mood="sad"
                      size={110}
                      title="Couldn't load community threads"
                      subtitle={error}
                    />
                    <Pressable
                      style={styles.retryBtn}
                      onPress={() => loadAllForumData()}
                    >
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </Pressable>
                  </View>
                </View>
              ) : threads.length === 0 ? (
                <View style={styles.centerBox}>
                  <View style={styles.stateCard}>
                    <CompanionReaction
                      mood="curious"
                      size={120}
                      title="No discussions yet"
                      subtitle="Be the first to share a recipe tip or question with the community!"
                    />
                  </View>
                </View>
              ) : (
                <FlatList
                  data={threads}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listPadding}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      tintColor="#57E165"
                      onRefresh={() => {
                        setRefreshing(true);
                        loadAllForumData(true);
                      }}
                    />
                  }
                  renderItem={({ item }) => (
                    <ThreadCard
                      post={item}
                      isOwn={item.author_id === userId}
                      onPress={() =>
                        router.push({
                          pathname: "/forum/[id]",
                          params: { id: item.id },
                        })
                      }
                      onLike={() => handleToggleLike(item)}
                      onComment={() =>
                        router.push({
                          pathname: "/forum/[id]",
                          params: { id: item.id },
                        })
                      }
                      onShare={() => handleShare(item)}
                      onEdit={
                        item.author_id === userId
                          ? () => handleOpenEdit(item)
                          : undefined
                      }
                      onDelete={
                        item.author_id === userId
                          ? () => handleConfirmDelete(item)
                          : undefined
                      }
                      onReport={
                        item.author_id !== userId
                          ? () => handleReportPost(item)
                          : undefined
                      }
                    />
                  )}
                />
              )}
            </View>
          )}

          {/* ─── MODULE 2: OWN PROFILE SECTION (MANAGE OWN POSTS) ──────────── */}
          {activeTab === "profile" && (
            <FlatList
              data={myPosts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listPadding}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  tintColor="#57E165"
                  onRefresh={() => {
                    setRefreshing(true);
                    loadAllForumData(true);
                  }}
                />
              }
              ListHeaderComponent={
                <View>
                  {/* Chef Profile Header Card */}
                  <View style={styles.profileCard}>
                    <View style={styles.profileTopRow}>
                      <View
                        style={[
                          styles.profileAvatarFrame,
                          {
                            borderColor: companionOpt.accentColor,
                            backgroundColor: companionOpt.badgeBg,
                          },
                        ]}
                      >
                        <Image
                          source={companionOpt.image}
                          style={styles.profileAvatarImg}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.profileInfoCol}>
                        <View style={styles.profileBadge}>
                          <Ionicons
                            name="restaurant"
                            size={11}
                            color="#504B3A"
                          />
                          <Text style={styles.profileBadgeText}>
                            {companionOpt.defaultTitle}
                          </Text>
                        </View>
                        <Text style={styles.profileName}>
                          Chef {displayName}
                        </Text>
                        <Text style={styles.profileEmail} numberOfLines={1}>
                          {session.user.email}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => router.push("/(auth)/companion-setup")}
                        style={styles.editCompanionBtn}
                      >
                        <Ionicons
                          name="color-wand-outline"
                          size={16}
                          color="#504B3A"
                        />
                      </Pressable>
                    </View>

                    {/* Profile Stats Row */}
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>
                          {myStats.postCount}
                        </Text>
                        <Text style={styles.statLabel}>My Posts</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>
                          {myStats.totalLikes}
                        </Text>
                        <Text style={styles.statLabel}>Likes Earned</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>
                          {myStats.totalComments}
                        </Text>
                        <Text style={styles.statLabel}>Comments</Text>
                      </View>
                    </View>

                    {/* Quick Create Post Button inside Profile */}
                    <Pressable
                      style={styles.profileCreateBtn}
                      onPress={() => router.push("/forum/new")}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color="#504B3A"
                      />
                      <Text style={styles.profileCreateBtnText}>
                        Create New Post
                      </Text>
                    </Pressable>

                    {/* Privacy & Account Data Deletion Controls */}
                    <View style={styles.privacySection}>
                      <View style={styles.privacyTextCol}>
                        <Text style={styles.privacyTitle}>
                          Privacy & Data Control
                        </Text>
                        <Text style={styles.privacySubtitle}>
                          Permanently delete your account, forum posts, and
                          personal data.
                        </Text>
                      </View>
                      <Pressable
                        onPress={handleConfirmDeleteAccount}
                        disabled={deletingAccount}
                        style={styles.deleteAccountBtn}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#B91C1C"
                        />
                        <Text style={styles.deleteAccountBtnText}>
                          {deletingAccount ? "Deleting…" : "Delete Account"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.sectionHeadingPill}>
                    <Ionicons
                      name="settings-outline"
                      size={14}
                      color="#504B3A"
                    />
                    <Text style={styles.sectionHeadingText}>
                      Manage Your Posts ({myPosts.length})
                    </Text>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.stateCard}>
                  <CompanionReaction
                    mood="curious"
                    size={115}
                    title="You haven't posted yet"
                    subtitle="Share your first recipe tip, cooking question, or dish creation above!"
                  />
                </View>
              }
              renderItem={({ item }) => (
                <ThreadCard
                  post={item}
                  isOwn
                  onPress={() =>
                    router.push({
                      pathname: "/forum/[id]",
                      params: { id: item.id },
                    })
                  }
                  onLike={() => handleToggleLike(item)}
                  onComment={() =>
                    router.push({
                      pathname: "/forum/[id]",
                      params: { id: item.id },
                    })
                  }
                  onShare={() => handleShare(item)}
                  onEdit={() => handleOpenEdit(item)}
                  onDelete={() => handleConfirmDelete(item)}
                />
              )}
            />
          )}

          {/* ─── MODULE 3: NOTIFICATIONS MODULE ────────────────────────────── */}
          {activeTab === "notifications" && (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listPadding}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  tintColor="#57E165"
                  onRefresh={() => {
                    setRefreshing(true);
                    loadAllForumData(true);
                  }}
                />
              }
              ListHeaderComponent={
                <View style={styles.notifHeaderRow}>
                  <View style={styles.sectionHeadingPill}>
                    <Ionicons
                      name="notifications-outline"
                      size={15}
                      color="#504B3A"
                    />
                    <Text style={styles.sectionHeadingText}>
                      Activity & Notifications ({notifications.length})
                    </Text>
                  </View>
                  {notifications.length > 0 && (
                    <Pressable
                      onPress={handleClearNotifications}
                      style={styles.clearNotifsBtn}
                    >
                      <Text style={styles.clearNotifsText}>Clear All</Text>
                    </Pressable>
                  )}
                </View>
              }
              ListEmptyComponent={
                <View style={styles.stateCard}>
                  <CompanionReaction
                    mood="happy"
                    size={115}
                    title="All caught up!"
                    subtitle="When community chefs like, comment on, or share your posts, you'll see alerts right here."
                  />
                </View>
              }
              renderItem={({ item }) => {
                const iconName =
                  item.type === "like"
                    ? "heart"
                    : item.type === "comment"
                      ? "chatbubble"
                      : item.type === "share"
                        ? "share-social"
                        : "sparkles";

                const actionLabel =
                  item.type === "like"
                    ? "liked a post"
                    : item.type === "comment"
                      ? "commented on"
                      : item.type === "share"
                        ? "shared"
                        : "published";

                return (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/forum/[id]",
                        params: { id: item.post_id },
                      })
                    }
                    style={[
                      styles.notifCard,
                      !item.is_read && styles.notifCardUnread,
                    ]}
                  >
                    <View
                      style={[
                        styles.notifIconCircle,
                        item.type === "like"
                          ? { backgroundColor: "#57E165" }
                          : item.type === "comment"
                            ? { backgroundColor: "#EDF5EC" }
                            : { backgroundColor: "#F3F5F0" },
                      ]}
                    >
                      <Ionicons
                        name={iconName}
                        size={17}
                        color={item.type === "like" ? "#504B3A" : "#646F58"}
                      />
                    </View>

                    <View style={styles.notifBodyCol}>
                      <Text style={styles.notifHeadline}>
                        <Text style={styles.notifActor}>{item.actor_name}</Text>{" "}
                        {actionLabel}{" "}
                        <Text style={styles.notifPostTitle}>
                          &ldquo;{item.post_title}&rdquo;
                        </Text>
                      </Text>
                      {item.preview ? (
                        <Text style={styles.notifPreview} numberOfLines={2}>
                          {item.preview}
                        </Text>
                      ) : null}
                      <Text style={styles.notifTime}>
                        {formatRelativeTime(item.created_at)}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#7D8570"
                    />
                  </Pressable>
                );
              }}
            />
          )}
        </View>

        {/* Edit Own Post Modal */}
        <Modal
          visible={Boolean(editingPost)}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingPost(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Your Post</Text>
                <Pressable onPress={() => setEditingPost(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={24} color="#7D8570" />
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.modalInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Post title"
                placeholderTextColor="#7D8570"
                maxLength={120}
              />

              <Text style={styles.inputLabel}>Body</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextarea]}
                value={editBody}
                onChangeText={setEditBody}
                placeholder="Share your culinary thoughts…"
                placeholderTextColor="#7D8570"
                multiline
                maxLength={2000}
              />

              <Text style={styles.inputLabel}>Recipe Tag (optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={editTag}
                onChangeText={setEditTag}
                placeholder="e.g. Adobo, Sinigang, Pasta"
                placeholderTextColor="#7D8570"
                maxLength={60}
              />

              <View style={styles.modalFooter}>
                <Pressable
                  onPress={() => setEditingPost(null)}
                  style={styles.cancelModalBtn}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={savingEdit || !editTitle.trim() || !editBody.trim()}
                  style={styles.saveModalBtn}
                >
                  {savingEdit ? (
                    <ActivityIndicator size="small" color="#504B3A" />
                  ) : (
                    <Text style={styles.saveModalText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SystemBackground>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    gap: 10,
  },
  bellHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDF5EC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#57E165",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#504B3A",
  },
  signOutPill: {
    backgroundColor: "#F3F6F1",
    borderWidth: 1,
    borderColor: "#DCE4D8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#646F58",
  },
  moduleNavWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2EAE0",
  },
  moduleNav: {
    flexDirection: "row",
    backgroundColor: "#EFF3EC",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: "#DCE4D8",
  },
  moduleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 999,
    gap: 5,
  },
  moduleTabActive: {
    backgroundColor: "#57E165",
    elevation: 2,
  },
  moduleTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#646F58",
  },
  moduleTabTextActive: {
    color: "#504B3A",
    fontWeight: "800",
  },
  tabUnreadDot: {
    backgroundColor: "#504B3A",
    borderRadius: 999,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tabUnreadText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  newThreadBar: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2EAE0",
  },
  newThreadBtn: {
    backgroundColor: "#57E165",
    borderRadius: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#46C953",
  },
  newThreadBtnText: {
    color: "#504B3A",
    fontWeight: "800",
    fontSize: 14,
  },
  listPadding: {
    padding: 16,
    paddingBottom: 32,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2EAE0",
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: "#57E165",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryBtnText: {
    color: "#504B3A",
    fontWeight: "800",
  },
  profileCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2EAE0",
    marginBottom: 16,
    elevation: 3,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatarFrame: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 2.5,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  profileAvatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  profileInfoCol: {
    flex: 1,
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EDF5EC",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 4,
    marginBottom: 4,
  },
  profileBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#646F58",
  },
  profileName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#504B3A",
  },
  profileEmail: {
    fontSize: 12.5,
    color: "#7D8570",
    marginTop: 1,
  },
  editCompanionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDF5EC",
    borderWidth: 1,
    borderColor: "#D4E3D1",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8F4",
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E4EAE0",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#504B3A",
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#7D8570",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#DCE4D8",
  },
  profileCreateBtn: {
    marginTop: 14,
    backgroundColor: "#57E165",
    borderRadius: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  profileCreateBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#504B3A",
  },
  privacySection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E8ECE4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  privacyTextCol: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#504B3A",
  },
  privacySubtitle: {
    fontSize: 11,
    color: "#7D8570",
    marginTop: 1,
  },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 4,
  },
  deleteAccountBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#B91C1C",
  },
  sectionHeadingPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE4D8",
    marginBottom: 12,
    gap: 6,
  },
  sectionHeadingText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#504B3A",
  },
  notifHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  clearNotifsBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE4D8",
    marginBottom: 12,
  },
  clearNotifsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#646F58",
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2EAE0",
    gap: 12,
  },
  notifCardUnread: {
    borderColor: "#57E165",
    borderWidth: 1.5,
    backgroundColor: "#F6FDF7",
  },
  notifIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBodyCol: {
    flex: 1,
  },
  notifHeadline: {
    fontSize: 13.5,
    color: "#646F58",
    lineHeight: 19,
  },
  notifActor: {
    fontWeight: "800",
    color: "#504B3A",
  },
  notifPostTitle: {
    fontWeight: "700",
    color: "#504B3A",
  },
  notifPreview: {
    fontSize: 12.5,
    color: "#7D8570",
    marginTop: 3,
    fontStyle: "italic",
  },
  notifTime: {
    fontSize: 11,
    color: "#7D8570",
    marginTop: 4,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(80, 75, 58, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#DCE4D8",
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#504B3A",
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#646F58",
    marginBottom: 5,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#DCE2D5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#504B3A",
    backgroundColor: "#F7F8F5",
  },
  modalTextarea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F3F5F0",
  },
  cancelModalText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#646F58",
  },
  saveModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#57E165",
  },
  saveModalText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#504B3A",
  },
});
