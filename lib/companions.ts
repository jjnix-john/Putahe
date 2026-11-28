import type { ImageSourcePropType } from "react-native";

export type CompanionMood =
  | "happy"
  | "sad"
  | "jumping"
  | "discovering"
  | "amazed"
  | "curious";

export interface CompanionOption {
  id: string;
  defaultTitle: string;
  specialty: string;
  accentColor: string;
  badgeBg: string;
  image: ImageSourcePropType;
  moods: Record<CompanionMood, ImageSourcePropType>;
}

export const COMPANION_OPTIONS: CompanionOption[] = [
  {
    id: "companion-1",
    defaultTitle: "Herb & Veggie Sprout",
    specialty: "Fresh greens & homestyle comfort",
    accentColor: "#46A758",
    badgeBg: "#E6F7E9",
    image: require("../assets/companion-1.png"),
    moods: {
      happy: require("../assets/companions/c1_happy.png"),
      sad: require("../assets/companions/c1_sad.png"),
      jumping: require("../assets/companions/c1_jumping.png"),
      discovering: require("../assets/companions/c1_discovering.png"),
      amazed: require("../assets/companions/c1_amazed.png"),
      curious: require("../assets/companions/c1_curious.png"),
    },
  },
  {
    id: "companion-2",
    defaultTitle: "Golden Wok Prodigy",
    specialty: "Quick stir-fries & street food",
    accentColor: "#D99B26",
    badgeBg: "#FDF4DC",
    image: require("../assets/companion-2.png"),
    moods: {
      happy: require("../assets/companions/c2_happy.png"),
      sad: require("../assets/companions/c2_sad.png"),
      jumping: require("../assets/companions/c2_jumping.png"),
      discovering: require("../assets/companions/c2_discovering.png"),
      amazed: require("../assets/companions/c2_amazed.png"),
      curious: require("../assets/companions/c2_curious.png"),
    },
  },
  {
    id: "companion-3",
    defaultTitle: "Grand Master Chef",
    specialty: "Classic heritage & slow-cooked feasts",
    accentColor: "#3B82F6",
    badgeBg: "#E8F2FF",
    image: require("../assets/companion-3.png"),
    moods: {
      happy: require("../assets/companions/c3_happy.png"),
      sad: require("../assets/companions/c3_sad.png"),
      jumping: require("../assets/companions/c3_jumping.png"),
      discovering: require("../assets/companions/c3_discovering.png"),
      amazed: require("../assets/companions/c3_amazed.png"),
      curious: require("../assets/companions/c3_curious.png"),
    },
  },
  {
    id: "companion-4",
    defaultTitle: "Sweet Pastry Artisan",
    specialty: "Bakes, desserts & cozy treats",
    accentColor: "#D946EF",
    badgeBg: "#FCE8FF",
    image: require("../assets/companion-4.png"),
    moods: {
      happy: require("../assets/companions/c4_happy.png"),
      sad: require("../assets/companions/c4_sad.png"),
      jumping: require("../assets/companions/c4_jumping.png"),
      discovering: require("../assets/companions/c4_discovering.png"),
      amazed: require("../assets/companions/c4_amazed.png"),
      curious: require("../assets/companions/c4_curious.png"),
    },
  },
  {
    id: "companion-5",
    defaultTitle: "Flame & Spice Rebel",
    specialty: "Bold grills, savory & spicy dishes",
    accentColor: "#EA580C",
    badgeBg: "#FFEDE5",
    image: require("../assets/companion-5.png"),
    moods: {
      happy: require("../assets/companions/c5_happy.png"),
      sad: require("../assets/companions/c5_sad.png"),
      jumping: require("../assets/companions/c5_jumping.png"),
      discovering: require("../assets/companions/c5_discovering.png"),
      amazed: require("../assets/companions/c5_amazed.png"),
      curious: require("../assets/companions/c5_curious.png"),
    },
  },
];

export function getCompanionOption(iconId?: string | null): CompanionOption {
  return (
    COMPANION_OPTIONS.find((c) => c.id === iconId) ?? COMPANION_OPTIONS[0]
  );
}

export function getCompanionMoodImage(
  iconId: string | null | undefined,
  mood: CompanionMood
): ImageSourcePropType {
  return getCompanionOption(iconId).moods[mood];
}
