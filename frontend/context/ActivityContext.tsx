import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Activity } from "../types/Activity";

interface ActivityContextType {
    activities: Activity[];
    addActivity: (name: string) => void;
    renameActivity: (id: string, newName: string) => void;
    deleteActivity: (id: string) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function ActivityProvider({ children }: { children: ReactNode }) {
    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {
        const loadActivities = async () => {
            try {
                const data = await AsyncStorage.getItem("activities");
                if (data) {
                    setActivities(JSON.parse(data));
                }
            } catch (error) {
                // Silent failure
            }
        };
        loadActivities();
    }, []);

    useEffect(() => {
        const saveActivities = async () => {
            try {
                await AsyncStorage.setItem("activities", JSON.stringify(activities));
            } catch (error) {
                // Silent failure
            }
        };
        saveActivities();
    }, [activities]);

    const addActivity = (name: string) => {
        const newActivity: Activity = {
            id: Date.now().toString(),
            name,
            createdAt: Date.now(),
        };
        setActivities((prev) => [...prev, newActivity]);
    };

    const renameActivity = (id: string, newName: string) => {
        setActivities((prev) =>
            prev.map((activity) =>
                activity.id === id ? { ...activity, name: newName } : activity
            )
        );
    };

    const deleteActivity = (id: string) => {
        setActivities((prev) => prev.filter((activity) => activity.id !== id));
    };

    return (
        <ActivityContext.Provider
            value={{
                activities,
                addActivity,
                renameActivity,
                deleteActivity,
            }}
        >
            {children}
        </ActivityContext.Provider>
    );
}

export function useActivity() {
    const context = useContext(ActivityContext);
    if (context === undefined) {
        throw new Error("useActivity must be used within an ActivityProvider");
    }
    return context;
}
