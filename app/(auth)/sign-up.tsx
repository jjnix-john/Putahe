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
import { SystemBackground } from "@/components/SystemBackground";

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      setSuccess(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Registration failed.";
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
      `${provider} Sign Up`,
      `${provider} OAuth can be enabled in your Supabase Auth provider settings.`
    );
  }

  if (success) {
    return (
      <SystemBackground>
        <View style={styles.root}>
          <View style={styles.successBox}>
            <View style={styles.formContainer}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={34} color="#504B3A" />
              </View>
              <Text style={[styles.title, { textAlign: "center" }]}>
                Account Created!
              </Text>
              <Text style={[styles.subtitle, { marginBottom: 22 }]}>
                We&apos;ve sent a confirmation link to{" "}
                <Text style={styles.successEmail}>{email}</Text>. Next, let&apos;s
                set up your personal Cooking Companion!
              </Text>
              <View style={styles.primaryButtonWrapper}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.replace("/(auth)/companion-setup")}
                >
                  <Text style={styles.primaryButtonText}>
                    Choose Cooking Companion
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </SystemBackground>
    );
  }

  return (
    <SystemBackground>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
            onPress={() => router.replace("/(auth)/sign-in")}
          >
            <Ionicons name="chevron-back" size={20} color="#504B3A" />
          </Pressable>
        </View>

        {/* Main Card Area */}
        <View style={styles.formContainer}>
          {/* Heading + Subtitle */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Create a new account to get started and enjoy seamless access to
              our features.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Name Pill Input */}
          <View style={styles.pillInputContainer}>
            <View style={styles.iconBadge}>
              <Ionicons name="person" size={16} color="#504B3A" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#7D8570"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

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
              autoComplete="new-password"
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

          {/* Confirm Password Pill Input */}
          <View style={styles.pillInputContainer}>
            <View style={styles.iconBadge}>
              <Ionicons name="lock-closed" size={16} color="#504B3A" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#7D8570"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
              onSubmitEditing={handleSignUp}
            />
            <Pressable
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              hitSlop={10}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#7D8570"
              />
            </Pressable>
          </View>

          {/* Prominent Pill Create Account Button */}
          <View style={[styles.primaryButtonWrapper, { marginTop: 8 }]}>
            <Pressable
              style={styles.primaryButton}
              onPress={handleSignUp}
              disabled={loading}
              android_ripple={{ color: "rgba(80,75,58,0.15)" }}
            >
              {loading ? (
                <ActivityIndicator color="#504B3A" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </Pressable>
          </View>

          {/* Already have an account? Sign In here */}
          <View style={styles.switchRow}>
            <Text style={styles.switchPrompt}>Already have an account? </Text>
            <Pressable
              onPress={() => router.replace("/(auth)/sign-in")}
              hitSlop={8}
            >
              <Text style={styles.switchLink}>Sign In here</Text>
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
    </SystemBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    backgroundColor: "#7D8570",
  },
  topWaveSmall: {
    position: "absolute",
    top: -140,
    left: 105,
    width: 195,
    height: 185,
    borderRadius: 95,
    backgroundColor: "#646F58",
  },
  bottomWaveLarge: {
    position: "absolute",
    bottom: -140,
    right: -70,
    width: 250,
    height: 230,
    borderRadius: 125,
    backgroundColor: "#646F58",
  },
  bottomWaveSmall: {
    position: "absolute",
    bottom: -140,
    right: 95,
    width: 180,
    height: 170,
    borderRadius: 90,
    backgroundColor: "#504B3A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 44,
    justifyContent: "center",
  },
  topBar: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 10,
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
    paddingVertical: 24,
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
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#504B3A",
    marginBottom: 6,
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
    height: 50,
    paddingHorizontal: 16,
    marginBottom: 12,
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
    marginTop: 16,
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
    marginVertical: 18,
  },
  socialLabel: {
    fontSize: 12,
    color: "#7D8570",
    textAlign: "center",
    marginBottom: 12,
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
  successBox: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#57E165",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  successEmail: {
    color: "#504B3A",
    fontWeight: "700",
  },
});
