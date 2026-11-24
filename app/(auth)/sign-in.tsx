import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError("Please enter your email address and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)/forum");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign in failed.";
      if (
        msg.toLowerCase().includes("fetch") ||
        msg.toLowerCase().includes("network")
      ) {
        setError(
          "Unable to reach Supabase server. Check your internet connection or .env.local credentials."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSocialLogin(provider: string) {
    Alert.alert(
      `${provider} Sign In`,
      `${provider} OAuth can be enabled in your Supabase Auth provider settings.`
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Background wave blobs — pointerEvents="none" so they never intercept touches */}
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.topWaveLarge} />
        <View style={styles.topWaveSmall} />
        <View style={styles.bottomWaveLarge} />
        <View style={styles.bottomWaveSmall} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar with circular back button */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace("/(tabs)")}
          >
            <Ionicons name="chevron-back" size={20} color="#504B3A" />
          </Pressable>
        </View>

        {/* Main Card Area */}
        <View style={styles.formContainer}>
          {/* Heading + Subtitle */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Log in</Text>
            <Text style={styles.subtitle}>
              Enter your email and password to securely access your account and
              manage your services.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email Pill Input */}
          <View style={styles.pillInputContainer}>
            <View style={styles.iconBadge}>
              <Ionicons name="mail" size={16} color="#504B3A" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#7D8570"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password Pill Input */}
          <View style={styles.pillInputContainer}>
            <View style={styles.iconBadge}>
              <Ionicons name="lock-closed" size={16} color="#504B3A" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#7D8570"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              onSubmitEditing={handleSignIn}
            />
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={10}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#7D8570"
              />
            </Pressable>
          </View>

          {/* Remember me & Forgot Password row */}
          <View style={styles.optionsRow}>
            <Pressable
              style={styles.rememberRow}
              onPress={() => setRememberMe((prev) => !prev)}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxChecked,
                ]}
              >
                {rememberMe && (
                  <Ionicons name="checkmark" size={13} color="#504B3A" />
                )}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={styles.forgotText}>Forgot Password</Text>
            </Pressable>
          </View>

          {/* Prominent Pill Login Button */}
          <View style={styles.primaryButtonWrapper}>
            <Pressable
              style={styles.primaryButton}
              onPress={handleSignIn}
              disabled={loading}
              android_ripple={{ color: "rgba(80,75,58,0.15)" }}
            >
              {loading ? (
                <ActivityIndicator color="#504B3A" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Login</Text>
              )}
            </Pressable>
          </View>

          {/* Don't have an account? Sign Up here */}
          <View style={styles.switchRow}>
            <Text style={styles.switchPrompt}>
              Don&apos;t have an account?{" "}
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/sign-up")}
              hitSlop={8}
            >
              <Text style={styles.switchLink}>Sign Up here</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Social Login Section */}
          <Text style={styles.socialLabel}>Or Continue With Account</Text>
          <View style={styles.socialRow}>
            <Pressable
              style={styles.socialCircle}
              onPress={() => handleSocialLogin("Facebook")}
            >
              <Ionicons name="logo-facebook" size={22} color="#1877F2" />
            </Pressable>
            <Pressable
              style={styles.socialCircle}
              onPress={() => handleSocialLogin("Google")}
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
            </Pressable>
            <Pressable
              style={styles.socialCircle}
              onPress={() => handleSocialLogin("Apple")}
            >
              <Ionicons name="logo-apple" size={22} color="#000000" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4F6F3",
  },
  backgroundLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  topWaveLarge: {
    position: "absolute",
    top: -135,
    left: -80,
    width: 260,
    height: 240,
    borderRadius: 130,
    backgroundColor: "#646F58",
  },
  topWaveSmall: {
    position: "absolute",
    top: -140,
    left: 105,
    width: 195,
    height: 185,
    borderRadius: 95,
    backgroundColor: "#504B3A",
  },
  bottomWaveLarge: {
    position: "absolute",
    bottom: -140,
    right: -70,
    width: 250,
    height: 230,
    borderRadius: 125,
    backgroundColor: "#504B3A",
  },
  bottomWaveSmall: {
    position: "absolute",
    bottom: -140,
    right: 95,
    width: 180,
    height: 170,
    borderRadius: 90,
    backgroundColor: "#646F58",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 48,
    justifyContent: "center",
  },
  topBar: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 12,
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: "#E6EAE1",
    elevation: 4,
    shadowColor: "#504B3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#504B3A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#7D8570",
    textAlign: "center",
    lineHeight: 19,
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
  pillInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DCE2D5",
    elevation: 2,
    shadowColor: "#504B3A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F2F5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#504B3A",
    fontWeight: "500",
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#7D8570",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#57E165",
    borderColor: "#57E165",
  },
  rememberText: {
    fontSize: 12.5,
    color: "#646F58",
    fontWeight: "600",
  },
  forgotText: {
    fontSize: 12.5,
    color: "#504B3A",
    fontWeight: "700",
  },
  primaryButtonWrapper: {
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#504B3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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
  primaryButtonText: {
    color: "#504B3A",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  switchPrompt: {
    fontSize: 13,
    color: "#7D8570",
  },
  switchLink: {
    fontSize: 13,
    color: "#646F58",
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  divider: {
    height: 1,
    backgroundColor: "#E4E8DF",
    marginVertical: 20,
  },
  socialLabel: {
    fontSize: 12,
    color: "#7D8570",
    textAlign: "center",
    marginBottom: 14,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  socialCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCE2D5",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
});
