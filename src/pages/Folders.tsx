import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
    DocumentPlusIcon,
    FolderIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    ListBulletIcon,
    Squares2X2Icon,
    MagnifyingGlassIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    HomeIcon,
    ArrowUpIcon,
    PencilIcon,
    DocumentDuplicateIcon,
    FolderPlusIcon,
    ScissorsIcon,
    ClipboardIcon,
    FolderArrowDownIcon,
    TagIcon,
    ArchiveBoxIcon,
    ShareIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    PencilSquareIcon,
    ClockIcon,
    CheckBadgeIcon,
    XCircleIcon,
    PlayIcon,
    EyeIcon,
    Bars3Icon,
    XMarkIcon,
    NoSymbolIcon,
    ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { TableSkeleton } from '../components/common/LoadingStates';
import useStore from '../store';
import { cn, formatDate, generateId } from '../utils';
import FolderDialog from '../components/folders/FolderDialog';
import SortDropdown from '../components/folders/SortDropdown';
import type { SortField, SortDirection } from '../components/folders/SortDropdown';
import FilterPanel, { DEFAULT_FILTER_STATE, ActiveFiltersChips } from '../components/folders/FilterPanel';
import type { FilterState } from '../components/folders/FilterPanel';
import AdvancedSearch from '../components/search/AdvancedSearch';
import type { Folder, FormTemplate, FormInstance } from '../types';
import { useLanguageStore, getDisplayName } from '../store/languageStore';
// Services removed - using unified folders system
import ListView from '../components/folders/ListView';
import DetailsView from '../components/folders/DetailsView';
import BulkActionsToolbar from '../components/folders/BulkActionsToolbar';
import { useSelection } from '../hooks/useSelection';
import QuickAccessSidebar, { loadRecentItems, saveRecentItem } from '../components/folders/QuickAccessSidebar';
import KeyboardShortcutsHelp from '../components/folders/KeyboardShortcutsHelp';
import { useKeyboardShortcuts, type KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import SmartSuggestionsPanel, { generateSuggestions } from '../components/folders/SmartSuggestionsPanel';
import ContextMenu, {
    getFolderMenuItems,
    getTemplateMenuItems,
    getInstanceMenuItems,
    getEmptyAreaMenuItems,
    getTemplatesAreaMenuItems,
    getReportsAreaMenuItems,
    type ContextMenuItem
} from '../components/folders/ContextMenu';
import Breadcrumb, { type BreadcrumbSegment } from '../components/folders/Breadcrumb';
import { useUndoRedo, type UndoableAction, type ActionType } from '../hooks/useUndoRedo';
import { useExplorerPermissions } from '../hooks/useExplorerPermissions';
import * as recycleBinService from '../services/recycleBinService';
import type { RecycleBinItem } from '../services/recycleBinService';
import { foldersService } from '../services/supabaseService';
import { useOpenInTab } from '../hooks/useOpenInTab';
import { useNavigationHistory } from '../hooks/useNavigationHistory';
import { useFormsDataIsolation } from '../hooks/useDataIsolation';
import useLocalStorage from '../hooks/useLocalStorage';
import { exportTemplateBackupFile, parseTemplateBackupFile } from '../services/templateBackupService';

type ViewMode = 'grid' | 'list' | 'details';
type MobileContentFilter = 'all' | 'forms' | 'reports';

const FoldersPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { folderId: paramFolderId } = useParams<{ folderId: string }>();
    const {
        folders,
        formTemplates,
        formInstances,
        currentFolderId,
        lastFormsFolderId,
        lastReportsFolderId,
        setCurrentFolder,
        setLastFormsFolder,
        setLastReportsFolder,
        getTemplatesInFolder,
        getInstancesInFolder,
        getFolderChildren,
        deleteFormTemplate,
        deleteFormInstance,
        deleteFolder,
        copyFolder,
        moveFolder,
        duplicateFormTemplate,
        moveFormTemplate,
        moveFormInstance,
        addFolder,
        addFormTemplate,
        addFormInstance,
        updateFolder,
        updateFormTemplate,
        updateFormInstance,
        archiveFolder,
        archiveFormTemplate,
        archiveFormInstance,
        user,
    } = useStore();

    const { displayLanguage } = useLanguageStore();

    const explorerBasePath = useMemo(
        () => (location.pathname.startsWith('/forms&reports') ? '/forms&reports' : '/folders'),
        [location.pathname]
    );

    const navigateToFolder = useCallback(
        (folderId: string | null, options?: { replace?: boolean }) => {
            if (!folderId) {
                navigate(explorerBasePath, { replace: options?.replace ?? false });
                return;
            }
            navigate(`${explorerBasePath}/${folderId}`, { replace: options?.replace ?? false });
        },
        [navigate, explorerBasePath]
    );

    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

    // Enhanced context menu state
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: 'folder' | 'template' | 'instance' | 'empty' | 'templates-area' | 'reports-area';
        item?: any;
    } | null>(null);
    const templateImportInputRef = useRef<HTMLInputElement | null>(null);
    const [isTemplateImporting, setIsTemplateImporting] = useState(false);

    // Persist view mode to localStorage so it survives page refresh
    const [viewMode, setViewMode] = useLocalStorage<ViewMode>('folders-view-mode', 'grid');
    const [isMobile, setIsMobile] = useState(false);
    const [mobileContentFilter, setMobileContentFilter] = useState<MobileContentFilter>('all');
    const [showFolderDialog, setShowFolderDialog] = useState(false);
    const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
    const [parentIdForNewFolder, setParentIdForNewFolder] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Sort and Filter State
    const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
        field: 'created_at',
        direction: 'desc'
    });
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

    // Bulk Selection State
    const selection = useSelection<string>();
    const { selectedItems, toggle: toggleSelection, deselectAll, isSelected, selectedCount } = selection;

    // Permissions
    const {
        canCreateFolder, canDeleteFolder, canMoveFolder,
        canCreateTemplate, canDeleteTemplate, canMoveTemplate, canDuplicateTemplate,
        canDeleteInstance, canMoveInstance,
        canCut, canCopy, canPaste: canPastePermission,
        isAdmin, loading: permissionsLoading
    } = useExplorerPermissions();

    // Quick Access & Sidebar State
    const [showQuickAccess, setShowQuickAccess] = useState(false);
    const [recentItems, setRecentItems] = useState<any[]>([]);
    const [favoriteItems, setFavoriteItems] = useState<any[]>([]);

    // Keyboard Shortcuts Help
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

    // Smart Suggestions
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(true);

    // Enhanced clipboard state with source folder tracking
    const [clipboard, setClipboard] = useState<{
        type: 'cut' | 'copy';
        items: string[];
        sourceFolder: string | null;
        itemTypes: Map<string, 'folder' | 'template' | 'instance'>;
    } | null>(null);

    // Undo/Redo support
    const {
        canUndo,
        canRedo,
        addAction,
        getUndoAction,
        getRedoAction,
        markUndone,
        markRedone,
        clearHistory: clearUndoHistory
    } = useUndoRedo({
        userId: user?.id || 'anonymous',
        sessionId: sessionStorage.getItem('sessionId') || Date.now().toString()
    });

    // Recycle bin settings
    const [recycleBinEnabled] = useState(true);
    const [recycleBinItems, setRecycleBinItems] = useState<RecycleBinItem[]>([]);

    // Load recycle bin items on mount
    useEffect(() => {
        recycleBinService.getRecycleBinItems().then(setRecycleBinItems);
    }, []);

    const { openTemplateForEntry, openInstanceForEdit, openDraftForEdit } = useOpenInTab();

    // Navigation History for Back/Forward navigation
    const {
        navigate: navHistoryNavigate,
        goBack: navGoBack,
        goForward: navGoForward,
        canGoBack,
        canGoForward,
        updateCurrentState: updateNavState,
        getScrollPosition,
        getSelectedItems,
    } = useNavigationHistory();

    // Load recent items on mount
    useEffect(() => {
        setRecentItems(loadRecentItems());
    }, []);

    // Responsive mode for mobile-first UX on forms & reports explorer
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(max-width: 1023px)');
        const updateViewport = () => setIsMobile(mediaQuery.matches);

        updateViewport();
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', updateViewport);
        } else {
            mediaQuery.addListener(updateViewport);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', updateViewport);
            } else {
                mediaQuery.removeListener(updateViewport);
            }
        };
    }, []);

    useEffect(() => {
        if (!isMobile) {
            setShowQuickAccess(false);
            setMobileContentFilter('all');
            return;
        }

        // List mode is dense on small screens; details mode is easier for data-entry users.
        if (viewMode === 'list') {
            setViewMode('details');
        }
    }, [isMobile, viewMode, setViewMode]);

    // Combined Forms & Reports Page - unified view
    // Legacy flags kept for component compatibility but set to show all content
    const isFormsPage = true;  // Always true - we show forms
    const isReportsPage = true; // Always true - we also show reports

    // Load folders on mount
    useEffect(() => {
        console.log('📁 [Folders] Loading folders...');
        console.log('✅ [Folders] Using folders from store:', Object.keys(folders).length);
    }, [folders, location.pathname]);

    // ✅ FIX: Lazy-load folder contents so users always see their templates/reports
    const { syncFolder, syncTemplate, syncInstance } = useStore();
    const loadedFolderContentRef = useRef<Set<string>>(new Set());
    const loadingFolderContentRef = useRef<Set<string>>(new Set());

    // ✅ FIX: Load child folders when entering a folder
    // progressiveLoader only loads root folders, so we need to lazy-load children
    useEffect(() => {
        const loadChildFolders = async () => {
            if (!currentFolderId) return; // Skip for root
            if (currentFolderId === '__archive__' || currentFolderId === '__recycle_bin__') return; // Skip virtual folders

            console.log('📂 [Folders] Loading child folders for:', currentFolderId);
            try {
                const { progressiveLoader } = await import('../services/progressiveLoader');
                const children = await progressiveLoader.loadFolderChildren(currentFolderId);

                if (children && children.length > 0) {
                    console.log(`✅ [Folders] Loaded ${children.length} child folders`);
                    // Add each child folder to the store
                    children.forEach(folder => {
                        syncFolder(folder);
                    });
                }
            } catch (error) {
                console.error('❌ [Folders] Error loading child folders:', error);
            }
        };

        loadChildFolders();
    }, [currentFolderId, syncFolder]);

    useEffect(() => {
        if (currentFolderId === '__archive__' || currentFolderId === '__recycle_bin__') {
            return;
        }

        const folderKey = currentFolderId ?? '__root__';
        if (loadedFolderContentRef.current.has(folderKey) || loadingFolderContentRef.current.has(folderKey)) {
            return;
        }

        let cancelled = false;
        loadingFolderContentRef.current.add(folderKey);

        const loadFolderContent = async () => {
            try {
                console.log('📦 [Folders] Loading folder content:', folderKey);
                const { progressiveLoader } = await import('../services/progressiveLoader');
                const [templateResult, instanceResult] = await Promise.all([
                    progressiveLoader.loadFolderTemplates(currentFolderId, 1, 200),
                    progressiveLoader.loadFolderInstances(currentFolderId, 1, 200),
                ]);

                if (cancelled) {
                    return;
                }

                templateResult.data.forEach((template) => syncTemplate(template));
                instanceResult.data.forEach((instance) => syncInstance(instance));
                loadedFolderContentRef.current.add(folderKey);

                console.log('✅ [Folders] Folder content loaded:', {
                    folderKey,
                    templates: templateResult.data.length,
                    instances: instanceResult.data.length,
                    hasMoreTemplates: templateResult.hasMore,
                    hasMoreInstances: instanceResult.hasMore,
                });

                // If folder contains more than lazy limit, run full sync in background once.
                if (templateResult.hasMore || instanceResult.hasMore) {
                    void useStore.getState().fetchAllData();
                }
            } catch (error) {
                console.error('❌ [Folders] Error loading folder content:', error);
            } finally {
                loadingFolderContentRef.current.delete(folderKey);
            }
        };

        loadFolderContent();

        return () => {
            cancelled = true;
        };
    }, [currentFolderId, syncTemplate, syncInstance]);

    // URL Source of Truth: Sync URL params to Store
    useEffect(() => {
        let cancelled = false;

        // Only if we are on the explorer route
        if (!location.pathname.startsWith('/folders') && !location.pathname.startsWith('/forms&reports')) return;

        if (paramFolderId) {
            // Handle special virtual folders FIRST (before any folder validation)
            const isVirtualFolder = paramFolderId === '__archive__' || paramFolderId === '__recycle_bin__';

            if (isVirtualFolder) {
                // Virtual folder - set it directly, no validation needed
                if (currentFolderId !== paramFolderId) {
                    console.log(`[Folders] Setting virtual folder: ${paramFolderId}`);
                    setCurrentFolder(paramFolderId);
                }
                return;
            }

            // Always trust URL first. This prevents refresh from bouncing to root
            // before progressive loading fetches child folders.
            if (currentFolderId !== paramFolderId) {
                setCurrentFolder(paramFolderId);
            }

            // If folder is not in local cache yet, validate from DB before redirecting.
            if (!folders[paramFolderId]) {
                (async () => {
                    try {
                        const remoteFolder = await foldersService.getFolder(paramFolderId);
                        if (cancelled) return;

                        if (remoteFolder) {
                            syncFolder(remoteFolder);
                            return;
                        }

                        // Truly missing folder (or not accessible) => redirect to root.
                        console.warn(`[Folders] Folder ${paramFolderId} not found in DB, redirecting to root`);
                        navigateToFolder(null, { replace: true });
                    } catch (error) {
                        if (cancelled) return;
                        console.warn(`[Folders] Folder lookup failed for ${paramFolderId}, redirecting to root`, error);
                        navigateToFolder(null, { replace: true });
                    }
                })();
            }
        } else {
            // Root folder (if path is just /folders)
            if (currentFolderId !== null) {
                setCurrentFolder(null);
            }
        }

        return () => {
            cancelled = true;
        };
    }, [paramFolderId, currentFolderId, setCurrentFolder, location.pathname, folders, navigateToFolder, syncFolder]);

    // Restore last folder position (Only if no params and we are visiting for the first time or coming from elsewhere)
    // We only rely on URL now, so this legacy restoration might be conflicting if not careful.
    // If URL is /folders, we might want to default to last folder, BUT that changes the URL.
    // For now, let's trust the URL. If URL is /folders, it means Root.

    // Save current folder (Keep tracking for convenience, but URL is master)
    React.useEffect(() => {
        setLastFormsFolder(currentFolderId);
    }, [currentFolderId]);

    // Use the unified folders system
    const currentFolder = currentFolderId ? folders[currentFolderId] : null;

    // Data Isolation Hook - uses 'folders' table for isolation filtering
    const { userDepartmentIds, isolationMode, canSeeAll } = useFormsDataIsolation('folders');

    // Get children folders (non-archived only) with data isolation
    const childFolders = useMemo(() => {
        let result = Object.values(folders)
            .filter(f => f.parent_id === currentFolderId && !f.archived);

        // Apply data isolation if mode is 'isolated' and user can't see all
        if (isolationMode === 'isolated' && !canSeeAll && userDepartmentIds.length > 0) {
            result = result.filter(f =>
                // Include folders belonging to user's department
                (f.department_id && userDepartmentIds.includes(f.department_id)) ||
                // Also include folders without department_id (system/legacy folders)
                !f.department_id
            );
            console.log('[Folders] Applied isolation filter:', {
                isolationMode,
                userDepartmentIds,
                filteredCount: result.length
            });
        }

        return result;
    }, [folders, currentFolderId, isolationMode, canSeeAll, userDepartmentIds]);

    // Check if viewing special views
    const isArchiveView = currentFolderId === '__archive__';
    const isRecycleBinView = currentFolderId === '__recycle_bin__';
    const isSpecialView = isArchiveView || isRecycleBinView;

    // Recycle Bin items state
    const [recycleBinItemsData, setRecycleBinItemsData] = useState<RecycleBinItem[]>([]);
    const [recycleBinLoading, setRecycleBinLoading] = useState(false);

    // Load recycle bin items when viewing recycle bin
    useEffect(() => {
        if (isRecycleBinView) {
            setRecycleBinLoading(true);
            recycleBinService.getRecycleBinItems()
                .then(items => {
                    setRecycleBinItemsData(items);
                    setRecycleBinLoading(false);
                })
                .catch(err => {
                    console.error('Error loading recycle bin:', err);
                    setRecycleBinLoading(false);
                });
        }
    }, [isRecycleBinView]);

    // Get archived items when viewing archive
    const archivedFolders = useMemo(() => {
        if (!isArchiveView) return [];
        return Object.values(folders).filter(f => f.archived);
    }, [folders, isArchiveView]);

    const archivedTemplates = useMemo(() => {
        if (!isArchiveView) return [];
        return Object.values(formTemplates).filter(t => t.archived);
    }, [formTemplates, isArchiveView]);

    const archivedInstances = useMemo(() => {
        if (!isArchiveView) return [];
        return Object.values(formInstances).filter(i => i.archived);
    }, [formInstances, isArchiveView]);

    // Get templates and instances for current folder (or special views)
    const templates = isArchiveView
        ? archivedTemplates
        : (!isRecycleBinView ? getTemplatesInFolder(currentFolderId) : []);
    const instances = isArchiveView
        ? archivedInstances
        : (!isRecycleBinView ? getInstancesInFolder(currentFolderId) : []);


    // Helper function to check if date is within range
    const isWithinDateRange = (dateStr: string) => {
        if (filters.dateRange === 'all') return true;
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filters.dateRange) {
            case 'today':
                return date >= today;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return date >= yesterday && date < today;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return date >= weekAgo;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setDate(monthAgo.getDate() - 30);
                return date >= monthAgo;
            case 'quarter':
                const quarterAgo = new Date(today);
                quarterAgo.setDate(quarterAgo.getDate() - 90);
                return date >= quarterAgo;
            default:
                return true;
        }
    };

    // Filter and sort templates
    const filteredTemplates = useMemo(() => {
        let result = templates.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            isWithinDateRange(t.created_at)
        );

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortConfig.field) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'ar');
                    break;
                case 'created_at':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'modified_at':
                    comparison = new Date((a as any).modified_at || a.created_at).getTime() - new Date((b as any).modified_at || b.created_at).getTime();
                    break;
                default:
                    comparison = 0;
            }
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [templates, searchQuery, filters, sortConfig]);

    // Filter and sort instances (reports)
    const filteredInstances = useMemo(() => {
        let result = instances.filter(i => {
            const template = formTemplates[i.template_id];
            const matchesSearch = template?.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDate = isWithinDateRange(i.created_at);
            const matchesStatus = filters.status.length === 0 || filters.status.includes(i.status);

            return matchesSearch && matchesDate && matchesStatus;
        });

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortConfig.field) {
                case 'name':
                    const nameA = formTemplates[a.template_id]?.name || '';
                    const nameB = formTemplates[b.template_id]?.name || '';
                    comparison = nameA.localeCompare(nameB, 'ar');
                    break;
                case 'created_at':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'modified_at':
                    comparison = new Date((a as any).modified_at || a.created_at).getTime() - new Date((b as any).modified_at || b.created_at).getTime();
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                default:
                    comparison = 0;
            }
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [instances, formTemplates, searchQuery, filters, sortConfig]);

    // Filter and sort folders - match order with corresponding templates
    const displayFolders = useMemo(() => {
        // Use archived folders when in archive view, otherwise use childFolders
        const sourceFolders = isArchiveView ? archivedFolders : childFolders;

        let result = sourceFolders.filter(f =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            isWithinDateRange(f.created_at)
        );

        // Helper to get corresponding template name from folder name
        const getCorrespondingTemplateName = (folderName: string): string => {
            // Convert "تقارير منتج X" to "نموذج منتج X"
            if (folderName.startsWith('تقارير منتج ')) {
                return folderName.replace('تقارير منتج ', 'نموذج منتج ');
            }
            return folderName;
        };

        // Sort folders to match template order
        result.sort((a, b) => {
            const templateNameA = getCorrespondingTemplateName(a.name);
            const templateNameB = getCorrespondingTemplateName(b.name);

            // Find index of corresponding template in filtered templates
            const indexA = filteredTemplates.findIndex(t => t.name === templateNameA);
            const indexB = filteredTemplates.findIndex(t => t.name === templateNameB);

            // If both have corresponding templates, sort by template order
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }

            // If only one has a corresponding template, prioritize it
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            // For folders without corresponding templates, use standard sorting
            let comparison = 0;
            switch (sortConfig.field) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'ar');
                    break;
                case 'created_at':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'modified_at':
                    comparison = new Date((a as any).modified_at || a.created_at).getTime() - new Date((b as any).modified_at || b.created_at).getTime();
                    break;
                default:
                    comparison = 0;
            }
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [childFolders, archivedFolders, isArchiveView, searchQuery, filters, sortConfig, filteredTemplates]);

    const showFormsContent = !isMobile || mobileContentFilter !== 'reports';
    const showReportsContent = !isMobile || mobileContentFilter !== 'forms';
    const visibleTemplates = showFormsContent ? filteredTemplates : [];
    const visibleInstances = showReportsContent ? filteredInstances : [];
    const visibleFolders = showReportsContent ? displayFolders : [];
    const visibleItemsCount = visibleFolders.length + visibleTemplates.length + visibleInstances.length;

    // Handler for removing individual filters
    const handleRemoveFilter = (type: 'dateRange' | 'status' | 'tag', value?: string) => {
        if (type === 'dateRange') {
            setFilters({ ...filters, dateRange: 'all' });
        } else if (type === 'status' && value) {
            setFilters({ ...filters, status: filters.status.filter(s => s !== value) });
        } else if (type === 'tag' && value) {
            setFilters({ ...filters, tags: filters.tags.filter(t => t !== value) });
        }
    };

    const handleCreateFolder = (parentId: string | null) => {
        // Import folder utilities inline to avoid circular deps
        import('../utils/folderUtils').then(({ canCreateFolderAtDepth, MAX_FOLDER_DEPTH }) => {
            if (!canCreateFolderAtDepth(parentId, folders)) {
                alert(`لا يمكن إنشاء مجلد جديد: تم الوصول للحد الأقصى للعمق (${MAX_FOLDER_DEPTH} مستويات)`);
                return;
            }
            setParentIdForNewFolder(parentId);
            setEditingFolder(null);
            setShowFolderDialog(true);
        });
    };

    const handleCreateTemplate = () => {
        // Navigate to form designer with folder context
        navigate(`/forms/new${currentFolderId ? `?folderId=${currentFolderId}` : ''}`);
    };

    const getTemplateImportFolderId = useCallback((): string | null => {
        if (!currentFolderId) return null;
        if (currentFolderId === '__archive__' || currentFolderId === '__recycle_bin__') return null;
        return currentFolderId;
    }, [currentFolderId]);

    const buildImportedTemplateName = useCallback((baseName: string, folderId: string): string => {
        const normalizedBaseName = baseName.trim() || 'نموذج مستورد';
        const existingNames = new Set(
            Object.values(formTemplates)
                .filter(t => t.folder_id === folderId && !t.archived)
                .map(t => t.name.trim())
        );

        if (!existingNames.has(normalizedBaseName)) {
            return normalizedBaseName;
        }

        let candidate = `${normalizedBaseName} (مستورد)`;
        let counter = 2;
        while (existingNames.has(candidate)) {
            candidate = `${normalizedBaseName} (مستورد ${counter})`;
            counter += 1;
        }

        return candidate;
    }, [formTemplates]);

    const handleExportTemplate = useCallback((template: FormTemplate) => {
        try {
            exportTemplateBackupFile(template);
        } catch (error) {
            console.error('❌ Failed to export template backup:', error);
            alert('فشل تصدير النموذج. يرجى المحاولة مرة أخرى.');
        }
    }, []);

    const handleToolbarImportClick = useCallback(() => {
        const importFolderId = getTemplateImportFolderId();
        if (!importFolderId) {
            alert('يرجى فتح المجلد الذي تريد استيراد النموذج داخله أولاً.');
            return;
        }
        templateImportInputRef.current?.click();
    }, [getTemplateImportFolderId]);

    const handleTemplateImportFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const importFolderId = getTemplateImportFolderId();
        if (!importFolderId) {
            alert('يرجى فتح المجلد الذي تريد استيراد النموذج داخله أولاً.');
            return;
        }

        setIsTemplateImporting(true);
        try {
            const parsedTemplate = await parseTemplateBackupFile(file);
            const importedTemplate: FormTemplate = {
                ...parsedTemplate,
                id: generateId(),
                name: buildImportedTemplateName(parsedTemplate.name, importFolderId),
                created_at: new Date().toISOString(),
                folder_id: importFolderId,
                unified_folder_id: importFolderId,
                archived: false,
                archived_at: undefined,
                archived_by: undefined,
                custom_properties: parsedTemplate.custom_properties || {},
                sections: parsedTemplate.sections || {},
                version: parsedTemplate.version || 1,
            };

            await addFormTemplate(importedTemplate);
            alert(`تم استيراد النموذج "${importedTemplate.name}" بنجاح.`);
        } catch (error) {
            console.error('❌ Failed to import template backup:', error);
            alert('تعذر استيراد الملف. تأكد أنه ملف نسخة احتياطية صالح للنموذج.');
        } finally {
            setIsTemplateImporting(false);
        }
    }, [addFormTemplate, buildImportedTemplateName, getTemplateImportFolderId]);

    const handleFolderDoubleClick = (folderId: string) => {
        navigateToFolder(folderId);
    };

    const handleGoUp = useCallback(() => {
        if (currentFolder?.parent_id) {
            navigateToFolder(currentFolder.parent_id);
        } else {
            navigateToFolder(null);
        }
    }, [currentFolder, navigateToFolder]);

    // Navigation History handlers for Back/Forward
    // Phase 2 Fix: Use browser-native navigation AND keep useNavigationHistory in sync
    const handleGoBack = useCallback(() => {
        // Use browser history for reliable back navigation
        if (canGoBack) {
            navGoBack(); // Keep hook state in sync
            navigate(-1); // Navigate using browser history
        }
    }, [canGoBack, navGoBack, navigate]);

    const handleGoForward = useCallback(() => {
        // Use browser history for reliable forward navigation
        if (canGoForward) {
            navGoForward(); // Keep hook state in sync
            navigate(1); // Navigate using browser history
        }
    }, [canGoForward, navGoForward, navigate]);

    // Track navigation in history when folder changes (kept for scroll position tracking)
    useEffect(() => {
        navHistoryNavigate(currentFolderId);
    }, [currentFolderId, navHistoryNavigate]);

    // Windows-like Selection Handler
    const handleItemClick = useCallback((id: string, type: 'folder' | 'template' | 'instance', e: React.MouseEvent) => {
        // If modifiers are pressed, handle selection and preventing navigation
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            toggleSelection(id);
            return true; // Handled
        }

        if (e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();

            // Construct the visual order of items for range selection
            const orderedIds = [
                ...displayFolders.map(f => f.id),
                ...filteredTemplates.map(t => t.id),
                ...filteredInstances.map(i => i.instance_id)
            ];

            selection.selectRange(id, orderedIds);
            return true; // Handled
        }

        return false; // Not handled (proceed to navigation)
    }, [displayFolders, filteredTemplates, filteredInstances, toggleSelection, selection]);

    // Bulk Action Handlers with Recycle Bin and Undo support
    const handleBulkDelete = useCallback(async (targetIds?: string[]) => {
        const itemsToDelete = targetIds || Array.from(selectedItems);
        const count = itemsToDelete.length;

        if (count === 0) return;

        // Show confirmation dialog with recycle bin option
        const message = recycleBinEnabled
            ? `هل تريد حذف ${count} عنصر؟\n\nسيتم نقل العناصر إلى سلة المحذوفات ويمكن استعادتها لاحقاً.`
            : `⚠️ هل أنت متأكد من حذف ${count} عنصر نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه.`;

        const confirmed = window.confirm(message);
        if (!confirmed) return;

        let deletedCount = 0;
        let failedCount = 0;
        const deletedItemsData: any[] = [];
        const itemTypesMap = new Map<string, 'folder' | 'template' | 'instance'>();

        // Helper to recursively collect folder contents
        const collectFolderContents = (folderId: string) => {
            const contents: {
                folders: Folder[];
                templates: FormTemplate[];
                instances: FormInstance[];
            } = {
                folders: [],
                templates: [],
                instances: []
            };

            const traverse = (currentId: string) => {
                // Find children folders
                const childFolders = Object.values(folders).filter(f => f.parent_id === currentId);
                childFolders.forEach(child => {
                    contents.folders.push(child);
                    traverse(child.id); // Recurse
                });

                // Find templates in this folder
                const childTemplates = Object.values(formTemplates).filter(t => t.folder_id === currentId);
                contents.templates.push(...childTemplates);

                // Find instances in this folder
                const childInstances = Object.values(formInstances).filter(i => i.folder_id === currentId);
                contents.instances.push(...childInstances);
            };

            traverse(folderId);
            return contents;
        };

        for (const id of itemsToDelete) {
            try {
                // Check if it's a folder
                if (folders[id]) {
                    const folder = folders[id];
                    itemTypesMap.set(id, 'folder');

                    // AUDIT FIX: Always capture item data for undo, not just when recycleBin is enabled
                    // Collect all contents (recursive) - needed for both recycle bin and undo
                    const contents = collectFolderContents(folder.id);

                    if (recycleBinEnabled) {
                        // Move to recycle bin with bundled contents
                        await recycleBinService.addToRecycleBin({
                            id: folder.id,
                            type: 'folder',
                            name: folder.name,
                            path: folder.path,
                            parentId: folder.parent_id,
                            data: {
                                folder: folder,
                                contents: contents
                            },
                        }, user?.id || 'anonymous');
                    }

                    // Always capture for undo history
                    deletedItemsData.push({ ...folder, _contents: contents });

                    await deleteFolder(id);
                    deletedCount++;
                }
                // Check if it's a template
                else if (formTemplates[id]) {
                    const template = formTemplates[id];
                    itemTypesMap.set(id, 'template');

                    if (recycleBinEnabled) {
                        await recycleBinService.addToRecycleBin({
                            id: template.id,
                            type: 'template',
                            name: template.name,
                            parentId: template.folder_id,
                            data: template,
                        }, user?.id || 'anonymous');
                    }

                    // Always capture for undo history
                    deletedItemsData.push(template);

                    await deleteFormTemplate(id);
                    deletedCount++;
                }
                // Check if it's an instance (report)
                else if (formInstances[id]) {
                    const instance = formInstances[id];
                    itemTypesMap.set(id, 'instance');

                    if (recycleBinEnabled) {
                        await recycleBinService.addToRecycleBin({
                            id: instance.instance_id,
                            type: 'instance',
                            name: `تقرير - ${formTemplates[instance.template_id]?.name || 'غير معروف'}`,
                            parentId: instance.folder_id,
                            data: instance,
                        }, user?.id || 'anonymous');
                    }

                    // Always capture for undo history
                    deletedItemsData.push(instance);

                    await deleteFormInstance(id);
                    deletedCount++;
                }
            } catch (error) {
                console.error(`Failed to delete item ${id}:`, error);
                failedCount++;
            }
        }

        // Add to undo history
        if (deletedCount > 0) {
            addAction({
                type: 'delete',
                description: `حذف ${deletedCount} عنصر`,
                data: {
                    itemIds: itemsToDelete.filter(id => !failedCount || itemTypesMap.has(id)),
                    itemTypes: itemTypesMap,
                    sourceFolder: currentFolderId,
                    targetFolder: null,
                    deletedItems: deletedItemsData,
                },
                canUndo: recycleBinEnabled,
            });

            // Refresh recycle bin items
            recycleBinService.getRecycleBinItems().then(setRecycleBinItems);
        }

        if (failedCount > 0) {
            alert(`تم حذف ${deletedCount} عنصر بنجاح، لكن فشل حذف ${failedCount} عنصر.`);
        } else if (deletedCount > 0 && recycleBinEnabled) {
            console.log(`🗑️ Moved ${deletedCount} items to recycle bin`);
        }

        // Only deselect if we deleted from current selection
        if (!targetIds) {
            deselectAll();
        }
    }, [selectedItems, folders, formTemplates, formInstances, deleteFolder, deleteFormTemplate, deleteFormInstance, deselectAll, recycleBinEnabled, user, currentFolderId, addAction]);

    // Determine item type helper (Hoisted)
    const getItemType = useCallback((id: string): 'folder' | 'template' | 'instance' | null => {
        if (folders[id]) return 'folder';
        if (formTemplates[id]) return 'template';
        if (formInstances[id]) return 'instance';
        return null;
    }, [folders, formTemplates, formInstances]);

    const handleBulkArchive = useCallback(() => {
        if (selectedCount === 0) return;

        const confirmed = window.confirm(`هل أنت متأكد من أرشفة ${selectedCount} عنصر؟`);
        if (confirmed) {
            console.log('Archiving items:', Array.from(selectedItems));

            // Iterate and archive based on type
            selectedItems.forEach(id => {
                const type = getItemType(id);
                if (type === 'folder' && archiveFolder) {
                    archiveFolder(id);
                } else if (type === 'template' && archiveFormTemplate) {
                    archiveFormTemplate(id);
                } else if (type === 'instance' && archiveFormInstance) {
                    archiveFormInstance(id);
                }
            });

            deselectAll();
            // Optional: add toast
        }
    }, [selectedItems, selectedCount, deselectAll, getItemType, archiveFolder, archiveFormTemplate, archiveFormInstance]);



    const handleBulkAddTag = useCallback(() => {
        if (selectedCount === 0) return;
        const tagName = window.prompt('أدخل اسم العلامة:');
        if (tagName) {
            console.log('Adding tag:', tagName, 'to items:', Array.from(selectedItems));
            deselectAll();
        }
    }, [selectedItems, selectedCount, deselectAll]);



    // Check if item is being cut (for visual feedback)
    const isItemCut = useCallback((id: string): boolean => {
        return clipboard?.type === 'cut' && clipboard.items.includes(id);
    }, [clipboard]);

    // Undo handler - AUDIT FIX: Properly await all async store operations
    const handleUndo = useCallback(async () => {
        const action = getUndoAction();
        if (!action) return;

        try {
            switch (action.type) {
                case 'delete':
                    // Restore deleted items from undo history or recycle bin
                    if (action.data.deletedItems && action.data.deletedItems.length > 0) {
                        for (const item of action.data.deletedItems) {
                            const itemType = action.data.itemTypes.get(item.id || item.instance_id);

                            // Try to find and remove from recycle bin (if recycleBin was enabled)
                            const recycleBinItems = await recycleBinService.getRecycleBinItems();
                            const rbItem = recycleBinItems.find(rb => rb.originalId === (item.id || item.instance_id));
                            if (rbItem) {
                                await recycleBinService.removeFromRecycleBin(rbItem.id);
                            }

                            // Restore item based on type
                            if (itemType === 'folder' && addFolder) {
                                // AUDIT FIX: Check for bundled content from undo history first
                                const contents = item._contents || (rbItem?.data?.contents);
                                const folderData = rbItem?.data?.folder || item;

                                // Remove internal _contents field before saving
                                const { _contents, ...cleanFolder } = folderData;

                                // Restore parent folder first
                                await addFolder(cleanFolder);

                                // Restore children if we have bundled content
                                if (contents) {
                                    const { folders: childFolders, templates, instances } = contents;

                                    // Restore child folders (in order - parents before children)
                                    if (childFolders) {
                                        for (const f of childFolders) {
                                            await addFolder(f);
                                        }
                                    }

                                    // Restore templates
                                    if (templates && addFormTemplate) {
                                        for (const t of templates) {
                                            await addFormTemplate(t);
                                        }
                                    }

                                    // Restore instances
                                    if (instances && addFormInstance) {
                                        for (const i of instances) {
                                            await addFormInstance(i);
                                        }
                                    }
                                }
                            } else if (itemType === 'template' && addFormTemplate) {
                                await addFormTemplate(item);
                            } else if (itemType === 'instance' && addFormInstance) {
                                await addFormInstance(item);
                            }
                        }
                        setRecycleBinItems(await recycleBinService.getRecycleBinItems());
                        console.log(`↩️ Restored ${action.data.deletedItems.length} items`);
                    }
                    break;

                case 'paste':
                    // For paste undo, we need to delete the created items
                    if (action.data.createdIds) {
                        for (const id of action.data.createdIds) {
                            const itemType = action.data.itemTypes.get(id);
                            if (itemType === 'folder') {
                                deleteFolder(id);
                            } else if (itemType === 'template') {
                                deleteFormTemplate(id);
                            } else if (itemType === 'instance') {
                                await deleteFormInstance(id);
                            }
                        }
                    }
                    break;

                case 'cut':
                    // For cut undo, move items back to source folder
                    if (action.data.sourceFolder !== undefined) {
                        for (const id of action.data.itemIds) {
                            const itemType = action.data.itemTypes.get(id);
                            if (itemType === 'folder') {
                                moveFolder(id, action.data.sourceFolder);
                            } else if (itemType === 'template') {
                                moveFormTemplate?.(id, action.data.sourceFolder);
                            } else if (itemType === 'instance') {
                                moveFormInstance?.(id, action.data.sourceFolder);
                            }
                        }
                    }
                    break;

                case 'rename':
                    // For rename undo, restore the old name
                    if (action.data.itemId && action.data.oldName) {
                        const itemType = action.data.itemType;
                        if (itemType === 'folder') {
                            updateFolder(action.data.itemId, { name: action.data.oldName });
                        } else if (itemType === 'template') {
                            updateFormTemplate?.(action.data.itemId, { name: action.data.oldName });
                        } else if (itemType === 'instance') {
                            updateFormInstance?.(action.data.itemId, { name: action.data.oldName });
                        }
                    }
                    break;
            }

            markUndone();
        } catch (error) {
            console.error('Undo failed:', error);
            alert('فشل التراجع عن العملية');
        }
    }, [getUndoAction, markUndone, addFolder, addFormTemplate, addFormInstance, deleteFolder, deleteFormTemplate, deleteFormInstance, moveFolder]);

    // Redo handler
    const handleRedo = useCallback(async () => {
        const action = getRedoAction();
        if (!action) return;

        try {
            switch (action.type) {
                case 'delete':
                    // Re-delete the items (soft delete to recycle bin)
                    for (const id of action.data.itemIds) {
                        const itemType = action.data.itemTypes.get(id);
                        if (itemType === 'folder') {
                            const folder = folders[id];
                            if (folder) {
                                await recycleBinService.addToRecycleBin({
                                    id,
                                    type: 'folder',
                                    name: folder.name,
                                    path: folder.path || '',
                                    parentId: folder.parent_id,
                                    data: folder
                                }, user?.id || 'unknown');
                            }
                            deleteFolder(id);
                        } else if (itemType === 'template') {
                            const template = formTemplates[id];
                            if (template) {
                                await recycleBinService.addToRecycleBin({
                                    id,
                                    type: 'template',
                                    name: template.name,
                                    path: '',
                                    parentId: template.folder_id,
                                    data: template
                                }, user?.id || 'unknown');
                            }
                            deleteFormTemplate(id);
                        } else if (itemType === 'instance') {
                            const instance = formInstances[id];
                            if (instance) {
                                await recycleBinService.addToRecycleBin({
                                    id,
                                    type: 'instance',
                                    name: instance.name || `تقرير ${id}`,
                                    path: '',
                                    parentId: instance.folder_id,
                                    data: instance
                                }, user?.id || 'unknown');
                            }
                            await deleteFormInstance(id);
                        }
                    }
                    setRecycleBinItems(await recycleBinService.getRecycleBinItems());
                    break;

                case 'paste':
                    // Redo paste = recreate the items (if copy) or move back (if cut)
                    if (action.data.wasCut && action.data.targetFolder !== undefined) {
                        // For cut, move items back to target
                        for (const id of action.data.itemIds) {
                            const itemType = action.data.itemTypes.get(id);
                            if (itemType === 'folder') {
                                moveFolder(id, action.data.targetFolder);
                            } else if (itemType === 'template') {
                                moveFormTemplate?.(id, action.data.targetFolder);
                            } else if (itemType === 'instance') {
                                moveFormInstance?.(id, action.data.targetFolder);
                            }
                        }
                    }
                    // Note: For copy, we'd need to re-duplicate - but this is complex
                    // For now, copy operations don't support full redo
                    break;

                case 'cut':
                    // Redo cut = move items back to target folder
                    if (action.data.targetFolder !== undefined) {
                        for (const id of action.data.itemIds) {
                            const itemType = action.data.itemTypes.get(id);
                            if (itemType === 'folder') {
                                moveFolder(id, action.data.targetFolder);
                            } else if (itemType === 'template') {
                                moveFormTemplate?.(id, action.data.targetFolder);
                            } else if (itemType === 'instance') {
                                moveFormInstance?.(id, action.data.targetFolder);
                            }
                        }
                    }
                    break;

                case 'rename':
                    // Redo rename = apply the new name
                    if (action.data.itemId && action.data.newName) {
                        const itemType = action.data.itemType;
                        if (itemType === 'folder') {
                            updateFolder(action.data.itemId, { name: action.data.newName });
                        } else if (itemType === 'template') {
                            updateFormTemplate?.(action.data.itemId, { name: action.data.newName });
                        } else if (itemType === 'instance') {
                            updateFormInstance?.(action.data.itemId, { name: action.data.newName });
                        }
                    }
                    break;
            }

            markRedone();
        } catch (error) {
            console.error('Redo failed:', error);
            alert('فشل إعادة العملية');
        }
    }, [getRedoAction, markRedone, deleteFolder, deleteFormTemplate, deleteFormInstance, folders, formTemplates, formInstances, moveFolder, moveFormTemplate, moveFormInstance, updateFolder, updateFormTemplate, updateFormInstance]);

    // Cut handler - marks items for moving
    const handleCut = useCallback(() => {
        if (selectedCount === 0) return;
        const selectedIds = Array.from(selectedItems);

        // Track types of each item
        const itemTypes = new Map<string, 'folder' | 'template' | 'instance'>();
        selectedIds.forEach(id => {
            const type = getItemType(id);
            if (type) itemTypes.set(id, type);
        });

        setClipboard({
            type: 'cut',
            items: selectedIds,
            sourceFolder: currentFolderId,
            itemTypes
        });

        // Show feedback toast/message
        console.log(`✂️ Cut ${selectedIds.length} items for moving`);
    }, [selectedItems, selectedCount, currentFolderId, getItemType]);

    // Copy handler - marks items for copying
    const handleCopy = useCallback(() => {
        if (selectedCount === 0) return;
        const selectedIds = Array.from(selectedItems);

        // Track types of each item
        const itemTypes = new Map<string, 'folder' | 'template' | 'instance'>();
        selectedIds.forEach(id => {
            const type = getItemType(id);
            if (type) itemTypes.set(id, type);
        });

        setClipboard({
            type: 'copy',
            items: selectedIds,
            sourceFolder: currentFolderId,
            itemTypes
        });

        console.log(`📋 Copied ${selectedIds.length} items`);
    }, [selectedItems, selectedCount, currentFolderId, getItemType]);

    // Paste handler with validation and proper execution
    // Accepts optional targetFolderId to support breadcrumb paste without race condition
    const handlePaste = useCallback(async (targetFolderId?: string | null) => {
        // Use provided targetFolderId or fall back to currentFolderId
        const destinationFolderId = targetFolderId !== undefined ? targetFolderId : currentFolderId;

        if (!clipboard || clipboard.items.length === 0) return;

        // Validation: Prevent pasting cut items into the same folder
        if (clipboard.type === 'cut' && clipboard.sourceFolder === destinationFolderId) {
            alert('⚠️ لا يمكن نقل العناصر إلى نفس المجلد المصدر');
            return;
        }

        // Check for potential overwrites (folders with same name)
        const existingNames = new Set<string>();
        Object.values(folders).filter(f => f.parent_id === destinationFolderId).forEach(f => {
            existingNames.add(f.name.toLowerCase());
        });

        const conflictingItems = clipboard.items.filter(id => {
            const folder = folders[id];
            if (folder && existingNames.has(folder.name.toLowerCase())) {
                return true;
            }
            return false;
        });

        if (conflictingItems.length > 0) {
            const proceed = window.confirm(
                `⚠️ يوجد ${conflictingItems.length} عنصر بنفس الاسم في المجلد الحالي.\n\nهل تريد المتابعة؟ (سيتم إعادة تسمية العناصر المكررة)`
            );
            if (!proceed) return;
        }

        // Confirmation dialog
        const operationText = clipboard.type === 'cut' ? 'نقل' : 'نسخ';
        const confirmed = window.confirm(
            `هل تريد ${operationText} ${clipboard.items.length} عنصر إلى هذا المجلد؟`
        );

        if (!confirmed) return;

        let successCount = 0;
        let errorCount = 0;

        for (const id of clipboard.items) {
            try {
                const itemType = clipboard.itemTypes.get(id);

                if (itemType === 'folder') {
                    const folder = folders[id];
                    if (folder) {
                        if (clipboard.type === 'cut') {
                            // Move folder to destination location
                            await moveFolder(id, destinationFolderId);
                        } else {
                            // Copy folder
                            await copyFolder(id, destinationFolderId);
                        }
                        successCount++;
                    }
                } else if (itemType === 'template') {
                    const template = formTemplates[id];
                    if (template) {
                        if (clipboard.type === 'copy') {
                            // Duplicate template
                            await duplicateFormTemplate(id);
                            successCount++;
                        } else if (clipboard.type === 'cut') {
                            // Move template to destination folder
                            await moveFormTemplate(id, destinationFolderId);
                            successCount++;
                        }
                    }
                } else if (itemType === 'instance') {
                    const instance = formInstances[id];
                    if (instance) {
                        if (clipboard.type === 'copy') {
                            // Duplicate instance with new ID
                            const newInstanceId = `${instance.instance_id}-copy-${Date.now()}`;
                            const newInstance: FormInstance = {
                                ...instance,
                                id: newInstanceId,
                                instance_id: newInstanceId,
                                folder_id: destinationFolderId,
                                created_at: new Date().toISOString(),
                                created_by: user?.id || 'unknown',
                                status: 'draft',
                                submitted_at: undefined,
                                submitted_by: undefined,
                            };
                            await addFormInstance(newInstance);
                            successCount++;
                        } else if (clipboard.type === 'cut') {
                            // Move instance to destination folder
                            await moveFormInstance(id, destinationFolderId);
                            successCount++;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing item ${id}:`, error);
                errorCount++;
            }
        }

        // Add to undo history
        if (successCount > 0) {
            addAction({
                type: 'paste',
                description: `${operationText} ${successCount} عنصر`,
                data: {
                    itemIds: clipboard.items,
                    itemTypes: clipboard.itemTypes,
                    sourceFolder: clipboard.sourceFolder,
                    targetFolder: destinationFolderId,
                },
                canUndo: true,
            });
        }

        // Clear clipboard only after successful CUT+PASTE (not copy)
        // Copy operations keep clipboard for potential multiple pastes
        if (clipboard.type === 'cut') {
            setClipboard(null);
        }

        deselectAll();

        // Show result feedback
        if (errorCount > 0) {
            alert(`✅ تم ${operationText} ${successCount} عنصر بنجاح\n❌ فشل ${errorCount} عنصر`);
        } else {
            console.log(`✅ Successfully ${clipboard.type === 'cut' ? 'moved' : 'copied'} ${successCount} items`);
        }

        // Stay in destination folder after paste (Windows Explorer behavior)
        // Only navigate if we pasted to a different folder
        if (destinationFolderId !== currentFolderId) {
            navigateToFolder(destinationFolderId);
        }

    }, [clipboard, folders, currentFolderId, copyFolder, moveFolder, formTemplates, formInstances, duplicateFormTemplate, deselectAll, addAction, navigateToFolder, moveFormTemplate, moveFormInstance, addFormInstance, user]);

    // Share handler
    const handleShare = useCallback(() => {
        if (selectedCount === 0) return;

        const selectedIds = Array.from(selectedItems);
        const itemsToShare = selectedIds.map(id => {
            const folder = folders[id];
            const template = formTemplates[id];
            const instance = formInstances[id];

            if (folder) return { type: 'folder', name: folder.name, id };
            if (template) return { type: 'template', name: template.name, id };
            if (instance) return { type: 'instance', name: formTemplates[instance.template_id]?.name || 'تقرير', id };
            return null;
        }).filter(Boolean);

        // Create shareable link or show share dialog
        const shareText = itemsToShare.map(item => `${item?.type}: ${item?.name}`).join('\n');
        if (navigator.share) {
            navigator.share({
                title: 'مشاركة العناصر',
                text: shareText
            }).catch(() => {
                // Fallback to clipboard
                navigator.clipboard.writeText(shareText);
                alert('تم نسخ المعلومات إلى الحافظة');
            });
        } else {
            navigator.clipboard.writeText(shareText);
            alert('تم نسخ المعلومات إلى الحافظة');
        }
    }, [selectedItems, selectedCount, folders, formTemplates, formInstances]);

    const handleBulkChangeStatus = useCallback((status: string) => {
        if (selectedCount === 0) return;
        // logic to update statuses
        console.log('Changing status to:', status, 'for items:', Array.from(selectedItems));

        // Optimistic update (optional)
        selectedItems.forEach(id => {
            // Find instance and update status locally in store if needed
        });
        deselectAll();
    }, [selectedItems, selectedCount, deselectAll]);

    const handleGoHome = () => {
        navigateToFolder(null);
    };

    const handleQuickAccessItemClick = useCallback((item: any) => {
        if (item.type === 'folder') {
            navigateToFolder(item.id);
        } else if (item.type === 'template') {
            navigate(`/forms/preview/${item.id}`);
        } else if (item.type === 'report') {
            navigate(`/reports/view/${item.id}`);
        }

        if (isMobile) {
            setShowQuickAccess(false);
        }
    }, [navigate, navigateToFolder, isMobile]);

    // Generate smart suggestions
    useEffect(() => {
        const templates = Object.values(formTemplates);
        const instances = Object.values(formInstances);
        const allFolders = Object.values(folders);
        const newSuggestions = generateSuggestions(templates, instances, allFolders);
        setSuggestions(newSuggestions);
    }, [formTemplates, formInstances, folders]);

    // Handle toggle favorite
    const handleToggleFavorite = useCallback((id: string, type: string) => {
        setFavoriteItems(prev => {
            const exists = prev.find(item => item.id === id);
            if (exists) {
                return prev.filter(item => item.id !== id);
            }
            // Add to favorites
            let name = '';
            if (type === 'template') {
                name = formTemplates[id]?.name || 'نموذج';
            } else if (type === 'folder') {
                name = folders[id]?.name || 'مجلد';
            }
            return [...prev, { id, name, type, isFavorite: true, lastAccessed: new Date().toISOString() }];
        });
    }, [formTemplates, folders]);

    // Keyboard shortcuts configuration
    const shortcuts: KeyboardShortcut[] = useMemo(() => [
        {
            key: 'z',
            ctrl: true,
            description: 'Undo last action',
            descriptionAr: 'تراجع عن آخر إجراء',
            category: 'actions',
            action: handleUndo,
        },
        {
            key: 'y',
            ctrl: true,
            description: 'Redo last action',
            descriptionAr: 'إعادة آخر إجراء',
            category: 'actions',
            action: handleRedo,
        },
        {
            key: 'z',
            ctrl: true,
            shift: true,
            description: 'Redo last action (Alternative)',
            descriptionAr: 'إعادة آخر إجراء (بديل)',
            category: 'actions',
            action: handleRedo,
        },
        {
            key: '?',
            shift: true,
            description: 'Show keyboard shortcuts',
            descriptionAr: 'إظهار اختصارات لوحة المفاتيح',
            category: 'view',
            action: () => setShowShortcutsHelp(true),
        },
        {
            key: 'a',
            ctrl: true,
            description: 'Select all',
            descriptionAr: 'تحديد الكل',
            category: 'selection',
            action: () => {
                const allIds = [
                    ...filteredTemplates.map(t => t.id),
                    ...filteredInstances.map(i => i.instance_id),
                ];
                selection.selectAll(allIds);
            },
        },
        {
            key: 'Escape',
            description: 'Deselect all',
            descriptionAr: 'إلغاء التحديد',
            category: 'selection',
            action: deselectAll,
        },
        {
            key: 'Delete',
            description: 'Delete selected',
            descriptionAr: 'حذف المحدد',
            category: 'actions',
            action: () => {
                // Permission check before delete
                if (!canDeleteFolder && !canDeleteTemplate && !canDeleteInstance) {
                    alert('ليس لديك صلاحية للحذف');
                    return;
                }
                handleBulkDelete();
            },
        },
        {
            key: 'Backspace',
            description: 'Go to parent folder',
            descriptionAr: 'العودة للمجلد الأعلى',
            category: 'navigation',
            action: handleGoUp,
        },
        {
            key: 'ArrowLeft',
            alt: true,
            description: 'Go back',
            descriptionAr: 'رجوع',
            category: 'navigation',
            action: handleGoBack,
        },
        {
            key: 'ArrowRight',
            alt: true,
            description: 'Go forward',
            descriptionAr: 'تقدم',
            category: 'navigation',
            action: handleGoForward,
        },
        {
            key: 'g',
            description: 'Toggle grid view',
            descriptionAr: 'عرض شبكي',
            category: 'view',
            action: () => setViewMode('grid'),
        },
        {
            key: 'l',
            description: 'Toggle list view',
            descriptionAr: 'عرض قائمة',
            category: 'view',
            action: () => setViewMode('list'),
        },
        {
            key: 'd',
            description: 'Toggle details view',
            descriptionAr: 'عرض تفصيلي',
            category: 'view',
            action: () => setViewMode('details'),
        },
    ], [filteredTemplates, filteredInstances, selection, deselectAll, handleBulkDelete, handleGoUp, handleUndo, handleRedo]);

    // Enable keyboard shortcuts
    useKeyboardShortcuts({ shortcuts });

    // Get folder path with IDs for clickable breadcrumb
    const getFolderPathWithIds = (folderId: string): { id: string; name: string; name_en?: string }[] => {
        const path: { id: string; name: string; name_en?: string }[] = [];
        let currentId: string | null = folderId;
        while (currentId) {
            const folderItem: Folder | undefined = folders[currentId];
            if (folderItem) {
                path.unshift({ id: folderItem.id, name: folderItem.name, name_en: folderItem.name_en });
                currentId = folderItem.parent_id;
            } else {
                break;
            }
        }
        return path;
    };

    const breadcrumbPath = currentFolderId ? getFolderPathWithIds(currentFolderId) : [];

    // Generate breadcrumb segments for the new Breadcrumb component
    const breadcrumbSegments: BreadcrumbSegment[] = useMemo(() => {
        const segments: BreadcrumbSegment[] = [
            { id: null, name: 'الرئيسية', type: 'root' }
        ];

        breadcrumbPath.forEach(item => {
            segments.push({
                id: item.id,
                name: getDisplayName(item.name, item.name_en, displayLanguage),
                type: 'folder'
            });
        });

        return segments;
    }, [breadcrumbPath, displayLanguage]);

    // Handle breadcrumb paste - pass target folder directly to avoid race condition
    const handleBreadcrumbPaste = useCallback((targetFolderId: string | null) => {
        if (!clipboard || clipboard.items.length === 0) return;

        // Call handlePaste directly with target folder - no setTimeout needed
        handlePaste(targetFolderId);
    }, [clipboard, handlePaste]);

    const handleDeleteTemplate = (templateId: string) => {
        const template = formTemplates[templateId];
        if (window.confirm(`هل أنت متأكد من حذف النموذج "${template?.name || 'بدون اسم'}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
            deleteFormTemplate(templateId);
            setTemplateToDelete(null);
        } else {
            setTemplateToDelete(null);
        }
    };

    // Context menu handlers
    const handleFolderContextMenu = (e: React.MouseEvent, folder: Folder) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', item: folder });
    };

    const handleTemplateContextMenu = (e: React.MouseEvent, template: FormTemplate) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'template', item: template });
    };

    const handleInstanceContextMenu = (e: React.MouseEvent, instance: FormInstance) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'instance', item: instance });
    };

    const handleEmptyAreaContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'empty' });
    };

    const handleTemplatesAreaContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'templates-area' });
    };

    const handleReportsAreaContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'reports-area' });
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    // Generate context menu items based on type
    const getContextMenuItems = (): ContextMenuItem[] => {
        if (!contextMenu) return [];

        const canPaste = clipboard && clipboard.items.length > 0;

        switch (contextMenu.type) {
            case 'folder':
                return getFolderMenuItems(contextMenu.item, {
                    onOpen: () => navigateToFolder(contextMenu.item.id),
                    onRename: () => handleEditFolder(contextMenu.item),
                    onCut: () => {
                        const itemTypes = new Map<string, 'folder' | 'template' | 'instance'>();
                        itemTypes.set(contextMenu.item.id, 'folder');
                        setClipboard({ type: 'cut', items: [contextMenu.item.id], sourceFolder: currentFolderId, itemTypes });
                    },
                    onCopy: () => {
                        const itemTypes = new Map<string, 'folder' | 'template' | 'instance'>();
                        itemTypes.set(contextMenu.item.id, 'folder');
                        setClipboard({ type: 'copy', items: [contextMenu.item.id], sourceFolder: currentFolderId, itemTypes });
                    },
                    onPaste: handlePaste,
                    onDelete: () => handleBulkDelete([contextMenu.item.id]),
                }, canPaste ?? undefined);

            case 'template':
                return getTemplateMenuItems(contextMenu.item, {
                    onPreview: () => navigate(`/forms/preview/${contextMenu.item.id}`),
                    onEdit: () => navigate(`/forms/edit/${contextMenu.item.id}`),
                    onCreateReport: () => navigate(`/reports/new/${contextMenu.item.id}`),
                    onCut: () => {
                        const itemTypes = new Map<string, 'folder' | 'template' | 'instance'>();
                        itemTypes.set(contextMenu.item.id, 'template');
                        setClipboard({ type: 'cut', items: [contextMenu.item.id], sourceFolder: currentFolderId, itemTypes });
                    },
                    onCopy: () => {
                        const itemTypes = new Map<string, 'folder' | 'template' | 'instance'>();
                        itemTypes.set(contextMenu.item.id, 'template');
                        setClipboard({ type: 'copy', items: [contextMenu.item.id], sourceFolder: currentFolderId, itemTypes });
                    },
                    onDuplicate: () => {
                        if (duplicateFormTemplate) {
                            duplicateFormTemplate(contextMenu.item.id);
                        }
                    },
                    onExport: () => handleExportTemplate(contextMenu.item as FormTemplate),
                    onDelete: () => handleBulkDelete([contextMenu.item.id]),
                });

            case 'instance':
                return getInstanceMenuItems(contextMenu.item, {
                    onOpen: () => navigate(`/reports/view/${contextMenu.item.instance_id}`),
                    onView: () => navigate(`/reports/view/${contextMenu.item.instance_id}`),
                    onEdit: () => openDraftForEdit(
                        contextMenu.item.instance_id,
                        contextMenu.item.name || contextMenu.item.template_name || ''
                    ),
                    onCut: () => {
                        const itemTypes = new Map<string, 'folder' | 'template' | 'instance'>();
                        itemTypes.set(contextMenu.item.instance_id, 'instance');
                        setClipboard({ type: 'cut', items: [contextMenu.item.instance_id], sourceFolder: currentFolderId, itemTypes });
                    },
                    onCopy: () => {
                        const itemTypes = new Map<string, 'folder' | 'template' | 'instance'>();
                        itemTypes.set(contextMenu.item.instance_id, 'instance');
                        setClipboard({ type: 'copy', items: [contextMenu.item.instance_id], sourceFolder: currentFolderId, itemTypes });
                    },
                    onDelete: () => handleBulkDelete([contextMenu.item.instance_id]),
                });

            case 'empty':
                return getEmptyAreaMenuItems({
                    onNewFolder: () => handleCreateFolder(currentFolderId),
                    onNewTemplate: () => handleCreateTemplate(),
                    onPaste: handlePaste,
                    onRefresh: () => window.location.reload(),
                    onSelectAll: () => {
                        const allIds = [
                            ...displayFolders.map(f => f.id),
                            ...filteredTemplates.map(t => t.id),
                            ...filteredInstances.map(i => i.instance_id),
                        ];
                        selection.setSelection(allIds);
                    },
                }, canPaste ?? undefined);

            case 'templates-area':
                return getTemplatesAreaMenuItems({
                    onNewTemplate: () => handleCreateTemplate(),
                    onPaste: handlePaste,
                    onRefresh: () => window.location.reload(),
                    onSelectAllTemplates: () => {
                        const templateIds = filteredTemplates.map(t => t.id);
                        selection.setSelection(templateIds);
                    },
                }, canPaste ?? undefined);

            case 'reports-area':
                return getReportsAreaMenuItems({
                    onNewFolder: () => handleCreateFolder(currentFolderId),
                    onPaste: handlePaste,
                    onRefresh: () => window.location.reload(),
                    onSelectAllReports: () => {
                        const reportIds = [
                            ...displayFolders.map(f => f.id),
                            ...filteredInstances.map(i => i.instance_id),
                        ];
                        selection.setSelection(reportIds);
                    },
                }, canPaste ?? undefined);

            default:
                return [];
        }
    };

    const handleEditFolder = (folder: Folder) => {
        setEditingFolder(folder);
        setShowFolderDialog(true);
        closeContextMenu();
    };

    const handleDeleteFolder = (folderId: string) => {
        // Called from modal confirmation button - delete directly without window.confirm
        deleteFolder(folderId);
        setFolderToDelete(null);
        closeContextMenu();
    };

    const handleCopyFolder = (folder: Folder) => {
        copyFolder(folder.id, folder.parent_id);
        closeContextMenu();
    };

    const handleCreateSubfolder = (parentId: string) => {
        setParentIdForNewFolder(parentId);
        setEditingFolder(null);
        setShowFolderDialog(true);
        closeContextMenu();
    };

    // Close context menu when clicking outside
    React.useEffect(() => {
        const handleClick = () => closeContextMenu();
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Keyboard shortcuts for folder navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore if user is typing in an input or textarea
        const activeElement = document.activeElement;
        if (activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            (activeElement as HTMLElement).isContentEditable
        )) {
            return;
        }

        // Alt+ArrowUp: Go to parent folder (Backspace handled by useKeyboardShortcuts)
        if (e.altKey && e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentFolder?.parent_id) {
                navigateToFolder(currentFolder.parent_id);
            } else if (currentFolderId) {
                navigateToFolder(null);
            }
        }

        // Home: Go to root folder
        if (e.key === 'Home' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            navigateToFolder(null);
        }

        // Escape: Close context menu if open
        if (e.key === 'Escape' && contextMenu) {
            e.preventDefault();
            closeContextMenu();
        }
    }, [currentFolder, currentFolderId, navigateToFolder, contextMenu]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);


    return (
        <div className="h-full w-full p-2 sm:p-4 bg-gray-100 dark:bg-gray-900 overflow-hidden font-segoe">
            <div className="flex flex-col h-full w-full bg-win11-bg-light dark:bg-win11-bg-dark backdrop-blur-win11 rounded-win11-lg sm:rounded-win11-xl border border-white/40 dark:border-white/10 shadow-win11 transition-all duration-300 relative">

                {/* 1. Breadcrumb Row with Right-Click Context Menu */}
                <div className="min-h-10 px-2 sm:px-4 py-1 sm:py-0 flex items-center gap-2 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20 select-none">
                    {isMobile && (
                        <button
                            onClick={() => setShowQuickAccess(true)}
                            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
                            title="الوصول السريع"
                        >
                            <Bars3Icon className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={handleGoUp}
                        disabled={!currentFolderId}
                        className={cn(
                            "p-1.5 rounded-md transition-colors",
                            currentFolderId
                                ? "hover:bg-black/5 dark:hover:bg-white/5 text-gray-500"
                                : "text-gray-300 cursor-not-allowed"
                        )}
                        title="العودة للمجلد الأعلى"
                    >
                        <ArrowUpIcon className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />

                    <Breadcrumb
                        segments={breadcrumbSegments}
                        onNavigate={(id) => navigateToFolder(id ?? null)}
                        onPaste={handleBreadcrumbPaste}
                        canPaste={clipboard !== null && clipboard.items.length > 0}
                        clipboardType={clipboard?.type || null}
                        clipboardCount={clipboard?.items.length || 0}
                        className="flex-1 min-w-0"
                    />

                    {/* Clipboard indicator in breadcrumb */}
                    {clipboard && clipboard.items.length > 0 && !isMobile && (
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                            clipboard.type === 'cut'
                                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        )}>
                            {clipboard.type === 'cut' ? (
                                <ScissorsIcon className="w-3.5 h-3.5" />
                            ) : (
                                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                            )}
                            <span>{clipboard.items.length}</span>
                        </div>
                    )}
                </div>

                {/* 2. Command Bar (Toolbar) */}
                <div className="min-h-14 px-2 py-2 flex flex-wrap items-center gap-1.5 border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md overflow-visible relative z-50">
                    {/* New Actions */}
                    <div className="flex items-center gap-1 px-1">
                        {isFormsPage && (
                            <button
                                onClick={() => handleCreateTemplate()}
                                disabled={!canCreateTemplate}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-win11-blue/10 text-win11-blue hover:bg-win11-blue/15 dark:hover:bg-win11-blue/20 disabled:opacity-50 transition-colors"
                            >
                                <DocumentPlusIcon className="w-5 h-5 text-win11-blue" />
                                <span className="text-sm font-medium">نموذج جديد</span>
                            </button>
                        )}
                        {isFormsPage && (
                            <button
                                onClick={handleToolbarImportClick}
                                disabled={!canCreateTemplate || isTemplateImporting}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                                title="استيراد نموذج من ملف نسخة احتياطية"
                            >
                                <ArrowUpTrayIcon className={cn("w-5 h-5 text-win11-blue", isTemplateImporting && "animate-pulse")} />
                                <span className="text-sm">استيراد</span>
                            </button>
                        )}
                        {isFormsPage && (
                            <button
                                onClick={() => handleCreateFolder(currentFolderId)}
                                disabled={!canCreateFolder}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                            >
                                <FolderPlusIcon className="w-5 h-5 text-win11-blue" />
                                <span className="text-sm">مجلد</span>
                            </button>
                        )}
                    </div>
                    <input
                        ref={templateImportInputRef}
                        type="file"
                        accept=".json,.qms-template.json,application/json"
                        className="hidden"
                        onChange={handleTemplateImportFileChange}
                    />

                    <div className="hidden md:block h-5 w-px bg-black/10 dark:bg-white/10 mx-1" />

                    {/* Back/Forward Navigation */}
                    <div className="hidden md:flex items-center gap-0.5">
                        <button
                            onClick={handleGoBack}
                            title={`رجوع (Alt+←)${canGoBack ? '' : ' - لا يوجد'}`}
                            disabled={!canGoBack}
                            className={cn(
                                "p-1.5 rounded-[4px] transition-colors",
                                canGoBack
                                    ? "hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            )}
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleGoForward}
                            title={`تقدم (Alt+→)${canGoForward ? '' : ' - لا يوجد'}`}
                            disabled={!canGoForward}
                            className={cn(
                                "p-1.5 rounded-[4px] transition-colors",
                                canGoForward
                                    ? "hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            )}
                        >
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="hidden lg:block h-5 w-px bg-black/10 dark:bg-white/10 mx-1" />

                    {/* Undo/Redo Actions */}
                    <div className="hidden lg:flex items-center gap-0.5">
                        <button
                            onClick={handleUndo}
                            title={`تراجع (Ctrl+Z)${canUndo ? '' : ' - لا يوجد'}`}
                            disabled={!canUndo}
                            className={cn(
                                "p-1.5 rounded-[4px] transition-colors",
                                canUndo
                                    ? "hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            )}
                        >
                            <ArrowUturnLeftIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleRedo}
                            title={`إعادة (Ctrl+Y)${canRedo ? '' : ' - لا يوجد'}`}
                            disabled={!canRedo}
                            className={cn(
                                "p-1.5 rounded-[4px] transition-colors",
                                canRedo
                                    ? "hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            )}
                        >
                            <ArrowUturnRightIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="hidden lg:block h-5 w-px bg-black/10 dark:bg-white/10 mx-1" />

                    {/* Common Actions (Cut, Copy, Paste, Rename, Share, Delete) */}
                    <div className="hidden lg:flex items-center gap-0.5">
                        <button
                            onClick={handleCut}
                            title="قص (Ctrl+X)"
                            disabled={selectedCount === 0 || !canCut}
                            className="p-1.5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                        >
                            <ScissorsIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleCopy}
                            title="نسخ"
                            disabled={selectedCount === 0 || !canCopy}
                            className="p-1.5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                        >
                            <DocumentDuplicateIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handlePaste()}
                            title={clipboard ? `لصق ${clipboard.items.length} عنصر (${clipboard.type === 'cut' ? 'نقل' : 'نسخ'})` : 'لصق'}
                            disabled={!clipboard || clipboard.items.length === 0}
                            className={cn(
                                "p-1.5 rounded-[4px] transition-colors relative",
                                clipboard && clipboard.items.length > 0
                                    ? clipboard.type === 'cut'
                                        ? "text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                        : "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    : "text-gray-400 hover:bg-transparent cursor-not-allowed"
                            )}
                        >
                            <ClipboardIcon className="w-5 h-5" />
                            {clipboard && clipboard.items.length > 0 && (
                                <span className={cn(
                                    "absolute -top-1 -right-1 w-4 h-4 text-[10px] rounded-full flex items-center justify-center text-white",
                                    clipboard.type === 'cut' ? "bg-orange-500" : "bg-blue-500"
                                )}>
                                    {clipboard.items.length}
                                </span>
                            )}
                        </button>
                        <button
                            title="إعادة تسمية"
                            disabled={selectedCount !== 1}
                            onClick={() => {
                                const selectedId = Array.from(selection.selectedItems)[0];
                                if (!selectedId) return;
                                // Check if it's a folder by looking it up in the folders map
                                const f = folders[selectedId];
                                if (f) {
                                    handleEditFolder(f);
                                } else {
                                    // For templates, navigate to edit
                                    const template = formTemplates[selectedId];
                                    if (template) {
                                        navigate(`/forms/edit/${selectedId}`);
                                    }
                                }
                            }}
                            className="p-1.5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                        >
                            <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleShare}
                            title="مشاركة"
                            disabled={selectedCount === 0}
                            className="p-1.5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                        >
                            <ShareIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleBulkDelete()}
                            title="حذف"
                            disabled={selectedCount === 0 || !canDeleteFolder}
                            className="p-1.5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="hidden lg:block h-5 w-px bg-black/10 dark:bg-white/10 mx-1" />

                    {/* Extended Actions (Move, Archive, Tag) - Only visible when selected */}
                    {selectedCount > 0 && (
                        <div className="hidden lg:flex items-center gap-0.5 animate-fade-in">

                            <button
                                onClick={handleBulkArchive}
                                title="أرشفة"
                                className="p-1.5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                <ArchiveBoxIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleBulkAddTag}
                                title="إضافة علامة"
                                className="p-1.5 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                <TagIcon className="w-5 h-5" />
                            </button>
                            <div className="h-5 w-px bg-black/10 dark:bg-white/10 mx-1" />
                        </div>
                    )}


                    {/* Search & Sort */}
                    <div className="flex-1 hidden md:block" />
                    <div className="w-full md:w-56 lg:w-64 order-last md:order-none">
                        <AdvancedSearch
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="بحث في النماذج والتقارير..."
                        />
                    </div>

                    <div className="mx-1 hidden md:block" />

                    <div className="flex items-center gap-1 ml-auto md:ml-0">
                        <div className="hidden sm:block">
                            <SortDropdown
                                currentSort={sortConfig}
                                onSortChange={setSortConfig}
                            />
                        </div>
                        <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-[4px] hover:bg-black/5", viewMode === 'grid' && "bg-black/5")}>
                            <Squares2X2Icon className="w-4 h-4" />
                        </button>
                        {!isMobile && (
                            <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-[4px] hover:bg-black/5", viewMode === 'list' && "bg-black/5")}>
                                <ListBulletIcon className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={() => setViewMode('details')} className={cn("p-1.5 rounded-[4px] hover:bg-black/5", viewMode === 'details' && "bg-black/5")}>
                            <DocumentTextIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Active Filters Bar */}
                {(filters.dateRange !== 'all' || filters.status.length > 0 || filters.tags.length > 0) && (
                    <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/10">
                        <ActiveFiltersChips filters={filters} onRemoveFilter={handleRemoveFilter} />
                    </div>
                )}

                {isMobile && !isSpecialView && (
                    <div className="px-2 py-2 border-b border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/10">
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                            <button
                                onClick={() => setMobileContentFilter('all')}
                                className={cn(
                                    "px-2 py-1.5 text-xs rounded-md transition-colors",
                                    mobileContentFilter === 'all'
                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60"
                                )}
                            >
                                الكل ({filteredTemplates.length + filteredInstances.length + displayFolders.length})
                            </button>
                            <button
                                onClick={() => setMobileContentFilter('forms')}
                                className={cn(
                                    "px-2 py-1.5 text-xs rounded-md transition-colors",
                                    mobileContentFilter === 'forms'
                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60"
                                )}
                            >
                                النماذج ({filteredTemplates.length})
                            </button>
                            <button
                                onClick={() => setMobileContentFilter('reports')}
                                className={cn(
                                    "px-2 py-1.5 text-xs rounded-md transition-colors",
                                    mobileContentFilter === 'reports'
                                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60"
                                )}
                            >
                                التقارير ({filteredInstances.length + displayFolders.length})
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab Bar for open forms */}


                {/* 3. Main Body */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Sidebar */}
                    {!isMobile && (
                        <QuickAccessSidebar
                            recentItems={recentItems}
                            favoriteItems={favoriteItems}
                            pinnedFolders={[]}
                            recycleBinCount={recycleBinItems.length}
                            onRecycleBinClick={() => {
                                navigateToFolder('__recycle_bin__');
                            }}
                            onArchiveClick={() => {
                                navigateToFolder('__archive__');
                            }}
                            onItemClick={handleQuickAccessItemClick}
                            onToggleFavorite={handleToggleFavorite}
                            solidBackground={true}
                        />
                    )}

                    {/* Content */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white/40 dark:bg-black/20 relative">


                        <div
                            className="flex-1 overflow-y-auto p-2 sm:p-4 content-area"
                            onClick={() => deselectAll()}
                            onContextMenu={(e) => {
                                // Prevent default browser context menu
                                e.preventDefault();
                            }}
                        >
                            {isMobile && !isSpecialView && (
                                <div className="mb-3 grid grid-cols-2 gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCreateTemplate();
                                        }}
                                        className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300"
                                    >
                                        <DocumentPlusIcon className="w-4 h-4" />
                                        نموذج جديد
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCreateFolder(currentFolderId);
                                        }}
                                        disabled={!canCreateFolder}
                                        className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 disabled:opacity-50"
                                    >
                                        <FolderPlusIcon className="w-4 h-4" />
                                        مجلد جديد
                                    </button>
                                </div>
                            )}

                            {/* Special Views - Archive */}
                            {isArchiveView && (
                                <div onClick={(e) => e.stopPropagation()} className="space-y-4">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                                <ArchiveBoxIcon className="w-6 h-6 text-amber-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">الأرشيف</h2>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {archivedFolders.length + archivedTemplates.length + archivedInstances.length} عنصر
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Empty state */}
                                    {archivedFolders.length === 0 && archivedTemplates.length === 0 && archivedInstances.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                            <ArchiveBoxIcon className="w-16 h-16 mb-4 opacity-30" />
                                            <p className="text-lg font-medium">الأرشيف فارغ</p>
                                            <p className="text-sm">لا توجد عناصر مؤرشفة</p>
                                        </div>
                                    )}

                                    {/* Items list */}
                                    {(archivedFolders.length > 0 || archivedTemplates.length > 0 || archivedInstances.length > 0) && (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                            {isMobile && (
                                                <div className="space-y-2 p-3">
                                                    {archivedFolders.map(folder => (
                                                        <div key={folder.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                                            <div className="mb-2 flex items-center gap-2">
                                                                <FolderIcon className="w-5 h-5 text-amber-500" />
                                                                <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{folder.name}</span>
                                                            </div>
                                                            <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                                                                <span>النوع: مجلد</span>
                                                                <span className="mx-1">•</span>
                                                                <span>تاريخ الأرشفة: {folder.archived_at ? formatDate(folder.archived_at) : '-'}</span>
                                                            </div>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await updateFolder(folder.id, { archived: false, archived_at: undefined, archived_by: undefined });
                                                                    } catch (err) {
                                                                        console.error('Error unarchiving folder:', err);
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                                            >
                                                                <ArrowUturnLeftIcon className="h-4 w-4" />
                                                                إلغاء الأرشفة
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {archivedTemplates.map(template => (
                                                        <div key={template.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                                            <div className="mb-2 flex items-center gap-2">
                                                                <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                                                                <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{template.name}</span>
                                                            </div>
                                                            <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                                                                <span>النوع: نموذج</span>
                                                                <span className="mx-1">•</span>
                                                                <span>تاريخ الأرشفة: {(template as any).archived_at ? formatDate((template as any).archived_at) : '-'}</span>
                                                            </div>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await updateFormTemplate(template.id, { archived: false, archived_at: undefined, archived_by: undefined } as any);
                                                                    } catch (err) {
                                                                        console.error('Error unarchiving template:', err);
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                                            >
                                                                <ArrowUturnLeftIcon className="h-4 w-4" />
                                                                إلغاء الأرشفة
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {archivedInstances.map(instance => (
                                                        <div key={instance.instance_id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                                            <div className="mb-2 flex items-center gap-2">
                                                                <ClipboardDocumentCheckIcon className="w-5 h-5 text-green-500" />
                                                                <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                                    {formTemplates[instance.template_id]?.name || 'تقرير'}
                                                                </span>
                                                            </div>
                                                            <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                                                                <span>النوع: تقرير</span>
                                                                <span className="mx-1">•</span>
                                                                <span>تاريخ الأرشفة: {(instance as any).archived_at ? formatDate((instance as any).archived_at) : '-'}</span>
                                                            </div>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await updateFormInstance(instance.instance_id, { archived: false, archived_at: undefined, archived_by: undefined } as any);
                                                                    } catch (err) {
                                                                        console.error('Error unarchiving instance:', err);
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                                            >
                                                                <ArrowUturnLeftIcon className="h-4 w-4" />
                                                                إلغاء الأرشفة
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {!isMobile && (
                                            <table className="w-full">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الاسم</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">النوع</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">تاريخ الأرشفة</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الإجراءات</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {/* Archived Folders */}
                                                    {archivedFolders.map(folder => (
                                                        <tr key={folder.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <FolderIcon className="w-5 h-5 text-amber-500" />
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{folder.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">مجلد</td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                                {folder.archived_at ? formatDate(folder.archived_at) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            await updateFolder(folder.id, { archived: false, archived_at: undefined, archived_by: undefined });
                                                                        } catch (err) {
                                                                            console.error('Error unarchiving folder:', err);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400"
                                                                    title="إلغاء الأرشفة"
                                                                >
                                                                    <ArrowUturnLeftIcon className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Archived Templates */}
                                                    {archivedTemplates.map(template => (
                                                        <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">نموذج</td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                                {(template as any).archived_at ? formatDate((template as any).archived_at) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            await updateFormTemplate(template.id, { archived: false, archived_at: undefined, archived_by: undefined } as any);
                                                                        } catch (err) {
                                                                            console.error('Error unarchiving template:', err);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400"
                                                                    title="إلغاء الأرشفة"
                                                                >
                                                                    <ArrowUturnLeftIcon className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Archived Instances */}
                                                    {archivedInstances.map(instance => (
                                                        <tr key={instance.instance_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <ClipboardDocumentCheckIcon className="w-5 h-5 text-green-500" />
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {formTemplates[instance.template_id]?.name || 'تقرير'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">تقرير</td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                                {(instance as any).archived_at ? formatDate((instance as any).archived_at) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            await updateFormInstance(instance.instance_id, { archived: false, archived_at: undefined, archived_by: undefined } as any);
                                                                        } catch (err) {
                                                                            console.error('Error unarchiving instance:', err);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400"
                                                                    title="إلغاء الأرشفة"
                                                                >
                                                                    <ArrowUturnLeftIcon className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Special Views - Recycle Bin */}
                            {isRecycleBinView && (
                                <div onClick={(e) => e.stopPropagation()} className="space-y-4">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                                <TrashIcon className="w-6 h-6 text-red-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">سلة المحذوفات</h2>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {recycleBinItemsData.length} عنصر
                                                </p>
                                            </div>
                                        </div>
                                        {recycleBinItemsData.length > 0 && (
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm('هل أنت متأكد من إفراغ سلة المحذوفات نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه.')) {
                                                        try {
                                                            let failed = 0;
                                                            for (const item of recycleBinItemsData) {
                                                                const removed = await recycleBinService.permanentlyDeleteItem(item);
                                                                if (!removed) failed++;
                                                            }
                                                            if (failed === 0) {
                                                                setRecycleBinItemsData([]);
                                                            }
                                                        } catch (err) {
                                                            console.error('Error emptying recycle bin:', err);
                                                        }
                                                    }
                                                }}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                إفراغ السلة
                                            </button>
                                        )}
                                    </div>

                                    {/* Loading state */}
                                    {recycleBinLoading && (
                                        <div className="py-6">
                                            <TableSkeleton />
                                        </div>
                                    )}

                                    {/* Empty state */}
                                    {!recycleBinLoading && recycleBinItemsData.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                            <TrashIcon className="w-16 h-16 mb-4 opacity-30" />
                                            <p className="text-lg font-medium">سلة المحذوفات فارغة</p>
                                            <p className="text-sm">لا توجد عناصر محذوفة</p>
                                        </div>
                                    )}

                                    {/* Items list */}
                                    {!recycleBinLoading && recycleBinItemsData.length > 0 && (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                            {isMobile && (
                                                <div className="space-y-2 p-3">
                                                    {recycleBinItemsData.map(item => (
                                                        <div key={item.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                                            <div className="mb-2 flex items-center gap-2">
                                                                {item.type === 'folder' ? (
                                                                    <FolderIcon className="w-5 h-5 text-amber-500" />
                                                                ) : item.type === 'template' ? (
                                                                    <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                                                                ) : (
                                                                    <ClipboardDocumentCheckIcon className="w-5 h-5 text-green-500" />
                                                                )}
                                                                <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{item.name}</span>
                                                            </div>
                                                            <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                                                                <span>النوع: {item.type === 'folder' ? 'مجلد' : item.type === 'template' ? 'نموذج' : 'تقرير'}</span>
                                                                <span className="mx-1">•</span>
                                                                <span>تاريخ الحذف: {formatDate(item.deletedAt)}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            if (item.type === 'folder' && item.data) {
                                                                                await addFolder(item.data);
                                                                            } else if (item.type === 'template' && item.data) {
                                                                                await addFormTemplate(item.data);
                                                                            } else if (item.type === 'instance' && item.data) {
                                                                                await addFormInstance(item.data);
                                                                            }
                                                                            await recycleBinService.removeFromRecycleBin(item.id);
                                                                            setRecycleBinItemsData(prev => prev.filter(i => i.id !== item.id));
                                                                        } catch (err) {
                                                                            console.error('Error restoring item:', err);
                                                                        }
                                                                    }}
                                                                    className="inline-flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                                >
                                                                    <ArrowUturnLeftIcon className="h-4 w-4" />
                                                                    استعادة
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm('هل تريد حذف هذا العنصر نهائياً؟')) {
                                                                            try {
                                                                                const removed = await recycleBinService.permanentlyDeleteItem(item);
                                                                                if (removed) {
                                                                                    setRecycleBinItemsData(prev => prev.filter(i => i.id !== item.id));
                                                                                }
                                                                            } catch (err) {
                                                                                console.error('Error deleting item:', err);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                                >
                                                                    <TrashIcon className="h-4 w-4" />
                                                                    حذف نهائياً
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {!isMobile && (
                                            <table className="w-full">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الاسم</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">النوع</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">تاريخ الحذف</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الإجراءات</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {recycleBinItemsData.map(item => (
                                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    {item.type === 'folder' ? (
                                                                        <FolderIcon className="w-5 h-5 text-amber-500" />
                                                                    ) : item.type === 'template' ? (
                                                                        <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                                                                    ) : (
                                                                        <ClipboardDocumentCheckIcon className="w-5 h-5 text-green-500" />
                                                                    )}
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                                {item.type === 'folder' ? 'مجلد' : item.type === 'template' ? 'نموذج' : 'تقرير'}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                                {formatDate(item.deletedAt)}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                // Restore item
                                                                                if (item.type === 'folder' && item.data) {
                                                                                    await addFolder(item.data);
                                                                                } else if (item.type === 'template' && item.data) {
                                                                                    await addFormTemplate(item.data);
                                                                                } else if (item.type === 'instance' && item.data) {
                                                                                    await addFormInstance(item.data);
                                                                                }
                                                                                await recycleBinService.removeFromRecycleBin(item.id);
                                                                                setRecycleBinItemsData(prev => prev.filter(i => i.id !== item.id));
                                                                            } catch (err) {
                                                                                console.error('Error restoring item:', err);
                                                                            }
                                                                        }}
                                                                        className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400"
                                                                        title="استعادة"
                                                                    >
                                                                        <ArrowUturnLeftIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (window.confirm('هل تريد حذف هذا العنصر نهائياً؟')) {
                                                                            try {
                                                                                const removed = await recycleBinService.permanentlyDeleteItem(item);
                                                                                if (removed) {
                                                                                    setRecycleBinItemsData(prev => prev.filter(i => i.id !== item.id));
                                                                                }
                                                                            } catch (err) {
                                                                                console.error('Error deleting item:', err);
                                                                            }
                                                                            }
                                                                        }}
                                                                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                                                                        title="حذف نهائياً"
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Normal Views */}
                            {!isSpecialView && viewMode === 'list' && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <ListView
                                        folders={visibleFolders}
                                        templates={visibleTemplates}
                                        instances={visibleInstances}
                                        formTemplates={formTemplates}
                                        onFolderClick={(id, e) => {
                                            if (handleItemClick(id, 'folder', e)) return;
                                            e.stopPropagation();
                                            selection.setSelection([id]);
                                        }}
                                        onTemplateClick={(id, e) => {
                                            if (handleItemClick(id, 'template', e)) return;
                                            e.stopPropagation();
                                            selection.setSelection([id]);
                                        }}
                                        onInstanceClick={(id, e) => {
                                            if (handleItemClick(id, 'instance', e)) return;
                                            e.stopPropagation();
                                            selection.setSelection([id]);
                                        }}
                                        onFolderDoubleClick={handleFolderDoubleClick}
                                        onTemplateDoubleClick={(id) => {
                                            if (window.confirm('هل تريد إنشاء تقرير جديد من هذا النموذج؟')) {
                                                const template = visibleTemplates.find(t => t.id === id);
                                                if (template) openTemplateForEntry(id, template.name);
                                            } else {
                                                navigate(`/forms/preview/${id}`);
                                            }
                                        }}
                                        onInstanceDoubleClick={(id) => {
                                            const instance = visibleInstances.find(i => i.instance_id === id);
                                            if (instance) {
                                                const template = formTemplates[instance.template_id];
                                                const name = template ? `تقرير - ${template.name}` : 'تقرير';
                                                openInstanceForEdit(id, name);
                                            }
                                        }}
                                        onFolderContextMenu={handleFolderContextMenu}
                                        onTemplateContextMenu={handleTemplateContextMenu}
                                        onInstanceContextMenu={handleInstanceContextMenu}
                                        onTemplatesAreaContextMenu={handleTemplatesAreaContextMenu}
                                        onReportsAreaContextMenu={handleReportsAreaContextMenu}
                                        getDisplayName={getDisplayName}
                                        displayLanguage={displayLanguage}
                                        isFormsPage={isFormsPage}
                                        isReportsPage={isReportsPage}
                                        isSelected={isSelected}
                                        onToggleSelection={toggleSelection}
                                        selectedCount={selectedCount}
                                    />
                                </div>
                            )}

                            {!isSpecialView && viewMode === 'details' && (
                                <div onClick={(e) => e.stopPropagation()}>
                                    <DetailsView
                                        folders={visibleFolders}
                                        templates={visibleTemplates}
                                        instances={visibleInstances}
                                        formTemplates={formTemplates}
                                        onFolderClick={handleFolderDoubleClick}
                                        onTemplateClick={(id) => {
                                            const template = visibleTemplates.find(t => t.id === id);
                                            if (template) openTemplateForEntry(id, template.name);
                                        }}
                                        onInstanceClick={(id) => {
                                            const instance = visibleInstances.find(i => i.instance_id === id);
                                            if (instance) {
                                                const template = formTemplates[instance.template_id];
                                                const name = template ? `تقرير - ${template.name}` : 'تقرير';
                                                openInstanceForEdit(id, name);
                                            }
                                        }}
                                        onFolderContextMenu={handleFolderContextMenu}
                                        onTemplateContextMenu={handleTemplateContextMenu}
                                        onInstanceContextMenu={handleInstanceContextMenu}
                                        onTemplatesAreaContextMenu={handleTemplatesAreaContextMenu}
                                        onReportsAreaContextMenu={handleReportsAreaContextMenu}
                                        onTemplateEdit={(id) => navigate(`/forms/edit/${id}`)}
                                        onTemplateDelete={(id) => setTemplateToDelete(id)}
                                        onCreateReport={(id) => navigate(`/reports/new/${id}`)}
                                        getDisplayName={getDisplayName}
                                        displayLanguage={displayLanguage}
                                        isFormsPage={isFormsPage}
                                        isReportsPage={isReportsPage}
                                        isSelected={isSelected}
                                        onToggleSelection={toggleSelection}
                                        onSelectionClick={handleItemClick}
                                        selectedCount={selectedCount}
                                    />
                                </div>
                            )}

                            {!isSpecialView && viewMode === 'grid' && (
                                <div className="flex flex-col pb-10 sm:pb-20" onClick={(e) => e.stopPropagation()}>
                                    {/* Templates Section - Always visible when on forms page */}
                                    {isFormsPage && showFormsContent && (
                                        <div
                                            className="min-h-[150px] pb-4"
                                            onContextMenu={(e) => {
                                                // Only trigger area menu if not clicking on an item
                                                if ((e.target as HTMLElement).closest('[data-item]')) return;
                                                handleTemplatesAreaContextMenu(e);
                                            }}
                                        >
                                            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3">
                                                <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-300">النماذج ({visibleTemplates.length})</h2>
                                            </div>
                                            {visibleTemplates.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 sm:gap-4">
                                                    {visibleTemplates.map((template) => (
                                                        <div
                                                            key={template.id}
                                                            data-item="template"
                                                            className={cn(
                                                                'group relative aspect-[0.95] sm:aspect-square rounded-win11-lg p-3 sm:p-4 select-none',
                                                                'flex flex-col items-center justify-center gap-2',
                                                                'cursor-pointer transition-all duration-200',
                                                                isSelected(template.id)
                                                                    ? 'bg-win11-blue/10 border border-win11-blue shadow-[0_0_0_1px_rgba(0,95,184,0.3)]'
                                                                    : 'bg-white/70 dark:bg-white/5 border border-transparent hover:bg-white dark:hover:bg-white/10 hover:shadow-win11-hover',
                                                                // Visual feedback for cut items
                                                                isItemCut(template.id) && 'opacity-50 border-dashed border-orange-400'
                                                            )}
                                                            onClick={(e) => {
                                                                if (handleItemClick(template.id, 'template', e)) return;
                                                                e.stopPropagation();
                                                                selection.setSelection([template.id]);
                                                            }}
                                                            onDoubleClick={() => {
                                                                if (window.confirm('هل تريد إنشاء تقرير جديد من هذا النموذج؟')) {
                                                                    openTemplateForEntry(template.id, template.name);
                                                                } else {
                                                                    // Preview logic - maybe open in preview tab?
                                                                    navigate(`/forms/preview/${template.id}`);
                                                                }
                                                            }}
                                                            onContextMenu={(e) => {
                                                                e.stopPropagation();
                                                                handleTemplateContextMenu(e, template);
                                                            }}
                                                        >
                                                            {/* Selection checkbox - only shows when 2+ items selected */}
                                                            {selectedCount >= 2 && isSelected(template.id) && (
                                                                <div className="w-5 h-5 absolute top-2 right-2 rounded border flex items-center justify-center text-xs bg-win11-blue border-win11-blue text-white">
                                                                    ✓
                                                                </div>
                                                            )}
                                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                                <DocumentTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <span className="text-xs text-center line-clamp-2 text-gray-700 dark:text-gray-200 w-full break-words">
                                                                {template.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-20 text-gray-400 dark:text-gray-500 text-sm">
                                                    لا توجد نماذج - كلك يمين لإنشاء نموذج جديد
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Divider between Templates and Reports */}
                                    {isFormsPage && isReportsPage && showFormsContent && showReportsContent && (
                                        <div className="border-t-2 border-gray-300 dark:border-gray-600 my-4"></div>
                                    )}

                                    {/* Reports Section - Always visible when on reports page */}
                                    {isReportsPage && showReportsContent && (
                                        <div
                                            className="min-h-[150px] flex-1"
                                            onContextMenu={(e) => {
                                                // Only trigger area menu if not clicking on an item
                                                if ((e.target as HTMLElement).closest('[data-item]')) return;
                                                handleReportsAreaContextMenu(e);
                                            }}
                                        >
                                            <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3">
                                                <h2 className="text-sm font-semibold text-green-700 dark:text-green-300">
                                                    التقارير ({visibleInstances.length + visibleFolders.length})
                                                </h2>
                                            </div>
                                            {(visibleInstances.length > 0 || visibleFolders.length > 0) ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 sm:gap-4">
                                                    {/* Show instances first */}
                                                    {visibleInstances.map((instance) => {
                                                        const template = formTemplates[instance.template_id];
                                                        return (
                                                            <div
                                                                key={instance.instance_id}
                                                                data-item="instance"
                                                                className={cn(
                                                                    'group relative aspect-[0.95] sm:aspect-square rounded-win11-lg p-3 sm:p-4',
                                                                    'flex flex-col items-center justify-center gap-2',
                                                                    'cursor-pointer transition-all duration-200',
                                                                    isSelected(instance.instance_id)
                                                                        ? 'bg-win11-blue/10 border border-win11-blue shadow-[0_0_0_1px_rgba(0,95,184,0.3)]'
                                                                        : 'bg-white/70 dark:bg-white/5 border border-transparent hover:bg-white dark:hover:bg-white/10 hover:shadow-win11-hover',
                                                                    // Visual feedback for cut items
                                                                    isItemCut(instance.instance_id) && 'opacity-50 border-dashed border-orange-400'
                                                                )}
                                                                onClick={(e) => {
                                                                    if (handleItemClick(instance.instance_id, 'instance', e)) return;
                                                                    e.stopPropagation();
                                                                    selection.setSelection([instance.instance_id]);
                                                                }}
                                                                onDoubleClick={() => {
                                                                    const template = formTemplates[instance.template_id];
                                                                    const name = template ? `تقرير - ${template.name}` : 'تقرير';
                                                                    openInstanceForEdit(instance.instance_id, name);
                                                                }}
                                                                onContextMenu={(e) => {
                                                                    e.stopPropagation();
                                                                    handleInstanceContextMenu(e, instance);
                                                                }}
                                                            >
                                                                {/* Selection checkbox - only shows when 2+ items selected */}
                                                                {selectedCount >= 2 && isSelected(instance.instance_id) && (
                                                                    <div className="w-5 h-5 absolute top-2 right-2 rounded border flex items-center justify-center text-xs bg-win11-blue border-win11-blue text-white">
                                                                        ✓
                                                                    </div>
                                                                )}
                                                                {(() => {
                                                                    // \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0623\u064a\u0642\u0648\u0646\u0629 \u0648\u0627\u0644\u0644\u0648\u0646 \u062d\u0633\u0628 \u0627\u0644\u062d\u0627\u0644\u0629
                                                                    const statusIcons: Record<string, React.ElementType> = {
                                                                        draft: PencilSquareIcon,
                                                                        in_progress: PlayIcon,
                                                                        submitted: ClockIcon,
                                                                        under_review: EyeIcon,
                                                                        approved: CheckBadgeIcon,
                                                                        rejected: XCircleIcon,
                                                                        archived: ArchiveBoxIcon,
                                                                        cancelled: NoSymbolIcon
                                                                    };
                                                                    const statusBgColors: Record<string, string> = {
                                                                        draft: 'bg-gray-100 dark:bg-gray-800',
                                                                        in_progress: 'bg-yellow-100 dark:bg-yellow-900',
                                                                        submitted: 'bg-blue-100 dark:bg-blue-900',
                                                                        under_review: 'bg-purple-100 dark:bg-purple-900',
                                                                        approved: 'bg-green-100 dark:bg-green-900',
                                                                        rejected: 'bg-red-100 dark:bg-red-900',
                                                                        archived: 'bg-slate-100 dark:bg-slate-900',
                                                                        cancelled: 'bg-orange-100 dark:bg-orange-900'
                                                                    };
                                                                    const statusIconColors: Record<string, string> = {
                                                                        draft: 'text-gray-600 dark:text-gray-400',
                                                                        in_progress: 'text-yellow-600 dark:text-yellow-400',
                                                                        submitted: 'text-blue-600 dark:text-blue-400',
                                                                        under_review: 'text-purple-600 dark:text-purple-400',
                                                                        approved: 'text-green-600 dark:text-green-400',
                                                                        rejected: 'text-red-600 dark:text-red-400',
                                                                        archived: 'text-slate-600 dark:text-slate-400',
                                                                        cancelled: 'text-orange-600 dark:text-orange-400'
                                                                    };

                                                                    const StatusIcon = statusIcons[instance.status] || ClipboardDocumentCheckIcon;
                                                                    const statusBg = statusBgColors[instance.status] || 'bg-gray-100 dark:bg-gray-800';
                                                                    const statusColor = statusIconColors[instance.status] || 'text-gray-600 dark:text-gray-400';

                                                                    return (
                                                                        <div className={cn('p-2 rounded-lg', statusBg)}>
                                                                            <StatusIcon className={cn('w-8 h-8', statusColor)} />
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <span className="text-xs text-center line-clamp-2 text-gray-700 dark:text-gray-200 w-full break-words">
                                                                    {template?.name || 'تقرير'}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">
                                                                    {formatDate(instance.created_at)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Then show folders under Reports */}
                                                    {visibleFolders.map((folder) => (
                                                        <div
                                                            key={folder.id}
                                                            data-item="folder"
                                                            className={cn(
                                                                'group relative aspect-[0.95] sm:aspect-square rounded-win11-lg p-3 sm:p-4 select-none',
                                                                'flex flex-col items-center justify-center gap-2',
                                                                'cursor-pointer transition-all duration-200',
                                                                isSelected(folder.id)
                                                                    ? 'bg-win11-blue/10 border border-win11-blue shadow-[0_0_0_1px_rgba(0,95,184,0.3)]'
                                                                    : 'bg-white/70 dark:bg-white/5 border border-transparent hover:bg-white dark:hover:bg-white/10 hover:shadow-win11-hover',
                                                                // Visual feedback for cut items
                                                                isItemCut(folder.id) && 'opacity-50 border-dashed border-orange-400'
                                                            )}
                                                            onClick={(e) => {
                                                                if (!handleItemClick(folder.id, 'folder', e)) {
                                                                    e.stopPropagation();
                                                                    selection.setSelection([folder.id]);
                                                                }
                                                            }}
                                                            onDoubleClick={() => handleFolderDoubleClick(folder.id)}
                                                            onContextMenu={(e) => {
                                                                e.stopPropagation();
                                                                handleFolderContextMenu(e, folder);
                                                            }}
                                                        >
                                                            {/* Selection checkbox - only shows when 2+ items selected */}
                                                            {selectedCount >= 2 && isSelected(folder.id) && (
                                                                <div className="w-5 h-5 absolute top-2 right-2 rounded border flex items-center justify-center text-xs bg-win11-blue border-win11-blue text-white">
                                                                    ✓
                                                                </div>
                                                            )}
                                                            <FolderIcon className="w-12 h-12" style={{ color: folder.color || '#FBC02D' }} />
                                                            <span className="text-xs text-center line-clamp-2 text-gray-700 dark:text-gray-200 w-full break-words">
                                                                {getDisplayName(folder.name, folder.name_en, displayLanguage)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-20 text-gray-400 dark:text-gray-500 text-sm">
                                                    لا توجد تقارير - كلك يمين لإنشاء مجلد جديد
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Status Bar */}
                <div className="hidden sm:flex h-8 px-4 items-center gap-4 bg-white/40 dark:bg-black/20 border-t border-black/5 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400 select-none">
                    <span>{visibleItemsCount} عنصر</span>
                    <div className="h-3 w-px bg-gray-300 dark:bg-gray-600" />
                    <span>{selectedCount} محدد</span>

                    {/* Clipboard indicator in status bar */}
                    {clipboard && clipboard.items.length > 0 && (
                        <>
                            <div className="h-3 w-px bg-gray-300 dark:bg-gray-600" />
                            <span className={cn(
                                "flex items-center gap-1",
                                clipboard.type === 'cut' ? "text-orange-500" : "text-blue-500"
                            )}>
                                {clipboard.type === 'cut' ? (
                                    <>
                                        <ScissorsIcon className="w-3 h-3" />
                                        {clipboard.items.length} للنقل
                                    </>
                                ) : (
                                    <>
                                        <DocumentDuplicateIcon className="w-3 h-3" />
                                        {clipboard.items.length} للنسخ
                                    </>
                                )}
                            </span>
                        </>
                    )}

                    <div className="flex-1" />
                    <button className="hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded">
                        <Squares2X2Icon className="w-3 h-3" />
                    </button>
                    <button className="hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded">
                        <ListBulletIcon className="w-3 h-3" />
                    </button>
                </div>

                {isMobile && showQuickAccess && (
                    <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[1px] lg:hidden" onClick={() => setShowQuickAccess(false)}>
                        <div className="absolute right-0 top-0 h-full w-[18rem]" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setShowQuickAccess(false)}
                                className="absolute top-2 left-2 z-10 p-1.5 rounded-md bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 shadow-md"
                                title="إغلاق"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                            <QuickAccessSidebar
                                recentItems={recentItems}
                                favoriteItems={favoriteItems}
                                pinnedFolders={[]}
                                recycleBinCount={recycleBinItems.length}
                                onRecycleBinClick={() => {
                                    navigateToFolder('__recycle_bin__');
                                    setShowQuickAccess(false);
                                }}
                                onArchiveClick={() => {
                                    navigateToFolder('__archive__');
                                    setShowQuickAccess(false);
                                }}
                                onItemClick={handleQuickAccessItemClick}
                                onToggleFavorite={handleToggleFavorite}
                                solidBackground={true}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <FolderDialog
                isOpen={showFolderDialog}
                onClose={() => setShowFolderDialog(false)}
                folder={editingFolder}
                parentId={parentIdForNewFolder || currentFolderId}
                onSuccess={(actionType, item, originalItem) => {
                    if (actionType === 'create') {
                        addAction({
                            type: 'paste', // We treat create as paste (creation of items) for undo purposes or use a new type
                            description: `إنشاء مجلد ${item.name}`,
                            data: {
                                itemIds: [item.id],
                                itemTypes: new Map([[item.id, 'folder']]),
                                sourceFolder: null,
                                targetFolder: parentIdForNewFolder || currentFolderId,
                                wasCut: false
                            },
                            canUndo: true,
                        });
                    } else if (actionType === 'update' && originalItem) {
                        addAction({
                            type: 'rename',
                            description: `تعديل مجلد ${originalItem.name}`,
                            data: {
                                itemId: item.id,
                                itemType: 'folder',
                                oldName: originalItem.name,
                                newName: item.name,
                                itemIds: [item.id],
                                itemTypes: new Map([[item.id, 'folder']]),
                                sourceFolder: null,
                                targetFolder: null,
                            },
                            canUndo: true,
                        });
                    }
                }}
            />

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems()}
                    onClose={closeContextMenu}
                />
            )}

            {/* Bulk Actions Toolbar - Removed per user request */}

            {/* Unsaved Changes Dialog for Tabs */}

        </div>
    );
};

export default FoldersPage;
