'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook for refreshing the page data with ISR
 * @returns Object with refresh function and loading state
 */
export function useISRRefresh() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const router = useRouter();

    // Function to refresh the current page
    const refreshData = async () => {
        setIsRefreshing(true);

        try {
            // Tell Next.js to revalidate the page
            await fetch('/api/revalidate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: window.location.pathname,
                }),
            });

            // Refresh the router
            router.refresh();
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return { refreshData, isRefreshing };
} 
