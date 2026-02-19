import React, { useState, useRef } from 'react';
import { MagnifyingGlassIcon, PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { DepartmentNode } from './DepartmentNode';
import type { DepartmentWithChildren as DeptWithChildren } from '../../types/department';

interface OrganizationalChartProps {
    departments: DeptWithChildren[];
    selectedDeptId: string | null;
    onSelectDepartment: (id: string) => void;
    onAddDepartment: (parentId: string | null) => void;
    onEditDepartment: (dept: DeptWithChildren) => void;
    onDeleteDepartment: (dept: DeptWithChildren) => void;
}

export const OrganizationalChart: React.FC<OrganizationalChartProps> = ({
    departments,
    selectedDeptId,
    onSelectDepartment,
    onAddDepartment,
    onEditDepartment,
    onDeleteDepartment,
}) => {
    const NODE_WIDTH = 280;
    const NODE_HEIGHT = 120;
    const HORIZONTAL_GAP = 40;
    const VERTICAL_GAP = 100;
    const CANVAS_PADDING = 50;

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Build tree structure
    const buildTree = (depts: DeptWithChildren[], parentId: string | null = null): DeptWithChildren[] => {
        return depts
            .filter(d => d.parent_department_id === parentId)
            .map(d => ({ ...d, children: buildTree(depts, d.id) }));
    };

    const tree = buildTree(departments);

    // Filter departments by search term
    const filterTree = (nodes: DeptWithChildren[], term: string): DeptWithChildren[] => {
        if (!term) return nodes;

        return nodes.map(node => {
            const matchesSearch =
                node.name.toLowerCase().includes(term.toLowerCase()) ||
                node.name_ar?.toLowerCase().includes(term.toLowerCase()) ||
                node.code?.toLowerCase().includes(term.toLowerCase());

            const filteredChildren = filterTree(node.children || [], term);

            if (matchesSearch || filteredChildren.length > 0) {
                return { ...node, children: filteredChildren };
            }
            return null;
        }).filter(Boolean) as DeptWithChildren[];
    };

    const filteredTree = filterTree(tree, searchTerm);

    // Zoom handlers
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.max(0.3, Math.min(2, prev * delta)));
    };

    // Pan handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).closest('.org-chart-canvas')) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Reset view
    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Calculate node positions using true subtree widths to prevent branch overlap.
    const calculatePositions = (roots: DeptWithChildren[]): Map<string, { x: number; y: number; width: number; height: number }> => {
        const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
        const subtreeWidthCache = new Map<string, number>();

        const getSubtreeWidth = (node: DeptWithChildren): number => {
            const cachedWidth = subtreeWidthCache.get(node.id);
            if (cachedWidth !== undefined) return cachedWidth;

            const children = node.children || [];
            if (children.length === 0) {
                subtreeWidthCache.set(node.id, NODE_WIDTH);
                return NODE_WIDTH;
            }

            const childrenTotalWidth = children.reduce((sum, child) => sum + getSubtreeWidth(child), 0)
                + HORIZONTAL_GAP * (children.length - 1);

            const subtreeWidth = Math.max(NODE_WIDTH, childrenTotalWidth);
            subtreeWidthCache.set(node.id, subtreeWidth);
            return subtreeWidth;
        };

        const placeNode = (node: DeptWithChildren, level: number, startX: number) => {
            const subtreeWidth = getSubtreeWidth(node);
            const children = node.children || [];

            const nodeX = startX + (subtreeWidth - NODE_WIDTH) / 2;
            const nodeY = level * (NODE_HEIGHT + VERTICAL_GAP);

            positions.set(node.id, {
                x: nodeX,
                y: nodeY,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
            });

            if (children.length === 0) return;

            const childrenTotalWidth = children.reduce((sum, child) => sum + getSubtreeWidth(child), 0)
                + HORIZONTAL_GAP * (children.length - 1);

            let childStartX = startX + (subtreeWidth - childrenTotalWidth) / 2;
            children.forEach((child) => {
                placeNode(child, level + 1, childStartX);
                childStartX += getSubtreeWidth(child) + HORIZONTAL_GAP;
            });
        };

        let currentX = 0;
        roots.forEach((root) => {
            placeNode(root, 0, currentX);
            currentX += getSubtreeWidth(root) + HORIZONTAL_GAP;
        });

        return positions;
    };

    const positions = calculatePositions(filteredTree);

    // Calculate SVG viewBox size
    let maxX = 0;
    let maxY = 0;
    positions.forEach(pos => {
        maxX = Math.max(maxX, pos.x + pos.width);
        maxY = Math.max(maxY, pos.y + pos.height);
    });

    // Render connecting lines using SVG
    const renderConnections = () => {
        const lines: React.ReactElement[] = [];

        const renderNodeConnections = (nodes: DeptWithChildren[]) => {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    const parentPos = positions.get(node.id);
                    if (!parentPos) return;

                    const parentCenterX = parentPos.x + parentPos.width / 2;
                    const parentBottomY = parentPos.y + NODE_HEIGHT;

                    node.children.forEach(child => {
                        const childPos = positions.get(child.id);
                        if (!childPos) return;

                        const childCenterX = childPos.x + childPos.width / 2;
                        const childTopY = childPos.y;

                        // Draw L-shaped connection
                        const midY = parentBottomY + VERTICAL_GAP / 2;

                        lines.push(
                            <path
                                key={`${node.id}-${child.id}`}
                                d={`M ${parentCenterX} ${parentBottomY} 
                                    L ${parentCenterX} ${midY} 
                                    L ${childCenterX} ${midY} 
                                    L ${childCenterX} ${childTopY}`}
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                className="text-gray-300 dark:text-gray-600"
                            />
                        );
                    });

                    renderNodeConnections(node.children);
                }
            });
        };

        renderNodeConnections(filteredTree);
        return lines;
    };

    // Render department nodes
    const renderNodes = () => {
        const nodes: React.ReactElement[] = [];

        const renderNode = (dept: DeptWithChildren) => {
            const pos = positions.get(dept.id);
            if (!pos) return;

            nodes.push(
                <div
                    key={dept.id}
                    style={{
                        position: 'absolute',
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        transition: 'all 0.3s ease',
                    }}
                >
                    <DepartmentNode
                        department={dept}
                        isSelected={dept.id === selectedDeptId}
                        onClick={() => onSelectDepartment(dept.id)}
                        onEdit={() => onEditDepartment(dept)}
                        onDelete={() => onDeleteDepartment(dept)}
                        onAddChild={() => onAddDepartment(dept.id)}
                    />
                </div>
            );

            if (dept.children) {
                dept.children.forEach(child => renderNode(child));
            }
        };

        filteredTree.forEach(dept => renderNode(dept));
        return nodes;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Controls Bar */}
            <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث في الأقسام..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <button
                        onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}
                        className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm font-medium"
                    >
                        -
                    </button>
                    <span className="text-sm font-medium min-w-[3rem] text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                        className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm font-medium"
                    >
                        +
                    </button>
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <button
                        onClick={resetView}
                        className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm font-medium"
                    >
                        إعادة تعيين
                    </button>
                </div>

                {/* Add Root Department */}
                <button
                    onClick={() => onAddDepartment(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md transition-all"
                >
                    <PlusIcon className="w-5 h-5" />
                    قسم رئيسي
                </button>
            </div>

            {/* Chart Canvas */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <div
                    className="org-chart-canvas absolute"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'top left',
                        transition: isDragging ? 'none' : 'transform 0.2s ease',
                        minWidth: `${maxX + CANVAS_PADDING * 2}px`,
                        minHeight: `${maxY + CANVAS_PADDING * 2}px`,
                        padding: `${CANVAS_PADDING}px`,
                    }}
                >
                    {/* SVG Layer for Connections */}
                    <svg
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{
                            width: `${maxX + CANVAS_PADDING * 4}px`,
                            height: `${maxY + CANVAS_PADDING * 4}px`,
                        }}
                    >
                        {renderConnections()}
                    </svg>

                    {/* Nodes Layer */}
                    <div className="relative">
                        {renderNodes()}
                    </div>
                </div>

                {/* Empty State */}
                {filteredTree.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <FunnelIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-500">
                                {searchTerm ? 'لا توجد نتائج' : 'لا توجد أقسام'}
                            </h3>
                            <p className="text-sm text-gray-400 mt-2">
                                {searchTerm ? 'جرب كلمات بحث أخرى' : 'ابدأ بإضافة قسم رئيسي'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Instructions Hint */}
                {!isDragging && filteredTree.length > 0 && (
                    <div className="absolute bottom-4 left-4 px-3 py-2 bg-black/70 text-white text-xs rounded-lg backdrop-blur-sm">
                        💡 استخدم عجلة الماوس للتكبير/التصغير • اسحب لتحريك العرض
                    </div>
                )}
            </div>
        </div>
    );
};
