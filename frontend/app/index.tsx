import { Text, View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ScrollView, Alert } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TimeEntry {
  activityName: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationMs: number;
}

export default function Index() {
  const [activityName, setActivityName] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedName, setEditedName] = useState("");

  // Function to load today's entries
  const loadTodayEntries = async () => {
    try {
      const existingData = await AsyncStorage.getItem("timeEntries");
      if (existingData) {
        const allEntries: TimeEntry[] = JSON.parse(existingData);

        // Get today's date string (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        // Filter entries from today only
        const todayOnly = allEntries.filter((entry) => {
          const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
          return entryDate === today;
        });

        setTodayEntries(todayOnly);
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
    if (todayEntries.length === 0) {
      return null;
    }

    // Calculate total time in milliseconds
    const totalMs = todayEntries.reduce((sum, entry) => sum + entry.durationMs, 0);

    // Group by activity name
    const activityGroups: { [key: string]: number } = {};
    todayEntries.forEach((entry) => {
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

    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
    Keyboard.dismiss();
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
      >
        <View style={styles.content}>
          <Text style={styles.title}>Time Logger</Text>

          <TextInput
            style={styles.input}
            placeholder="What am I doing?"
            placeholderTextColor="#999999"
            value={activityName}
            onChangeText={setActivityName}
            editable={!isRunning}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.startButton,
                (!activityName.trim() || isRunning) && styles.buttonDisabled
              ]}
              onPress={handleStart}
              disabled={!activityName.trim() || isRunning}
            >
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.stopButton,
                !isRunning && styles.buttonDisabled
              ]}
              onPress={handleStop}
              disabled={!isRunning}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Activities List */}
        {todayEntries.length > 0 && (
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Today's Activities</Text>

            {todayEntries.map((entry, index) => (
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
                      <Text style={styles.entryName}>{entry.activityName}</Text>
                      <Text style={styles.entryDuration}>{entry.duration}</Text>
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
            ))}
          </View>
        )}

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
  entryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    marginBottom: 12,
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
});
