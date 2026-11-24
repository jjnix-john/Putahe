import { Pressable, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PantryIngredient } from "@/types/index";

interface PantryItemProps {
  ingredient: PantryIngredient;
  onToggle: () => void;
  onDelete: () => void;
}

export function PantryItem({ ingredient, onToggle, onDelete }: PantryItemProps) {
  return (
    <View
      className={`flex-row items-center px-4 py-3 border-b border-[#E8ECE4] ${
        ingredient.isActive ? "bg-white" : "bg-[#F7F8F5]"
      }`}
    >
      {/* Toggle */}
      <Switch
        value={ingredient.isActive}
        onValueChange={onToggle}
        trackColor={{ false: "#D8DDD2", true: "#A8EEAF" }}
        thumbColor={ingredient.isActive ? "#57E165" : "#7D8570"}
      />

      {/* Name + quantity */}
      <View className="flex-1 ml-3">
        <Text
          className={`text-sm font-semibold ${
            ingredient.isActive
              ? "text-khaki"
              : "text-olive-light line-through"
          }`}
        >
          {ingredient.name}
        </Text>
        {(ingredient.quantity || ingredient.unit) && (
          <Text className="text-xs text-olive-light mt-0.5">
            {[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ")}
          </Text>
        )}
      </View>

      {/* Delete */}
      <Pressable
        onPress={onDelete}
        className="ml-2 p-2 rounded-lg active:bg-red-50"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color="#504B3A" />
      </Pressable>
    </View>
  );
}
