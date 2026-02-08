import { useNavigate } from 'react-router-dom';
import useStore from '../../store';
import { FolderCard } from './FolderCard';
import { FolderPlus, FilePlus, ChevronLeft, Search } from 'lucide-react';

export const FolderGrid = () => {
    const navigate = useNavigate();
    const {
        folders,
        currentFolderId,
        getFolderChildren,
        getFolderPath,
    } = useStore();

    const currentFolder = currentFolderId ? folders[currentFolderId] : null;
    const subFolders = getFolderChildren(currentFolderId);
    // removed unused path variable

    // Reconstruct path objects for breadcrumbs
    // getFolderPath currently returns names string[], might want to refactor to return objects or IDs
    // For now simplistic breadcrumb
    const pathNames = currentFolderId ? getFolderPath(currentFolderId) : [];

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50/50">
            {/* Toolbar / Breadcrumbs */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center space-x-reverse space-x-2 text-sm text-gray-600">
                    <button
                        onClick={() => navigate('/folders')}
                        className={`hover:text-blue-600 transition-colors ${!currentFolderId ? 'font-bold text-gray-900' : ''}`}
                    >
                        الرئيسية
                    </button>
                    {pathNames.map((name, index) => (
                        <div key={index} className="flex items-center">
                            <ChevronLeft size={14} className="mx-1 text-gray-400" />
                            <span className={index === pathNames.length - 1 ? 'font-bold text-gray-900' : ''}>
                                {name}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center space-x-reverse space-x-3">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="بحث في المجلد..."
                            className="pr-9 pl-4 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors shadow-sm cursor-pointer">
                        <FolderPlus size={16} />
                        <span>مجلد جديد</span>
                    </button>
                    <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
                        <FilePlus size={16} />
                        <span>نموذج جديد</span>
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="p-6 overflow-y-auto">
                {subFolders.length === 0 && !currentFolderId && (
                    <div className="text-center py-20">
                        <p className="text-gray-500">لا توجد مجلدات، ابدأ بإنشاء مجلد جديد</p>
                    </div>
                )}

                {subFolders.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">المجلدات</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {subFolders.map(folder => (
                                <FolderCard key={folder.id} folder={folder} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Templates and Reports Section Placeholders */}
                {currentFolderId && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">النماذج</h2>
                            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                                <FilePlus className="mx-auto mb-2 opacity-50" size={32} />
                                <p className="text-sm">لا توجد نماذج في هذا المجلد</p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">التقارير الحديثة</h2>
                            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                                <p className="text-sm">لا توجد تقارير</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
