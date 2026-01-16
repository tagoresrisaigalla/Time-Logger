import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Footer() {
    const router = useRouter();

    return (
        <View style={styles.footer}>
            <TouchableOpacity
                style={styles.footerButton}
                onPress={() => router.push("/")}
            >
                <Text style={styles.footerButtonText}>Activities</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.footerButton}
                onPress={() => router.push("/timer")}
            >
                <Text style={styles.footerButtonText}>Timeline</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.footerButton}
                onPress={() => router.push("/weekly")}
            >
                <Text style={styles.footerButtonText}>Weekly</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.footerButton}
                onPress={() => router.push("/monthly")}
            >
                <Text style={styles.footerButtonText}>Monthly</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    footer: {
        flexDirection: "row",
        backgroundColor: "#F5F5F5",
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    footerButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    footerButtonText: {
        fontSize: 12,
        color: "#000000",
        fontWeight: "600",
    },
});
