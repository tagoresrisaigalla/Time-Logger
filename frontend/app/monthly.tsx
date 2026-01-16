import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

interface TimeEntry {
    activityName: string;
    startTime: string;
    endTime: string;
    duration: string;
    durationMs: number;
    activityId?: string | null;
}

interface MonthlySummary {
    totalMs: number;
    activeDays: number;
    avgPerActiveDayMs: number;
    topCategories: { name: string; durationMs: number }[];
    categoryStats: { name: string; durationMs: number }[];
}

export default function Monthly() {
    const router = useRouter();
    const [monthIdentifier, setMonthIdentifier] = useState<string>("");
    const [summary, setSummary] = useState<MonthlySummary | null>(null);
    const [previousSummary, setPreviousSummary] = useState<MonthlySummary | null>(null);

    useEffect(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        setMonthIdentifier(`${year}-${month}`);
    }, []);

    useEffect(() => {
        if (monthIdentifier) {
            loadMonthlySummary(monthIdentifier);
            loadPreviousMonthSummary(monthIdentifier);
        }
    }, [monthIdentifier]);

    const calculateMonthlySummary = async (monthIdentifier: string) => {
        try {
            const existingData = await AsyncStorage.getItem("timeEntries");
            if (!existingData) {
                return null;
            }

            const allEntries: TimeEntry[] = JSON.parse(existingData);
            const [year, month] = monthIdentifier.split('-');

            const monthEntries = allEntries.filter((entry) => {
                const entryDate = new Date(entry.startTime);
                const entryYear = entryDate.getFullYear().toString();
                const entryMonth = (entryDate.getMonth() + 1).toString().padStart(2, '0');
                return entryYear === year && entryMonth === month;
            });

            if (monthEntries.length === 0) {
                return null;
            }

            const totalMs = monthEntries.reduce((sum, entry) => sum + entry.durationMs, 0);

            const activeDaysSet = new Set<string>();
            monthEntries.forEach((entry) => {
                const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
                activeDaysSet.add(entryDate);
            });
            const activeDays = activeDaysSet.size;
            const avgPerActiveDayMs = activeDays > 0 ? totalMs / activeDays : 0;

            const categoryGroups: { [key: string]: number } = {};
            monthEntries.forEach((entry) => {
                if (categoryGroups[entry.activityName]) {
                    categoryGroups[entry.activityName] += entry.durationMs;
                } else {
                    categoryGroups[entry.activityName] = entry.durationMs;
                }
            });

            const topCategories = Object.entries(categoryGroups)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, ms]) => ({ name, durationMs: ms }));

            const categoryStats = Object.entries(categoryGroups).map(([name, ms]) => ({
                name,
                durationMs: ms,
            }));

            return {
                totalMs,
                activeDays,
                avgPerActiveDayMs,
                topCategories,
                categoryStats,
            };
        } catch (error) {
            console.error("Error calculating monthly summary:", error);
            return null;
        }
    };

    const loadMonthlySummary = async (identifier: string) => {
        const data = await calculateMonthlySummary(identifier);
        setSummary(data);
    };

    const loadPreviousMonthSummary = async (identifier: string) => {
        const [year, month] = identifier.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        date.setMonth(date.getMonth() - 1);
        const prevYear = date.getFullYear();
        const prevMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        const prevIdentifier = `${prevYear}-${prevMonth}`;
        const data = await calculateMonthlySummary(prevIdentifier);
        setPreviousSummary(data);
    };

    const getTrendIndicator = () => {
        if (!previousSummary) {
            return "No data for previous month";
        }
        if (!summary) {
            return "";
        }

        const diff = summary.totalMs - previousSummary.totalMs;
        let arrow = "→";
        if (diff > 0) arrow = "↑";
        if (diff < 0) arrow = "↓";

        const diffFormatted = formatDuration(Math.abs(diff));
        const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";

        return `${arrow} ${sign}${diffFormatted} vs last month`;
    };

    const getTopCategoryComparison = () => {
        if (!previousSummary) {
            return "";
        }
        if (!summary || summary.topCategories.length === 0) {
            return "";
        }
        if (previousSummary.topCategories.length === 0) {
            return "";
        }

        const currentTop = summary.topCategories[0].name;
        const previousTop = previousSummary.topCategories[0].name;

        if (currentTop === previousTop) {
            return "Same as last month";
        } else {
            return "Changed from last month";
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

    const navigateToPreviousMonth = () => {
        const [year, month] = monthIdentifier.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        date.setMonth(date.getMonth() - 1);
        const newYear = date.getFullYear();
        const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        setMonthIdentifier(`${newYear}-${newMonth}`);
    };

    const navigateToNextMonth = () => {
        const [year, month] = monthIdentifier.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        date.setMonth(date.getMonth() + 1);
        const newYear = date.getFullYear();
        const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
        setMonthIdentifier(`${newYear}-${newMonth}`);
    };

    const formatMonthLabel = (identifier: string) => {
        const [year, month] = identifier.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Monthly Summary</Text>

                <View style={styles.monthNavigation}>
                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={navigateToPreviousMonth}
                    >
                        <Text style={styles.navButtonText}>← Previous</Text>
                    </TouchableOpacity>

                    <Text style={styles.monthLabel}>
                        {monthIdentifier && formatMonthLabel(monthIdentifier)}
                    </Text>

                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={navigateToNextMonth}
                    >
                        <Text style={styles.navButtonText}>Next →</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>Month Statistics</Text>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Total Time Logged:</Text>
                        <Text style={styles.statValue}>
                            {summary ? formatDuration(summary.totalMs) : "0m"}
                        </Text>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Active Days:</Text>
                        <Text style={styles.statValue}>
                            {summary ? summary.activeDays : 0}
                        </Text>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Average Per Active Day:</Text>
                        <Text style={styles.statValue}>
                            {summary ? formatDuration(summary.avgPerActiveDayMs) : "0m"}
                        </Text>
                    </View>
                </View>

                <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>Top 5 Categories</Text>

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
                        <Text style={styles.noDataText}>No data for this month</Text>
                    )}
                </View>

                <View style={styles.summarySection}>
                    <Text style={styles.sectionTitle}>Month Trends</Text>

                    <View style={styles.trendRow}>
                        <Text style={styles.trendLabel}>Total Time:</Text>
                        <Text style={styles.trendValue}>
                            {getTrendIndicator()}
                        </Text>
                    </View>

                    {summary && summary.topCategories.length > 0 && (
                        <View style={styles.trendRow}>
                            <Text style={styles.trendLabel}>Top Category:</Text>
                            <Text style={styles.trendValue}>
                                {getTopCategoryComparison()}
                            </Text>
                        </View>
                    )}
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
    monthNavigation: {
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
    monthLabel: {
        fontSize: 16,
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
    trendRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: "#F5F5F5",
        borderRadius: 8,
        marginBottom: 8,
    },
    trendLabel: {
        fontSize: 16,
        color: "#000000",
    },
    trendValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666666",
    },
});
