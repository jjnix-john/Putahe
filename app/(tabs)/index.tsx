import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRecipes } from "@/stores/RecipeContext";
import { useAuth } from "@/stores/AuthContext";
import { getCompanionMoodImage, getCompanionOption } from "@/lib/companions";
import { RecipeCard } from "@/components/RecipeCard";
import { CompanionReaction } from "@/components/CompanionReaction";
import { SystemBackground } from "@/components/SystemBackground";
import type { Recipe } from "@/types/index";

const QUICK_TAGS = [
  "Chicken",
  "Filipino",
  "Pasta",
  "Seafood",
  "Pizza",
  "Beef",
  "Salad",
  "Dessert",
];

export default function DiscoverScreen() {
  const {
    results,
    catalog,
    categories,
    selectedCategory,
    loading,
    catalogLoading,
    error,
    search,
    loadCatalog,
    selectCategory,
    clearResults,
    saveRecipe,
    removeSavedRecipe,
    isRecipeSaved,
  } = useRecipes();

  const { companion } = useAuth();
  const companionOption = getCompanionOption(companion?.iconId);

  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleSearch = useCallback(
    (overrideQuery?: string) => {
      const q = (overrideQuery ?? query).trim();
      if (!q) {
        clearResults();
        return;
      }
      search(q);
    },
    [query, search, clearResults]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    clearResults();
  }, [clearResults]);

  const handleSelectRecipe = useCallback((recipe: Recipe) => {
    router.push({ pathname: "/recipe/[id]", params: { id: recipe.id } });
  }, []);

  const handleToggleSave = useCallback(
    async (recipe: Recipe) => {
      if (isRecipeSaved(recipe.id)) {
        await removeSavedRecipe(recipe.id);
      } else {
        await saveRecipe(recipe);
      }
    },
    [isRecipeSaved, removeSavedRecipe, saveRecipe]
  );

  const filteredCatalog = useMemo(() => {
    if (selectedCategory === "All") return catalog;
    const catLower = selectedCategory.toLowerCase();
    return catalog.filter(
      (r) =>
        r.category.toLowerCase() === catLower ||
        r.area.toLowerCase() === catLower ||
        (r.tags ?? []).some((t) => t.toLowerCase() === catLower)
    );
  }, [catalog, selectedCategory]);

  const featuredRecipes = useMemo(() => {
    return catalog.slice(0, 8);
  }, [catalog]);

  const isSearching = query.trim().length > 0 && (results.length > 0 || loading);
  const displayedRecipes =
    query.trim().length > 0 && results.length > 0 ? results : filteredCatalog;

  // Dynamic companion mood in the Discover header based on live app state
  const headerMood =
    loading || catalogLoading
      ? "curious"
      : error
        ? "sad"
        : query.trim().length > 0 && results.length === 0
          ? "sad"
          : query.trim().length > 0 && results.length > 0
            ? "discovering"
            : selectedCategory !== "All"
              ? "amazed"
              : "happy";

  async function handleRefresh() {
    setRefreshing(true);
    await loadCatalog(true);
    setRefreshing(false);
  }

  return (
    <SystemBackground>
      <View style={styles.root}>
        {/* Top Header Card with Cooking Companion */}
        <View style={styles.topHeader}>
          <View style={styles.companionBanner}>
            <Pressable
              onPress={() => router.push("/(auth)/companion-setup")}
              style={styles.companionRow}
            >
              <View
                style={[
                  styles.companionAvatarBox,
                  {
                    borderColor: companionOption.accentColor,
                    backgroundColor: companionOption.badgeBg,
                  },
                ]}
              >
                <Image
                  source={getCompanionMoodImage(companion?.iconId, headerMood)}
                  style={styles.companionAvatar}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.companionTextBox}>
                <View style={styles.greetingTagRow}>
                  <Text style={styles.greetingLabel}>
                    {companion
                      ? `CHEF ${companion.name.toUpperCase()}`
                      : "CHOOSE YOUR CHEF"}
                  </Text>
                  <Ionicons name="pencil" size={11} color="#646F58" />
                </View>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {companion
                    ? `What are we cooking today?`
                    : "Tap to create your Cooking Companion!"}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.snapQuickBtn}
              onPress={() => router.push("/(tabs)/snap")}
            >
              <Ionicons name="camera" size={18} color="#504B3A" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchRow}>
            <View style={styles.searchPill}>
              <Ionicons
                name="search"
                size={18}
                color="#646F58"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search 100+ recipes, ingredients, cuisines…"
                placeholderTextColor="#7D8570"
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  if (!text.trim()) clearResults();
                }}
                onSubmitEditing={() => handleSearch()}
                returnKeyType="search"
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <Pressable onPress={handleClear} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#7D8570" />
                </Pressable>
              )}
            </View>
            <Pressable
              style={styles.searchButton}
              onPress={() => handleSearch()}
              disabled={loading}
            >
              <Text style={styles.searchButtonText}>Go</Text>
            </Pressable>
          </View>
        </View>

        {/* Main Discover Feed */}
        {loading || (catalogLoading && catalog.length === 0) ? (
          <View style={styles.centerBox}>
            <CompanionReaction
              mood="curious"
              size={130}
              title="Searching the recipe books…"
              subtitle="Your companion is gathering delicious dishes for you."
            />
            <ActivityIndicator
              size="small"
              color="#57E165"
              style={{ marginTop: 12 }}
            />
          </View>
        ) : error && catalog.length === 0 ? (
          <View style={styles.centerBox}>
            <CompanionReaction
              mood="sad"
              size={125}
              title="Oops! Couldn't reach the kitchen"
              subtitle={error}
            />
            <Pressable
              style={[styles.retryButton, { marginTop: 14 }]}
              onPress={() => loadCatalog(true)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={displayedRecipes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor="#57E165"
                onRefresh={handleRefresh}
              />
            }
            ListHeaderComponent={
              <View>
                {/* Quick Search Tags */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickTagsRow}
                >
                  {QUICK_TAGS.map((tag) => (
                    <Pressable
                      key={tag}
                      style={styles.quickTagChip}
                      onPress={() => {
                        setQuery(tag);
                        handleSearch(tag);
                      }}
                    >
                      <Ionicons name="sparkles" size={11} color="#57E165" />
                      <Text style={styles.quickTagText}>{tag}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Featured Horizontal Carousel (shown when not actively searching) */}
                {!isSearching && featuredRecipes.length > 0 && (
                  <View style={styles.featuredSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View>
                        <Text style={styles.sectionTitle}>
                          Featured Today
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                          Handpicked dishes from your companion
                        </Text>
                      </View>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                          {catalog.length}+ recipes
                        </Text>
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.featuredScroll}
                    >
                      {featuredRecipes.map((item) => {
                        const saved = isRecipeSaved(item.id);
                        const totalTime =
                          (item.prepTimeMinutes ?? 15) +
                          (item.cookTimeMinutes ?? 25);
                        return (
                          <Pressable
                            key={item.id}
                            style={styles.featuredCard}
                            onPress={() => handleSelectRecipe(item)}
                          >
                            <Image
                              source={{ uri: item.thumbnail }}
                              style={styles.featuredImage}
                              resizeMode="cover"
                            />
                            <View style={styles.featuredTopBadges}>
                              <View style={styles.featuredAreaPill}>
                                <Text style={styles.featuredAreaText}>
                                  {item.area || item.category}
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => handleToggleSave(item)}
                                style={styles.featuredSaveCircle}
                                hitSlop={8}
                              >
                                <Ionicons
                                  name={saved ? "bookmark" : "bookmark-outline"}
                                  size={15}
                                  color={saved ? "#57E165" : "#504B3A"}
                                />
                              </Pressable>
                            </View>

                            <View style={styles.featuredBody}>
                              <Text
                                style={styles.featuredTitle}
                                numberOfLines={1}
                              >
                                {item.title}
                              </Text>
                              <View style={styles.featuredMetaRow}>
                                <View style={styles.featuredMetaItem}>
                                  <Ionicons
                                    name="star"
                                    size={12}
                                    color="#F59E0B"
                                  />
                                  <Text style={styles.featuredMetaText}>
                                    {(item.rating ?? 4.8).toFixed(1)}
                                  </Text>
                                </View>
                                <Text style={styles.featuredDot}>•</Text>
                                <View style={styles.featuredMetaItem}>
                                  <Ionicons
                                    name="time-outline"
                                    size={12}
                                    color="#646F58"
                                  />
                                  <Text style={styles.featuredMetaText}>
                                    {totalTime} min
                                  </Text>
                                </View>
                                <Text style={styles.featuredDot}>•</Text>
                                <Text style={styles.featuredMetaText}>
                                  {item.difficulty ?? "Easy"}
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Category Filter Pills */}
                <View style={styles.categorySection}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                  >
                    {categories.map((cat) => {
                      const active = selectedCategory === cat && !isSearching;
                      return (
                        <Pressable
                          key={cat}
                          onPress={() => {
                            if (query.trim()) {
                              setQuery("");
                              clearResults();
                            }
                            selectCategory(cat);
                          }}
                          style={[
                            styles.categoryChip,
                            active && styles.categoryChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              active && styles.categoryChipTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Feed Heading */}
                <View style={styles.feedHeadingRow}>
                  <Text style={styles.sectionTitle}>
                    {query.trim().length > 0
                      ? `Search Results (${displayedRecipes.length})`
                      : selectedCategory === "All"
                        ? `Explore All Dishes (${displayedRecipes.length})`
                        : `${selectedCategory} Dishes (${displayedRecipes.length})`}
                  </Text>
                  {query.trim().length > 0 && (
                    <Pressable onPress={handleClear}>
                      <Text style={styles.clearFilterText}>Clear Search</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <CompanionReaction
                  mood="sad"
                  size={120}
                  title="No dishes matched that search"
                  subtitle="Try another keyword or tap one of the category filters above!"
                />
              </View>
            }
            renderItem={({ item }) => (
              <RecipeCard
                recipe={item}
                onPress={() => handleSelectRecipe(item)}
                isSaved={isRecipeSaved(item.id)}
                onToggleSave={() => handleToggleSave(item)}
              />
            )}
          />
        )}
      </View>
    </SystemBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E8DC",
  },
  companionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  companionRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  companionAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    padding: 2,
    backgroundColor: "#FFFFFF",
    marginRight: 11,
    elevation: 2,
  },
  companionAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  companionTextBox: {
    flex: 1,
  },
  greetingTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  greetingLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#646F58",
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#504B3A",
    marginTop: 1,
  },
  snapQuickBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#57E165",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#D8E2D4",
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#504B3A",
    fontWeight: "500",
  },
  searchButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#57E165",
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#504B3A",
    fontWeight: "800",
    fontSize: 13.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  quickTagsRow: {
    gap: 8,
    paddingBottom: 12,
  },
  quickTagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 5,
    borderWidth: 1,
    borderColor: "#DCE6D8",
  },
  quickTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#504B3A",
  },
  featuredSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#504B3A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#646F58",
    fontWeight: "500",
  },
  countBadge: {
    backgroundColor: "#57E165",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#504B3A",
  },
  featuredScroll: {
    gap: 14,
    paddingRight: 8,
  },
  featuredCard: {
    width: 220,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2EAE0",
    elevation: 4,
    shadowColor: "#504B3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  featuredImage: {
    width: "100%",
    height: 128,
  },
  featuredTopBadges: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredAreaPill: {
    backgroundColor: "rgba(80, 75, 58, 0.82)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featuredAreaText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  featuredSaveCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredBody: {
    padding: 12,
  },
  featuredTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#504B3A",
    marginBottom: 6,
  },
  featuredMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  featuredMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  featuredMetaText: {
    fontSize: 11.5,
    color: "#646F58",
    fontWeight: "700",
  },
  featuredDot: {
    color: "#7D8570",
    fontSize: 11,
  },
  categorySection: {
    marginBottom: 14,
  },
  categoryScroll: {
    gap: 8,
  },
  categoryChip: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE5D8",
  },
  categoryChipActive: {
    backgroundColor: "#504B3A",
    borderColor: "#504B3A",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#646F58",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  feedHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  clearFilterText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#646F58",
    textDecorationLine: "underline",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: "#504B3A",
    fontWeight: "600",
  },
  errorText: {
    color: "#B91C1C",
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#57E165",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryButtonText: {
    color: "#504B3A",
    fontWeight: "800",
  },
  emptyBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#504B3A",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#7D8570",
    textAlign: "center",
    marginTop: 4,
  },
});
