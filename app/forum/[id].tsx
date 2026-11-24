import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/stores/AuthContext";
import {
  getThreadById,
  getReplies,
  createReply,
  deletePost,
  deleteReply,
} from "@/lib/forum";
import { ReplyCard } from "@/components/ReplyCard";
import type { ForumPost, ForumReply } from "@/types/index";

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loadingPost, setLoadingPost] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const [fetchedPost, fetchedReplies] = await Promise.all([
          getThreadById(id),
          getReplies(id),
        ]);
        if (!cancelled) {
          setPost(fetchedPost);
          setReplies(fetchedReplies);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load thread.");
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
  }, [id]);

  async function handleDeletePost() {
    if (!post) return;
    try {
      await deletePost(post.id);
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete post.");
    }
  }

  async function handleSubmitReply() {
    if (!replyBody.trim() || !id) return;
    setSubmitting(true);
    try {
      const newReply = await createReply(id, replyBody);
      setReplies((prev) => [...prev, newReply]);
      setReplyBody("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to post reply.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteReply(replyId: string) {
    try {
      await deleteReply(replyId);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete reply.");
    }
  }

  if (loadingPost) {
    return (
      <>
        <Stack.Screen options={{ title: "Thread", headerShown: true }} />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#57E165" />
        </View>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Stack.Screen options={{ title: "Thread", headerShown: true }} />
        <View className="flex-1 items-center justify-center bg-white px-6">
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
      </>
    );
  }

  const isPostOwner = userId === post.author_id;
  const authorName =
    post.profiles?.display_name ?? post.author_id.slice(0, 8);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Thread",
          headerBackTitle: "Community",
          headerShown: true,
          headerTintColor: "#504B3A",
          headerTitleStyle: { color: "#504B3A", fontWeight: "700" },
        }}
      />
      <KeyboardAvoidingView
        className="flex-1 bg-[#F7F8F5]"
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
              {/* Post body */}
              <View className="bg-white rounded-xl border border-[#E8ECE4] px-4 py-4 mb-2">
                <Text className="text-lg font-bold text-khaki leading-snug">
                  {post.title}
                </Text>
                {post.recipe_tag ? (
                  <View className="mt-1 self-start bg-[#EDF5EC] rounded-full px-2 py-0.5">
                    <Text className="text-olive text-xs font-semibold">
                      #{post.recipe_tag}
                    </Text>
                  </View>
                ) : null}
                <Text className="text-khaki text-sm mt-3 leading-relaxed">
                  {post.body}
                </Text>
                <View className="flex-row items-center justify-between mt-3">
                  <Text className="text-olive-light text-xs">{authorName}</Text>
                  {isPostOwner && (
                    <Pressable
                      onPress={handleDeletePost}
                      className="active:opacity-60"
                    >
                      <Text className="text-red-500 text-xs font-semibold">
                        Delete Post
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Error banner */}
              {error && (
                <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                  <Text className="text-red-700 text-sm">{error}</Text>
                </View>
              )}

              {/* Replies heading */}
              <Text className="text-sm font-bold text-khaki mb-2">
                {replies.length === 0
                  ? "No replies yet"
                  : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ReplyCard
              reply={item}
              isOwn={userId === item.author_id}
              onDelete={() => handleDeleteReply(item.id)}
            />
          )}
        />

        {/* Reply input */}
        <View className="bg-white border-t border-[#E8ECE4] px-4 py-3">
          <View className="flex-row items-end gap-x-2">
            <TextInput
              className="flex-1 border border-[#E2E7DC] rounded-xl px-4 py-2.5 text-khaki bg-[#F7F8F5] text-sm"
              placeholder="Write a reply…"
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
                <Text className="text-khaki font-bold text-sm">Post</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
