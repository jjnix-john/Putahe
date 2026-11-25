import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/stores/AuthContext";
import { COMPANION_OPTIONS, type CompanionMood } from "@/lib/companions";
import { SystemBackground } from "@/components/SystemBackground";

const PREVIEW_MOODS: { key: CompanionMood; label: string }[] = [
  { key: "happy", label: "Happy" },
  { key: "jumping", label: "Jumping" },
  { key: "discovering", label: "Discovering" },
  { key: "amazed", label: "Amazed" },
  { key: "curious", label: "Curious" },
  { key: "sad", label: "Sad" },
];

export default function CompanionSetupScreen() {
  const { companion, saveCompanion } = useAuth();
  const [name, setName] = useState(companion?.name ?? "");
  const [selectedIconId, setSelectedIconId] = useState(
    companion?.iconId ?? COMPANION_OPTIONS[0].id
  );
  const [previewMood, setPreviewMood] = useState<CompanionMood>("happy");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption =
    COMPANION_OPTIONS.find((c) => c.id === selectedIconId) ??
    COMPANION_OPTIONS[0];

  async function handleComplete() {
    if (!name.trim()) {
      setError("Please give your cooking companion a name!");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveCompanion({
        name: name.trim(),
        iconId: selectedIconId,
      });
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not save your companion."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SystemBackground>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top navigation bar */}
          <View style={styles.topBar}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Ionicons name="chevron-back" size={20} color="#504B3A" />
            </Pressable>
            <View style={styles.stepPill}>
              <Ionicons name="sparkles" size={13} color="#504B3A" />
              <Text style={styles.stepPillText}>Chef Companion</Text>
            </View>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Choose Your Cooking Companion</Text>
            <Text style={styles.subtitle}>
              Pick an avatar from the kitchen crew and give your personal chef
              companion a name!
            </Text>

            {/* Large Selected Avatar + Reaction Pose Preview */}
            <View style={styles.previewSection}>
              <View
                style={[
                  styles.previewFrame,
                  {
                    borderColor: selectedOption.accentColor,
                    backgroundColor: selectedOption.badgeBg,
                  },
                ]}
              >
                <Image
                  source={selectedOption.moods[previewMood]}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>
              <View
                style={[
                  styles.specialtyBadge,
                  { backgroundColor: selectedOption.badgeBg },
                ]}
              >
                <Text
                  style={[
                    styles.specialtyTitle,
                    { color: selectedOption.accentColor },
                  ]}
                >
                  {selectedOption.defaultTitle}
                </Text>
              </View>
              <Text style={styles.specialtyDesc}>
                {selectedOption.specialty}
              </Text>

              {/* Reaction Mood Preview Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.moodsRow}
              >
                {PREVIEW_MOODS.map((m) => {
                  const active = previewMood === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setPreviewMood(m.key)}
                      style={[
                        styles.moodChip,
                        active && {
                          backgroundColor: selectedOption.accentColor,
                          borderColor: selectedOption.accentColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.moodChipText,
                          active && { color: "#FFFFFF" },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 5 Companion Icons Grid */}
            <Text style={styles.sectionLabel}>Select an Icon</Text>
            <View style={styles.avatarGrid}>
              {COMPANION_OPTIONS.map((item) => {
                const isSelected = item.id === selectedIconId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedIconId(item.id)}
                    style={[
                      styles.avatarChoice,
                      isSelected && {
                        borderColor: "#57E165",
                        backgroundColor: "#EDF9EE",
                        transform: [{ scale: 1.06 }],
                      },
                    ]}
                  >
                    <Image
                      source={item.image}
                      style={styles.avatarThumb}
                      resizeMode="contain"
                    />
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={11} color="#504B3A" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Companion Name Input */}
            <Text style={styles.sectionLabel}>Name Your Companion</Text>
            <View style={styles.pillInputContainer}>
              <View style={styles.iconBadge}>
                <Ionicons name="restaurant" size={15} color="#504B3A" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. Chef Kusinero, Lolo Putahe, Mia…"
                placeholderTextColor="#7D8570"
                value={name}
                onChangeText={setName}
                maxLength={28}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleComplete}
              />
              {name.length > 0 && (
                <Pressable onPress={() => setName("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#7D8570" />
                </Pressable>
              )}
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color="#B91C1C"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <View style={styles.primaryButtonWrapper}>
              <Pressable
                style={styles.primaryButton}
                onPress={handleComplete}
                disabled={saving}
                android_ripple={{ color: "rgba(80,75,58,0.15)" }}
              >
                {saving ? (
                  <ActivityIndicator color="#504B3A" size="small" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.primaryButtonText}>
                      Start Cooking Together
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#504B3A" />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SystemBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E4E8DF",
    elevation: 3,
  },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    borderColor: "#DCE2D5",
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#504B3A",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: "#E2E8DD",
    elevation: 5,
    shadowColor: "#504B3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#504B3A",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#646F58",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  previewSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  previewFrame: {
    width: 118,
    height: 118,
    borderRadius: 28,
    borderWidth: 3,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  specialtyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  specialtyTitle: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  specialtyDesc: {
    fontSize: 12,
    color: "#7D8570",
    fontWeight: "500",
    marginBottom: 10,
  },
  moodsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
  },
  moodChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F3F5F0",
    borderWidth: 1,
    borderColor: "#DCE2D5",
  },
  moodChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#504B3A",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#504B3A",
    marginBottom: 10,
    marginLeft: 4,
  },
  avatarGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    gap: 6,
  },
  avatarChoice: {
    width: 58,
    height: 58,
    borderRadius: 16,
    padding: 3,
    borderWidth: 2.5,
    borderColor: "transparent",
    backgroundColor: "#F5F7F2",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  checkBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#57E165",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pillInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: "#DCE2D5",
    elevation: 2,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EDF7EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#504B3A",
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 12.5,
  },
  primaryButtonWrapper: {
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
    elevation: 4,
  },
  primaryButton: {
    width: "100%",
    height: 52,
    backgroundColor: "#57E165",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#46C953",
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#504B3A",
    fontSize: 15.5,
    fontWeight: "800",
  },
});
