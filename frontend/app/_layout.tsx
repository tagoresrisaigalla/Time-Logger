import { Stack } from "expo-router";
import { TimerProvider } from "../context/TimerContext";

export default function RootLayout() {
    return (
        <TimerProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="weekly" />
            </Stack>
        </TimerProvider>
    );
}
