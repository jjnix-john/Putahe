import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function SplashLoading() {
  const progress = useSharedValue(0.08);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Smooth progressive fill animation
    progress.value = withRepeat(
      withSequence(
        withTiming(0.45, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0.85, {
          duration: 600,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(1, {
          duration: 350,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0.1, {
          duration: 200,
          easing: Easing.linear,
        })
      ),
      -1,
      false
    );

    // Subtle logo breathing animation
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, {
          duration: 900,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0.98, {
          duration: 900,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      true
    );
  }, [progress, pulse]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Top decorative organic blobs in brand palette */}
      <View style={styles.topBlobDark} />
      <View style={styles.topBlobOlive} />

      {/* Bottom decorative organic blobs */}
      <View style={styles.bottomBlobDark} />
      <View style={styles.bottomBlobGreen} />

      <Animated.View style={[styles.logoWrapper, logoStyle]}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Progress Bar Only — no extra text */}
      <View style={styles.progressSection}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    overflow: "hidden",
  },
  topBlobDark: {
    position: "absolute",
    top: -110,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#646F58",
    opacity: 0.15,
  },
  topBlobOlive: {
    position: "absolute",
    top: -90,
    left: 60,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#7D8570",
    opacity: 0.12,
  },
  bottomBlobDark: {
    position: "absolute",
    bottom: -110,
    right: -70,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#504B3A",
    opacity: 0.14,
  },
  bottomBlobGreen: {
    position: "absolute",
    bottom: -95,
    right: 65,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#57E165",
    opacity: 0.18,
  },
  logoWrapper: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  progressSection: {
    width: "100%",
    maxWidth: 240,
    alignItems: "center",
  },
  track: {
    width: "100%",
    height: 10,
    backgroundColor: "#EDF0E9",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCE2D5",
  },
  fill: {
    height: "100%",
    backgroundColor: "#57E165",
    borderRadius: 999,
  },
});
