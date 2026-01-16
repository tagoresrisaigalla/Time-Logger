import { Stack } from "expo-router";
import { TimerProvider } from "../context/TimerContext";
import { ActivityProvider } from "../context/ActivityContext";

export default function RootLayout() {
    return (
        <ActivityProvider>
            <TimerProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="weekly" />
                    <Stack.Screen name="monthly" />
                </Stack>
            </TimerProvider>
        </ActivityProvider>
    );
}
