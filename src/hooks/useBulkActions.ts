/**
 * useBulkActions Hook
 * 
 * Extracted from Folders.tsx to handle bulk operations on folders, templates, and instances.
 * Includes: delete, archive, cut, copy, paste, undo/redo operations with recycle bin support.
 */

import { useCallback, useState } from 'react';
import type { Folder, FormTemplate, FormInstance } from '../types';
import * as recycleBinService from '../services/recycleBinService';
import type { RecycleBinItem } from '../services/recycleBinService';
import { useUndoRedo, type UndoableAction } from './useUndoRedo';

// Types for bulk actions
export type ItemType = 'folder' | 'template' | 'instance';

export interface ClipboardState {
    type: 'cut' | 'copy';
    items: string[];
    sourceFolder: string | null;
    itemTypes: Map<string, ItemType>;
}

export interface BulkActionsConfig {
    // Data sources
    folders: Record<string, Folder>;
    formTemplates: Record<string, FormTemplate>;
    formInstances: Record<string, FormInstance>;

    // Current context
    currentFolderId: string | null;
    userId: string;

    // Selection management
    selectedItems: Set<string>;
    selectedCount: number;
    deselectAll: () => void;

    // Store actions for CRUD operations
    deleteFolder: (id: string) => Promise<void> | void;
    deleteFormTemplate: (id: string) => Promise<void> | void;
    deleteFormInstance: (id: string) => Promise<void> | void;

    addFolder: (folder: Folder) => Promise<void> | void;
    addFormTemplate: (template: FormTemplate) => Promise<void> | void;
    addFormInstance: (instance: FormInstance) => Promise<void> | void;

    updateFolder: (id: string, updates: Partial<Folder>) => Promise<void> | void;
    updateFormTemplate?: (id: string, updates: Partial<FormTemplate>) => Promise<void> | void;
    updateFormInstance?: (id: string, updates: Partial<FormInstance>) => Promise<void> | void;

    moveFolder: (id: string, targetFolderId: string | null) => Promise<void> | void;
    moveFormTemplate?: (id: string, targetFolderId: string | null) => Promise<void> | void;
    moveFormInstance?: (id: string, targetFolderId: string | null) => Promise<void> | void;

    copyFolder: (id: string, targetFolderId: string | null) => Promise<void> | void;
    duplicateFormTemplate: (id: string) => Promise<void> | void;

    archiveFolder?: (id: string) => Promise<void> | void;
    archiveFormTemplate?: (id: string) => Promise<void> | void;
    archiveFormInstance?: (id: string) => Promise<void> | void;

    // Navigation
    setCurrentFolder: (id: string | null) => void;
}

export interface BulkActionsResult {
    // Clipboard state
    clipboard: ClipboardState | null;
    isItemCut: (id: string) => boolean;

    // Recycle bin
    recycleBinItems: RecycleBinItem[];
    recycleBinEnabled: boolean;

    // Undo/Redo state
    canUndo: boolean;
    canRedo: boolean;

    // Bulk action handlers
    handleBulkDelete: (targetIds?: string[]) => Promise<void>;
    handleBulkArchive: () => void;
    handleBulkAddTag: () => void;
    handleBulkChangeStatus: (status: string) => void;

    // Clipboard operations
    handleCut: () => void;
    handleCopy: () => void;
    handlePaste: (targetFolderId?: string | null) => Promise<void>;
    handleShare: () => void;

    // Undo/Redo operations
    handleUndo: () => Promise<void>;
    handleRedo: () => Promise<void>;

    // Utilities
    getItemType: (id: string) => ItemType | null;
    collectFolderContents: (folderId: string) => {
        folders: Folder[];
        templates: FormTemplate[];
        instances: FormInstance[];
    };
}

/**
 * Hook for bulk operations on file explorer items
 */
