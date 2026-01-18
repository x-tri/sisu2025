'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Scores {
    redacao: number;
    linguagens: number;
    humanas: number;
    natureza: number;
    matematica: number;
}

interface ScoreContextType {
    scores: Scores;
    setScore: (subject: keyof Scores, value: number) => void;
    setScores: (scores: Scores) => void;
    calculateAverage: (weights: any) => number;
}

const defaultScores: Scores = {
    redacao: 0,
    linguagens: 0,
    humanas: 0,
    natureza: 0,
    matematica: 0,
};

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export function ScoreProvider({ children }: { children: ReactNode }) {
    const [scores, setScoresState] = useState<Scores>(defaultScores);

    useEffect(() => {
        const saved = localStorage.getItem('sisu_scores');
        if (saved) {
            try {
                setScoresState(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse scores", e);
            }
        }
    }, []);

    const setScore = (subject: keyof Scores, value: number) => {
        setScoresState(prev => {
            const newScores = { ...prev, [subject]: value };
            localStorage.setItem('sisu_scores', JSON.stringify(newScores));
            return newScores;
        });
    };

    const setScores = (newScores: Scores) => {
        localStorage.setItem('sisu_scores', JSON.stringify(newScores));
        setScoresState(newScores);
    };

    const calculateAverage = (weights: any) => {
        // Weights keys from DB: peso_red, peso_ling, peso_mat, peso_ch, peso_cn
        // Scores keys: redacao, linguagens, matematica, humanas, natureza

        if (!weights) return 0;

        const red = (scores.redacao * (weights.peso_red || 1));
        const ling = (scores.linguagens * (weights.peso_ling || 1));
        const mat = (scores.matematica * (weights.peso_mat || 1));
        const ch = (scores.humanas * (weights.peso_ch || 1));
        const cn = (scores.natureza * (weights.peso_cn || 1));

        const totalWeight = (weights.peso_red || 1) + (weights.peso_ling || 1) +
            (weights.peso_mat || 1) + (weights.peso_ch || 1) + (weights.peso_cn || 1);

        return (red + ling + mat + ch + cn) / totalWeight;
    };

    return (
        <ScoreContext.Provider value={{ scores, setScore, setScores, calculateAverage }}>
            {children}
        </ScoreContext.Provider>
    );
}

export function useScores() {
    const context = useContext(ScoreContext);
    if (context === undefined) {
        throw new Error('useScores must be used within a ScoreProvider');
    }
    return context;
}
