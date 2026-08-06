'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    calculateWeightedScore,
    CourseWeights,
    DEFAULT_SCORES,
    isValidScore,
    readPersistedScores,
    SCORE_STORAGE_KEY,
    ScoreSubject,
    Scores,
    serializePersistedScores,
    validateScores,
} from '../lib/score-core';

interface ScoreContextType {
    scores: Scores;
    hasScores: boolean;
    setScore: (subject: ScoreSubject, value: number) => boolean;
    setScores: (scores: Scores) => boolean;
    clearScores: () => void;
    rememberScores: boolean;
    setRememberScores: (remember: boolean) => void;
    calculateAverage: (weights: CourseWeights | null | undefined) => number;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

function createDefaultScores(): Scores {
    return { ...DEFAULT_SCORES };
}

function removePersistedScores(): void {
    try {
        localStorage.removeItem(SCORE_STORAGE_KEY);
    } catch {
        // Storage can be unavailable in private/restricted browser contexts.
    }
}

export function ScoreProvider({ children }: { children: ReactNode }) {
    const [scores, setScoresState] = useState<Scores>(createDefaultScores);
    const [hasScores, setHasScores] = useState(false);
    const [rememberScores, setRememberScoresState] = useState(false);

    useEffect(() => {
        try {
            const stored = readPersistedScores(localStorage.getItem(SCORE_STORAGE_KEY));
            if (stored.status === 'valid') {
                setScoresState(stored.scores);
                setHasScores(true);
                setRememberScoresState(true);
            } else if (stored.status !== 'empty') {
                removePersistedScores();
            }
        } catch {
            removePersistedScores();
        }
    }, []);

    const persistScores = (scoresToPersist: Scores): void => {
        try {
            localStorage.setItem(SCORE_STORAGE_KEY, serializePersistedScores(scoresToPersist));
        } catch {
            // Scores remain available in memory even when storage is unavailable.
        }
    };

    const setScore = (subject: ScoreSubject, value: number): boolean => {
        if (!isValidScore(value)) return false;
        const nextScores = { ...scores, [subject]: value };
        setScoresState(nextScores);
        setHasScores(true);
        if (rememberScores) persistScores(nextScores);
        return true;
    };

    const setScores = (newScores: Scores): boolean => {
        const validation = validateScores(newScores);
        if (!validation.valid) return false;
        setScoresState(validation.scores);
        setHasScores(true);
        if (rememberScores) persistScores(validation.scores);
        return true;
    };

    const setRememberScores = (remember: boolean): void => {
        setRememberScoresState(remember);
        if (remember) {
            persistScores(scores);
        } else {
            removePersistedScores();
        }
    };

    const clearScores = (): void => {
        setScoresState(createDefaultScores());
        setHasScores(false);
        setRememberScoresState(false);
        removePersistedScores();
    };

    const calculateAverage = (weights: CourseWeights | null | undefined): number => {
        return calculateWeightedScore(scores, weights).average ?? 0;
    };

    return (
        <ScoreContext.Provider value={{
            scores,
            hasScores,
            setScore,
            setScores,
            clearScores,
            rememberScores,
            setRememberScores,
            calculateAverage,
        }}>
            {children}
        </ScoreContext.Provider>
    );
}

export function useScores(): ScoreContextType {
    const context = useContext(ScoreContext);
    if (context === undefined) {
        throw new Error('useScores must be used within a ScoreProvider');
    }
    return context;
}

export type { CourseWeights, Scores } from '../lib/score-core';
