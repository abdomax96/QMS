import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LayerPattern, StackingPattern } from '../../../types/palletConfig';
import { computeLayerPlan } from '../../../types/palletConfig';
import { getCuboidTransform } from './Css3dHelpers';

interface PalletStackingVisualizerProps {
    // Pallet dimensions in centimeters
    palletWidth: number;
    palletDepth: number;
    // Carton dimensions in centimeters
    cartonWidth: number;
    cartonDepth: number;
    cartonHeight: number;
    // Stacking configuration
    cartonsPerLayer: number;
    numberOfLayers: number;
    alternateLayers: boolean;
    basePattern?: StackingPattern;
    // Optional
    layerPatterns?: LayerPattern[];
    onLayerClick?: (layerIndex: number) => void;
    interactive?: boolean;
    className?: string;
}

interface CuboidProps {
    width: number;
    height: number;
    depth: number;
    x: number;
    y: number;
    z: number;
    color?: string;
    borderColor?: string;
    opacity?: number;
    label?: React.ReactNode;
    onClick?: () => void;
    className?: string;
}

const PALLET_HEIGHT = 14.5; // cm
const SCALE = 2; // px per cm
const BUILD_INTERVAL_MS = 400;

const COLORS = {
    pallet: '#8B4513',
    layerEven: '#4299E1',
    layerOdd: '#48BB78',
};

const clamp = (value: number, min = 0, max = 255) => Math.min(max, Math.max(min, value));

const shadeHex = (hex: string, amount: number) => {
    if (!hex.startsWith('#')) return hex;
    const raw = hex.slice(1);
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    if (full.length !== 6) return hex;
    const num = Number.parseInt(full, 16);
    if (Number.isNaN(num)) return hex;

    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;

    const toChannel = (v: number) => clamp(Math.round(v + 255 * amount));
    return `rgb(${toChannel(r)}, ${toChannel(g)}, ${toChannel(b)})`;
};

// ----------------------------------------------------------------------
// Cuboid Component
// width  -> X axis
// height -> Y axis (we map pallet depth here)
// depth  -> Z axis (we map pallet height here)
// ----------------------------------------------------------------------
const Cuboid = ({
    width,
    height,
    depth,
    x,
    y,
    z,
    color = '#ccc',
    borderColor = 'rgba(0,0,0,0.12)',
    opacity = 1,
    label,
    onClick,
    className = '',
}: CuboidProps) => {
    const halfW = width / 2;
    const halfH = height / 2;
    const halfD = depth / 2;

    const baseFace: React.CSSProperties = {
        position: 'absolute',
        backfaceVisibility: 'hidden',
        border: `1px solid ${borderColor}`,
        opacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transformStyle: 'preserve-3d',
    };

    return (
        <div
            className={className}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick();
                }
            }}
            style={{
                position: 'absolute',
                width: 0,
                height: 0,
                transformStyle: 'preserve-3d',
                transform: getCuboidTransform(x, y, z),
            }}
        >
            {/* Front - brightest, facing camera */}
            <div
                style={{
                    ...baseFace,
                    width,
                    height,
                    left: -halfW,
                    top: -halfH,
                    backgroundColor: shadeHex(color, 0.05),
                    transform: `translateZ(${halfD}px)`,
                }}
            >
                {label}
            </div>

            {/* Back - darkest, away from camera */}
            <div
                style={{
                    ...baseFace,
                    width,
                    height,
                    left: -halfW,
                    top: -halfH,
                    backgroundColor: shadeHex(color, -0.2),
                    transform: `rotateY(180deg) translateZ(${halfD}px)`,
                }}
            />

            {/* Right - slightly darker */}
            <div
                style={{
                    ...baseFace,
                    width: depth,
                    height,
                    left: -halfD,
                    top: -halfH,
                    backgroundColor: shadeHex(color, -0.08),
                    transform: `rotateY(90deg) translateZ(${halfW}px)`,
                }}
            />

            {/* Left - darker */}
            <div
                style={{
                    ...baseFace,
                    width: depth,
                    height,
                    left: -halfD,
                    top: -halfH,
                    backgroundColor: shadeHex(color, -0.15),
                    transform: `rotateY(-90deg) translateZ(${halfW}px)`,
                }}
            />

            {/* Top - light, receiving light from above */}
            <div
                style={{
                    ...baseFace,
                    width,
                    height: depth,
                    left: -halfW,
                    top: -halfD,
                    backgroundColor: shadeHex(color, 0.1),
                    transform: `rotateX(90deg) translateZ(${halfH}px)`,
                }}
            />

            {/* Bottom - very dark */}
            <div
                style={{
                    ...baseFace,
                    width,
                    height: depth,
                    left: -halfW,
                    top: -halfD,
                    backgroundColor: shadeHex(color, -0.25),
                    transform: `rotateX(-90deg) translateZ(${halfH}px)`,
                }}
            />
        </div>
    );
};

