/**
 * UnifiedFormsReports Page
 * Main page for the new unified folders and reports system
 */

import React, { useState } from 'react';
import {
    FolderIcon,
    ShareIcon,
    MagnifyingGlassIcon,
    Squares2X2Icon,
    ListBulletIcon,
    AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../utils';
import { useUnifiedFolders } from '../hooks/useUnifiedFolders';
import { useContentSharing } from '../hooks/useContentSharing';
import FolderGrid from '../components/unified-folders/FolderGrid';
import SharedContentView from '../components/unified-folders/SharedContentView';
import ShareDialog from '../components/unified-folders/ShareDialog';
import CreateFolderDialog from '../components/unified-folders/CreateFolderDialog';
import FolderBreadcrumb from '../components/unified-folders/FolderBreadcrumb';
import FolderContentView from '../components/unified-folders/FolderContentView';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import type { FolderFormData } from '../components/unified-folders/CreateFolderDialog';

type ViewMode = 'grid' | 'list';
type ActiveTab = 'my-folders' | 'shared';

const UnifiedFormsReports: React.FC = () => {
    const { profile } = useSupabaseAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>('my-folders');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<any>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [currentFolder, setCurrentFolder] = useState<any>(null);
    const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string; icon?: string }>>([]);
    const [viewingContent, setViewingContent] = useState(false);

    // Load folders for current user's department
    const {
        folders,
        loading,
        createFolder,
        toggleFavorite,
        getFolderById,
    } = useUnifiedFolders({
        departmentId: profile?.department_id,
        parentId: currentFolderId,
        enableRealtime: true,
    });

    const { createShare, sharedWithMe } = useContentSharing();

    const handleFolderOpen = async (folder: any) => {
        // Check if folder has subfolders or it's a leaf folder (contains forms/reports)
        const hasContentTypes = folder.content_types && folder.content_types.length > 0;

        if (hasContentTypes && !folder.has_children) {
            // Leaf folder - show content
            setCurrentFolder(folder);
            setViewingContent(true);
            setFolderPath([...folderPath, { id: folder.id, name: folder.name, icon: folder.icon }]);
        } else {
            // Has subfolders - navigate into it
            setCurrentFolderId(folder.id);
            setViewingContent(false);
            setFolderPath([...folderPath, { id: folder.id, name: folder.name, icon: folder.icon }]);
        }
    };

    const handleNavigate = (folderId: string | null) => {
        if (folderId === null) {
            // Navigate to root
            setCurrentFolderId(null);
            setCurrentFolder(null);
            setViewingContent(false);
            setFolderPath([]);
        } else {
            // Navigate to specific folder in path
            const folderIndex = folderPath.findIndex(f => f.id === folderId);
            if (folderIndex !== -1) {
                setCurrentFolderId(folderId);
                setCurrentFolder(null);
                setViewingContent(false);
                setFolderPath(folderPath.slice(0, folderIndex + 1));
            }
        }
    };

    const handleCreateFolder = () => {
        setShowCreateDialog(true);
    };

    const handleCreateSubmit = async (folderData: FolderFormData) => {
        try {
            await createFolder(folderData);
            setShowCreateDialog(false);
        } catch (error) {
            console.error('Error creating folder:', error);
            throw error;
        }
    };

    const handleShare = (folder: any) => {
        setSelectedFolder(folder);
        setShowShareDialog(true);
    };

    const handleShareSubmit = async (config: any) => {
        try {
            await createShare({
                contentType: 'folder',
                contentId: selectedFolder.id,
                ...config,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    // Filter folders by search
    const filteredFolders = folders.filter(folder =>
        folder.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        folder.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
                    {/* Title & Actions */}
                    <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-corporate bg-gradient-primary flex items-center justify-center shadow-glow-primary flex-shrink-0">
                                <FolderIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                                    النماذج والتقارير
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                                    Forms & Reports - Unified System
                                </p>
                            </div>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-corporate p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        'min-h-[40px] min-w-[40px] p-2 rounded-corporate transition-all',
                                        viewMode === 'grid'
                                            ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600'
                                            : 'text-slate-500 hover:text-slate-700'
                                    )}
                                    title="عرض شبكي"
                                >
                                    <Squares2X2Icon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        'min-h-[40px] min-w-[40px] p-2 rounded-corporate transition-all',
                                        viewMode === 'list'
                                            ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600'
                                            : 'text-slate-500 hover:text-slate-700'
                                    )}
                                    title="عرض قائمة"
                                >
                                    <ListBulletIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <button className="min-h-[40px] min-w-[40px] p-2 rounded-corporate hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-400">
                                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs & Search */}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        {/* Tabs */}
                        <div className="w-full lg:w-auto overflow-x-auto pb-1 -mx-1 px-1 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0">
                            <div className="flex items-center gap-2 min-w-max lg:min-w-0">
                            <button
                                onClick={() => setActiveTab('my-folders')}
                                className={cn(
                                    'min-h-[40px] px-3 sm:px-4 py-2 rounded-corporate-lg font-medium text-sm transition-all whitespace-nowrap',
                                    activeTab === 'my-folders'
                                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <FolderIcon className="w-4 h-4" />
                                    <span>مجلداتي</span>
                                    <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-xs font-semibold">
                                        {folders.length}
                                    </span>
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('shared')}
                                className={cn(
                                    'min-h-[40px] px-3 sm:px-4 py-2 rounded-corporate-lg font-medium text-sm transition-all whitespace-nowrap',
                                    activeTab === 'shared'
                                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <ShareIcon className="w-4 h-4" />
                                    <span>المحتوى المشترك</span>
                                    {sharedWithMe.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-semibold animate-pulse">
                                            {sharedWithMe.length}
                                        </span>
                                    )}
                                </span>
                            </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-full lg:max-w-md">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="بحث في المجلدات..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-corporate focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:text-white placeholder-slate-400"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
                {/* Breadcrumb */}
                {activeTab === 'my-folders' && folderPath.length > 0 && (
                    <div className="mb-4 sm:mb-6">
                        <FolderBreadcrumb
                            path={folderPath}
                            onNavigate={handleNavigate}
                        />
                    </div>
                )}

                {activeTab === 'my-folders' ? (
                    viewingContent && currentFolder ? (
                        // Viewing folder contents
                        <FolderContentView
                            folderId={currentFolder.id}
                            folderName={currentFolder.name}
                            contentTypes={currentFolder.content_types || []}
                        />
                    ) : (
                        // Browsing folders
                        <div className="space-y-5 sm:space-y-6">
                            {/* Section: My Department */}
                            <section>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                                        {currentFolderId ? '📂 المجلدات الفرعية' : '🏢 مجلدات قسمي'}
                                    </h2>
                                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                        {filteredFolders.length} مجلد
                                    </span>
                                </div>

                                <FolderGrid
                                    folders={filteredFolders}
                                    loading={loading}
                                    onFolderOpen={handleFolderOpen}
                                    onFolderCreate={handleCreateFolder}
                                    onToggleFavorite={(folder) => toggleFavorite(folder.id)}
                                    onShare={handleShare}
                                    showCreateButton={true}
                                    className={cn(viewMode === 'list' && '!grid-cols-1')}
                                />
                            </section>

                            {/* Section: Favorites (if any) */}
                            {!currentFolderId && folders.some(f => f.is_favorite) && (
                                <section>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                                            ⭐ المفضلة
                                        </h2>
                                        <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                            {folders.filter(f => f.is_favorite).length} مجلد
                                        </span>
                                    </div>

                                    <FolderGrid
                                        folders={folders.filter(f => f.is_favorite)}
                                        loading={loading}
                                        onFolderOpen={handleFolderOpen}
                                        onToggleFavorite={(folder) => toggleFavorite(folder.id)}
                                        onShare={handleShare}
                                        showCreateButton={false}
                                        className={cn(viewMode === 'list' && '!grid-cols-1')}
                                    />
                                </section>
                            )}
                        </div>
                    )
                ) : (
                    <SharedContentView />
                )}
            </div>

            {/* Share Dialog */}
            {showShareDialog && selectedFolder && (
                <ShareDialog
                    isOpen={showShareDialog}
                    onClose={() => {
                        setShowShareDialog(false);
                        setSelectedFolder(null);
                    }}
                    contentName={selectedFolder.name}
                    contentType="folder"
                    onShare={handleShareSubmit}
                />
            )}

            {/* Create Folder Dialog */}
            {showCreateDialog && (
                <CreateFolderDialog
                    isOpen={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)}
                    onSubmit={handleCreateSubmit}
                    parentFolder={currentFolderId ? folderPath[folderPath.length - 1] : null}
                    departmentId={profile?.department_id || ''}
                />
            )}
        </div>
    );
};

export default UnifiedFormsReports;
