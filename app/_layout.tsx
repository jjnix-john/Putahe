import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/stores/AuthContext";
import { RecipeProvider } from "@/stores/RecipeContext";
import { PantryProvider } from "@/stores/PantryContext";
import { initDatabase } from "@/lib/database";
import { SplashLoading } from "@/components/SplashLoading";

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const minDisplay = new Promise((resolve) => setTimeout(resolve, 1400));

    Promise.all([
      initDatabase().catch((err) => {
        console.error("Database init failed:", err);
      }),
      minDisplay,
    ]).then(() => {
      if (mounted) setAppReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!appReady) {
    return (
      <>
        <StatusBar style="dark" />
        <SplashLoading />
      </>
    );
  }

  return (
    <AuthProvider>
      <RecipeProvider>
        <PantryProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </PantryProvider>
      </RecipeProvider>
    </AuthProvider>
  );
}
