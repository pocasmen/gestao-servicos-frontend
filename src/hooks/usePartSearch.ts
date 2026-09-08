import { useState, useCallback, useRef } from 'react';
import apiClient from '../apiClient';
import { PartItem } from '../types';

export const usePartSearch = () => {
    const [searchResults, setSearchResults] = useState<PartItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const searchParts = useCallback((query: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!query || query.trim().length < 3) {
            setSearchResults([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                // The backend endpoint GET /api/inventory accepts a 'search' query param
                const response = await apiClient.get(`/api/inventory?search=${encodeURIComponent(query.trim())}&limit=15&view=all_search`);
                
                // inventory.controller.ts returns { data: [...], pagination: {...} }
                const parts = response.data.data || [];
                setSearchResults(parts);
            } catch (error) {
                console.error('Error searching parts:', error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 400);
    }, []);

    const clearResults = useCallback(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        setSearchResults([]);
    }, []);

    return { searchResults, isLoading, searchParts, clearResults };
};
