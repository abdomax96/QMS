import React, { useState } from 'react';
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    Bars3Icon,
    TableCellsIcon,
    CheckBadgeIcon,
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
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormTemplate, FormSection, Table, TableType, QualityCriteria } from '../../../types';
import { generateId, cn } from '../../../utils';
import TableBuilder from '../../tables/TableBuilder';

interface SectionsTabProps {
    template: FormTemplate;
    onChange: (updates: Partial<FormTemplate>) => void;
}

interface QualityCriteriaItemDraft {
    id: string;
    parameter: string;
    specification: string;
}

// Grade colors for quality criteria
const gradeColors = [
    { id: 'green', label: 'أخضر', color: '#10B981', bgClass: 'bg-green-100 dark:bg-green-900' },
    { id: 'blue', label: 'أزرق', color: '#3B82F6', bgClass: 'bg-blue-100 dark:bg-blue-900' },
    { id: 'yellow', label: 'أصفر', color: '#F59E0B', bgClass: 'bg-yellow-100 dark:bg-yellow-900' },
    { id: 'red', label: 'أحمر', color: '#EF4444', bgClass: 'bg-red-100 dark:bg-red-900' },
    { id: 'purple', label: 'بنفسجي', color: '#8B5CF6', bgClass: 'bg-purple-100 dark:bg-purple-900' },
];

interface SortableSectionProps {
    section: FormSection;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAddTable: () => void;
    onEditTable: (tableId: string) => void;
    onDeleteTable: (tableId: string) => void;
    onAddQualityCriteria: () => void;
    onEditQualityCriteria: (criteria: QualityCriteria) => void;
    onDeleteQualityCriteria: (criteriaId: string) => void;
}

