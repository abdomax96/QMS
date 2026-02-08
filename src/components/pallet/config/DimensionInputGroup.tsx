/**
 * Dimension Input Group Component
 * Reusable component for entering width, depth, and height dimensions
 */

import React from 'react';
import { Ruler } from 'lucide-react';

interface DimensionInputGroupProps {
    label: string;
    width: number;
    depth: number;
    height: number;
    onWidthChange: (value: number) => void;
    onDepthChange: (value: number) => void;
    onHeightChange: (value: number) => void;
    unit?: string;
    minValue?: number;
    maxValue?: number;
    minWidth?: number;
    maxWidth?: number;
    minDepth?: number;
    maxDepth?: number;
    minHeight?: number;
    maxHeight?: number;
    disabled?: boolean;
    showHeight?: boolean;
    error?: string;
}

export default function DimensionInputGroup({
    label,
    width,
    depth,
    height,
    onWidthChange,
    onDepthChange,
    onHeightChange,
    unit = 'سم',
    minValue = 1,
    maxValue = 500,
    minWidth,
    maxWidth,
    minDepth,
    maxDepth,
    minHeight,
    maxHeight,
    disabled = false,
    showHeight = true,
    error
}: DimensionInputGroupProps) {
    const widthMin = minWidth ?? minValue;
    const widthMax = maxWidth ?? maxValue;
    const depthMin = minDepth ?? minValue;
    const depthMax = maxDepth ?? maxValue;
    const heightMin = minHeight ?? minValue;
    const heightMax = maxHeight ?? maxValue;

    return (
        <div className="space-y-3">
            {/* Label */}
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Ruler size={16} className="text-gray-400" />
                <span>{label}</span>
            </div>

            {/* Inputs Grid */}
            <div className={`grid ${showHeight ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                {/* Width */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">العرض</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={width}
                            onChange={(e) => onWidthChange(Number(e.target.value))}
                            min={widthMin}
                            max={widthMax}
                            step="0.5"
                            disabled={disabled}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left ${
                                disabled ? 'bg-gray-100 text-gray-500' : 'bg-white'
                            } ${error ? 'border-red-300' : 'border-gray-300'}`}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            {unit}
                        </span>
                    </div>
                </div>

                {/* Depth */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">العمق</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={depth}
                            onChange={(e) => onDepthChange(Number(e.target.value))}
                            min={depthMin}
                            max={depthMax}
                            step="0.5"
                            disabled={disabled}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left ${
                                disabled ? 'bg-gray-100 text-gray-500' : 'bg-white'
                            } ${error ? 'border-red-300' : 'border-gray-300'}`}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            {unit}
                        </span>
                    </div>
                </div>

                {/* Height */}
                {showHeight && (
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">الارتفاع</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => onHeightChange(Number(e.target.value))}
                                min={heightMin}
                                max={heightMax}
                                step="0.5"
                                disabled={disabled}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left ${
                                    disabled ? 'bg-gray-100 text-gray-500' : 'bg-white'
                                } ${error ? 'border-red-300' : 'border-gray-300'}`}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                {unit}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <p className="text-xs text-red-600">{error}</p>
            )}

            {/* Visual representation */}
            <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                <span>{width}</span>
                <span>×</span>
                <span>{depth}</span>
                {showHeight && (
                    <>
                        <span>×</span>
                        <span>{height}</span>
                    </>
                )}
                <span>{unit}</span>
            </div>
        </div>
    );
}
