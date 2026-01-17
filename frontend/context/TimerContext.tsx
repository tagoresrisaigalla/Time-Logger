import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";

interface TimerContextType {
    activityName: string;
    setActivityName: (name: string) => void;
    startTime: number | null;
    setStartTime: (time: number | null) => void;
    isRunning: boolean;
    setIsRunning: (running: boolean) => void;
    activeActivityId: string | null;
    setActiveActivityId: (id: string | null) => void;
    elapsedMs: number;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
    const [activityName, setActivityName] = useState("");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
    const [, forceUpdate] = useState(0);
    const elapsedMs = isRunning && startTime ? Date.now() - startTime : 0;


    React.useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            forceUpdate(prev => prev + 1);
        }, 100);
        return () => clearInterval(interval);
    }, [isRunning]);

    return (
        <TimerContext.Provider
            value={{
                activityName,
                setActivityName,
                startTime,
                setStartTime,
                isRunning,
                setIsRunning,
                activeActivityId,
                setActiveActivityId,
                elapsedMs,
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
