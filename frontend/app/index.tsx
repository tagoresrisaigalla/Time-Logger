import { Text, View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from "react-native";
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
                <Text style={styles.entryName}>{entry.activityName}</Text>
                <Text style={styles.entryDuration}>{entry.duration}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
});
