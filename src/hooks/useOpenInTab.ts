/**
 * useOpenInTab - Hook to open forms as tabs
 * 
 * Provides a simple interface for opening templates/instances
 * as tabs from anywhere in the app.
 */
import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTabsStore } from '../store/tabsStore';

import { useToastStore } from '../store/toastStore';

interface OpenInTabOptions {
    navigateToTab?: boolean;  // Whether to navigate after opening
    returnPath?: string;      // Specific path to return to
}

export const useOpenInTab = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { openTab, switchTab, getTabByFormId, activeTabId } = useTabsStore();
    const { addToast } = useToastStore();

    /**
     * Open a template for creating a new report
     */
    const openTemplateForEntry = useCallback((
        templateId: string,
        templateName: string,
        options: OpenInTabOptions = { navigateToTab: true }
    ) => {
        const path = `/reports/new/${templateId}`;
        const returnPath = options.returnPath || location.pathname + location.search;
        const tabId = openTab('instance', templateId, templateName, path, returnPath);

        if (!tabId) {
            addToast({
                title: 'تنبيه',
                message: 'لا يمكن فتح المزيد من التبويبات. يرجى إغلاق بعض التبويبات المفتوحة أولاً.',
                type: 'warning',
            });
            return '';
        }

        if (options.navigateToTab) {
            navigate(`/reports/new/${templateId}`);
        }

        return tabId;
    }, [openTab, navigate]);

    /**
     * Open an existing instance/report for viewing or editing
     */
    const openInstanceForEdit = useCallback((
        instanceId: string,
        instanceName: string,
        options: OpenInTabOptions = { navigateToTab: true }
    ) => {
        const path = `/reports/view/${instanceId}`;
        const returnPath = options.returnPath || location.pathname + location.search;
        const tabId = openTab('instance', instanceId, instanceName, path, returnPath);

        if (options.navigateToTab && tabId) {
            navigate(`/reports/view/${instanceId}`);
        }

        return tabId;
    }, [openTab, navigate]);

    /**
     * Open a template for editing its design
     */
    const openTemplateForEdit = useCallback((
        templateId: string,
        templateName: string,
        options: OpenInTabOptions = { navigateToTab: true }
    ) => {
        const path = `/forms/edit/${templateId}`;
        const returnPath = options.returnPath || location.pathname + location.search;
        const tabId = openTab('template', templateId, `تحرير: ${templateName}`, path, returnPath);

        if (options.navigateToTab && tabId) {
            navigate(`/forms/edit/${templateId}`);
        }

        return tabId;
    }, [openTab, navigate]);

    /**
     * Check if a form is already open in a tab
     */
    const isFormOpen = useCallback((formId: string): boolean => {
        return !!getTabByFormId(formId);
    }, [getTabByFormId]);

    /**
     * Switch to an existing tab for a form
     */
    const focusForm = useCallback((formId: string): boolean => {
        const tab = getTabByFormId(formId);
        if (tab) {
            switchTab(tab.id);
            navigate(tab.path);
            return true;
        }
        return false;
    }, [getTabByFormId, switchTab, navigate]);

    return {
        openTemplateForEntry,
        openInstanceForEdit,
        openTemplateForEdit,
        isFormOpen,
        focusForm,
    };
};

export default useOpenInTab;
