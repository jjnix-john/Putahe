import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { usePantry } from "@/stores/PantryContext";
import { PantryItem } from "@/components/PantryItem";
import { RecipeCard } from "@/components/RecipeCard";
import { CompanionReaction } from "@/components/CompanionReaction";
import { SystemBackground } from "@/components/SystemBackground";
import type { AlmostMatch, ReadyMatch } from "@/types/index";

type Tab = "pantry" | "matches";

const COMMON_STAPLES = [
  "Chicken",
  "Garlic",
  "Onion",
  "Egg",
  "Rice",
  "Tomato",
  "Pork",
  "Beef",
  "Potato",
  "Soy Sauce",
  "Pasta",
  "Cheese",
  "Shrimp",
  "Carrot",
];

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
    const raw = inputValue.trim();
    if (!raw) return;
    setInputValue("");
    // Allow adding comma-separated ingredients at once (e.g., "chicken, garlic, onion")
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of parts) {
      await addIngredient(part);
    }
  }

  async function handleFindMatches() {
    setActiveTab("matches");
    await findMatches();
  }

  async function handleSelectTab(tab: Tab) {
    setActiveTab(tab);
    if (tab === "matches" && ingredients.some((i) => i.isActive)) {
      await findMatches();
    }
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
                title: `🌿 Cook With Your Ingredients (${matchResults.almost.length})`,
                type: "almost" as const,
                data: matchResults.almost,
              },
            ]
          : []),
      ]
    : [];

  const existingNames = new Set(
    ingredients.map((i) => i.name.toLowerCase())
  );

  const tabBar = (
    <View className="flex-row bg-white/95 border-b border-[#E8ECE4]">
      {(["pantry", "matches"] as Tab[]).map((tab) => (
        <Pressable
          key={tab}
          onPress={() => handleSelectTab(tab)}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === tab ? "border-malachite" : "border-transparent"
          }`}
        >
          <Text
            className={`text-sm font-bold ${
              activeTab === tab ? "text-khaki" : "text-olive-light"
            }`}
          >
            {tab === "pantry"
              ? `My Pantry (${ingredients.filter((i) => i.isActive).length})`
              : "What Can I Cook?"}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (activeTab === "pantry") {
    return (
      <SystemBackground>
        <View className="flex-1">
          {tabBar}

          {/* Add ingredient input */}
          <View className="bg-white/95 px-4 pt-3 pb-2.5 border-b border-[#E8ECE4]">
            <View className="flex-row items-center gap-x-2">
              <TextInput
                className="flex-1 border border-[#DCE2D5] rounded-xl px-4 py-2.5 text-khaki bg-white text-sm"
                placeholder="Add ingredients (e.g. Chicken, Garlic)…"
                placeholderTextColor="#7D8570"
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
                autoCapitalize="words"
              />
              <Pressable
                className="bg-malachite rounded-xl px-5 py-2.5 active:opacity-80"
                onPress={handleAdd}
                disabled={!inputValue.trim()}
              >
                <Text className="text-khaki font-bold text-sm">Add</Text>
              </Pressable>
            </View>

            {/* Quick-Add Common Ingredients Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingTop: 10, paddingBottom: 2 }}
            >
              {COMMON_STAPLES.map((staple) => {
                const alreadyAdded = existingNames.has(staple.toLowerCase());
                return (
                  <Pressable
                    key={staple}
                    onPress={() => addIngredient(staple)}
                    disabled={alreadyAdded}
                    className={`px-3 py-1.5 rounded-full border ${
                      alreadyAdded
                        ? "bg-[#EDF5EC] border-[#C6DEC3] opacity-60"
                        : "bg-[#F6F8F4] border-[#DCE2D5] active:opacity-75"
                    }`}
                  >
                    <Text className="text-xs font-bold text-khaki">
                      {alreadyAdded ? `✓ ${staple}` : `+ ${staple}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {ingredients.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <View className="bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center w-full">
                <CompanionReaction
                  mood="curious"
                  size={125}
                  title="Your pantry is empty"
                  subtitle="Type an ingredient above or tap the quick-add chips (+ Chicken, + Garlic, + Egg) to find recipes you can cook right now!"
                />
              </View>
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

              <View className="bg-white/95 border-t border-[#E8ECE4] px-4 py-3">
                <Pressable
                  className="bg-malachite rounded-xl py-3.5 items-center active:opacity-80"
                  onPress={handleFindMatches}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#504B3A" />
                  ) : (
                    <Text className="text-khaki font-bold text-base">
                      🍳  Find Recipes With My Ingredients (
                      {ingredients.filter((i) => i.isActive).length})
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </SystemBackground>
    );
  }

  return (
    <SystemBackground>
      <View className="flex-1">
        {tabBar}

        {loading && (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center w-full">
              <CompanionReaction
                mood="discovering"
                size={125}
                title="Checking your ingredients…"
                subtitle="Searching 1,000+ recipes for dishes matching your pantry!"
              />
              <ActivityIndicator
                size="small"
                color="#57E165"
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        )}

        {!loading && error && (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center w-full">
              <CompanionReaction
                mood="sad"
                size={120}
                title="Couldn't match recipes"
                subtitle={error}
              />
              <Pressable
                className="mt-4 bg-malachite rounded-lg px-5 py-2 active:opacity-80"
                onPress={handleFindMatches}
              >
                <Text className="text-khaki font-bold">Retry</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!loading && !error && (!matchResults || sections.length === 0) && (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center w-full">
              <CompanionReaction
                mood={ingredients.length === 0 ? "curious" : "sad"}
                size={125}
                title={
                  ingredients.length === 0
                    ? "Add ingredients first!"
                    : "No recipe matches yet"
                }
                subtitle={
                  ingredients.length === 0
                    ? "Switch to My Pantry and add a few ingredients you have at home."
                    : "Try adding or enabling a few more staple ingredients in My Pantry!"
                }
              />
              <Pressable
                className="mt-4 bg-malachite rounded-xl px-6 py-3 active:opacity-80"
                onPress={() => setActiveTab("pantry")}
              >
                <Text className="text-khaki font-bold">Go to My Pantry</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!loading && !error && sections.length > 0 && (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.recipe.id}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <CompanionReaction
                mood={
                  (matchResults?.ready.length ?? 0) > 0
                    ? "jumping"
                    : "discovering"
                }
                size={66}
                compact
                title={
                  (matchResults?.ready.length ?? 0) > 0
                    ? `${matchResults?.ready.length} dish(es) ready to cook right now!`
                    : `Found ${matchResults?.almost.length ?? 0} dishes using your ingredients!`
                }
                subtitle="Sorted by best ingredient match. Tap any dish to see what you have and what's needed."
              />
            }
            renderSectionHeader={({ section }) => (
              <View className="bg-white/90 px-3 py-1.5 rounded-lg self-start mb-2 mt-2 border border-[#DCE2D5]">
                <Text className="text-xs font-bold text-khaki">
                  {section.title}
                </Text>
              </View>
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
                  matchedCount={item.matchedCount}
                  totalCount={item.totalCount}
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
    </SystemBackground>
  );
}
