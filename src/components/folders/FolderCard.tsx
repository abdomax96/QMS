import { useNavigate } from 'react-router-dom';
import useStore from '../../store';
import type { Folder } from '../../types';
import { Folder as FolderIcon, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguageStore, getDisplayName } from '../../store/languageStore';

interface FolderCardProps {
    folder: Folder;
}

export const FolderCard = ({ folder }: FolderCardProps) => {
    const navigate = useNavigate();
    const { displayLanguage } = useLanguageStore();
    const displayName = getDisplayName(folder.name, folder.name_en, displayLanguage);

    return (
        <div
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group relative"
            onClick={() => navigate(`/folders/${folder.id}`)}
        >
            <div className="flex justify-between items-start mb-3">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                    style={{ backgroundColor: folder.color || '#3B82F6' }}
                >
                    <i className={folder.icon || 'fas fa-folder'}></i>
                </div>
                <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={18} />
                </button>
            </div>

            <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2" title={displayName}>
                {displayName}
            </h3>

            <div className="flex items-center text-xs text-gray-500 mb-3 space-x-2 space-x-reverse">
                <span>{folder.stats.form_templates_count} نموذج</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span>{folder.stats.reports_count} تقرير</span>
            </div>

            <div className="text-xs text-gray-400 border-t pt-2 flex justify-between items-center">
                <span>{format(new Date(folder.modified_at || folder.created_at || Date.now()), 'yyyy/MM/dd')}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${folder.type === 'department' ? 'bg-purple-100 text-purple-600' :
                    folder.type === 'project' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                    {folder.type === 'department' ? 'قسم' :
                        folder.type === 'project' ? 'مشروع' : 'عام'}
                </span>
            </div>
        </div>
    );
};
