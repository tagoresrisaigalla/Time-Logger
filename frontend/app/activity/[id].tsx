import { View, Text, StyleSheet, SectionList } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useActivity } from "../../context/ActivityContext";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TimeEntry {
    activityName: string;
    startTime: string;
    endTime: string;
    duration: string;
    durationMs: number;
    activityId?: string | null;
}

const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
};

const formatDurationDisplay = (durationMs: number): string => {
    const totalMinutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours} h ${minutes} min`;
    }
    return `${minutes} min`;
};

const getDateKey = (timestamp: string): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateKey: string): string => {
    const today = new Date();
    const todayKey = getDateKey(today.toISOString());

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getDateKey(yesterday.toISOString());

    if (dateKey === todayKey) {
        return 'Today';
    }
    if (dateKey === yesterdayKey) {
        return 'Yesterday';
    }

    const [year, month, day] = dateKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const yearShort = year.slice(2);

    return `${weekday}, ${day} ${monthName} ${yearShort}`;
};

interface DateGroup {
    date: string;
    data: TimeEntry[];
}

export default function ActivityDetail() {
    const { id } = useLocalSearchParams();
    const { activities } = useActivity();
    const [logs, setLogs] = useState<TimeEntry[]>([]);

    const activity = activities.find(a => a.id === id);

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const existingData = await AsyncStorage.getItem("timeEntries");
                if (existingData) {
                    const allEntries: TimeEntry[] = JSON.parse(existingData);
                    const filteredLogs = allEntries.filter(entry => entry.activityId === id);
                    setLogs(filteredLogs.reverse());
                }
            } catch (error) {
                console.error("Error loading logs:", error);
            }
        };
        loadLogs();
    }, [id]);

    if (!activity) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Activity not found</Text>
            </View>
        );
    }

    const totalMs = logs.reduce((sum, log) => sum + log.durationMs, 0);
    const totalTime = formatDurationDisplay(totalMs);

    const groupedByDate = logs.reduce<Record<string, TimeEntry[]>>((acc, log) => {
        const dateKey = getDateKey(log.startTime);
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(log);
        return acc;
    }, {});

    const sections: DateGroup[] = Object.keys(groupedByDate)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 14)
        .map(date => ({
            date,
            data: groupedByDate[date],
        }));

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{activity.name}</Text>
            {logs.length === 0 ? (
                <Text style={styles.emptyText}>No logs for this activity</Text>
            ) : (
                <>
                    <Text style={styles.totalText}>Total: {totalTime}</Text>
                    <SectionList
                        sections={sections}
                        keyExtractor={(item, index) => `${item.startTime}-${index}`}
                        renderItem={({ item }) => (
                            <View style={styles.entryItem}>
                                <View style={styles.entryContent}>
                                    <View>
                                        <Text style={styles.entryTime}>
                                            {formatTime(item.startTime)} – {formatTime(item.endTime)}
                                        </Text>
                                    </View>
                                    <Text style={styles.entryDuration}>{formatDurationDisplay(item.durationMs)}</Text>
                                </View>
                            </View>
                        )}
                        renderSectionHeader={({ section }) => {
                            const dayTotal = section.data.reduce((sum, log) => sum + log.durationMs, 0);
                            return (
                                <View>
                                    <Text style={styles.dateHeader}>{formatDateLabel(section.date)}</Text>
                                    <Text style={styles.dayTotal}>Total: {formatDurationDisplay(dayTotal)}</Text>
                                </View>
                            );
                        }}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: "600",
        color: "#000000",
        marginBottom: 16,
    },
    totalText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#000000",
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        color: "#999999",
        textAlign: "center",
        marginTop: 40,
    },
    entryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: "#F5F5F5",
        borderRadius: 8,
        marginBottom: 10,
    },
    entryContent: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginRight: 12,
    },
    entryTime: {
        fontSize: 12,
        color: "#999999",
        marginTop: 2,
    },
    entryDuration: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666666",
    },
    dateHeader: {
        fontSize: 14,
        fontWeight: "600",
        color: "#000000",
        marginTop: 16,
        marginBottom: 8,
    },
    dayTotal: {
        fontSize: 12,
        fontWeight: "500",
        color: "#666666",
        marginBottom: 8,
    },
});
