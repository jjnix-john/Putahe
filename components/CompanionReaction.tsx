import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "@/stores/AuthContext";
import {
  getCompanionMoodImage,
  getCompanionOption,
  type CompanionMood,
} from "@/lib/companions";

interface CompanionReactionProps {
  mood: CompanionMood;
  title?: string;
  subtitle?: string;
  size?: number;
  compact?: boolean;
  iconIdOverride?: string;
}

const MOOD_LABELS: Record<CompanionMood, string> = {
  happy: "HAPPY",
  sad: "OH NO…",
  jumping: "YAY!",
  discovering: "AHA!",
  amazed: "WOW!",
  curious: "HMM…",
};

/**
 * Renders the user's chosen Cooking Companion in one of the 6 full-body reaction poses
 * (`happy`, `sad`, `jumping`, `discovering`, `amazed`, `curious`) with a lively bounce.
 */
export function CompanionReaction({
  mood,
  title,
  subtitle,
  size = 115,
  compact = false,
  iconIdOverride,
}: CompanionReactionProps) {
  const { companion } = useAuth();
  const activeIconId = iconIdOverride ?? companion?.iconId;
  const option = getCompanionOption(activeIconId);
  const spriteSource = getCompanionMoodImage(activeIconId, mood);
  const chefName = companion?.name ? `Chef ${companion.name}` : option.defaultTitle;

  const floatY = useSharedValue(0);

  useEffect(() => {
    const amplitude = mood === "jumping" ? -10 : mood === "sad" ? 3 : -5;
    const duration = mood === "jumping" ? 450 : 950;
    floatY.value = withRepeat(
      withSequence(
        withTiming(amplitude, {
          duration,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      true
    );
  }, [mood, floatY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  if (compact) {
    return (
      <View
        style={[
          styles.compactCard,
          { borderColor: option.accentColor, backgroundColor: "rgba(255,255,255,0.94)" },
        ]}
      >
        <Animated.View style={animStyle}>
          <Image
            source={spriteSource}
            style={{ width: size, height: size }}
            resizeMode="contain"
          />
        </Animated.View>
        <View style={styles.compactTextCol}>
          <View style={styles.moodTagRow}>
            <View
              style={[
                styles.moodBadge,
                { backgroundColor: option.badgeBg },
              ]}
            >
              <Text
                style={[styles.moodBadgeText, { color: option.accentColor }]}
              >
                {chefName} • {MOOD_LABELS[mood]}
              </Text>
            </View>
          </View>
          {title ? <Text style={styles.compactTitle}>{title}</Text> : null}
          {subtitle ? (
            <Text style={styles.compactSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.centerContainer}>
      <Animated.View style={[styles.spriteBox, animStyle]}>
        <Image
          source={spriteSource}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>

      <View
        style={[
          styles.moodBadge,
          { backgroundColor: option.badgeBg, marginBottom: 6 },
        ]}
      >
        <Text style={[styles.moodBadgeText, { color: option.accentColor }]}>
          {chefName} • {MOOD_LABELS[mood]}
        </Text>
      </View>

      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  spriteBox: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  moodTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  moodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  moodBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#504B3A",
    textAlign: "center",
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#646F58",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 19,
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#504B3A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  compactTextCol: {
    flex: 1,
    marginLeft: 10,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#504B3A",
  },
  compactSubtitle: {
    fontSize: 12.5,
    color: "#646F58",
    marginTop: 2,
    lineHeight: 17,
  },
});
