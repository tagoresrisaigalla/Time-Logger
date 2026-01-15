import { Text, View, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

interface TimeEntry {
    activityName: string;
    startTime: string;
    endTime: string;
    duration: string;
    durationMs: number;
}

interface WeeklySummary {
    totalMs: number;
    avgPerDayMs: number;
    topCategories: { name: string; durationMs: number }[];
}

export default function Weekly() {
    const router = useRouter();
    const [weekStartDate, setWeekStartDate] = useState<string>("");
    const [summary, setSummary] = useState<WeeklySummary | null>(null);
    const [reflection, setReflection] = useState<string>("");

    useEffect(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        setWeekStartDate(monday.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (weekStartDate) {
            loadWeeklySummary(weekStartDate);
            loadReflection(weekStartDate);
        }
    }, [weekStartDate]);

    useEffect(() => {
        if (weekStartDate) {
            saveReflection(weekStartDate, reflection);
        }
    }, [reflection]);

    const calculateWeeklySummary = async (weekStartDate: string) => {
        try {
            const existingData = await AsyncStorage.getItem("timeEntries");
            if (!existingData) {
                return null;
            }

            const allEntries: TimeEntry[] = JSON.parse(existingData);
            const startDate = new Date(weekStartDate);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);

            const weekEntries = allEntries.filter((entry) => {
                const entryDate = new Date(entry.startTime);
                return entryDate >= startDate && entryDate < endDate;
            });

            if (weekEntries.length === 0) {
                return null;
            }

            const totalMs = weekEntries.reduce((sum, entry) => sum + entry.durationMs, 0);
            const avgPerDayMs = totalMs / 7;

            const categoryGroups: { [key: string]: number } = {};
            weekEntries.forEach((entry) => {
                if (categoryGroups[entry.activityName]) {
                    categoryGroups[entry.activityName] += entry.durationMs;
                } else {
                    categoryGroups[entry.activityName] = entry.durationMs;
                }
            });

            const topCategories = Object.entries(categoryGroups)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, ms]) => ({ name, durationMs: ms }));

            return {
                totalMs,
                avgPerDayMs,
                topCategories,
            };
        } catch (error) {
            console.error("Error calculating weekly summary:", error);
            return null;
        }
    };

    const loadWeeklySummary = async (startDate: string) => {
        const data = await calculateWeeklySummary(startDate);
        setSummary(data);
    };

    const loadReflection = async (startDate: string) => {
        try {
            const reflectionsData = await AsyncStorage.getItem("weeklyReflections");
            if (reflectionsData) {
                const reflections = JSON.parse(reflectionsData);
                setReflection(reflections[startDate] || "");
            } else {
                setReflection("");
            }
        } catch (error) {
            console.error("Error loading reflection:", error);
            setReflection("");
        }
    };

    const saveReflection = async (startDate: string, text: string) => {
        try {
            const reflectionsData = await AsyncStorage.getItem("weeklyReflections");
            const reflections = reflectionsData ? JSON.parse(reflectionsData) : {};
            reflections[startDate] = text;
            await AsyncStorage.setItem("weeklyReflections", JSON.stringify(reflections));
        } catch (error) {
            console.error("Error saving reflection:", error);
        }
    };

    const formatDuration = (ms: number): string => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);

        if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return "0m";
        }
    };

    const navigateToPreviousWeek = () => {
        const currentStart = new Date(weekStartDate);
        currentStart.setDate(currentStart.getDate() - 7);
        setWeekStartDate(currentStart.toISOString().split('T')[0]);
    };

    const navigateToNextWeek = () => {
        const currentStart = new Date(weekStartDate);
        currentStart.setDate(currentStart.getDate() + 7);
        setWeekStartDate(currentStart.toISOString().split('T')[0]);
    };

    const formatWeekRange = (startDate: string) => {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Weekly Summary</Text>

                <View style={styles.weekNavigation}>
                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={navigateToPreviousWeek}
                    >
                        <Text style={styles.navButtonText}>← Previous</Text>
                    </TouchableOpacity>

                    <Text style={styles.weekLabel}>
                        {weekStartDate && formatWeekRange(weekStartDate)}
                    </Text>

                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={navigateToNextWeek}
                    >
                        <Text style={styles.navButtonText}>Next →</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>Week Statistics</Text>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Total Time Logged:</Text>
                        <Text style={styles.statValue}>
                            {summary ? formatDuration(summary.totalMs) : "0m"}
                        </Text>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Average Per Day:</Text>
                        <Text style={styles.statValue}>
                            {summary ? formatDuration(summary.avgPerDayMs) : "0m"}
                        </Text>
                    </View>
                </View>

                <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>Top 3 Categories</Text>

                    {summary && summary.topCategories.length > 0 ? (
                        summary.topCategories.map((category, index) => (
                            <View key={index} style={styles.categoryRow}>
                                <Text style={styles.categoryName}>{category.name}</Text>
                                <Text style={styles.categoryDuration}>
                                    {formatDuration(category.durationMs)}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noDataText}>No data for this week</Text>
                    )}
                </View>

                <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>Weekly Reflection</Text>
                    <TextInput
                        style={styles.reflectionInput}
                        placeholder="What went well this week? What wasted your time?"
                        placeholderTextColor="#999999"
                        value={reflection}
                        onChangeText={setReflection}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>Back to Daily View</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 48,
    },
    title: {
        fontSize: 32,
        fontWeight: "600",
        color: "#000000",
        letterSpacing: 0.5,
        marginBottom: 32,
        textAlign: "center",
    },
    weekNavigation: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 32,
        gap: 8,
    },
    navButton: {
        backgroundColor: "#2196F3",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 80,
    },
    navButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
    weekLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#000000",
        flex: 1,
        textAlign: "center",
    },
    summarySection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#000000",
        marginBottom: 16,
    },
    statRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: "#F5F5F5",
        borderRadius: 8,
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 16,
        color: "#000000",
    },
    statValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2196F3",
    },
    categoryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: "#F5F5F5",
        borderRadius: 8,
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 16,
        color: "#000000",
        flex: 1,
    },
    categoryDuration: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666666",
    },
    noDataText: {
        fontSize: 16,
        color: "#999999",
        textAlign: "center",
        paddingVertical: 24,
    },
    backButton: {
        backgroundColor: "#4CAF50",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 16,
    },
    backButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "600",
    },
    reflectionInput: {
        borderWidth: 2,
        borderColor: "#E0E0E0",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: "#000000",
        backgroundColor: "#FFFFFF",
        minHeight: 120,
    },
});
