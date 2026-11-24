import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRecipes } from "@/stores/RecipeContext";
import { RecipeCard } from "@/components/RecipeCard";
import type { Recipe } from "@/types/index";

export default function DiscoverScreen() {
  const { results, loading, error, search, clearResults } = useRecipes();
  const [query, setQuery] = useState("");

  const handleSearch = useCallback(() => {
    search(query);
  }, [query, search]);

  const handleClear = useCallback(() => {
    setQuery("");
    clearResults();
  }, [clearResults]);

  const handleSelectRecipe = useCallback((recipe: Recipe) => {
    router.push({ pathname: "/recipe/[id]", params: { id: recipe.id } });
  }, []);

  return (
    <View className="flex-1 bg-[#F7F8F5]">
      {/* Search bar */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-[#E8ECE4]">
        <View className="flex-row items-center gap-x-2">
          <View className="flex-1 flex-row items-center bg-[#F3F5F0] border border-[#E2E7DC] rounded-xl px-3 py-2">
            <Ionicons
              name="search-outline"
              size={18}
              color="#7D8570"
              style={{ marginRight: 8 }}
            />
            <TextInput
              className="flex-1 text-khaki text-sm"
              placeholder="Discover a dish…"
              placeholderTextColor="#7D8570"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={handleClear} className="ml-1 p-1">
                <Ionicons name="close-circle" size={16} color="#7D8570" />
              </Pressable>
            )}
          </View>
          <Pressable
            className="bg-malachite rounded-xl px-4 py-2.5 active:opacity-80"
            onPress={handleSearch}
            disabled={loading}
          >
            <Text className="text-khaki font-bold text-sm">Search</Text>
          </Pressable>
        </View>
      </View>

      {/* States */}
      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#57E165" />
          <Text className="mt-3 text-olive-light text-sm">
            Searching recipes…
          </Text>
        </View>
      )}

      {!loading && error && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">{error}</Text>
          <Pressable
            className="mt-4 bg-malachite rounded-lg px-5 py-2 active:opacity-80"
            onPress={handleSearch}
          >
            <Text className="text-khaki font-bold">Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && results.length === 0 && query.trim().length > 0 && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-olive-light text-center">
            No dishes found for &ldquo;{query}&rdquo;
          </Text>
        </View>
      )}

      {!loading && !error && results.length === 0 && query.trim().length === 0 && (
        <View className="flex-1 items-center justify-center px-6">
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 150, height: 150, marginBottom: 12 }}
            resizeMode="contain"
          />
          <Text className="text-khaki font-bold text-base">
            Discover Delicious Dishes
          </Text>
          <Text className="text-olive-light text-sm text-center mt-1">
            Search by name — Adobo, Sinigang, Pasta, Chicken…
          </Text>
        </View>
      )}

      {/* Results */}
      {!loading && !error && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => handleSelectRecipe(item)}
            />
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
