import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRecipes } from "@/stores/RecipeContext";
import { RecipeCard } from "@/components/RecipeCard";
import { CompanionReaction } from "@/components/CompanionReaction";
import { SystemBackground } from "@/components/SystemBackground";
import type { Recipe } from "@/types/index";

export default function CookbookScreen() {
  const { savedRecipes, removeSavedRecipe } = useRecipes();

  function handleSelectRecipe(recipe: Recipe) {
    router.push({ pathname: "/recipe/[id]", params: { id: recipe.id } });
  }

  return (
    <SystemBackground>
      <View className="flex-1">
        <View className="bg-white/90 px-4 py-3 border-b border-[#E8ECE4] flex-row items-center justify-between">
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
            <View className="bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center w-full">
              <CompanionReaction
                mood="curious"
                size={125}
                title="Your cookbook is empty"
                subtitle="Bookmark your favorite dishes from Discover, Snap, or Pantry so we can cook them anytime!"
              />
              <Pressable
                onPress={() => router.push("/(tabs)")}
                className="mt-5 bg-malachite rounded-xl px-6 py-3 active:opacity-80"
              >
                <Text className="text-khaki font-bold text-sm">
                  Discover Dishes
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <FlatList
            data={savedRecipes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <CompanionReaction
                mood="happy"
                size={64}
                compact
                title="Your Personal Recipe Collection"
                subtitle={`You have ${savedRecipes.length} saved ${
                  savedRecipes.length === 1 ? "recipe" : "recipes"
                } ready for the kitchen!`}
              />
            }
            renderItem={({ item }) => (
              <RecipeCard
                recipe={item}
                onPress={() => handleSelectRecipe(item)}
                isSaved
                onToggleSave={() => removeSavedRecipe(item.id)}
              />
            )}
          />
        )}
      </View>
    </SystemBackground>
  );
}
