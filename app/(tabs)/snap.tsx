import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { compressImage, identifyDish } from "@/lib/snap";
import { useRecipes } from "@/stores/RecipeContext";
import type { SnapResult } from "@/types/index";

type SnapState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "not_configured" }
  | { status: "not_food" }
  | { status: "error"; message: string }
  | { status: "result"; imageUri: string; result: SnapResult };

export default function SnapScreen() {
  const [state, setState] = useState<SnapState>({ status: "idle" });
  const [savedSnap, setSavedSnap] = useState(false);
  const { saveRecipe } = useRecipes();

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setState({
        status: "error",
        message: "Photo library permission is required to pick an image.",
      });
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: true,
    });

    if (pickerResult.canceled) return;
    await processAsset(pickerResult.assets[0]);
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setState({
        status: "error",
        message: "Camera permission is required to take a photo.",
      });
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
      base64: true,
    });

    if (cameraResult.canceled) return;
    await processAsset(cameraResult.assets[0]);
  }

  async function processAsset(asset: ImagePicker.ImagePickerAsset) {
    setState({ status: "loading" });
    setSavedSnap(false);
    try {
      const compressed = await compressImage(asset.uri);
      const snapResult = await identifyDish(compressed.base64);

      if (!snapResult.is_food) {
        setState({ status: "not_food" });
        return;
      }

      setState({
        status: "result",
        imageUri: compressed.uri,
        result: snapResult,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg === "SUPABASE_NOT_CONFIGURED") {
        setState({ status: "not_configured" });
      } else {
        setState({ status: "error", message: msg });
      }
    }
  }

  function handleReset() {
    setState({ status: "idle" });
    setSavedSnap(false);
  }

  async function handleSaveSnap() {
    if (state.status !== "result") return;
    const { imageUri, result } = state;
    await saveRecipe({
      id: `snap-${Date.now()}`,
      title: result.dish_name,
      category: "Snapped Dish",
      area: "AI Kitchen",
      instructions: result.steps.join("\n"),
      thumbnail: imageUri,
      ingredients: result.ingredients.map((i) => ({
        name: i.name,
        measure: i.quantity,
      })),
      source: "Putahe Snap",
    });
    setSavedSnap(true);
  }

  // ─── Idle / action buttons ─────────────────────────────────────────────────

  if (state.status === "idle") {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8 gap-y-4">
        <View className="w-20 h-20 rounded-full bg-[#EDF5EC] items-center justify-center mb-1">
          <Ionicons name="camera-outline" size={38} color="#646F58" />
        </View>
        <Text className="text-xl font-bold text-khaki">Snap a Dish</Text>
        <Text className="text-olive-light text-sm text-center">
          Take or choose a photo of a dish and we&apos;ll identify it and show
          you the recipe.
        </Text>

        <View className="w-full gap-y-3 mt-4">
          <Pressable
            className="bg-malachite rounded-xl py-4 flex-row items-center justify-center gap-x-2 active:opacity-80"
            onPress={handleTakePhoto}
          >
            <Ionicons name="camera" size={20} color="#504B3A" />
            <Text className="text-khaki font-bold text-base">
              Take a Photo
            </Text>
          </Pressable>

          <Pressable
            className="border border-olive-light rounded-xl py-4 flex-row items-center justify-center gap-x-2 active:opacity-70"
            onPress={handlePickImage}
          >
            <Ionicons name="images-outline" size={20} color="#646F58" />
            <Text className="text-olive font-bold text-base">
              Choose from Gallery
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (state.status === "loading") {
    return (
      <View className="flex-1 bg-white items-center justify-center gap-y-4">
        <ActivityIndicator size="large" color="#57E165" />
        <Text className="text-olive-light text-sm">Identifying dish…</Text>
      </View>
    );
  }

  // ─── Not configured ────────────────────────────────────────────────────────

  if (state.status === "not_configured") {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8 gap-y-3">
        <Ionicons name="settings-outline" size={40} color="#646F58" />
        <Text className="text-lg font-bold text-khaki">
          Service not configured
        </Text>
        <Text className="text-olive-light text-sm text-center">
          Add your Supabase credentials to{" "}
          <Text className="font-mono text-khaki">.env.local</Text> to enable
          dish identification.
        </Text>
        <Pressable
          className="mt-4 bg-[#EDF5EC] rounded-xl px-6 py-3 active:opacity-70"
          onPress={handleReset}
        >
          <Text className="text-olive font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Not food ──────────────────────────────────────────────────────────────

  if (state.status === "not_food") {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8 gap-y-3">
        <Ionicons name="help-circle-outline" size={44} color="#646F58" />
        <Text className="text-lg font-bold text-khaki">
          That doesn&apos;t look like food
        </Text>
        <Text className="text-olive-light text-sm text-center">
          Try a clearer photo of a dish or meal.
        </Text>
        <Pressable
          className="mt-4 bg-malachite rounded-xl px-6 py-3 active:opacity-80"
          onPress={handleReset}
        >
          <Text className="text-khaki font-bold">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────

  if (state.status === "error") {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8 gap-y-3">
        <Ionicons name="warning-outline" size={42} color="#646F58" />
        <Text className="text-lg font-bold text-khaki">
          Something went wrong
        </Text>
        <Text className="text-olive-light text-sm text-center">
          {state.message}
        </Text>
        <Pressable
          className="mt-4 bg-malachite rounded-xl px-6 py-3 active:opacity-80"
          onPress={handleReset}
        >
          <Text className="text-khaki font-bold">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────────────

  const { imageUri, result } = state;

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
    >
      {/* Image preview */}
      <Image
        source={{ uri: imageUri }}
        className="w-full h-56"
        resizeMode="cover"
      />

      <View className="px-4 pt-4 pb-10">
        {/* Dish name */}
        <Text className="text-2xl font-bold text-khaki">
          {result.dish_name}
        </Text>
        {result.confidence_note ? (
          <Text className="text-olive-light text-sm mt-1">
            {result.confidence_note}
          </Text>
        ) : null}

        {/* Ingredients */}
        <Text className="text-lg font-bold text-khaki mt-6 mb-3">
          Ingredients
        </Text>
        {result.ingredients.map((ing, idx) => (
          <View
            key={idx}
            className="flex-row items-start py-2 border-b border-[#F1F3EE]"
          >
            <View className="w-2 h-2 rounded-full bg-malachite mt-1.5 mr-3 flex-shrink-0" />
            <Text className="flex-1 text-khaki text-sm">{ing.name}</Text>
            {ing.quantity ? (
              <Text className="text-olive-light text-sm ml-2">
                {ing.quantity}
              </Text>
            ) : null}
          </View>
        ))}

        {/* Steps */}
        <Text className="text-lg font-bold text-khaki mt-6 mb-3">
          How to Cook
        </Text>
        {result.steps.map((step, idx) => (
          <View key={idx} className="flex-row mb-4">
            <View className="w-6 h-6 rounded-full bg-olive items-center justify-center mr-3 mt-0.5 flex-shrink-0">
              <Text className="text-white text-xs font-bold">{idx + 1}</Text>
            </View>
            <Text className="flex-1 text-khaki text-sm leading-relaxed">
              {step}
            </Text>
          </View>
        ))}

        {/* Actions */}
        <View className="gap-y-3 mt-4">
          <Pressable
            onPress={handleSaveSnap}
            disabled={savedSnap}
            className={`rounded-xl py-3.5 items-center ${
              savedSnap
                ? "bg-[#EDF5EC] border border-[#D4E3D1]"
                : "bg-malachite active:opacity-80"
            }`}
          >
            <Text className="text-khaki font-bold">
              {savedSnap ? "✓ Saved to Cookbook" : "Save to Cookbook"}
            </Text>
          </Pressable>
          <Pressable
            className="bg-[#F3F5F0] rounded-xl py-3 items-center active:opacity-70"
            onPress={handleReset}
          >
            <Text className="text-olive font-semibold">Snap Another</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
