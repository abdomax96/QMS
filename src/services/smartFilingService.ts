import { generateId } from '../utils';
import { foldersService } from './supabaseService';
import useStore from '../store';
import type { FormInstance, FormTemplate, Folder } from '../types';

export const smartFilingService = {
    /**
     * Applies smart filing logic to organize reports into hierarchical folders
     * Structure: Template Name (or Product Name) > Date > Shift
     * Returns the ID of the final folder where the report should be saved
     */
    async applySmartFiling(
        instanceData: FormInstance,
        template: FormTemplate,
        userProfile: { uid: string } | null | undefined
    ): Promise<string | null> {
        if (!template) {
            console.log('⚠️ [Smart Filing] No template, skipping folder structure');
            return null;
        }

        try {
            console.log('🗂️ [Smart Filing] Starting folder structure creation...');
            console.log('📍 [Smart Filing] Template folder_id:', template.folder_id);

            // Get store methods for local updates
            const { addFolder } = useStore.getState();

            // Fetch folders ONCE
            const allFolders = await foldersService.getAllFolders();
            // Create a local mutable copy to track new creations without refetching
            const localFolders = { ...allFolders };
            const localFoldersList = () => Object.values(localFolders);

            console.log('📁 [Smart Filing] Current folders count:', localFoldersList().length);

            // The parent folder is the template's folder (where the template lives)
            let templateParentId = template.folder_id || null;

            // If template has a parent, but that parent is NOT in folders, check if we can recover or log warning
            if (templateParentId && !localFolders[templateParentId]) {
                console.warn('⚠️ [Smart Filing] Template folder not found in unified folders:', templateParentId);
                // Fallback to root if folder missing
                templateParentId = null;
            }

            console.log('📍 [Smart Filing] Parent folder for new structure:', templateParentId);

            // 1. Find or Create Report Folder
            let reportFolderName = template.name;
            if (template.name.startsWith('نموذج منتج ')) {
                const productName = template.name.replace('نموذج منتج ', '');
                reportFolderName = `تقارير منتج ${productName}`;
            }

            let templateNameFolder = localFoldersList().find(
                f => f.name === reportFolderName && f.parent_id === templateParentId
            );

            if (!templateNameFolder) {
                console.log('📁 [Smart Filing] Creating report folder:', reportFolderName);
                const newFolderId = generateId();
                const parentFolder = templateParentId ? localFolders[templateParentId] : null;
                const basePath = parentFolder?.path || '';
                const now = new Date().toISOString();

                templateNameFolder = {
                    id: newFolderId,
                    name: reportFolderName,
                    type: 'department',
                    parent_id: templateParentId,
                    created_at: now,
                    created_by: userProfile?.uid || 'system',
                    modified_at: now,
                    icon: '📋',
                    color: '#10B981',
                    path: basePath + '/' + reportFolderName,
                    metadata: { isSmartFiling: true, templateId: template.id },
                    permissions: { owner: userProfile?.uid || 'system', viewers: [], editors: [] },
                    stats: { reports_count: 0, storage_used_mb: 0, form_templates_count: 0 },
                    is_system: false,
                    company_id: userProfile?.uid || 'system',
                    sort_order: 0,
                    description: ''
                };

                await foldersService.saveFolder(templateNameFolder);
                addFolder(templateNameFolder);
                localFolders[templateNameFolder.id] = templateNameFolder;
                console.log('✅ [Smart Filing] Report folder created:', templateNameFolder.id);
            } else {
                console.log('✓ [Smart Filing] Report folder exists:', templateNameFolder.id);
            }

            if (!templateNameFolder) {
                console.error('❌ [Smart Filing] Failed to create/find report folder');
                throw new Error('فشل إنشاء مجلد التقارير الرئيسي');
            }

            let targetFolderId = templateNameFolder.id;
            const reportDate = instanceData.form_data.report_date || new Date().toISOString().split('T')[0];

            // 2. Find or Create Date Folder
            let dateFolder = localFoldersList().find(
                f => f.name === reportDate && f.parent_id === templateNameFolder!.id
            );

            if (!dateFolder) {
                console.log('📅 [Smart Filing] Creating date folder:', reportDate);
                const newDateFolderId = generateId();
                const now = new Date().toISOString();

                dateFolder = {
                    id: newDateFolderId,
                    name: reportDate,
                    type: 'date-based' as any, // Using 'any' to bypass strict type check if 'date-based' isn't in union yet, but it should be fine if Folders type allows string
                    parent_id: templateNameFolder.id,
                    created_at: now,
                    created_by: userProfile?.uid || 'system',
                    modified_at: now,
                    icon: '📅',
                    color: '#6B7280',
                    path: templateNameFolder.path + '/' + reportDate,
                    metadata: { isSmartFiling: true },
                    permissions: { owner: userProfile?.uid || 'system', viewers: [], editors: [] },
                    stats: { reports_count: 0, storage_used_mb: 0, form_templates_count: 0 },
                    is_system: false,
                    company_id: userProfile?.uid || 'system',
                    sort_order: 0,
                    description: ''
                };

                await foldersService.saveFolder(dateFolder);
                addFolder(dateFolder);
                localFolders[dateFolder.id] = dateFolder;
                console.log('✅ [Smart Filing] Date folder created:', dateFolder.id);
            } else {
                console.log('✓ [Smart Filing] Date folder exists:', dateFolder.id);
            }

            if (dateFolder) {
                targetFolderId = dateFolder.id;

                // 3. Find or Create Shift Folder (if shift exists)
                const shift = instanceData.form_data.shift;
                if (shift) {
                    const shiftFolderName = `الوردية ${shift}`;

                    let shiftFolder = localFoldersList().find(
                        f => f.name === shiftFolderName && f.parent_id === dateFolder!.id
                    );

                    if (!shiftFolder) {
                        console.log('⏰ [Smart Filing] Creating shift folder:', shiftFolderName);
                        const newShiftFolderId = generateId();
                        const now = new Date().toISOString();

                        shiftFolder = {
                            id: newShiftFolderId,
                            name: shiftFolderName,
                            type: 'department',
                            parent_id: dateFolder.id,
                            created_at: now,
                            created_by: userProfile?.uid || 'system',
                            modified_at: now,
                            icon: '🕐',
                            color: '#8B5CF6',
                            path: dateFolder.path + '/' + shiftFolderName,
                            metadata: { isSmartFiling: true, shift },
                            permissions: { owner: userProfile?.uid || 'system', viewers: [], editors: [] },
                            stats: { reports_count: 0, storage_used_mb: 0, form_templates_count: 0 },
                            is_system: false,
                            company_id: userProfile?.uid || 'system',
                            sort_order: 0,
                            description: ''
                        };

                        await foldersService.saveFolder(shiftFolder);
                        addFolder(shiftFolder);
                        localFolders[shiftFolder.id] = shiftFolder;
                        console.log('✅ [Smart Filing] Shift folder created:', shiftFolder.id);
                    } else {
                        console.log('✓ [Smart Filing] Shift folder exists:', shiftFolder.id);
                    }

                    if (shiftFolder) {
                        targetFolderId = shiftFolder.id;
                    }
                }
            }

            console.log('✅ [Smart Filing] Final folder_id:', targetFolderId);
            return targetFolderId;
        } catch (error: any) {
            console.error('❌ [Smart Filing] Error:', error);
            throw error;
        }
    }
};
