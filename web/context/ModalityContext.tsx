'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Imports from shared utility
import {
    MODALITY_OPTIONS,
    getModalityAlias,
    getModalityCode,
    matchModality,
} from '../utils/modality';
export { MODALITY_OPTIONS, getModalityCode, matchModality };

interface ModalityContextType {
    selectedModality: string;
    setSelectedModality: (modality: string) => void;
    getModalityLabel: () => string;
}

const ModalityContext = createContext<ModalityContextType | undefined>(undefined);

export function ModalityProvider({ children }: { children: ReactNode }) {
    const [selectedModality, setSelectedModality] = useState<string>('');

    const getModalityLabel = () => {
        const alias = getModalityAlias(selectedModality);
        const option = MODALITY_OPTIONS.find(o => o.code === alias);
        return option?.shortName || 'Modalidade selecionada';
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