type CartonVisual = {
    id: string;
    width: number;
    depth: number;
    height: number;
    x: number;
    y: number;
    z: number;
    layerIndex: number;
    buildIndex: number;
    color: string;
};

export default function PalletStackingVisualizer({
    palletWidth,
    palletDepth,
    cartonWidth,
    cartonDepth,
    cartonHeight,
    cartonsPerLayer,
    numberOfLayers,
    alternateLayers,
    basePattern = 'column',
    layerPatterns,
    onLayerClick,
    interactive = false,
    className = '',
}: PalletStackingVisualizerProps) {
    const rotationZ = 45;
    const rotationX = 60;
    const [buildStep, setBuildStep] = useState(0);
    const buildTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const palletWidthPx = palletWidth * SCALE;
    const palletDepthPx = palletDepth * SCALE;
    const palletHeightPx = PALLET_HEIGHT * SCALE;
    const stackHeightPx = (PALLET_HEIGHT + numberOfLayers * cartonHeight) * SCALE;

    // Calculate projected dimensions after isometric rotation
    const rotationXRad = rotationX * Math.PI / 180;

    // After rotateX(60deg):
    // - Z axis (height) projects onto screen-Y as NEGATIVE (upward on screen)
    // - Y axis (depth) projects onto screen-Y as positive (downward on screen)
    const projectedStackUp = stackHeightPx * Math.sin(rotationXRad);   // extends UP from origin
    const projectedBaseDown = palletDepthPx * Math.cos(rotationXRad); // extends DOWN from origin

    // Total vertical extent of the scene
    const totalProjectedExtent = projectedStackUp + projectedBaseDown;

    // Viewport height with padding
    const padding = 160;
    const viewHeightPx = Math.round(totalProjectedExtent + padding);

    // Calculate offset to center the stack vertically
    // The stack extends from -projectedStackUp (top) to +projectedBaseDown (bottom)
    // To center: we need to push the scene DOWN to bring the top into view
    // translateY(positive) = moves scene down = brings upper part of stack into view
    // Add extra margin for top visibility
    const topMargin = 40;
    const sceneOffsetY = Math.round((projectedStackUp - projectedBaseDown) / 2 + topMargin);

    const { cartons, maxBuildIndex } = useMemo(() => {
        const items: CartonVisual[] = [];
        let buildIndex = 0;

        for (let layer = 0; layer < numberOfLayers; layer++) {
            const pattern = layerPatterns?.find((p) => p.layer_index === layer);
            const plan = computeLayerPlan({
                palletWidth,
                palletDepth,
                cartonWidth,
                cartonDepth,
                basePattern,
                alternateLayers,
                layerIndex: layer,
                layerPattern: pattern
            });

            if (plan.maxCapacity <= 0 || plan.rows.length === 0) {
                continue;
            }

            const targetCount = Math.min(cartonsPerLayer, plan.maxCapacity);
            let remaining = targetCount;

            const rowsUsed: Array<{
                row: (typeof plan.rows)[number];
                colsInRow: number;
                buildIndex: number;
            }> = [];

            for (const row of plan.rows) {
                if (remaining <= 0) break;
                const colsInRow = Math.min(row.maxCols, remaining);
                if (colsInRow <= 0) continue;
                rowsUsed.push({ row, colsInRow, buildIndex });
                remaining -= colsInRow;
                buildIndex += 1;
            }

            const usedDepth = rowsUsed.reduce((sum, rowUse) => sum + rowUse.row.rowDepth, 0);
            const startY = -palletDepth / 2 + (palletDepth - usedDepth) / 2;
            let yCursor = startY;

            for (const rowUse of rowsUsed) {
                const { row, colsInRow } = rowUse;
                const availableWidth = palletWidth - row.rowOffset;
                const rowWidthUsed = colsInRow * row.rowWidth;
                const rowStartX = -palletWidth / 2 + row.rowOffset + (availableWidth - rowWidthUsed) / 2;
                const rowCenterY = yCursor + row.rowDepth / 2;

                for (let c = 0; c < colsInRow; c++) {
                    const x = rowStartX + c * row.rowWidth + row.rowWidth / 2;
                    const y = rowCenterY;
                    const z = PALLET_HEIGHT + layer * cartonHeight + cartonHeight / 2;

                    items.push({
                        id: `l${layer}-r${row.rowIndex}-c${c}`,
                        width: row.rowWidth,
                        depth: row.rowDepth,
                        height: cartonHeight,
                        x,
                        y,
                        z,
                        layerIndex: layer,
                        buildIndex: rowUse.buildIndex,
                        color: layer % 2 === 0 ? COLORS.layerEven : COLORS.layerOdd,
                    });
                }

                yCursor += row.rowDepth;
            }
        }

        const sorted = items.sort((a, b) => {
            if (a.z !== b.z) return a.z - b.z;
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });

        return {
            cartons: sorted,
            maxBuildIndex: Math.max(buildIndex - 1, 0),
        };
    }, [
        palletWidth,
        palletDepth,
        cartonWidth,
        cartonDepth,
        cartonHeight,
        cartonsPerLayer,
        numberOfLayers,
        alternateLayers,
        basePattern,
        layerPatterns,
    ]);

    useEffect(() => {
        setBuildStep(maxBuildIndex);
        return () => {
            if (buildTimerRef.current) {
                clearInterval(buildTimerRef.current);
                buildTimerRef.current = null;
            }
        };
    }, [maxBuildIndex]);

    const startBuildAnimation = () => {
        if (buildTimerRef.current) {
            clearInterval(buildTimerRef.current);
            buildTimerRef.current = null;
        }
        setBuildStep(0);
        if (maxBuildIndex <= 0) return;
        let current = 0;
        buildTimerRef.current = setInterval(() => {
            current += 1;
            setBuildStep(current);
            if (current >= maxBuildIndex) {
                if (buildTimerRef.current) {
                    clearInterval(buildTimerRef.current);
                    buildTimerRef.current = null;
                }
            }
        }, BUILD_INTERVAL_MS);
    };

    const visibleCartons = useMemo(
        () => cartons.filter((c) => c.buildIndex <= buildStep),
        [cartons, buildStep]
    );

    return (
        <div
            className={`relative w-full bg-slate-50 overflow-hidden flex flex-col ${className}`}
            style={{ height: `${viewHeightPx}px` }}
        >
            {/* 3D Scene */}
            <div className="flex-1 relative" style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transformStyle: 'preserve-3d',
                        transform: `translateY(${sceneOffsetY}px) rotateX(${rotationX}deg) rotateZ(${rotationZ}deg)`,
                        transition: 'transform 0.2s ease-out',
                    }}
                >
                    {/* Pallet Base */}
                    <Cuboid
                        width={palletWidthPx}
                        height={palletDepthPx}
                        depth={palletHeightPx}
                        x={0}
                        y={0}
                        z={palletHeightPx / 2}
                        color={COLORS.pallet}
                        borderColor="#5D3A1A"
                    />

                    {/* Cartons */}
                    {visibleCartons.map((c) => (
                        <Cuboid
                            key={c.id}
                            width={c.width * SCALE}
                            height={c.depth * SCALE}
                            depth={c.height * SCALE}
                            x={c.x * SCALE}
                            y={c.y * SCALE}
                            z={c.z * SCALE}
                            color={c.color}
                            onClick={() => interactive && onLayerClick?.(c.layerIndex)}
                            className={interactive ? 'cursor-pointer hover:brightness-110 transition-all' : ''}
                        />
                    ))}

                    {/* Layer Numbers removed */}
                </div>
            </div>

            {/* Controls Below Preview */}
            <div className="bg-white border-t p-2 flex items-center justify-center">
                <button
                    type="button"
                    onClick={startBuildAnimation}
                    className="px-4 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                    تشغيل البناء
                </button>
            </div>

        </div>
    );
}