const SortableSection: React.FC<SortableSectionProps> = ({
    section,
    isExpanded,
    onToggleExpand,
    onEdit,
    onDelete,
    onAddTable,
    onEditTable,
    onDeleteTable,
    onAddQualityCriteria,
    onEditQualityCriteria,
    onDeleteQualityCriteria,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getTableTypeName = (type: TableType) => {
        const names: Record<TableType, string> = {
            'parameters': 'جدول معلمات',
            'sample': 'جدول عينات',
            'custom': 'جدول مخصص',
            // @ts-ignore
            'ai-code': 'جدول AI',
            'checklist': 'قائمة تحقق',
            'recipe': 'جدول وصفة',
            'recipe-traceability': 'جدول تتبع الخامات',
        };
        return names[type] || type;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
                isDragging && 'opacity-50 shadow-lg'
            )}
        >
            <div className="flex items-center gap-3 p-4">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                    <Bars3Icon className="w-5 h-5 text-gray-400" />
                </button>

                <button onClick={onToggleExpand} className="p-1">
                    {isExpanded ? (
                        <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                        <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                </button>

                <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{section.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {section.tables?.length || 0} جداول • {section.quality_criteria?.length || 0} معايير جودة
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onEdit}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                    {/* Tables */}
                    <div className="space-y-2 mb-4">
                        {(!section.tables || section.tables.length === 0) ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                لا توجد جداول في هذا القسم
                            </div>
                        ) : (
                            (section.tables || []).map((table, tableIndex) => (
                                <div
                                    key={table.id || `table-${tableIndex}`}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                    <TableCellsIcon className="w-5 h-5 text-gray-400" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                                                {table.name}
                                            </div>
                                            {table.linked_stop_group && (
                                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                                    🔗 {table.linked_stop_group}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {getTableTypeName(table.type)}
                                            {table.rows && ` • ${table.rows} صف`}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onEditTable(table.id)}
                                        className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        <PencilIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteTable(table.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={onAddTable}
                        className="flex items-center gap-2 w-full p-3 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg border-2 border-dashed border-primary-300 dark:border-primary-700"
                    >
                        <PlusIcon className="w-4 h-4" />
                        إضافة جدول
                    </button>

                    {/* Quality Criteria Section */}
                    {(section.quality_criteria && section.quality_criteria.length > 0) && (
                        <div className="mt-4 space-y-2">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                معايير الجودة
                            </div>
                            {section.quality_criteria.map((criteria) => {
                                const colorConfig = gradeColors.find(c => c.id === criteria.color) || gradeColors[0];
                                return (
                                    <div
                                        key={criteria.id}
                                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                        style={{ borderRight: `4px solid ${colorConfig.color}` }}
                                    >
                                        <div
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${colorConfig.bgClass}`}
                                            style={{ color: colorConfig.color }}
                                        >
                                            {criteria.title}
                                        </div>
                                        <div className="flex-1">
                                            {criteria.acceptance && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {criteria.acceptance}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-400">
                                                {criteria.items?.length || 0} عناصر
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onEditQualityCriteria(criteria)}
                                            className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        >
                                            <PencilIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteQualityCriteria(criteria.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <button
                        onClick={onAddQualityCriteria}
                        className="flex items-center gap-2 w-full p-3 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg border-2 border-dashed border-green-300 dark:border-green-700 mt-2"
                    >
                        <CheckBadgeIcon className="w-4 h-4" />
                        إضافة معايير جودة
                    </button>
                </div>
            )
            }
        </div >
    );
};

interface SortableCriteriaItemRowProps {
    item: QualityCriteriaItemDraft;
    onParameterChange: (id: string, value: string) => void;
    onSpecificationChange: (id: string, value: string) => void;
    onDelete: (id: string) => void;
}

const SortableCriteriaItemRow: React.FC<SortableCriteriaItemRowProps> = ({
    item,
    onParameterChange,
    onSpecificationChange,
    onDelete,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-2 rounded',
                isDragging && 'opacity-80'
            )}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="اسحب للترتيب"
            >
                <Bars3Icon className="w-4 h-4" />
            </button>
            <input
                type="text"
                value={item.parameter}
                onChange={(e) => onParameterChange(item.id, e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="المعلمة"
            />
            <input
                type="text"
                value={item.specification}
                onChange={(e) => onSpecificationChange(item.id, e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="المواصفة"
            />
            <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

const SectionsTab: React.FC<SectionsTabProps> = ({ template, onChange }) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [showSectionDialog, setShowSectionDialog] = useState(false);
    const [editingSection, setEditingSection] = useState<FormSection | null>(null);
    const [showTableBuilder, setShowTableBuilder] = useState(false);
    const [editingTable, setEditingTable] = useState<{ sectionId: string; table?: Table } | null>(null);
    const [newSectionName, setNewSectionName] = useState('');
    // Quality Criteria state
    const [showQualityCriteriaDialog, setShowQualityCriteriaDialog] = useState(false);
    const [qualityCriteriaSectionId, setQualityCriteriaSectionId] = useState<string | null>(null);
    const [editingQualityCriteria, setEditingQualityCriteria] = useState<QualityCriteria | null>(null);
    const [newCriteriaTitle, setNewCriteriaTitle] = useState('');
    const [newCriteriaColor, setNewCriteriaColor] = useState('green');
    const [newCriteriaAcceptance, setNewCriteriaAcceptance] = useState('');
    const [newCriteriaItems, setNewCriteriaItems] = useState<QualityCriteriaItemDraft[]>([]);

    const sections = Object.values(template.sections || {}).sort((a, b) => a.order - b.order);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = sections.findIndex((s) => s.id === active.id);
            const newIndex = sections.findIndex((s) => s.id === over.id);
            const reordered = arrayMove(sections, oldIndex, newIndex);

            const updatedSections: Record<string, FormSection> = {};
            reordered.forEach((section, index) => {
                updatedSections[section.id] = { ...section, order: index };
            });

            onChange({ sections: updatedSections });
        }
    };

    const handleCriteriaItemsDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setNewCriteriaItems((prev) => {
            const oldIndex = prev.findIndex((item) => item.id === active.id);
            const newIndex = prev.findIndex((item) => item.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const handleAddSection = () => {
        if (!newSectionName.trim()) return;

        const newSection: FormSection = {
            id: generateId(),
            name: newSectionName,
            icon: 'fas fa-layer-group',
            order: sections.length,
            tables: [],
        };

        onChange({
            sections: {
                ...template.sections,
                [newSection.id]: newSection,
            },
        });

        setNewSectionName('');
        setShowSectionDialog(false);
    };

    const handleUpdateSection = () => {
        if (!editingSection || !newSectionName.trim()) return;

        onChange({
            sections: {
                ...template.sections,
                [editingSection.id]: { ...editingSection, name: newSectionName },
            },
        });

        setNewSectionName('');
        setEditingSection(null);
    };

    const handleDeleteSection = (sectionId: string) => {
        const { [sectionId]: deleted, ...rest } = template.sections;
        onChange({ sections: rest });
    };

    const handleToggleExpand = (sectionId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    const handleSaveTable = (sectionId: string, table: Table) => {
        const section = template.sections[sectionId];
        if (!section) return;

        const tables = section.tables || [];
        const existingIndex = tables.findIndex(t => t.id === table.id);
        let updatedTables: Table[];

        if (existingIndex >= 0) {
            updatedTables = [...tables];
            updatedTables[existingIndex] = table;
        } else {
            updatedTables = [...tables, table];
        }

        onChange({
            sections: {
                ...template.sections,
                [sectionId]: { ...section, tables: updatedTables },
            },
        });

        setShowTableBuilder(false);
        setEditingTable(null);
    };

    const handleDeleteTable = (sectionId: string, tableId: string) => {
        const section = template.sections[sectionId];
        if (!section) return;

        const tables = section.tables || [];
        onChange({
            sections: {
                ...template.sections,
                [sectionId]: {
                    ...section,
                    tables: tables.filter(t => t.id !== tableId),
                },
            },
        });
    };

    // Quality Criteria Handlers
    const handleAddQualityCriteria = (sectionId: string) => {
        setQualityCriteriaSectionId(sectionId);
        setEditingQualityCriteria(null);
        setNewCriteriaTitle('');
        setNewCriteriaColor('green');
        setNewCriteriaAcceptance('');
        setNewCriteriaItems([]);
        setShowQualityCriteriaDialog(true);
    };

    const handleEditQualityCriteria = (sectionId: string, criteria: QualityCriteria) => {
        setQualityCriteriaSectionId(sectionId);
        setEditingQualityCriteria(criteria);
        setNewCriteriaTitle(criteria.title);
        setNewCriteriaColor(criteria.color);
        setNewCriteriaAcceptance(criteria.acceptance || '');
        setNewCriteriaItems(
            criteria.items?.map((item) => ({
                id: generateId(),
                parameter: item.parameter,
                specification: item.specification,
            })) || []
        );
        setShowQualityCriteriaDialog(true);
    };

    const handleSaveQualityCriteria = () => {
        if (!qualityCriteriaSectionId || !newCriteriaTitle.trim()) return;

        const section = template.sections[qualityCriteriaSectionId];
        if (!section) return;

        // Filter out empty items
        const validItems = newCriteriaItems
            .filter((item) => item.parameter.trim() || item.specification.trim())
            .map(({ parameter, specification }) => ({ parameter, specification }));

        if (editingQualityCriteria) {
            // Update existing criteria
            const updatedCriteria = (section.quality_criteria || []).map(c =>
                c.id === editingQualityCriteria.id
                    ? { ...c, title: newCriteriaTitle, color: newCriteriaColor, acceptance: newCriteriaAcceptance, items: validItems }
                    : c
            );
            onChange({
                sections: {
                    ...template.sections,
                    [qualityCriteriaSectionId]: {
                        ...section,
                        quality_criteria: updatedCriteria,
                    },
                },
            });
        } else {
            // Add new criteria
            const newCriteria: QualityCriteria = {
                id: generateId(),
                title: newCriteriaTitle,
                icon: 'fas fa-check-circle',
                color: newCriteriaColor,
                acceptance: newCriteriaAcceptance,
                items: validItems,
            };

            onChange({
                sections: {
                    ...template.sections,
                    [qualityCriteriaSectionId]: {
                        ...section,
                        quality_criteria: [...(section.quality_criteria || []), newCriteria],
                    },
                },
            });
        }

        setShowQualityCriteriaDialog(false);
        setQualityCriteriaSectionId(null);
        setEditingQualityCriteria(null);
        setNewCriteriaTitle('');
        setNewCriteriaColor('green');
        setNewCriteriaAcceptance('');
        setNewCriteriaItems([]);
    };

    const handleDeleteQualityCriteria = (sectionId: string, criteriaId: string) => {
        const section = template.sections[sectionId];
        if (!section) return;

        onChange({
            sections: {
                ...template.sections,
                [sectionId]: {
                    ...section,
                    quality_criteria: (section.quality_criteria || []).filter(c => c.id !== criteriaId),
                },
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    أقسام النموذج
                </h3>
                <button
                    onClick={() => setShowSectionDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    <PlusIcon className="w-4 h-4" />
                    قسم جديد
                </button>
            </div>

            {sections.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <TableCellsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم إضافة أقسام بعد</p>
                    <button
                        onClick={() => setShowSectionDialog(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        إضافة أول قسم
                    </button>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={sections.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3">
                            {sections.map((section, sectionIndex) => (
                                <SortableSection
                                    key={section.id || `section-${sectionIndex}`}
                                    section={section}
                                    isExpanded={expandedSections.has(section.id)}
                                    onToggleExpand={() => handleToggleExpand(section.id)}
                                    onEdit={() => setEditingSection(section)}
                                    onDelete={() => handleDeleteSection(section.id)}
                                    onAddTable={() => {
                                        setEditingTable({ sectionId: section.id });
                                        setShowTableBuilder(true);
                                    }}
                                    onEditTable={(tableId) => {
                                        const table = (section.tables || []).find(t => t.id === tableId);
                                        setEditingTable({ sectionId: section.id, table });
                                        setShowTableBuilder(true);
                                    }}
                                    onDeleteTable={(tableId) => handleDeleteTable(section.id, tableId)}
                                    onAddQualityCriteria={() => handleAddQualityCriteria(section.id)}
                                    onEditQualityCriteria={(criteria) => handleEditQualityCriteria(section.id, criteria)}
                                    onDeleteQualityCriteria={(criteriaId) => handleDeleteQualityCriteria(section.id, criteriaId)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* Add Section Dialog */}
            {showSectionDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            قسم جديد
                        </h3>
                        <input
                            type="text"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white mb-4"
                            placeholder="اسم القسم"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowSectionDialog(false);
                                    setNewSectionName('');
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleAddSection}
                                disabled={!newSectionName.trim()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                إضافة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Section Dialog */}
            {editingSection && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            تعديل القسم
                        </h3>
                        <input
                            type="text"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            placeholder="اسم القسم"
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setEditingSection(null);
                                    setNewSectionName('');
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleUpdateSection}
                                disabled={!newSectionName.trim()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                حفظ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Builder Modal */}
            {showTableBuilder && editingTable && (
                <TableBuilder
                    table={editingTable.table}
                    onSave={(table) => handleSaveTable(editingTable.sectionId, table)}
                    onClose={() => {
                        setShowTableBuilder(false);
                        setEditingTable(null);
                    }}
                    template={template}
                    customVariables={(template.custom_variables || []).reduce((acc, v) => {
                        acc[v.name] = v.value;
                        return acc;
                    }, {} as Record<string, any>)}
                />
            )}

            {/* Quality Criteria Dialog */}
            {showQualityCriteriaDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            {editingQualityCriteria ? 'تعديل معيار الجودة' : 'إضافة معيار جودة'}
                        </h3>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    اسم المعيار
                                </label>
                                <input
                                    type="text"
                                    value={newCriteriaTitle}
                                    onChange={(e) => setNewCriteriaTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="مثال: GRADE A - منتج قياسي"
                                    autoFocus
                                />
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    اللون
                                </label>
                                <div className="flex gap-2">
                                    {gradeColors.map((color) => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => setNewCriteriaColor(color.id)}
                                            className={`w-10 h-10 rounded-lg border-2 transition-all ${newCriteriaColor === color.id
                                                ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-gray-400'
                                                : 'border-transparent'
                                                }`}
                                            style={{ backgroundColor: color.color }}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Acceptance Criteria */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    معيار القبول
                                </label>
                                <input
                                    type="text"
                                    value={newCriteriaAcceptance}
                                    onChange={(e) => setNewCriteriaAcceptance(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="مثال: لا يقل عن 95%"
                                />
                            </div>

                            {/* Quality Items Editor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    عناصر المعيار (المعلمة والمواصفة)
                                </label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleCriteriaItemsDragEnd}
                                    >
                                        <SortableContext
                                            items={newCriteriaItems.map((item) => item.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-2">
                                                {newCriteriaItems.map((item) => (
                                                    <SortableCriteriaItemRow
                                                        key={item.id}
                                                        item={item}
                                                        onParameterChange={(itemId, value) => {
                                                            setNewCriteriaItems((prev) =>
                                                                prev.map((entry) =>
                                                                    entry.id === itemId ? { ...entry, parameter: value } : entry
                                                                )
                                                            );
                                                        }}
                                                        onSpecificationChange={(itemId, value) => {
                                                            setNewCriteriaItems((prev) =>
                                                                prev.map((entry) =>
                                                                    entry.id === itemId ? { ...entry, specification: value } : entry
                                                                )
                                                            );
                                                        }}
                                                        onDelete={(itemId) => {
                                                            setNewCriteriaItems((prev) =>
                                                                prev.filter((entry) => entry.id !== itemId)
                                                            );
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                                {newCriteriaItems.length > 1 && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        اسحب من أيقونة الترتيب بجانب كل عنصر.
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setNewCriteriaItems([
                                            ...newCriteriaItems,
                                            { id: generateId(), parameter: '', specification: '' },
                                        ])
                                    }
                                    className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    إضافة عنصر
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowQualityCriteriaDialog(false);
                                    setQualityCriteriaSectionId(null);
                                    setEditingQualityCriteria(null);
                                    setNewCriteriaTitle('');
                                    setNewCriteriaColor('green');
                                    setNewCriteriaAcceptance('');
                                    setNewCriteriaItems([]);
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSaveQualityCriteria}
                                disabled={!newCriteriaTitle.trim()}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {editingQualityCriteria ? 'حفظ' : 'إضافة'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SectionsTab;
