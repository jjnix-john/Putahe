import { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRecipes } from "@/stores/RecipeContext";
import type { Ingredient } from "@/types/index";

export default function RecipeDetailScreen() {
  const { id, missing } = useLocalSearchParams<{
    id: string;
    missing?: string;
  }>();

  const {
    selectedRecipe,
    loading,
    error,
    loadRecipe,
    saveRecipe,
    removeSavedRecipe,
    isRecipeSaved,
  } = useRecipes();

  const missingIngredients: string[] = missing
    ? (JSON.parse(decodeURIComponent(missing)) as string[])
    : [];

  useEffect(() => {
    if (id) {
      loadRecipe(id);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading…", headerShown: true }} />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#57E165" />
        </View>
      </>
    );
  }

  if (error || !selectedRecipe) {
    return (
      <>
        <Stack.Screen options={{ title: "Error", headerShown: true }} />
        <View className="flex-1 items-center justify-center bg-white px-6">
          <Text className="text-khaki text-center mb-4">
            {error ?? "Recipe not found."}
          </Text>
          <Pressable
            className="bg-malachite rounded-lg px-5 py-2 active:opacity-80"
            onPress={() => router.back()}
          >
            <Text className="text-khaki font-bold">Go Back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const recipe = selectedRecipe;
  const saved = isRecipeSaved(recipe.id);

  async function handleToggleSave() {
    if (saved) {
      await removeSavedRecipe(recipe.id);
    } else {
      await saveRecipe(recipe);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.title,
          headerBackTitle: "Back",
          headerShown: true,
          headerTintColor: "#504B3A",
          headerTitleStyle: { color: "#504B3A", fontWeight: "700" },
        }}
      />
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <Image
          source={{ uri: recipe.thumbnail }}
          className="w-full h-56"
          resizeMode="cover"
        />

        <View className="px-4 pt-4 pb-10">
          {/* Title + meta */}
          <Text className="text-2xl font-bold text-khaki leading-tight">
            {recipe.title}
          </Text>

          <View className="flex-row flex-wrap gap-2 mt-2">
            {recipe.category ? (
              <View className="bg-[#EDF5EC] rounded-full px-3 py-1">
                <Text className="text-olive text-sm font-semibold">
                  {recipe.category}
                </Text>
              </View>
            ) : null}
            {recipe.area ? (
              <View className="bg-[#F3F5F0] rounded-full px-3 py-1">
                <Text className="text-olive-light text-sm">{recipe.area}</Text>
              </View>
            ) : null}
          </View>

          {/* Ingredients */}
          <Text className="text-lg font-bold text-khaki mt-6 mb-3">
            Ingredients
          </Text>
          {recipe.ingredients.map((ing: Ingredient, idx: number) => {
            const isMissing = missingIngredients.some(
              (m) => m.toLowerCase() === ing.name.toLowerCase()
            );
            return (
              <View
                key={idx}
                className={`flex-row items-start py-2 border-b border-[#F1F3EE] ${
                  isMissing ? "opacity-60" : ""
                }`}
              >
                <View
                  className={`w-2 h-2 rounded-full mt-1.5 mr-3 flex-shrink-0 ${
                    isMissing ? "bg-red-400" : "bg-malachite"
                  }`}
                />
                <Text className="flex-1 text-khaki text-sm">{ing.name}</Text>
                {ing.measure ? (
                  <Text className="text-olive-light text-sm ml-2">
                    {ing.measure}
                  </Text>
                ) : null}
                {isMissing && (
                  <Text className="text-red-500 text-xs ml-2 font-medium">
                    missing
                  </Text>
                )}
              </View>
            );
          })}

          {/* Instructions */}
          <Text className="text-lg font-bold text-khaki mt-6 mb-3">
            Instructions
          </Text>
          {recipe.instructions
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((step, idx) => (
              <View key={idx} className="flex-row mb-4">
                <View className="w-6 h-6 rounded-full bg-olive items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  <Text className="text-white text-xs font-bold">
                    {idx + 1}
                  </Text>
                </View>
                <Text className="flex-1 text-khaki text-sm leading-relaxed">
                  {step}
                </Text>
              </View>
            ))}

          {/* Save to Cookbook */}
          <Pressable
            onPress={handleToggleSave}
            className={`mt-4 rounded-xl py-3.5 flex-row items-center justify-center gap-x-2 ${
              saved
                ? "bg-[#EDF5EC] border border-[#D4E3D1]"
                : "bg-malachite active:opacity-80"
            }`}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={18}
              color="#504B3A"
            />
            <Text className="text-khaki font-bold">
              {saved ? "Saved in Cookbook (Tap to Remove)" : "Save to Cookbook"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
