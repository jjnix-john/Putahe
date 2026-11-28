import { useState } from "react";
import {
  ActivityIndicator,
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
import { supabase } from "@/lib/supabase";
import { SystemBackground } from "@/components/SystemBackground";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleResetPassword() {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim()
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to send password reset link.";
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
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#504B3A" />
          </Pressable>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address to receive a reset link and regain access
              to your account.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {sent ? (
            <View style={styles.sentBanner}>
              <Ionicons name="checkmark-circle" size={22} color="#57E165" />
              <Text style={styles.sentText}>
                Password reset link sent to {email}. Check your inbox!
              </Text>
            </View>
          ) : null}

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
              onSubmitEditing={handleResetPassword}
            />
          </View>

          {/* Continue Pill Button */}
          <View style={styles.primaryButtonWrapper}>
            <Pressable
              style={styles.primaryButton}
              onPress={handleResetPassword}
              disabled={loading}
              android_ripple={{ color: "rgba(80,75,58,0.15)" }}
            >
              {loading ? (
                <ActivityIndicator color="#504B3A" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Continue</Text>
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
  sentBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDF5EC",
    borderColor: "#D4E3D1",
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  sentText: {
    flex: 1,
    color: "#504B3A",
    fontSize: 13,
    fontWeight: "600",
  },
  pillInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 18,
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
});