export function useBulkActions(config: BulkActionsConfig): BulkActionsResult {
    const {
        folders,
        formTemplates,
        formInstances,
        currentFolderId,
        userId,
        selectedItems,
        selectedCount,
        deselectAll,
        deleteFolder,
        deleteFormTemplate,
        deleteFormInstance,
        addFolder,
        addFormTemplate,
        addFormInstance,
        updateFolder,
        updateFormTemplate,
        updateFormInstance,
        moveFolder,
        moveFormTemplate,
        moveFormInstance,
        copyFolder,
        duplicateFormTemplate,
        archiveFolder,
        archiveFormTemplate,
        archiveFormInstance,
        setCurrentFolder,
    } = config;

    // Clipboard state
    const [clipboard, setClipboard] = useState<ClipboardState | null>(null);

    // Recycle bin state
    const [recycleBinEnabled] = useState(true);
    const [recycleBinItems, setRecycleBinItems] = useState<RecycleBinItem[]>([]);

    // Undo/Redo support
    const {
        canUndo,
        canRedo,
        addAction,
        getUndoAction,
        getRedoAction,
        markUndone,
        markRedone,
    } = useUndoRedo({
        userId: userId || 'anonymous',
        sessionId: sessionStorage.getItem('sessionId') || Date.now().toString()
    });

    // ==================== Utility Functions ====================

    /**
     * Determine item type based on ID
     */
    const getItemType = useCallback((id: string): ItemType | null => {
        if (folders[id]) return 'folder';
        if (formTemplates[id]) return 'template';
        if (formInstances[id]) return 'instance';
        return null;
    }, [folders, formTemplates, formInstances]);

    /**
     * Check if an item is currently cut (for visual feedback)
     */
    const isItemCut = useCallback((id: string): boolean => {
        return clipboard?.type === 'cut' && clipboard.items.includes(id);
    }, [clipboard]);

    /**
     * Recursively collect all contents of a folder (for deletion/restoration)
     */
    const collectFolderContents = useCallback((folderId: string) => {
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
    }, [folders, formTemplates, formInstances]);

    // ==================== Bulk Delete Handler ====================

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
        const itemTypesMap = new Map<string, ItemType>();

        for (const id of itemsToDelete) {
            try {
                // Check if it's a folder
                if (folders[id]) {
                    const folder = folders[id];
                    itemTypesMap.set(id, 'folder');

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
                        }, userId || 'anonymous');
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
                        }, userId || 'anonymous');
                    }

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
                        }, userId || 'anonymous');
                    }

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
    }, [selectedItems, folders, formTemplates, formInstances, deleteFolder, deleteFormTemplate, deleteFormInstance, deselectAll, recycleBinEnabled, userId, currentFolderId, addAction, collectFolderContents]);

    // ==================== Bulk Archive Handler ====================

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
        }
    }, [selectedItems, selectedCount, deselectAll, getItemType, archiveFolder, archiveFormTemplate, archiveFormInstance]);

    // ==================== Bulk Add Tag Handler ====================

    const handleBulkAddTag = useCallback(() => {
        if (selectedCount === 0) return;
        const tagName = window.prompt('أدخل اسم العلامة:');
        if (tagName) {
            console.log('Adding tag:', tagName, 'to items:', Array.from(selectedItems));
            deselectAll();
        }
    }, [selectedItems, selectedCount, deselectAll]);

    // ==================== Bulk Change Status Handler ====================

    const handleBulkChangeStatus = useCallback((status: string) => {
        if (selectedCount === 0) return;
        console.log('Changing status to:', status, 'for items:', Array.from(selectedItems));
        deselectAll();
    }, [selectedItems, selectedCount, deselectAll]);

    // ==================== Cut Handler ====================

    const handleCut = useCallback(() => {
        if (selectedCount === 0) return;
        const selectedIds = Array.from(selectedItems);

        // Track types of each item
        const itemTypes = new Map<string, ItemType>();
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

        console.log(`✂️ Cut ${selectedIds.length} items for moving`);
    }, [selectedItems, selectedCount, currentFolderId, getItemType]);

    // ==================== Copy Handler ====================

    const handleCopy = useCallback(() => {
        if (selectedCount === 0) return;
        const selectedIds = Array.from(selectedItems);

        // Track types of each item
        const itemTypes = new Map<string, ItemType>();
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

    // ==================== Paste Handler ====================

    const handlePaste = useCallback(async (targetFolderId?: string | null) => {
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
                            await moveFolder(id, destinationFolderId);
                        } else {
                            await copyFolder(id, destinationFolderId);
                        }
                        successCount++;
                    }
                } else if (itemType === 'template') {
                    const template = formTemplates[id];
                    if (template) {
                        if (clipboard.type === 'copy') {
                            await duplicateFormTemplate(id);
                            successCount++;
                        } else if (clipboard.type === 'cut' && moveFormTemplate) {
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
                                created_by: userId || 'unknown',
                                status: 'draft',
                                submitted_at: undefined,
                                submitted_by: undefined,
                            };
                            await addFormInstance(newInstance);
                            successCount++;
                        } else if (clipboard.type === 'cut' && moveFormInstance) {
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

        // Navigate to destination if different from current
        if (destinationFolderId !== currentFolderId) {
            setCurrentFolder(destinationFolderId);
        }
    }, [clipboard, folders, currentFolderId, copyFolder, moveFolder, formTemplates, formInstances, duplicateFormTemplate, deselectAll, addAction, setCurrentFolder, moveFormTemplate, moveFormInstance, addFormInstance, userId]);

    // ==================== Share Handler ====================

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
                navigator.clipboard.writeText(shareText);
                alert('تم نسخ المعلومات إلى الحافظة');
            });
        } else {
            navigator.clipboard.writeText(shareText);
            alert('تم نسخ المعلومات إلى الحافظة');
        }
    }, [selectedItems, selectedCount, folders, formTemplates, formInstances]);

    // ==================== Undo Handler ====================

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

                            // Try to find and remove from recycle bin
                            const recycleBinItemsList = await recycleBinService.getRecycleBinItems();
                            const rbItem = recycleBinItemsList.find(rb => rb.originalId === (item.id || item.instance_id));
                            if (rbItem) {
                                await recycleBinService.removeFromRecycleBin(rbItem.id);
                            }

                            // Restore item based on type
                            if (itemType === 'folder' && addFolder) {
                                const contents = item._contents || (rbItem?.data?.contents);
                                const folderData = rbItem?.data?.folder || item;

                                // Remove internal _contents field before saving
                                const { _contents, ...cleanFolder } = folderData;

                                // Restore parent folder first
                                await addFolder(cleanFolder);

                                // Restore children if we have bundled content
                                if (contents) {
                                    const { folders: childFolders, templates, instances } = contents;

                                    if (childFolders) {
                                        for (const f of childFolders) {
                                            await addFolder(f);
                                        }
                                    }

                                    if (templates && addFormTemplate) {
                                        for (const t of templates) {
                                            await addFormTemplate(t);
                                        }
                                    }

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
                    // For paste undo, delete the created items
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
                            } else if (itemType === 'template' && moveFormTemplate) {
                                moveFormTemplate(id, action.data.sourceFolder);
                            } else if (itemType === 'instance' && moveFormInstance) {
                                moveFormInstance(id, action.data.sourceFolder);
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
                        } else if (itemType === 'template' && updateFormTemplate) {
                            updateFormTemplate(action.data.itemId, { name: action.data.oldName });
                        } else if (itemType === 'instance' && updateFormInstance) {
                            updateFormInstance(action.data.itemId, { name: action.data.oldName });
                        }
                    }
                    break;
            }

            markUndone();
        } catch (error) {
            console.error('Undo failed:', error);
            alert('فشل التراجع عن العملية');
        }
    }, [getUndoAction, markUndone, addFolder, addFormTemplate, addFormInstance, deleteFolder, deleteFormTemplate, deleteFormInstance, moveFolder, moveFormTemplate, moveFormInstance, updateFolder, updateFormTemplate, updateFormInstance]);

    // ==================== Redo Handler ====================

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
                                }, userId || 'unknown');
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
                                }, userId || 'unknown');
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
                                }, userId || 'unknown');
                            }
                            await deleteFormInstance(id);
                        }
                    }
                    setRecycleBinItems(await recycleBinService.getRecycleBinItems());
                    break;

                case 'paste':
                    // Redo paste - move back to target for cuts
                    if (action.data.wasCut && action.data.targetFolder !== undefined) {
                        for (const id of action.data.itemIds) {
                            const itemType = action.data.itemTypes.get(id);
                            if (itemType === 'folder') {
                                moveFolder(id, action.data.targetFolder);
                            } else if (itemType === 'template' && moveFormTemplate) {
                                moveFormTemplate(id, action.data.targetFolder);
                            } else if (itemType === 'instance' && moveFormInstance) {
                                moveFormInstance(id, action.data.targetFolder);
                            }
                        }
                    }
                    break;

                case 'cut':
                    // Redo cut = move items back to target folder
                    if (action.data.targetFolder !== undefined) {
                        for (const id of action.data.itemIds) {
                            const itemType = action.data.itemTypes.get(id);
                            if (itemType === 'folder') {
                                moveFolder(id, action.data.targetFolder);
                            } else if (itemType === 'template' && moveFormTemplate) {
                                moveFormTemplate(id, action.data.targetFolder);
                            } else if (itemType === 'instance' && moveFormInstance) {
                                moveFormInstance(id, action.data.targetFolder);
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
                        } else if (itemType === 'template' && updateFormTemplate) {
                            updateFormTemplate(action.data.itemId, { name: action.data.newName });
                        } else if (itemType === 'instance' && updateFormInstance) {
                            updateFormInstance(action.data.itemId, { name: action.data.newName });
                        }
                    }
                    break;
            }

            markRedone();
        } catch (error) {
            console.error('Redo failed:', error);
            alert('فشل إعادة العملية');
        }
    }, [getRedoAction, markRedone, deleteFolder, deleteFormTemplate, deleteFormInstance, folders, formTemplates, formInstances, moveFolder, moveFormTemplate, moveFormInstance, updateFolder, updateFormTemplate, updateFormInstance, userId]);

    return {
        // Clipboard state
        clipboard,
        isItemCut,

        // Recycle bin
        recycleBinItems,
        recycleBinEnabled,

        // Undo/Redo state
        canUndo,
        canRedo,

        // Bulk action handlers
        handleBulkDelete,
        handleBulkArchive,
        handleBulkAddTag,
        handleBulkChangeStatus,

        // Clipboard operations
        handleCut,
        handleCopy,
        handlePaste,
        handleShare,

        // Undo/Redo operations
        handleUndo,
        handleRedo,

        // Utilities
        getItemType,
        collectFolderContents,
    };
}
