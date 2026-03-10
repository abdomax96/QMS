export type UnitGroup = 'mass' | 'volume' | 'count';

interface UnitDefinition {
    group: UnitGroup;
    factor: number;
}

const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
    mg: { group: 'mass', factor: 0.001 },
    g: { group: 'mass', factor: 1 },
    kg: { group: 'mass', factor: 1000 },
    ml: { group: 'volume', factor: 1 },
    l: { group: 'volume', factor: 1000 },
    piece: { group: 'count', factor: 1 },
    pieces: { group: 'count', factor: 1 },
    pc: { group: 'count', factor: 1 },
    pcs: { group: 'count', factor: 1 },
    pack: { group: 'count', factor: 1 },
    packs: { group: 'count', factor: 1 },
    unit: { group: 'count', factor: 1 },
    units: { group: 'count', factor: 1 },
};

const normalizeUnit = (unit: string): string => unit.trim().toLowerCase();

export const canConvertUnits = (fromUnit?: string | null, toUnit?: string | null): boolean => {
    if (!fromUnit || !toUnit) return false;
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    if (!from || !to) return false;
    if (from === to) return true;

    const fromDef = UNIT_DEFINITIONS[from];
    const toDef = UNIT_DEFINITIONS[to];
    return Boolean(fromDef && toDef && fromDef.group === toDef.group);
};

export const convertQuantity = (
    value: number,
    fromUnit?: string | null,
    toUnit?: string | null
): number | null => {
    if (!Number.isFinite(value)) return null;
    if (!fromUnit || !toUnit) return null;

    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    if (!from || !to) return null;
    if (from === to) return value;

    const fromDef = UNIT_DEFINITIONS[from];
    const toDef = UNIT_DEFINITIONS[to];
    if (!fromDef || !toDef || fromDef.group !== toDef.group) {
        return null;
    }

    return (value * fromDef.factor) / toDef.factor;
};

