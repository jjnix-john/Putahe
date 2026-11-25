import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Recipe } from "@/types/index";

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  missingCount?: number;
  matchedCount?: number;
  totalCount?: number;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export function RecipeCard({
  recipe,
  onPress,
  missingCount,
  matchedCount,
  totalCount,
  isSaved,
  onToggleSave,
}: RecipeCardProps) {
  const totalTime =
    (recipe.prepTimeMinutes ?? 15) + (recipe.cookTimeMinutes ?? 25);
  const rating = recipe.rating ?? 4.8;
  const difficulty = recipe.difficulty ?? "Easy";

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Thumbnail with rating pill */}
      <View style={styles.thumbWrapper}>
        <Image
          source={{ uri: recipe.thumbnail }}
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={styles.ratingPill}>
          <Ionicons name="star" size={10} color="#F59E0B" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={2}>
            {recipe.title}
          </Text>
          {onToggleSave && (
            <Pressable
              onPress={onToggleSave}
              hitSlop={8}
              style={styles.bookmarkBtn}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={18}
                color={isSaved ? "#57E165" : "#7D8570"}
              />
            </Pressable>
          )}
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          {recipe.category ? (
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{recipe.category}</Text>
            </View>
          ) : null}
          {recipe.area ? (
            <View style={styles.areaBadge}>
              <Text style={styles.areaText}>{recipe.area}</Text>
            </View>
          ) : null}
          {matchedCount !== undefined && matchedCount > 0 && (
            <View style={styles.matchedBadge}>
              <Text style={styles.matchedText}>
                {totalCount
                  ? `${matchedCount}/${totalCount} in pantry`
                  : `${matchedCount} matched`}
              </Text>
            </View>
          )}
          {missingCount !== undefined && missingCount > 0 && (
            <View style={styles.missingBadge}>
              <Text style={styles.missingText}>{missingCount} missing</Text>
            </View>
          )}
        </View>

        {/* Footer meta: Cook time, difficulty, ingredient count */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color="#646F58" />
            <Text style={styles.metaText}>{totalTime} min</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={13} color="#646F58" />
            <Text style={styles.metaText}>{difficulty}</Text>
          </View>
          {recipe.ingredients.length > 0 && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>
                {recipe.ingredients.length} items
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 20,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4EAE0",
    elevation: 3,
    shadowColor: "#504B3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  thumbWrapper: {
    width: 106,
    height: 112,
    position: "relative",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  ratingPill: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 3,
  },
  ratingText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#504B3A",
  },
  info: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "800",
    color: "#504B3A",
    lineHeight: 19,
  },
  bookmarkBtn: {
    padding: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  catBadge: {
    backgroundColor: "#E8F8EA",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  catText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B6A4E",
  },
  areaBadge: {
    backgroundColor: "#F2F4EF",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  areaText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7D8570",
  },
  matchedBadge: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  matchedText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#166534",
  },
  missingBadge: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  missingText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#B45309",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 11.5,
    color: "#646F58",
    fontWeight: "600",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#7D8570",
  },
});
