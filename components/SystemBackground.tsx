import type { ReactNode } from "react";
import { ImageBackground, StyleSheet, View, type ViewStyle } from "react-native";

interface SystemBackgroundProps {
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * Full-screen system background using the user's mint-green geometric wave graphic
 * (`assets/system-bg.png`) with a subtle translucent veil so content remains crisp.
 */
export function SystemBackground({ children, style }: SystemBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <ImageBackground
        source={require("../assets/system-bg.png")}
        style={styles.bgImage}
        imageStyle={styles.imageStyle}
        resizeMode="cover"
      >
        <View style={styles.overlay}>{children}</View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E3FCE8",
  },
  bgImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  imageStyle: {
    opacity: 0.92,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
});
