import { Text, View, StyleSheet, FlatList, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useActivity } from "../context/ActivityContext";

export default function Activities() {
    const { activities, addActivity, renameActivity, deleteActivity } = useActivity();
    const [newActivityName, setNewActivityName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState("");

    const handleAddActivity = () => {
        const trimmedName = newActivityName.trim();
        if (!trimmedName) {
            return;
        }
        addActivity(trimmedName);
        setNewActivityName("");
    };

    const handleEdit = (id: string, currentName: string) => {
        setEditingId(id);
        setEditedName(currentName);
    };

    const handleSaveEdit = () => {
        const trimmedName = editedName.trim();
        if (!trimmedName || !editingId) {
            return;
        }
        renameActivity(editingId, trimmedName);
        setEditingId(null);
        setEditedName("");
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditedName("");
    };

    if (activities.length === 0) {
        return (
            <View style={styles.container}>
                <TextInput
                    style={styles.input}
                    placeholder="Activity name"
                    placeholderTextColor="#999999"
                    value={newActivityName}
                    onChangeText={setNewActivityName}
                />
                <TouchableOpacity
                    style={[styles.addButton, !newActivityName.trim() && styles.addButtonDisabled]}
                    onPress={handleAddActivity}
                    disabled={!newActivityName.trim()}
                >
                    <Text style={styles.addButtonText}>Add Activity</Text>
                </TouchableOpacity>
                <Text style={styles.emptyText}>No activities yet</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Activity name"
                placeholderTextColor="#999999"
                value={newActivityName}
                onChangeText={setNewActivityName}
            />
            <TouchableOpacity
                style={[styles.addButton, !newActivityName.trim() && styles.addButtonDisabled]}
                onPress={handleAddActivity}
                disabled={!newActivityName.trim()}
            >
                <Text style={styles.addButtonText}>Add Activity</Text>
            </TouchableOpacity>
            <FlatList
                data={activities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.activityItem}>
                        {editingId === item.id ? (
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
                            <View style={styles.viewContainer}>
                                <TouchableOpacity
                                    style={styles.activityNameContainer}
                                    onPress={() => handleEdit(item.id, item.name)}
                                >
                                    <Text style={styles.activityName}>{item.name}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => deleteActivity(item.id)}
                                >
                                    <Text style={styles.deleteButtonText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            />
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
        marginBottom: 16,
    },
    addButton: {
        width: "100%",
        height: 56,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4CAF50",
        marginBottom: 32,
    },
    addButtonDisabled: {
        backgroundColor: "#CCCCCC",
        opacity: 0.6,
    },
    addButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "600",
    },
    emptyText: {
        fontSize: 16,
        color: "#999999",
        textAlign: "center",
        marginTop: 40,
    },
    activityItem: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: "#F5F5F5",
        borderRadius: 8,
        marginBottom: 12,
    },
    activityName: {
        fontSize: 16,
        color: "#000000",
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
    viewContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    activityNameContainer: {
        flex: 1,
        marginRight: 12,
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
});
