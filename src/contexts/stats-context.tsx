import React, { createContext, PropsWithChildren, useContext, useState } from 'react';
import { StatDTO, AggregatedStatsDTO } from '@/data/dto';
import { AggregatedStatsResponse, AggregateStatResponse, StatApiClient } from '@/data/client/stat-api-client';
import { DatabaseContext } from './db-context';
import { SaaSContext } from './saas-context';


export type StatsContextType = {
    statsPopupOpen: boolean;
    setStatsPopupOpen: (open: boolean) => void;
    aggregateStats: (newItem: StatDTO) => Promise<StatDTO>;
    aggregatedStats: () => Promise<AggregatedStatsDTO>;
};

// Create the chat context
export const StatsContext = createContext<StatsContextType>({
    statsPopupOpen: false,
    setStatsPopupOpen: (open: boolean) => {},
    aggregateStats: async (newItem) => { return Promise.resolve(newItem); },
    aggregatedStats: async () => { return Promise.resolve({} as AggregatedStatsDTO); }

});

// Custom hook to access the chat context
export const useStatsContext = () => useContext(StatsContext);

// Chat context provider component
export const StatsContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
    
    const [statsPopupOpen, setStatsPopupOpen] = useState(false);
    const [lastRequestStat, setLastRequestStat] = useState<StatDTO | null>(null);

    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);


    const aggregatedStats = async (): Promise<AggregatedStatsDTO> => {
        const apiClient = new StatApiClient('', dbContext, saasContext, { useEncryption: false });
        const aggregatedStats = await apiClient.aggregated() as AggregatedStatsResponse;
        if (aggregatedStats.status === 200) {
            console.log('Stats this and last month: ', aggregatedStats);
            return aggregatedStats.data;
        } else {
            throw new Error(aggregatedStats.message)
        }
    }

    const aggregateStats = async (newItem: StatDTO): Promise<StatDTO> => {
        const apiClient = new StatApiClient('', dbContext, saasContext, { useEncryption: false });
        const aggregatedStats = await apiClient.aggregate(newItem) as AggregateStatResponse;
        if (aggregatedStats.status === 200) {
            console.log('Stats aggregated', aggregatedStats);
            setLastRequestStat(aggregatedStats.data);
            if (saasContext.userId) await saasContext.loadSaaSContext(''); // bc. this loads the current usage
            return aggregatedStats.data;
        } else {
            throw new Error(aggregatedStats.message)
        }
    }

    const value = { 
        statsPopupOpen,
        setStatsPopupOpen,
        aggregateStats,
        lastRequestStat,
        aggregatedStats,
    }

    return (
        <StatsContext.Provider value={value}>
            {children}
        </StatsContext.Provider>
    );
};

