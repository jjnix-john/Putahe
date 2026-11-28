import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/stores/AuthContext";
import {
  getThreadById,
  getReplies,
  createReply,
  deletePost,
  deleteReply,
  reportForumContent,
  togglePostLike,
  shareForumPost,
  updatePost,
} from "@/lib/forum";
import { toSafeErrorMessage } from "@/lib/security";
import { ReplyCard } from "@/components/ReplyCard";
import { SystemBackground } from "@/components/SystemBackground";
import type { ForumPost, ForumReply } from "@/types/index";

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, companion } = useAuth();
  const [focusReply, setFocusReply] = useState(false);

  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loadingPost, setLoadingPost] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit own post modal state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTag, setEditTag] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const userId = session?.user.id;
  const actorName =
    companion?.name ||
    (session?.user.user_metadata?.display_name as string | undefined) ||
    session?.user.email?.split("@")[0] ||
    "Chef";

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const [fetchedPost, fetchedReplies] = await Promise.all([
          getThreadById(id, userId),
          getReplies(id),
        ]);
        if (!cancelled) {
          setPost(fetchedPost);
          setReplies(fetchedReplies);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(toSafeErrorMessage(e, "Failed to load thread."));
        }
      } finally {
        if (!cancelled) {
          setLoadingPost(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, userId]);

  async function handleToggleLike() {
    if (!post || !userId) return;
    const { liked, likeCount } = await togglePostLike(post, userId, actorName);
    setPost((prev) =>
      prev
        ? { ...prev, liked_by_me: liked, like_count: likeCount }
        : prev
    );
  }

  async function handleShare() {
    if (!post) return;
    await shareForumPost(post, userId, actorName);
  }

  function handleOpenEdit() {
    if (!post) return;
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditTag(post.recipe_tag ?? "");
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (!post || !editTitle.trim() || !editBody.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await updatePost(post.id, {
        title: editTitle,
        body: editBody,
        recipeTag: editTag,
      });
      setPost((prev) =>
        prev
          ? {
              ...prev,
              title: updated.title,
              body: updated.body,
              recipe_tag: updated.recipe_tag,
              updated_at: updated.updated_at,
            }
          : prev
      );
      setEditing(false);
    } catch (e: unknown) {
      setError(toSafeErrorMessage(e, "Failed to update post."));
    } finally {
      setSavingEdit(false);
    }
  }

  function handleDeletePost() {
    if (!post) return;
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
              router.back();
            } catch (e: unknown) {
              setError(toSafeErrorMessage(e, "Failed to delete post."));
            }
          },
        },
      ]
    );
  }

  function handleReportPost() {
    if (!post) return;
    Alert.alert(
      "Report Post",
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
                "Thank you. Your report has been logged for moderation."
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

  async function handleSubmitReply() {
    if (!replyBody.trim() || !id) return;
    setSubmitting(true);
    try {
      const newReply = await createReply(
        id,
        replyBody,
        post ? { authorId: post.author_id, title: post.title } : undefined
      );
      setReplies((prev) => [...prev, newReply]);
      setPost((prev) =>
        prev ? { ...prev, reply_count: (prev.reply_count ?? 0) + 1 } : prev
      );
      setReplyBody("");
    } catch (e: unknown) {
      setError(toSafeErrorMessage(e, "Failed to post reply."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteReply(replyId: string) {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to permanently delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReply(replyId);
              setReplies((prev) => prev.filter((r) => r.id !== replyId));
              setPost((prev) =>
                prev
                  ? {
                      ...prev,
                      reply_count: Math.max(0, (prev.reply_count ?? 1) - 1),
                    }
                  : prev
              );
            } catch (e: unknown) {
              setError(toSafeErrorMessage(e, "Failed to delete reply."));
            }
          },
        },
      ]
    );
  }

  function handleReportReply(replyId: string) {
    Alert.alert(
      "Report Comment",
      "Report this comment for inappropriate, spam, or unsafe content?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            try {
              await reportForumContent({
                targetType: "reply",
                targetId: replyId,
                reason: "Flagged by community user",
              });
              Alert.alert(
                "Report Submitted",
                "Thank you. Your report has been logged for moderation."
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

  if (loadingPost) {
    return (
      <>
        <Stack.Screen options={{ title: "Thread", headerShown: true }} />
        <SystemBackground>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#57E165" />
          </View>
        </SystemBackground>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Stack.Screen options={{ title: "Thread", headerShown: true }} />
        <SystemBackground>
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-white/95 rounded-2xl p-6 items-center border border-[#E2EAE0] w-full">
              <Text className="text-olive-light text-center">
                Thread not found.
              </Text>
              <Pressable
                className="mt-4 bg-malachite rounded-lg px-5 py-2 active:opacity-80"
                onPress={() => router.back()}
              >
                <Text className="text-khaki font-bold">Go Back</Text>
              </Pressable>
            </View>
          </View>
        </SystemBackground>
      </>
    );
  }

  const isPostOwner = userId === post.author_id;
  const authorName =
    post.profiles?.display_name ?? post.author_id.slice(0, 8);
  const liked = Boolean(post.liked_by_me);
  const likeCount = post.like_count ?? 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Discussion",
          headerBackTitle: "Community",
          headerShown: true,
          headerTintColor: "#504B3A",
          headerTitleStyle: { color: "#504B3A", fontWeight: "700" },
        }}
      />
      <SystemBackground>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={80}
        >
          <FlatList
            data={replies}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View className="mb-4">
                {/* Post Card */}
                <View style={styles.postCard}>
                  <View style={styles.postHeaderRow}>
                    <View style={styles.authorMeta}>
                      <Text style={styles.authorName}>{authorName}</Text>
                      {isPostOwner && (
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>Author</Text>
                        </View>
                      )}
                    </View>

                    {isPostOwner ? (
                      <View style={styles.ownerBtns}>
                        <Pressable
                          onPress={handleOpenEdit}
                          style={styles.editBtn}
                        >
                          <Ionicons
                            name="create-outline"
                            size={15}
                            color="#646F58"
                          />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleDeletePost}
                          style={styles.deleteBtn}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color="#B91C1C"
                          />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={handleReportPost}
                        style={styles.editBtn}
                      >
                        <Ionicons
                          name="flag-outline"
                          size={14}
                          color="#7D8570"
                        />
                        <Text style={styles.editBtnText}>Report</Text>
                      </Pressable>
                    )}
                  </View>

                  <Text style={styles.postTitle}>{post.title}</Text>

                  {post.recipe_tag ? (
                    <View style={styles.tagPill}>
                      <Ionicons
                        name="pricetag-outline"
                        size={12}
                        color="#646F58"
                      />
                      <Text style={styles.tagText}>#{post.recipe_tag}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.postBody}>{post.body}</Text>

                  {/* Social Action Bar: Like, Comment, Share */}
                  <View style={styles.socialBar}>
                    <Pressable
                      onPress={handleToggleLike}
                      style={[
                        styles.socialBtn,
                        liked && styles.socialBtnLiked,
                      ]}
                    >
                      <Ionicons
                        name={liked ? "heart" : "heart-outline"}
                        size={17}
                        color={liked ? "#504B3A" : "#646F58"}
                      />
                      <Text
                        style={[
                          styles.socialBtnText,
                          liked && styles.socialBtnTextLiked,
                        ]}
                      >
                        {likeCount > 0 ? `${likeCount} ` : ""}
                        {likeCount === 1 ? "Like" : "Likes"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setFocusReply(true)}
                      style={styles.socialBtn}
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={16}
                        color="#646F58"
                      />
                      <Text style={styles.socialBtnText}>
                        {replies.length} Comment
                        {replies.length === 1 ? "" : "s"}
                      </Text>
                    </Pressable>

                    <Pressable onPress={handleShare} style={styles.socialBtn}>
                      <Ionicons
                        name="share-social-outline"
                        size={16}
                        color="#646F58"
                      />
                      <Text style={styles.socialBtnText}>Share</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Error banner */}
                {error && (
                  <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                    <Text className="text-red-700 text-sm">{error}</Text>
                  </View>
                )}

                {/* Replies heading */}
                <View style={styles.repliesHeaderPill}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={15}
                    color="#504B3A"
                  />
                  <Text style={styles.repliesHeaderText}>
                    {replies.length === 0
                      ? "No comments yet — start the conversation!"
                      : `${replies.length} ${
                          replies.length === 1 ? "Comment" : "Comments"
                        }`}
                  </Text>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <ReplyCard
                reply={item}
                isOwn={userId === item.author_id}
                onDelete={() => handleDeleteReply(item.id)}
                onReport={
                  userId !== item.author_id
                    ? () => handleReportReply(item.id)
                    : undefined
                }
              />
            )}
          />

          {/* Comment input */}
          <View className="bg-white/95 border-t border-[#E8ECE4] px-4 py-3">
            <View className="flex-row items-end gap-x-2">
              <TextInput
                key={focusReply ? "focused" : "default"}
                autoFocus={focusReply}
                className="flex-1 border border-[#DCE2D5] rounded-xl px-4 py-2.5 text-khaki bg-[#F7F8F5] text-sm"
                placeholder="Write a comment…"
                placeholderTextColor="#7D8570"
                value={replyBody}
                onChangeText={setReplyBody}
                multiline
                maxLength={1000}
              />
              <Pressable
                className="bg-malachite rounded-xl px-4 py-2.5 active:opacity-80"
                onPress={handleSubmitReply}
                disabled={submitting || !replyBody.trim()}
              >
                {submitting ? (
                  <ActivityIndicator color="#504B3A" size="small" />
                ) : (
                  <Text className="text-khaki font-bold text-sm">Comment</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Edit Post Modal */}
        <Modal
          visible={editing}
          transparent
          animationType="slide"
          onRequestClose={() => setEditing(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Your Post</Text>
                <Pressable onPress={() => setEditing(false)} hitSlop={8}>
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
                  onPress={() => setEditing(false)}
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
  postCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2EAE0",
    marginBottom: 12,
    elevation: 3,
  },
  postHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  authorMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  authorName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#646F58",
  },
  ownerBadge: {
    backgroundColor: "#57E165",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ownerBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#504B3A",
  },
  ownerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F6F1",
    borderWidth: 1,
    borderColor: "#DCE4D8",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#646F58",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B91C1C",
  },
  postTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#504B3A",
    lineHeight: 25,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EDF5EC",
    borderColor: "#D4E3D1",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
    gap: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#646F58",
  },
  postBody: {
    fontSize: 14.5,
    color: "#504B3A",
    lineHeight: 22,
    marginTop: 12,
  },
  socialBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E8ECE4",
    gap: 8,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F5F7F3",
    borderWidth: 1,
    borderColor: "#E3E9DF",
    gap: 5,
  },
  socialBtnLiked: {
    backgroundColor: "#57E165",
    borderColor: "#46C953",
  },
  socialBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#646F58",
  },
  socialBtnTextLiked: {
    color: "#504B3A",
    fontWeight: "800",
  },
  repliesHeaderPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE4D8",
    gap: 6,
  },
  repliesHeaderText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#504B3A",
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
