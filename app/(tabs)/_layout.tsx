import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#646F58",
        tabBarInactiveTintColor: "#7D8570",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E8ECE4",
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTintColor: "#504B3A",
        headerTitleStyle: {
          fontWeight: "700",
          color: "#504B3A",
        },
        headerShadowVisible: false,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarLabel: "Discover",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={focused ? "#646F58" : "#7D8570"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="snap"
        options={{
          title: "Snap",
          tabBarLabel: "Snap",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "camera" : "camera-outline"}
              size={22}
              color={focused ? "#646F58" : "#7D8570"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
          tabBarLabel: "Pantry",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "leaf" : "leaf-outline"}
              size={22}
              color={focused ? "#646F58" : "#7D8570"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cookbook"
        options={{
          title: "Cookbook",
          tabBarLabel: "Cookbook",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "book" : "book-outline"}
              size={22}
              color={focused ? "#646F58" : "#7D8570"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          title: "Community",
          tabBarLabel: "Community",
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={22}
              color={focused ? "#646F58" : "#7D8570"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
