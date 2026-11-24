import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePantry } from "@/stores/PantryContext";
import { PantryItem } from "@/components/PantryItem";
import { RecipeCard } from "@/components/RecipeCard";
import type { AlmostMatch, ReadyMatch } from "@/types/index";

type Tab = "pantry" | "matches";

export default function PantryScreen() {
  const {
    ingredients,
    matchResults,
    loading,
    error,
    addIngredient,
    removeIngredient,
    toggleIngredient,
    findMatches,
  } = usePantry();

  const [activeTab, setActiveTab] = useState<Tab>("pantry");
  const [inputValue, setInputValue] = useState("");

  async function handleAdd() {
    const name = inputValue.trim();
    if (!name) return;
    setInputValue("");
    await addIngredient(name);
  }

  async function handleFindMatches() {
    await findMatches();
    setActiveTab("matches");
  }

  type MatchSection =
    | { title: string; type: "ready"; data: ReadyMatch[] }
    | { title: string; type: "almost"; data: AlmostMatch[] };

  const sections: MatchSection[] = matchResults
    ? [
        ...(matchResults.ready.length > 0
          ? [
              {
                title: `✅ Ready to Cook (${matchResults.ready.length})`,
                type: "ready" as const,
                data: matchResults.ready,
              },
            ]
          : []),
        ...(matchResults.almost.length > 0
          ? [
              {
                title: `🌿 Almost Ready (${matchResults.almost.length})`,
                type: "almost" as const,
                data: matchResults.almost,
              },
            ]
          : []),
      ]
    : [];

  const tabBar = (
    <View className="flex-row bg-white border-b border-[#E8ECE4]">
      {(["pantry", "matches"] as Tab[]).map((tab) => (
        <Pressable
          key={tab}
          onPress={() => setActiveTab(tab)}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === tab ? "border-malachite" : "border-transparent"
          }`}
        >
          <Text
            className={`text-sm font-bold ${
              activeTab === tab ? "text-khaki" : "text-olive-light"
            }`}
          >
            {tab === "pantry" ? "My Pantry" : "What Can I Cook?"}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (activeTab === "pantry") {
    return (
      <View className="flex-1 bg-[#F7F8F5]">
        {tabBar}

        {/* Add ingredient */}
        <View className="bg-white px-4 py-3 border-b border-[#E8ECE4]">
          <View className="flex-row items-center gap-x-2">
            <TextInput
              className="flex-1 border border-[#E2E7DC] rounded-xl px-4 py-2.5 text-khaki bg-[#F7F8F5] text-sm"
              placeholder="Add an ingredient…"
              placeholderTextColor="#7D8570"
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              autoCapitalize="words"
            />
            <Pressable
              className="bg-malachite rounded-xl px-4 py-2.5 active:opacity-80"
              onPress={handleAdd}
              disabled={!inputValue.trim()}
            >
              <Text className="text-khaki font-bold text-sm">Add</Text>
            </Pressable>
          </View>
        </View>

        {ingredients.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-full bg-[#EDF5EC] items-center justify-center mb-3">
              <Ionicons name="leaf-outline" size={30} color="#646F58" />
            </View>
            <Text className="text-khaki font-bold text-base">
              Your pantry is empty
            </Text>
            <Text className="text-olive-light text-sm text-center mt-1">
              Add ingredients you have on hand and we&apos;ll find dishes you
              can cook.
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={ingredients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <PantryItem
                  ingredient={item}
                  onToggle={() => toggleIngredient(item.id)}
                  onDelete={() => removeIngredient(item.id)}
                />
              )}
              showsVerticalScrollIndicator={false}
            />

            <View className="bg-white border-t border-[#E8ECE4] px-4 py-3">
              <Pressable
                className="bg-malachite rounded-xl py-3.5 items-center active:opacity-80"
                onPress={handleFindMatches}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#504B3A" />
                ) : (
                  <Text className="text-khaki font-bold text-base">
                    🍳  What Can I Cook?
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F8F5]">
      {tabBar}

      {loading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#57E165" />
          <Text className="mt-3 text-olive-light text-sm">
            Searching for recipes…
          </Text>
        </View>
      )}

      {!loading && error && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">{error}</Text>
          <Pressable
            className="mt-4 bg-malachite rounded-lg px-5 py-2 active:opacity-80"
            onPress={handleFindMatches}
          >
            <Text className="text-khaki font-bold">Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && matchResults && sections.length === 0 && (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="restaurant-outline" size={38} color="#7D8570" />
          <Text className="text-khaki font-bold text-base mt-3">
            No matches found
          </Text>
          <Text className="text-olive-light text-sm text-center mt-1">
            Try adding more ingredients to your pantry.
          </Text>
        </View>
      )}

      {!loading && !error && sections.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.recipe.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <Text className="text-sm font-bold text-khaki mb-2 mt-2">
              {section.title}
            </Text>
          )}
          renderItem={({ item, section }) => {
            const missingCount =
              section.type === "almost"
                ? (item as AlmostMatch).missing.length
                : 0;
            const missingList =
              section.type === "almost"
                ? (item as AlmostMatch).missing
                : [];

            return (
              <RecipeCard
                recipe={item.recipe}
                missingCount={missingCount}
                onPress={() =>
                  router.push({
                    pathname: "/recipe/[id]",
                    params: {
                      id: item.recipe.id,
                      missing: encodeURIComponent(
                        JSON.stringify(missingList)
                      ),
                    },
                  })
                }
              />
            );
          }}
        />
      )}
    </View>
  );
}
