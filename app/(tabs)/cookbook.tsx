import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRecipes } from "@/stores/RecipeContext";
import { RecipeCard } from "@/components/RecipeCard";
import type { Recipe } from "@/types/index";

export default function CookbookScreen() {
  const { savedRecipes, removeSavedRecipe } = useRecipes();

  function handleSelectRecipe(recipe: Recipe) {
    router.push({ pathname: "/recipe/[id]", params: { id: recipe.id } });
  }

  return (
    <View className="flex-1 bg-[#F7F8F5]">
      <View className="bg-white px-4 py-3 border-b border-[#E8ECE4] flex-row items-center justify-between">
        <View>
          <Text className="text-khaki font-bold text-base">
            Saved Recipes
          </Text>
          <Text className="text-olive-light text-xs mt-0.5">
            {savedRecipes.length}{" "}
            {savedRecipes.length === 1 ? "dish" : "dishes"} in your personal
            cookbook
          </Text>
        </View>
        <View className="w-9 h-9 rounded-full bg-[#EDF5EC] items-center justify-center">
          <Ionicons name="book-outline" size={18} color="#646F58" />
        </View>
      </View>

      {savedRecipes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-[#EDF5EC] items-center justify-center mb-4">
            <Ionicons name="book-outline" size={30} color="#646F58" />
          </View>
          <Text className="text-khaki font-bold text-base">
            Your cookbook is empty
          </Text>
          <Text className="text-olive-light text-sm text-center mt-1">
            Save dishes from Discover, Snap, or Pantry to access them offline
            anytime.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)")}
            className="mt-5 bg-malachite rounded-xl px-6 py-3 active:opacity-80"
          >
            <Text className="text-khaki font-bold text-sm">
              Discover Dishes
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={savedRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="relative">
              <RecipeCard
                recipe={item}
                onPress={() => handleSelectRecipe(item)}
              />
              <Pressable
                onPress={() => removeSavedRecipe(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 border border-[#E8ECE4] items-center justify-center active:opacity-70"
              >
                <Ionicons name="trash-outline" size={15} color="#504B3A" />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
