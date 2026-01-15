import React, { createContext, useContext, useState, ReactNode } from "react";

interface TimerContextType {
    activityName: string;
    setActivityName: (name: string) => void;
    startTime: number | null;
    setStartTime: (time: number | null) => void;
    isRunning: boolean;
    setIsRunning: (running: boolean) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
    const [activityName, setActivityName] = useState("");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    return (
        <TimerContext.Provider
            value={{
                activityName,
                setActivityName,
                startTime,
                setStartTime,
                isRunning,
                setIsRunning,
            }}
        >
            {children}
        </TimerContext.Provider>
    );
}

export function useTimer() {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error("useTimer must be used within a TimerProvider");
    }
    return context;
}
