import { Text, View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ScrollView, Alert } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTimer } from "../context/TimerContext";
import { useActivity } from "../context/ActivityContext";
import Footer from "../components/Footer";


interface TimeEntry {
  activityName: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationMs: number;
  activityId?: string | null;
}

const getDateKey = (startTime: string): string => {
  return new Date(startTime).toISOString().split('T')[0];
};

const formatDateHeading = (dateKey: string): string => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dateKey === today) {
    return "Today";
  }
  if (dateKey === yesterday) {
    return "Yesterday";
  }

  const date = new Date(dateKey);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayOfWeek = dayNames[date.getDay()];
  const dayOfMonth = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);

  return `${dayOfWeek}, ${dayOfMonth} ${month} ${year}`;
};

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

const groupLogsByDate = (logs: TimeEntry[]): Record<string, TimeEntry[]> => {
  const grouped: Record<string, TimeEntry[]> = {};

  logs.forEach(log => {
    const dateKey = getDateKey(log.startTime);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(log);
  });

  Object.keys(grouped).forEach(dateKey => {
    grouped[dateKey].sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  });

  return grouped;
};

export default function Index() {
  const router = useRouter();
  const { activityName, setActivityName, startTime, setStartTime, isRunning, setIsRunning, setActiveActivityId } = useTimer();
  const { activities } = useActivity();
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedName, setEditedName] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Function to load today's entries
  const loadTodayEntries = async () => {
    try {
      const existingData = await AsyncStorage.getItem("timeEntries");
      if (existingData) {
        const allEntries: TimeEntry[] = JSON.parse(existingData);

        // Get cutoff date (14 days ago)
        const cutoffDate = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

        // Filter entries from last 14 days
        const recentEntries = allEntries.filter((entry) => {
          const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
          return entryDate >= cutoffDate;
        });

        setTodayEntries(recentEntries);
      }
    } catch (error) {
      console.error("Error loading entries:", error);
    }
  };

  // Load entries on mount
  useEffect(() => {
    loadTodayEntries();
  }, []);

  // Calculate daily summary
  const calculateDailySummary = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayOnly = todayEntries.filter((entry) => {
      const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
      return entryDate === today;
    });

    if (todayOnly.length === 0) {
      return null;
    }

    // Calculate total time in milliseconds
    const totalMs = todayOnly.reduce((sum, entry) => sum + entry.durationMs, 0);

    // Group by activity name
    const activityGroups: { [key: string]: number } = {};
    todayOnly.forEach((entry) => {
      if (activityGroups[entry.activityName]) {
        activityGroups[entry.activityName] += entry.durationMs;
      } else {
        activityGroups[entry.activityName] = entry.durationMs;
      }
    });

    // Format duration helper
    const formatDuration = (ms: number): string => {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);

      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${minutes}m`;
      }
    };

    return {
      totalTime: formatDuration(totalMs),
      activities: Object.entries(activityGroups).map(([name, ms]) => ({
        name,
        duration: formatDuration(ms),
      })),
    };
  };

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

  // Handle editing an activity
  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditedName(todayEntries[index].activityName);
  };

  // Save edited activity
  const handleSaveEdit = async () => {
    if (!editedName.trim() || editingIndex === null) {
      return;
    }

    try {
      // Get all entries
      const existingData = await AsyncStorage.getItem("timeEntries");
      if (existingData) {
        const allEntries: TimeEntry[] = JSON.parse(existingData);

        // Find the entry to update by matching all properties
        const entryToUpdate = todayEntries[editingIndex];
        const globalIndex = allEntries.findIndex(
          (e) =>
            e.startTime === entryToUpdate.startTime &&
            e.endTime === entryToUpdate.endTime &&
            e.durationMs === entryToUpdate.durationMs
        );

        if (globalIndex !== -1) {
          // Update the activity name
          allEntries[globalIndex].activityName = editedName.trim();

          // Save back to storage
          await AsyncStorage.setItem("timeEntries", JSON.stringify(allEntries));

          // Reload entries and exit edit mode
          await loadTodayEntries();
          setEditingIndex(null);
          setEditedName("");
        }
      }
    } catch (error) {
      console.error("Error saving edit:", error);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedName("");
  };

  // Handle deleting an activity
  const handleDelete = (index: number) => {
    Alert.alert(
      "Delete Activity",
      "Are you sure you want to delete this activity?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Get all entries
              const existingData = await AsyncStorage.getItem("timeEntries");
              if (existingData) {
                const allEntries: TimeEntry[] = JSON.parse(existingData);

                // Find the entry to delete
                const entryToDelete = todayEntries[index];
                const globalIndex = allEntries.findIndex(
                  (e) =>
                    e.startTime === entryToDelete.startTime &&
                    e.endTime === entryToDelete.endTime &&
                    e.durationMs === entryToDelete.durationMs
                );

                if (globalIndex !== -1) {
                  // Remove the entry
                  allEntries.splice(globalIndex, 1);

                  // Save back to storage
                  await AsyncStorage.setItem("timeEntries", JSON.stringify(allEntries));

                  // Reload entries
                  await loadTodayEntries();
                }
              }
            } catch (error) {
              console.error("Error deleting entry:", error);
            }
          },
        },
      ]
    );
  };

  const handleStart = () => {
    if (!activityName.trim()) {
      return;
    }

    Keyboard.dismiss();
    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
    setActiveActivityId(selectedActivityId);
    setSelectedActivityId(null);
  };


  const handleStop = async () => {
    if (!startTime) {
      return;
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const durationMinutes = Math.floor(durationMs / 60000);
    const durationSeconds = Math.floor((durationMs % 60000) / 1000);

    const entry = {
      activityName: activityName.trim(),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: `${durationMinutes}m ${durationSeconds}s`,
      durationMs: durationMs,
      activityId: selectedActivityId,
    };

    try {
      // Get existing entries
      const existingData = await AsyncStorage.getItem("timeEntries");
      const entries = existingData ? JSON.parse(existingData) : [];

      // Add new entry
      entries.push(entry);

      // Save back to storage
      await AsyncStorage.setItem("timeEntries", JSON.stringify(entries));

      // Reset state
      setActivityName("");
      setStartTime(null);
      setIsRunning(false);
      setActiveActivityId(null);

      // Reload today's entries
      await loadTodayEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Time Logger</Text>
        </View>

        {/* Today's Activities List */}
        {todayEntries.length > 0 && (() => {
          const groupedLogs = groupLogsByDate(todayEntries);
          const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

          return (
            <View style={styles.listContainer}>
              <Text style={styles.listTitle}>Today's Activities</Text>

              {sortedDates.map((dateKey) => (
                <View key={dateKey}>
                  <Text style={styles.dateHeading}>{formatDateHeading(dateKey)}</Text>

                  {groupedLogs[dateKey].map((entry, index) => {
                    const resolvedActivityName = entry.activityId
                      ? (activities.find(a => a.id === entry.activityId)?.name || "(Deleted Activity)")
                      : entry.activityId === null
                        ? "No Activity"
                        : entry.activityName;

                    return (
                      <View key={index} style={styles.entryItem}>
                        {editingIndex === index ? (
                          // Edit Mode
                          <View style={styles.editContainer}>
                            <TextInput
                              style={styles.editInput}
                              value={editedName}
                              onChangeText={setEditedName}
                              placeholder="Activity name"
                              placeholderTextColor="#999999"
                            />
                            <View style={styles.editButtonContainer}>
                              <TouchableOpacity
                                style={[styles.editButton, styles.saveButton]}
                                onPress={handleSaveEdit}
                              >
                                <Text style={styles.editButtonText}>Save</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.editButton, styles.cancelButton]}
                                onPress={handleCancelEdit}
                              >
                                <Text style={styles.editButtonText}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          // View Mode
                          <>
                            <TouchableOpacity
                              style={styles.entryContent}
                              onPress={() => handleEdit(index)}
                            >
                              <View>
                                <Text style={styles.entryActivityLabel}>{resolvedActivityName}</Text>
                                <Text style={styles.entryName}>{entry.activityName}</Text>
                                <Text style={styles.entryTime}>
                                  {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                                </Text>
                              </View>
                              <Text style={styles.entryDuration}>{formatDurationDisplay(entry.durationMs)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDelete(index)}
                            >
                              <Text style={styles.deleteButtonText}>Delete</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })()}

        {/* Daily Summary Section */}
        {todayEntries.length > 0 && (() => {
          const summary = calculateDailySummary();
          return summary ? (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Daily Summary</Text>

              <Text style={styles.summaryTotalText}>
                Total Time Today: {summary.totalTime}
              </Text>

              {summary.activities.map((activity, index) => (
                <View key={index} style={styles.summaryActivityRow}>
                  <Text style={styles.summaryActivityName}>{activity.name}</Text>
                  <Text style={styles.summaryActivityDuration}>{activity.duration}</Text>
                </View>
              ))}
            </View>
          ) : null;
        })()}
      </ScrollView>
      <Footer />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    color: "#000000",
    letterSpacing: 0.5,
    marginBottom: 48,
  },
  input: {
    width: "100%",
    height: 56,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  stopButton: {
    backgroundColor: "#F44336",
  },
  buttonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
  },
  dateHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    marginTop: 16,
    marginBottom: 12,
    paddingLeft: 4,
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
  entryName: {
    fontSize: 16,
    color: "#000000",
    flex: 1,
    marginRight: 16,
  },
  entryTime: {
    fontSize: 12,
    color: "#999999",
    marginTop: 2,
  },
  entryActivityLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 2,
  },
  entryDuration: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
  },
  deleteButton: {
    backgroundColor: "#F44336",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  editContainer: {
    flex: 1,
  },
  editInput: {
    width: "100%",
    height: 44,
    borderWidth: 1,
    borderColor: "#2196F3",
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  editButtonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#9E9E9E",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
  },
  summaryTotalText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2196F3",
    marginBottom: 20,
  },
  summaryActivityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryActivityName: {
    fontSize: 16,
    color: "#000000",
    flex: 1,
  },
  summaryActivityDuration: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
  },
  weeklyButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  weeklyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  monthlyButton: {
    backgroundColor: "#FF9800",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    width: "100%",
  },
  monthlyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  activitySelector: {
    width: "100%",
    marginBottom: 24,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  activityOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activityOption: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activityOptionSelected: {
    backgroundColor: "#4CAF50",
  },
  activityOptionText: {
    fontSize: 14,
    color: "#000000",
  },
});
