import { Image, Pressable, Text, View } from "react-native";
import type { Recipe } from "@/types/index";

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  missingCount?: number;
}

export function RecipeCard({ recipe, onPress, missingCount }: RecipeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row bg-white border border-[#E8ECE4] rounded-xl mb-3 overflow-hidden active:opacity-75"
      style={{ elevation: 1 }}
    >
      {/* Thumbnail */}
      <Image
        source={{ uri: recipe.thumbnail }}
        className="w-24 h-24"
        resizeMode="cover"
      />

      {/* Info */}
      <View className="flex-1 px-3 py-3 justify-between">
        <Text
          className="text-khaki font-bold text-sm leading-snug"
          numberOfLines={2}
        >
          {recipe.title}
        </Text>

        <View className="flex-row flex-wrap gap-1 mt-1">
          {recipe.category ? (
            <View className="bg-[#EDF5EC] rounded-full px-2 py-0.5">
              <Text className="text-olive text-xs font-semibold">
                {recipe.category}
              </Text>
            </View>
          ) : null}
          {recipe.area ? (
            <View className="bg-[#F3F5F0] rounded-full px-2 py-0.5">
              <Text className="text-olive-light text-xs">{recipe.area}</Text>
            </View>
          ) : null}
          {missingCount !== undefined && missingCount > 0 && (
            <View className="bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              <Text className="text-amber-700 text-xs font-medium">
                {missingCount} missing
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
