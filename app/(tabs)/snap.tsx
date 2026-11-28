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
import { toSafeErrorMessage } from "@/lib/security";
import { useRecipes } from "@/stores/RecipeContext";
import { CompanionReaction } from "@/components/CompanionReaction";
import { SystemBackground } from "@/components/SystemBackground";
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
      const rawMsg = e instanceof Error ? e.message : "Unknown error";
      if (rawMsg === "SUPABASE_NOT_CONFIGURED") {
        setState({ status: "not_configured" });
      } else {
        setState({
          status: "error",
          message: toSafeErrorMessage(
            e,
            "Unable to analyze the image right now. Please try again."
          ),
        });
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
      <SystemBackground>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center">
            <CompanionReaction
              mood="curious"
              size={125}
              title="Snap a Dish"
              subtitle="Take or choose a photo of any meal and your companion will inspect and reverse-engineer the recipe!"
            />

            <View className="w-full gap-y-3 mt-5">
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
                className="bg-white border border-olive-light rounded-xl py-4 flex-row items-center justify-center gap-x-2 active:opacity-70"
                onPress={handlePickImage}
              >
                <Ionicons name="images-outline" size={20} color="#646F58" />
                <Text className="text-olive font-bold text-base">
                  Choose from Gallery
                </Text>
              </Pressable>
            </View>

            {/* Explicit AI-Generated Content & Upload Safety Disclaimer */}
            <View className="mt-5 bg-[#F6F8F4] border border-[#DCE4D8] rounded-2xl p-3 flex-row items-start gap-x-2.5">
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#646F58"
              />
              <Text className="flex-1 text-xs text-olive leading-relaxed">
                <Text className="font-bold text-khaki">AI Disclaimer: </Text>
                Dish names, ingredients, and cooking steps are automated AI
                estimates and may contain errors. Always verify ingredients for
                allergens and dietary safety. Max upload size: 1.5 MB (JPEG/PNG).
              </Text>
            </View>
          </View>
        </View>
      </SystemBackground>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (state.status === "loading") {
    return (
      <SystemBackground>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center">
            <CompanionReaction
              mood="discovering"
              size={130}
              title="Inspecting your dish…"
              subtitle="Smelling the spices and figuring out the secret ingredients!"
            />
            <ActivityIndicator
              size="large"
              color="#57E165"
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </SystemBackground>
    );
  }

  // ─── Not configured ────────────────────────────────────────────────────────

  if (state.status === "not_configured") {
    return (
      <SystemBackground>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center">
            <CompanionReaction
              mood="curious"
              size={120}
              title="AI Vision not configured yet"
              subtitle="Add your Supabase credentials to .env.local to enable dish identification."
            />
            <Pressable
              className="mt-5 bg-malachite rounded-xl px-6 py-3 active:opacity-80"
              onPress={handleReset}
            >
              <Text className="text-khaki font-bold">Go Back</Text>
            </Pressable>
          </View>
        </View>
      </SystemBackground>
    );
  }

  // ─── Not food ──────────────────────────────────────────────────────────────

  if (state.status === "not_food") {
    return (
      <SystemBackground>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center">
            <CompanionReaction
              mood="sad"
              size={125}
              title="That doesn't look like food!"
              subtitle="Your companion couldn't spot a dish. Try a clearer photo of a meal."
            />
            <Pressable
              className="mt-5 bg-malachite rounded-xl px-6 py-3 active:opacity-80"
              onPress={handleReset}
            >
              <Text className="text-khaki font-bold">Try Again</Text>
            </Pressable>
          </View>
        </View>
      </SystemBackground>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────

  if (state.status === "error") {
    return (
      <SystemBackground>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full bg-white/95 border border-[#E2EAE0] rounded-3xl p-6 items-center">
            <CompanionReaction
              mood="sad"
              size={125}
              title="Something went wrong"
              subtitle={state.message}
            />
            <Pressable
              className="mt-5 bg-malachite rounded-xl px-6 py-3 active:opacity-80"
              onPress={handleReset}
            >
              <Text className="text-khaki font-bold">Try Again</Text>
            </Pressable>
          </View>
        </View>
      </SystemBackground>
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
        {/* Companion Amazed / Jumping Reaction Banner */}
        <CompanionReaction
          mood={savedSnap ? "jumping" : "amazed"}
          size={68}
          compact
          title={
            savedSnap
              ? "Added to your Cookbook!"
              : `Aha! It's ${result.dish_name}!`
          }
          subtitle={
            result.confidence_note ||
            "Here are the ingredients and steps to cook it at home."
          }
        />

        {/* Dish name */}
        <Text className="text-2xl font-bold text-khaki">
          {result.dish_name}
        </Text>

        {/* Explicit AI-Generated Output Disclaimer Banner */}
        <View className="mt-3 bg-[#F6F8F4] border border-[#DCE4D8] rounded-2xl p-3 flex-row items-start gap-x-2.5">
          <Ionicons name="sparkles-outline" size={17} color="#646F58" />
          <Text className="flex-1 text-xs text-olive leading-relaxed">
            <Text className="font-bold text-khaki">
              AI-Generated Estimate:{" "}
            </Text>
            This recipe was automatically generated by AI from your photo and
            may be inaccurate. Always verify ingredients for food allergies,
            dietary restrictions, and safe cooking temperatures.
          </Text>
        </View>

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
