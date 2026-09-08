import React, { createContext, useState, useEffect } from 'react';

export interface ClientCompany {
    id: number;
    name: string;
    nif?: string;
    address?: string;
    is_blacklisted?: boolean;
    blacklist_reason?: string;
}

interface ActiveClientContextType {
    activeClient: ClientCompany | null;
    setActiveClient: (client: ClientCompany | null) => void;
}

export const ActiveClientContext = createContext<ActiveClientContextType>({
    activeClient: null,
    setActiveClient: () => { },
});

export const ActiveClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeClient, setActiveClientState] = useState<ClientCompany | null>(() => {
        const saved = localStorage.getItem('activeClient');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    const setActiveClient = (client: ClientCompany | null) => {
        setActiveClientState(client);
        if (client) {
            localStorage.setItem('activeClient', JSON.stringify(client));
        } else {
            localStorage.removeItem('activeClient');
        }
    };

    return (
        <ActiveClientContext.Provider value={{ activeClient, setActiveClient }}>
            {children}
        </ActiveClientContext.Provider>
    );
};
