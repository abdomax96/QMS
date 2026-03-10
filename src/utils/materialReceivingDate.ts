import type { MaterialDateFormat } from '../domain/lab/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const FLEX_MONTH_RE = /^\d{4}-\d{1,2}$/;
const MONTH_YEAR_RE = /^\d{1,2}[\/-]\d{4}$/;

function normalizeDigits(value: string): string {
    // Support Arabic-Indic digits in manual text inputs.
    return value
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

function parseMonthYearInput(value: string): { year: number; month: number } | null {
    const normalized = normalizeDigits(value.trim());
    if (!normalized) return null;

    const dottedToDash = normalized.replace(/[.]/g, '-');

    if (FLEX_MONTH_RE.test(dottedToDash)) {
        const [yearRaw, monthRaw] = dottedToDash.split('-');
        const year = Number(yearRaw);
        const month = Number(monthRaw);
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
        return { year, month };
    }

    if (MONTH_YEAR_RE.test(dottedToDash)) {
        const [monthRaw, yearRaw] = dottedToDash.split(/[\/-]/);
        const year = Number(yearRaw);
        const month = Number(monthRaw);
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
        return { year, month };
    }

    return null;
}

function toDateOnly(value: string): string {
    return value.includes('T') ? value.split('T')[0] : value;
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

function dateToLocalIso(date: Date): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseIsoDateToLocalDate(isoDate: string): Date | null {
    const [yearRaw, monthRaw, dayRaw] = isoDate.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }

    const parsed = new Date(year, month - 1, day, 12, 0, 0);
    if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() + 1 !== month ||
        parsed.getDate() !== day
    ) {
        return null;
    }
    return parsed;
}

export function normalizeStoredMaterialDate(value?: string | null): string {
    if (!value) return '';
    const trimmed = normalizeDigits(value.trim());
    if (!trimmed) return '';

    const dateOnly = toDateOnly(trimmed);
    if (DATE_RE.test(dateOnly)) return dateOnly;
    if (MONTH_RE.test(dateOnly)) return `${dateOnly}-01`;

    const parsedMonthYear = parseMonthYearInput(dateOnly);
    if (parsedMonthYear) {
        return `${parsedMonthYear.year}-${pad2(parsedMonthYear.month)}-01`;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return '';
    return dateToLocalIso(parsed);
}

export function materialDateInputToStored(
    inputValue: string,
    dateFormat: MaterialDateFormat
): string {
    const trimmed = normalizeDigits(inputValue.trim());
    if (!trimmed) return '';

    if (dateFormat === 'my') {
        const parsedMonthYear = parseMonthYearInput(trimmed);
        if (!parsedMonthYear) return '';
        return `${parsedMonthYear.year}-${pad2(parsedMonthYear.month)}-01`;
    }

    if (!DATE_RE.test(trimmed)) return '';
    return trimmed;
}

export function materialDateToInputValue(
    storedValue?: string | null,
    dateFormat: MaterialDateFormat = 'dmy'
): string {
    const normalized = normalizeStoredMaterialDate(storedValue);
    if (!normalized) return '';
    return dateFormat === 'my' ? normalized.slice(0, 7) : normalized;
}

export function coerceStoredMaterialDateToFormat(
    storedValue: string | undefined,
    dateFormat: MaterialDateFormat
): string {
    if (!storedValue) return '';
    const inputValue = materialDateToInputValue(storedValue, dateFormat);
    return materialDateInputToStored(inputValue, dateFormat);
}

export function formatMaterialDateForDisplay(
    storedValue: string | null | undefined,
    dateFormat: MaterialDateFormat = 'dmy',
    language: 'ar' | 'en' = 'ar'
): string {
    const normalized = normalizeStoredMaterialDate(storedValue);
    if (!normalized) return '-';

    const parsed = parseIsoDateToLocalDate(normalized);
    if (!parsed) return '-';

    const locale = language === 'ar' ? 'ar-EG' : 'en-US';
    if (dateFormat === 'my') {
        return new Intl.DateTimeFormat(locale, {
            month: '2-digit',
            year: 'numeric',
        }).format(parsed);
    }

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
}
