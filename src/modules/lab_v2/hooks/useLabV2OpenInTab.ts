import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabsStore } from '../../../store/tabsStore';
import { useToastStore } from '../../../store/toastStore';

interface OpenInTabOptions {
  navigateToTab?: boolean;
  returnPath?: string;
}

export function useLabV2OpenInTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openTab } = useTabsStore();
  const { addToast } = useToastStore();

  const openTestRunInTab = useCallback(
    (runId: string, runNumber: string, options: OpenInTabOptions = { navigateToTab: true }) => {
      const path = `/lab/tests/runs/${runId}`;
      const returnPath = options.returnPath || location.pathname + location.search;
      const tabId = openTab('instance', runId, `فحص: ${runNumber}`, path, returnPath);

      if (!tabId) {
        addToast({
          title: 'تنبيه',
          message: 'لا يمكن فتح المزيد من التبويبات. يرجى إغلاق بعض التبويبات أولاً.',
          type: 'warning',
        });
        return '';
      }

      if (options.navigateToTab) {
        navigate(path);
      }

      return tabId;
    },
    [openTab, addToast, navigate, location.pathname, location.search]
  );

  return { openTestRunInTab };
}
