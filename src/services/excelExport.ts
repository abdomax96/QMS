/**
 * Excel Export Service
 * Export data to Excel format using SheetJS (xlsx)
 */

// Note: This uses a lightweight approach without external dependencies
// For production, consider using 'xlsx' or 'exceljs' library

export interface ExcelColumn {
    key: string;
    header: string;
    width?: number;
    formatter?: (value: unknown) => string | number;
}

export interface ExcelExportOptions {
    filename: string;
    sheetName?: string;
    columns: ExcelColumn[];
    data: Record<string, unknown>[];
    includeHeaders?: boolean;
    rtl?: boolean;
}

/**
 * Convert data to CSV format (basic Excel-compatible format)
 */
export function exportToCSV(options: ExcelExportOptions): void {
    const { filename, columns, data, includeHeaders = true } = options;

    // Build CSV content
    const rows: string[] = [];

    // Add BOM for UTF-8 Excel compatibility
    const BOM = '\uFEFF';

    // Headers
    if (includeHeaders) {
        const headerRow = columns.map(col => escapeCSV(col.header)).join(',');
        rows.push(headerRow);
    }

    // Data rows
    for (const item of data) {
        const row = columns.map(col => {
            const value = item[col.key];
            const formatted = col.formatter ? col.formatter(value) : value;
            return escapeCSV(String(formatted ?? ''));
        }).join(',');
        rows.push(row);
    }

    const csvContent = BOM + rows.join('\n');

    // Download
    downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Export NCR reports to Excel/CSV
 */
export function exportNcrToExcel(ncrs: Array<{
    number: string;
    department: string;
    date: string;
    severity: string;
    status: string;
    description?: string;
    discoveredBy?: string;
    daysOpen?: number;
}>): void {
    const columns: ExcelColumn[] = [
        { key: 'number', header: 'رقم التقرير', width: 15 },
        { key: 'department', header: 'القسم', width: 20 },
        { key: 'date', header: 'التاريخ', width: 12 },
        { key: 'severity', header: 'الخطورة', width: 10, formatter: formatSeverity },
        { key: 'status', header: 'الحالة', width: 15, formatter: formatStatus },
        { key: 'discoveredBy', header: 'اكتشف بواسطة', width: 20 },
        { key: 'daysOpen', header: 'أيام مفتوح', width: 12 },
        { key: 'description', header: 'الوصف', width: 50 }
    ];

    const now = new Date().toISOString().split('T')[0];

    exportToCSV({
        filename: `ncr_reports_${now}`,
        sheetName: 'NCR Reports',
        columns,
        data: ncrs,
        rtl: true
    });
}

/**
 * Export users to Excel/CSV
 */
export function exportUsersToExcel(users: Array<{
    name: string;
    email: string;
    department?: string;
    role: string;
    isActive: boolean;
}>): void {
    const columns: ExcelColumn[] = [
        { key: 'name', header: 'الاسم', width: 25 },
        { key: 'email', header: 'البريد الإلكتروني', width: 30 },
        { key: 'department', header: 'القسم', width: 20 },
        { key: 'role', header: 'الدور', width: 15, formatter: formatRole },
        { key: 'isActive', header: 'الحالة', width: 10, formatter: (v) => v ? 'نشط' : 'غير نشط' }
    ];

    const now = new Date().toISOString().split('T')[0];

    exportToCSV({
        filename: `users_${now}`,
        sheetName: 'Users',
        columns,
        data: users,
        rtl: true
    });
}

/**
 * Generic export function
 */
export function exportToExcel<T extends Record<string, unknown>>(
    data: T[],
    columns: ExcelColumn[],
    filename: string
): void {
    const now = new Date().toISOString().split('T')[0];

    exportToCSV({
        filename: `${filename}_${now}`,
        columns,
        data,
        rtl: true
    });
}

// Helper functions
function escapeCSV(value: string): string {
    // Escape quotes and wrap in quotes if contains special chars
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function formatSeverity(value: unknown): string {
    const map: Record<string, string> = {
        'low': 'منخفضة',
        'medium': 'متوسطة',
        'high': 'عالية'
    };
    return map[String(value)] || String(value);
}

function formatStatus(value: unknown): string {
    const map: Record<string, string> = {
        'open': 'مفتوح',
        'in_progress': 'قيد التنفيذ',
        'pending_verification': 'بانتظار التحقق',
        'closed': 'مغلق'
    };
    return map[String(value)] || String(value);
}

function formatRole(value: unknown): string {
    const map: Record<string, string> = {
        'admin': 'مدير',
        'manager': 'مشرف',
        'employee': 'موظف',
        'viewer': 'مشاهد'
    };
    return map[String(value)] || String(value);
}

export default {
    exportToCSV,
    exportNcrToExcel,
    exportUsersToExcel,
    exportToExcel
};
