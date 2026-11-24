import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { createThread } from "@/lib/forum";

export default function NewThreadScreen() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipeTag, setRecipeTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = title.trim().length > 0 && body.trim().length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setError(null);
    setSubmitting(true);
    try {
      const post = await createThread(
        title,
        body,
        recipeTag.trim() || undefined
      );
      router.replace({
        pathname: "/forum/[id]",
        params: { id: post.id },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create thread.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "New Thread",
          headerBackTitle: "Community",
          headerShown: true,
          headerTintColor: "#504B3A",
          headerTitleStyle: { color: "#504B3A", fontWeight: "700" },
          headerRight: () => (
            <Pressable
              onPress={handleSubmit}
              disabled={!isValid || submitting}
              className="mr-4 active:opacity-60"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#57E165" />
              ) : (
                <Text
                  className={`font-bold ${
                    isValid ? "text-olive" : "text-olive-light opacity-50"
                  }`}
                >
                  Post
                </Text>
              )}
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          )}

          {/* Title */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-khaki mb-1">
              Title <Text className="text-red-400">*</Text>
            </Text>
            <TextInput
              className="border border-[#E2E7DC] rounded-xl px-4 py-3 text-khaki bg-[#F7F8F5] text-sm"
              placeholder="What do you want to discuss?"
              placeholderTextColor="#7D8570"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              returnKeyType="next"
            />
            <Text className="text-xs text-olive-light mt-1 text-right">
              {title.length}/120
            </Text>
          </View>

          {/* Body */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-khaki mb-1">
              Body <Text className="text-red-400">*</Text>
            </Text>
            <TextInput
              className="border border-[#E2E7DC] rounded-xl px-4 py-3 text-khaki bg-[#F7F8F5] text-sm"
              placeholder="Share your question, tip, or discovery…"
              placeholderTextColor="#7D8570"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              maxLength={2000}
              textAlignVertical="top"
              style={{ minHeight: 120 }}
            />
            <Text className="text-xs text-olive-light mt-1 text-right">
              {body.length}/2000
            </Text>
          </View>

          {/* Recipe tag (optional) */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-khaki mb-1">
              Recipe Tag{" "}
              <Text className="text-olive-light font-normal">(optional)</Text>
            </Text>
            <TextInput
              className="border border-[#E2E7DC] rounded-xl px-4 py-3 text-khaki bg-[#F7F8F5] text-sm"
              placeholder="e.g. Adobo, Sinigang, Pasta…"
              placeholderTextColor="#7D8570"
              value={recipeTag}
              onChangeText={setRecipeTag}
              maxLength={60}
              autoCapitalize="words"
            />
          </View>

          {/* Submit */}
          <Pressable
            className={`rounded-xl py-3.5 items-center ${
              isValid && !submitting
                ? "bg-malachite active:opacity-80"
                : "bg-[#E8ECE4]"
            }`}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#504B3A" />
            ) : (
              <Text
                className={`font-bold text-base ${
                  isValid ? "text-khaki" : "text-olive-light"
                }`}
              >
                Post Thread
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
