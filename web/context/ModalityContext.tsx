'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Imports from shared utility
import { MODALITY_OPTIONS, getModalityCode, matchModality } from '../utils/modality';
export { MODALITY_OPTIONS, getModalityCode, matchModality };

interface ModalityContextType {
    selectedModality: string;
    setSelectedModality: (modality: string) => void;
    getModalityLabel: () => string;
}

const ModalityContext = createContext<ModalityContextType | undefined>(undefined);

export function ModalityProvider({ children }: { children: ReactNode }) {
    const [selectedModality, setSelectedModality] = useState<string>('ampla');

    const getModalityLabel = () => {
        const option = MODALITY_OPTIONS.find(o => o.code === selectedModality);
        return option?.shortName || 'Ampla';
    };

    return (
        <ModalityContext.Provider value={{ selectedModality, setSelectedModality, getModalityLabel }}>
            {children}
        </ModalityContext.Provider>
    );
}

export function useModality() {
    const context = useContext(ModalityContext);
    if (context === undefined) {
        throw new Error('useModality must be used within a ModalityProvider');
    }
    return context;
}
