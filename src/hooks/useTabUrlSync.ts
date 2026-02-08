/**
 * useTabUrlSync - URL Synchronization Hook for Tabs
 * 
 * Syncs active tab with URL query parameters:
 * - On mount: reads ?tab=xxx from URL, switches to that tab
 * - On tab switch: updates URL with new tab ID
 * - Supports deep linking to specific tabs
 */

import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTabsStore } from '../store/tabsStore';

interface UseTabUrlSyncOptions {
    /** Enable debug logging */
    debug?: boolean;
    /** URL parameter name for tab ID */
    paramName?: string;
    /** Auto-navigate to tab's path on URL tab switch */
    autoNavigate?: boolean;
}

/**
 * Hook to synchronize tabs system with URL
 */
export function useTabUrlSync(options: UseTabUrlSyncOptions = {}) {
    const {
        debug = import.meta.env.DEV,
        paramName = 'tab',
        autoNavigate = true
    } = options;

    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const {
        activeTabId,
        tabs,
        switchTab,
        getTab,
        getActiveTab
    } = useTabsStore();

    // Prevent infinite loops
    const isUpdatingFromUrl = useRef(false);
    const isUpdatingUrl = useRef(false);
    const lastSyncedTabId = useRef<string | null>(null);

    const log = useCallback((...args: any[]) => {
        if (debug) {
            console.log('[TabUrlSync]', ...args);
        }
    }, [debug]);

    // Read tab from URL on mount and when URL changes
    useEffect(() => {
        if (isUpdatingUrl.current) return;

        const urlTabId = searchParams.get(paramName);

        if (urlTabId && urlTabId !== activeTabId) {
            const tab = getTab(urlTabId);

            if (tab) {
                log('URL changed, switching to tab:', urlTabId);
                isUpdatingFromUrl.current = true;
                switchTab(urlTabId);

                // Navigate to tab's path if different from current
                if (autoNavigate && tab.path && tab.path !== location.pathname) {
                    log('Navigating to tab path:', tab.path);
                    navigate(tab.path, { replace: true });
                }

                setTimeout(() => {
                    isUpdatingFromUrl.current = false;
                }, 100);
            } else {
                log('Tab not found for ID:', urlTabId);
                // Clean up invalid tab param
                const newParams = new URLSearchParams(searchParams);
                newParams.delete(paramName);
                setSearchParams(newParams, { replace: true });
            }
        }
    }, [searchParams, paramName, getTab, switchTab, navigate, location.pathname, activeTabId, autoNavigate, log, setSearchParams]);

    // Update URL when active tab changes
    useEffect(() => {
        if (isUpdatingFromUrl.current) return;
        if (lastSyncedTabId.current === activeTabId) return;

        isUpdatingUrl.current = true;
        lastSyncedTabId.current = activeTabId;

        const newParams = new URLSearchParams(searchParams);

        if (activeTabId) {
            newParams.set(paramName, activeTabId);
            log('Active tab changed, updating URL:', activeTabId);
        } else {
            newParams.delete(paramName);
            log('No active tab, removing from URL');
        }

        setSearchParams(newParams, { replace: true });

        setTimeout(() => {
            isUpdatingUrl.current = false;
        }, 100);
    }, [activeTabId, paramName, searchParams, setSearchParams, log]);

    // Create deep link URL for a specific tab
    const getTabDeepLink = useCallback((tabId: string): string => {
        const tab = getTab(tabId);
        if (!tab) return window.location.href;

        const url = new URL(window.location.origin + tab.path);
        url.searchParams.set(paramName, tabId);
        return url.toString();
    }, [getTab, paramName]);

    // Copy deep link to clipboard
    const copyTabDeepLink = useCallback(async (tabId: string): Promise<boolean> => {
        try {
            const link = getTabDeepLink(tabId);
            await navigator.clipboard.writeText(link);
            log('Copied deep link:', link);
            return true;
        } catch (err) {
            console.error('Failed to copy deep link:', err);
            return false;
        }
    }, [getTabDeepLink, log]);

    // Navigate to a tab (update URL and switch)
    const navigateToTab = useCallback((tabId: string) => {
        const tab = getTab(tabId);
        if (!tab) return;

        switchTab(tabId);
        if (tab.path && tab.path !== location.pathname) {
            navigate(tab.path);
        }
    }, [getTab, switchTab, navigate, location.pathname]);

    return {
        /** Current active tab ID from store */
        activeTabId,
        /** All open tabs */
        tabs,
        /** Active tab object */
        activeTab: getActiveTab(),
        /** Get deep link URL for a tab */
        getTabDeepLink,
        /** Copy deep link to clipboard */
        copyTabDeepLink,
        /** Navigate to a specific tab */
        navigateToTab,
    };
}

export default useTabUrlSync;
