/**
 * Stacking Pattern Selector Component
 * Visual selector for choosing pallet stacking patterns
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { StackingPattern } from '../../../types/palletConfig';
import { STACKING_PATTERNS } from '../../../types/palletConfig';

interface StackingPatternSelectorProps {
    value: StackingPattern;
    onChange: (pattern: StackingPattern) => void;
    disabled?: boolean;
}

// Mini SVG previews for each pattern
const PatternPreview: React.FC<{ pattern: StackingPattern; selected: boolean }> = ({ pattern, selected }) => {
    const baseColor = selected ? '#3B82F6' : '#9CA3AF';
    const altColor = selected ? '#60A5FA' : '#D1D5DB';

    return (
        <svg viewBox="0 0 60 40" className="w-full h-full">
            {pattern === 'brick' && (
                // Brick pattern - offset rows
                <>
                    <rect x="2" y="2" width="18" height="10" fill={baseColor} rx="1" />
                    <rect x="22" y="2" width="18" height="10" fill={baseColor} rx="1" />
                    <rect x="42" y="2" width="16" height="10" fill={baseColor} rx="1" />

                    <rect x="11" y="14" width="18" height="10" fill={altColor} rx="1" />
                    <rect x="31" y="14" width="18" height="10" fill={altColor} rx="1" />

                    <rect x="2" y="26" width="18" height="10" fill={baseColor} rx="1" />
                    <rect x="22" y="26" width="18" height="10" fill={baseColor} rx="1" />
                    <rect x="42" y="26" width="16" height="10" fill={baseColor} rx="1" />
                </>
            )}

            {pattern === 'column' && (
                // Column pattern - aligned rows
                <>
                    <rect x="2" y="2" width="18" height="10" fill={baseColor} rx="1" />
                    <rect x="22" y="2" width="18" height="10" fill={baseColor} rx="1" />
                    <rect x="42" y="2" width="16" height="10" fill={baseColor} rx="1" />

                    <rect x="2" y="14" width="18" height="10" fill={altColor} rx="1" />
                    <rect x="22" y="14" width="18" height="10" fill={altColor} rx="1" />
                    <rect x="42" y="14" width="16" height="10" fill={altColor} rx="1" />

                    <rect x="2" y="26" width="18" height="10" fill={baseColor} rx="1" />
                    <rect x="22" y="26" width="18" height="10" fill={baseColor} rx="1" />
                    <rect x="42" y="26" width="16" height="10" fill={baseColor} rx="1" />
                </>
            )}

            {pattern === 'pinwheel' && (
                // Pinwheel pattern - rotating orientation
                <>
                    <rect x="2" y="2" width="12" height="18" fill={baseColor} rx="1" />
                    <rect x="16" y="2" width="12" height="18" fill={altColor} rx="1" />
                    <rect x="30" y="2" width="12" height="18" fill={baseColor} rx="1" />
                    <rect x="44" y="2" width="12" height="18" fill={altColor} rx="1" />

                    <rect x="2" y="22" width="12" height="16" fill={altColor} rx="1" />
                    <rect x="16" y="22" width="12" height="16" fill={baseColor} rx="1" />
                    <rect x="30" y="22" width="12" height="16" fill={altColor} rx="1" />
                    <rect x="44" y="22" width="12" height="16" fill={baseColor} rx="1" />
                </>
            )}
        </svg>
    );
};

export default function StackingPatternSelector({
    value,
    onChange,
    disabled = false
}: StackingPatternSelectorProps) {
    const patterns: StackingPattern[] = ['brick', 'column', 'pinwheel'];

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
                نمط الرص الأساسي
            </label>

            <div className="grid grid-cols-3 gap-3">
                {patterns.map((pattern) => {
                    const isSelected = value === pattern;
                    const info = STACKING_PATTERNS[pattern];

                    return (
                        <button
                            key={pattern}
                            type="button"
                            onClick={() => !disabled && onChange(pattern)}
                            disabled={disabled}
                            className={`
                                relative p-3 rounded-lg border-2 transition-all
                                ${isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                        >
                            {/* Selection indicator */}
                            {isSelected && (
                                <div className="absolute top-1 right-1">
                                    <CheckCircle size={16} className="text-blue-500" />
                                </div>
                            )}

                            {/* Pattern preview */}
                            <div className="h-12 mb-2">
                                <PatternPreview pattern={pattern} selected={isSelected} />
                            </div>

                            {/* Pattern name */}
                            <div className="text-center">
                                <p className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {info.ar}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {info.en}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 text-center">
                {STACKING_PATTERNS[value].description}
            </p>
        </div>
    );
}
