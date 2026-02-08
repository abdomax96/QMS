import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FolderOpenIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import {
  DocumentIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Folder } from '../../types';
import { cn } from '../../utils';
import useStore from '../../store';
import { useLanguageStore, getDisplayName } from '../../store/languageStore';

interface FolderTreeItemProps {
  folder: Folder;
  level: number;
  onSelect: (folder: Folder) => void;
  onContextMenu: (e: React.MouseEvent, folder: Folder) => void;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  folder,
  level,
  onSelect,
  onContextMenu
}) => {
  const {
    expandedFolders,
    toggleFolderExpanded,
    getFolderChildren,
    getTemplatesInFolder,
    getInstancesInFolder,
    currentFolderId
  } = useStore();

  const { displayLanguage } = useLanguageStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = currentFolderId === folder.id;
  const children = getFolderChildren(folder.id).filter(c => !c.archived);
  const templates = getTemplatesInFolder(folder.id);
  const instances = getInstancesInFolder(folder.id);
  const hasChildren = children.length > 0 || templates.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleFolderExpanded(folder.id);
    }
  };

  const handleSelect = () => {
    onSelect(folder);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors',
          isSelected && 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300',
          folder.archived && 'opacity-60'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
        onContextMenu={(e) => onContextMenu(e, folder)}
        {...attributes}
        {...listeners}
      >
        <button
          onClick={handleToggle}
          className={cn(
            'p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded',
            !hasChildren && 'invisible'
          )}
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center gap-2 flex-1">
          {folder.archived ? (
            <ArchiveBoxIcon className="w-5 h-5" style={{ color: folder.color }} />
          ) : isExpanded ? (
            <FolderOpenIcon className="w-5 h-5" style={{ color: folder.color }} />
          ) : (
            <FolderIcon className="w-5 h-5" style={{ color: folder.color }} />
          )}
          <span className="text-sm font-medium line-clamp-2">{getDisplayName(folder.name, folder.name_en, displayLanguage)}</span>
          <div className="flex items-center gap-2 ml-auto">
            {templates.length > 0 && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                {templates.length}
              </span>
            )}
            {instances.length > 0 && (
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                {instances.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div>
          {children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}

          {templates.map(template => (
            <div
              key={template.id}
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              style={{ paddingLeft: `${(level + 1) * 16 + 24}px` }}
            >
              <DocumentIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {getDisplayName(template.name, template.name_en, displayLanguage)}
              </span>
              <span className="text-xs text-gray-500 ml-auto">
                v{template.version}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// System Folders Section - Archive & Recycle Bin
const SystemFoldersSection: React.FC = () => {
  const navigate = useNavigate();
  const { folders, formTemplates, formInstances, currentFolderId, setCurrentFolder } = useStore();
  const [isExpanded, setIsExpanded] = useState(true);

  // Count archived items - convert Record to array for filtering
  const allFolders = Object.values(folders);
  const allTemplates = Object.values(formTemplates);
  const allInstances = Object.values(formInstances);
  const archivedFolders = allFolders.filter(f => f.archived);
  const archivedTemplates = allTemplates.filter(t => t.archived);
  const archivedInstances = allInstances.filter(i => i.archived);
  const totalArchived = archivedFolders.length + archivedTemplates.length + archivedInstances.length;

  // We'll need to get recycle bin count from the service
  const [recycleBinCount, setRecycleBinCount] = useState(0);

  React.useEffect(() => {
    // Load recycle bin count
    const loadRecycleBinCount = async () => {
      try {
        const { getRecycleBinItems } = await import('../../services/recycleBinService');
        const items = await getRecycleBinItems();
        setRecycleBinCount(items.length);
      } catch (error) {
        console.error('Error loading recycle bin count:', error);
      }
    };
    loadRecycleBinCount();
  }, [allFolders, allTemplates, allInstances]); // Refresh when items change

  const isArchiveSelected = currentFolderId === '__archive__';
  const isRecycleBinSelected = currentFolderId === '__recycle_bin__';

  const handleArchiveClick = () => {
    setCurrentFolder('__archive__');
    navigate('/folders/__archive__');
  };

  const handleRecycleBinClick = () => {
    setCurrentFolder('__recycle_bin__');
    navigate('/folders/__recycle_bin__');
  };

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div
        className="flex items-center justify-between mb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          النظام
        </h3>
        <button className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
          {isExpanded ? (
            <ChevronDownIcon className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRightIcon className="w-3 h-3 text-gray-500" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-0.5">
          {/* Archive */}
          <div
            className={cn(
              'flex items-center gap-2 py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors',
              isArchiveSelected && 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            )}
            onClick={handleArchiveClick}
          >
            <ArchiveBoxIcon className={cn(
              'w-5 h-5',
              isArchiveSelected ? 'text-amber-600' : 'text-amber-500'
            )} />
            <span className="text-sm font-medium flex-1">الأرشيف</span>
            {totalArchived > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                {totalArchived}
              </span>
            )}
          </div>

          {/* Recycle Bin */}
          <div
            className={cn(
              'flex items-center gap-2 py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors',
              isRecycleBinSelected && 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            )}
            onClick={handleRecycleBinClick}
          >
            <TrashIcon className={cn(
              'w-5 h-5',
              isRecycleBinSelected ? 'text-red-600' : 'text-red-500'
            )} />
            <span className="text-sm font-medium flex-1">سلة المحذوفات</span>
            {recycleBinCount > 0 && (
              <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                {recycleBinCount}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface FolderTreeProps {
  onFolderSelect: (folder: Folder) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateTemplate: (folderId: string) => void;
  onEditFolder?: (folder: Folder) => void;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  onFolderSelect,
  onCreateFolder,
  onCreateTemplate,
  onEditFolder
}) => {
  const {
    getFolderChildren,
    setCurrentFolder,
    moveFolder,
    copyFolder,
    archiveFolder,
    unarchiveFolder,
    deleteFolder
  } = useStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    folder: Folder;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const rootFolders = getFolderChildren(null).filter(f => !f.archived);

  const navigate = useNavigate();

  // ... (hooks)

  const handleFolderSelect = (folder: Folder) => {
    navigate(`/folders/${folder.id}`);
    onFolderSelect(folder);
  };

  const handleContextMenu = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      folder
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Move folder to new parent
      moveFolder(active.id as string, over.id as string);
    }
  };

  const handleMove = () => {
    if (contextMenu) {
      // Open a modal to select destination folder
      // For now, we'll just show an alert
      alert('Move functionality - select destination folder');
      closeContextMenu();
    }
  };

  const handleCopy = () => {
    if (contextMenu) {
      copyFolder(contextMenu.folder.id, contextMenu.folder.parent_id);
      closeContextMenu();
    }
  };

  const handleArchive = () => {
    if (contextMenu) {
      if (contextMenu.folder.archived) {
        unarchiveFolder(contextMenu.folder.id);
      } else {
        archiveFolder(contextMenu.folder.id);
      }
      closeContextMenu();
    }
  };

  const handleDelete = () => {
    if (contextMenu) {
      if (window.confirm(`هل تريد حذف المجلد "${contextMenu.folder.name}"؟`)) {
        deleteFolder(contextMenu.folder.id);
        closeContextMenu();
      }
    }
  };

  const handleRename = () => {
    if (contextMenu && onEditFolder) {
      onEditFolder(contextMenu.folder);
      closeContextMenu();
    }
  };

  React.useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        {/* Fixed Home Button */}
        <button
          onClick={() => {
            setCurrentFolder(null);
            navigate('/folders');
          }}
          className={cn(
            'w-full flex items-center gap-2 py-2 px-3 rounded-lg mb-3 transition-colors',
            'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30',
            'hover:from-primary-100 hover:to-primary-200 dark:hover:from-primary-900/50 dark:hover:to-primary-800/50',
            'border border-primary-200 dark:border-primary-700'
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary-600 dark:text-primary-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">الصفحة الرئيسية</span>
        </button>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            المجلدات
          </h3>
          <button
            onClick={() => onCreateFolder(null)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-0.5">
            {rootFolders.map(folder => (
              <FolderTreeItem
                key={folder.id}
                folder={folder}
                level={0}
                onSelect={handleFolderSelect}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        </DndContext>

        {/* System Folders Section - Archive & Recycle Bin */}
        <SystemFoldersSection />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
            onClick={() => {
              onCreateFolder(contextMenu.folder.id);
              closeContextMenu();
            }}
          >
            <FolderIcon className="w-4 h-4" />
            <span>مجلد جديد</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
            onClick={() => {
              onCreateTemplate(contextMenu.folder.id);
              closeContextMenu();
            }}
          >
            <DocumentIcon className="w-4 h-4" />
            <span>نموذج جديد</span>
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
            onClick={handleRename}
          >
            <PencilIcon className="w-4 h-4" />
            <span>إعادة تسمية</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
            onClick={handleMove}
          >
            <ArrowRightIcon className="w-4 h-4" />
            <span>نقل إلى</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
            onClick={handleCopy}
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
            <span>نسخ</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
            onClick={handleArchive}
          >
            {contextMenu.folder.archived ? (
              <>
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>استعادة من الأرشيف</span>
              </>
            ) : (
              <>
                <ArchiveBoxIcon className="w-4 h-4" />
                <span>أرشفة</span>
              </>
            )}
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-red-600"
            onClick={handleDelete}
          >
            <TrashIcon className="w-4 h-4" />
            <span>حذف</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FolderTree;