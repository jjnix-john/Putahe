import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/stores/AuthContext";
import { getThreads } from "@/lib/forum";
import { supabase } from "@/lib/supabase";
import { ThreadCard } from "@/components/ThreadCard";
import { CompanionReaction } from "@/components/CompanionReaction";
import { SystemBackground } from "@/components/SystemBackground";
import type { ForumPost } from "@/types/index";
import type { RealtimeChannel } from "@supabase/supabase-js";

export default function ForumScreen() {
  const { session, loading: authLoading, signOut } = useAuth();
  const [threads, setThreads] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/(auth)/sign-in");
    }
  }, [authLoading, session]);

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getThreads();
      setThreads(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load threads.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getThreads();
        if (!cancelled) {
          setThreads(data);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load threads.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    const channel = supabase
      .channel("forum_posts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_posts" },
        () => {
          loadThreads(true);
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
  }, [session, loadThreads]);

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
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#57E165" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Community",
          headerRight: () => (
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              className="mr-4 active:opacity-60"
            >
              <Text className="text-olive font-bold">
                {signingOut ? "…" : "Sign Out"}
              </Text>
            </Pressable>
          ),
        }}
      />

      <SystemBackground>
        <View className="flex-1">
          {/* New Thread button */}
          <View className="bg-white/90 px-4 py-3 border-b border-[#E8ECE4]">
            <Pressable
              className="bg-malachite rounded-xl py-2.5 flex-row items-center justify-center gap-x-2 active:opacity-80"
              onPress={() => router.push("/forum/new")}
            >
              <Ionicons name="create-outline" size={18} color="#504B3A" />
              <Text className="text-khaki font-bold text-sm">New Thread</Text>
            </Pressable>
          </View>

        {loading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#57E165" />
          </View>
        )}

        {!loading && error && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-red-500 text-center">{error}</Text>
            <Pressable
              className="mt-4 bg-malachite rounded-lg px-5 py-2 active:opacity-80"
              onPress={() => loadThreads()}
            >
              <Text className="text-khaki font-bold">Retry</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && threads.length === 0 && (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center w-full">
              <CompanionReaction
                mood="curious"
                size={120}
                title="No discussions yet"
                subtitle="Be the first to start a culinary thread in the community!"
              />
            </View>
          </View>
        )}

        {!loading && !error && threads.length > 0 && (
          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor="#57E165"
                onRefresh={() => {
                  setRefreshing(true);
                  loadThreads(true);
                }}
              />
            }
            renderItem={({ item }) => (
              <ThreadCard
                post={item}
                onPress={() =>
                  router.push({
                    pathname: "/forum/[id]",
                    params: { id: item.id },
                  })
                }
              />
            )}
          />
        )}
        </View>
      </SystemBackground>
    </>
  );
}
