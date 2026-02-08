import * as XLSX from 'xlsx';
import type { FormInstance, FormTemplate } from '../types';
import { formatDate } from './index';

/**
 * Excel Exporter for Form Reports
 * Exports form data to Excel workbooks with multiple sheets
 */

interface ExcelExportOptions {
    includeMetadata?: boolean;
    includeCalculations?: boolean;
    separateSheetPerSection?: boolean;
}

export class ExcelExporter {
    private workbook: XLSX.WorkBook;

    constructor() {
        this.workbook = XLSX.utils.book_new();
    }

    /**
     * Export form instance to Excel
     */
    exportReport(
        instance: FormInstance,
        template: FormTemplate,
        options: ExcelExportOptions = {}
    ): void {
        const {
            includeMetadata = true,
            separateSheetPerSection = true
        } = options;

        // Add metadata sheet
        if (includeMetadata) {
            this.addMetadataSheet(instance, template);
        }

        // Add sections
        if (separateSheetPerSection) {
            this.addSectionsAsSeparateSheets(instance, template);
        } else {
            this.addAllSectionsInOneSheet(instance, template);
        }

        // Add quality criteria sheet
        if (template.quality_criteria && template.quality_criteria.length > 0) {
            this.addQualityCriteriaSheet(template.quality_criteria);
        }

        // Save the workbook
        const filename = `${template.name}_${formatDate(instance.created_at, 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(this.workbook, filename);
    }

    /**
     * Add metadata sheet
     */
    private addMetadataSheet(instance: FormInstance, template: FormTemplate): void {
        const data: any[][] = [
            ['Report Information'],
            [],
            ['Template Name', template.name],
            ['Template Version', template.version],
            ['Template Type', template.type],
            [],
            ['Report ID', instance.instance_id],
            ['Status', instance.status],
            ['Report Date', formatDate(instance.form_data.report_date, 'dd/MM/yyyy')],
            ['Batch Number', instance.form_data.batch_number || 'N/A'],
            ['Shift', instance.form_data.shift || 'N/A'],
            [],
            ['Created By', instance.created_by],
            ['Created At', formatDate(instance.created_at, 'dd/MM/yyyy HH:mm:ss')],
        ];

        if (instance.submitted_at) {
            data.push(['Submitted At', formatDate(instance.submitted_at, 'dd/MM/yyyy HH:mm:ss')]);
            data.push(['Submitted By', instance.submitted_by || 'N/A']);
        }

        if (instance.form_data.production_line) {
            data.push(['Production Line', instance.form_data.production_line]);
        }
        if (instance.form_data.operator) {
            data.push(['Operator', instance.form_data.operator]);
        }

        // Add basic info if available
        if (template.basic_info) {
            data.push([]);
            data.push(['Basic Information']);
            data.push([]);
            data.push(['Standard Weight (kg)', template.basic_info.standard_weight || 0]);
            data.push(['Shelf Life (months)', template.basic_info.shelf_life_months || 0]);
            data.push(['Cartons per Pallet', template.basic_info.cartons_per_pallet || 0]);
            data.push(['Packs per Box', template.basic_info.packs_per_box || 0]);
            data.push(['Boxes per Carton', template.basic_info.boxes_per_carton || 0]);
            data.push(['AQL Level', template.basic_info.aql_level || 'N/A']);
        }

        // Add document control
        if (template.document_control) {
            data.push([]);
            data.push(['Document Control']);
            data.push([]);
            data.push(['Document Code', template.document_control.doc_code]);
            data.push(['Issue Number', template.document_control.issue_no]);
            data.push(['Review Number', template.document_control.review_no]);
            data.push(['Issue Date', template.document_control.issue_date]);
            data.push(['Review Date', template.document_control.review_date || 'N/A']);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 25 },
            { wch: 30 }
        ];

        // Style the headers
        this.styleHeader(ws, 'A1');
        if (template.basic_info) {
            this.styleHeader(ws, `A${data.findIndex(row => row[0] === 'Basic Information') + 1}`);
        }
        if (template.document_control) {
            this.styleHeader(ws, `A${data.findIndex(row => row[0] === 'Document Control') + 1}`);
        }

        XLSX.utils.book_append_sheet(this.workbook, ws, 'Metadata');
    }

    /**
     * Add sections as separate sheets
     */
    private addSectionsAsSeparateSheets(instance: FormInstance, template: FormTemplate): void {
        const sections = template.sections;
        const formData = instance.form_data.sections;

        for (const [sectionId, section] of Object.entries(sections)) {
            const sectionData = formData?.[sectionId];

            if (section.tables && section.tables.length > 0) {
                // Create data array for this section
                const sheetData: any[][] = [[section.name]];
                sheetData.push([]);

                section.tables.forEach((table) => {
                    // Add table title
                    sheetData.push([table.name]);

                    // Add table headers
                    if (table.columns && table.columns.length > 0) {
                        const headers = table.columns.map((col: any) => col.label);
                        sheetData.push(headers);

                        // Add table data
                        const tableData = sectionData?.tables?.[table.id]?.data || [];
                        if (tableData.length > 0) {
                            tableData.forEach(row => sheetData.push(row));
                        } else {
                            sheetData.push(Array(headers.length).fill('-'));
                        }
                    }

                    sheetData.push([]); // Empty row between tables
                });

                const ws = XLSX.utils.aoa_to_sheet(sheetData);

                // Set column widths
                const colCount = Math.max(...sheetData.map(row => row.length));
                ws['!cols'] = Array(colCount).fill({ wch: 15 });

                // Sanitize sheet name (max 31 chars, no special chars)
                const sheetName = section.name.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '_');
                XLSX.utils.book_append_sheet(this.workbook, ws, sheetName);
            }
        }
    }

    /**
     * Add all sections in one sheet
     */
    private addAllSectionsInOneSheet(instance: FormInstance, template: FormTemplate): void {
        const sections = template.sections;
        const formData = instance.form_data.sections;
        const allData: any[][] = [['Form Data']];
        allData.push([]);

        for (const [sectionId, section] of Object.entries(sections)) {
            const sectionData = formData?.[sectionId];

            // Section header
            allData.push([section.name]);
            allData.push([]);

            if (section.tables && section.tables.length > 0) {
                section.tables.forEach((table) => {
                    // Table title
                    allData.push([table.name]);

                    // Table data
                    if (table.columns && table.columns.length > 0) {
                        const headers = table.columns.map((col: any) => col.label);
                        allData.push(headers);

                        const tableData = sectionData?.tables?.[table.id]?.data || [];
                        if (tableData.length > 0) {
                            tableData.forEach(row => allData.push(row));
                        } else {
                            allData.push(Array(headers.length).fill('-'));
                        }
                    }

                    allData.push([]); // Empty row
                });
            }

            allData.push([]); // Empty row between sections
        }

        const ws = XLSX.utils.aoa_to_sheet(allData);

        // Set column widths
        const colCount = Math.max(...allData.map(row => row.length));
        ws['!cols'] = Array(colCount).fill({ wch: 15 });

        XLSX.utils.book_append_sheet(this.workbook, ws, 'All Data');
    }

    /**
     * Add quality criteria sheet
     */
    private addQualityCriteriaSheet(criteria: any[]): void {
        const data: any[][] = [['Quality Criteria']];
        data.push([]);

        criteria.forEach((criterion) => {
            data.push([criterion.title]);
            data.push(['Parameter', 'Specification', 'Result']);

            criterion.items.forEach((item: any) => {
                data.push([
                    item.parameter,
                    item.specification,
                    item.result || '-'
                ]);
            });

            data.push([]); // Empty row between criteria
        });

        const ws = XLSX.utils.aoa_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 30 },
            { wch: 40 },
            { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(this.workbook, ws, 'Quality Criteria');
    }

    /**
     * Style a header cell
     */
    private styleHeader(ws: XLSX.WorkSheet, cell: string): void {
        if (!ws[cell]) return;

        ws[cell].s = {
            font: {
                bold: true,
                sz: 14
            },
            fill: {
                fgColor: { rgb: 'E0E0E0' }
            },
            alignment: {
                horizontal: 'left',
                vertical: 'center'
            }
        };
    }
}

/**
 * Export utility function
 */
export const exportReportToExcel = (
    instance: FormInstance,
    template: FormTemplate,
    options?: ExcelExportOptions
): void => {
    const exporter = new ExcelExporter();
    exporter.exportReport(instance, template, options);
};

/**
 * Export multiple reports to a single Excel file
 */
export const exportMultipleReportsToExcel = (
    reports: Array<{ instance: FormInstance; template: FormTemplate }>,
    filename?: string
): void => {
    const workbook = XLSX.utils.book_new();

    reports.forEach(({ instance, template }, index) => {
        const sheetName = `Report_${index + 1}`;
        const data: any[][] = [
            [template.name],
            ['Date:', formatDate(instance.form_data.report_date, 'dd/MM/yyyy')],
            ['Batch:', instance.form_data.batch_number || 'N/A'],
            ['Status:', instance.status],
            []
        ];

        // Add table data from sections
        const sections = template.sections;
        const formData = instance.form_data.sections;

        for (const [sectionId, section] of Object.entries(sections)) {
            const sectionData = formData?.[sectionId];

            if (section.tables && section.tables.length > 0) {
                section.tables.forEach((table) => {
                    if (table.columns) {
                        data.push([table.name]);
                        data.push(table.columns.map((col: any) => col.label));

                        const tableData = sectionData?.tables?.[table.id]?.data || [];
                        tableData.forEach(row => data.push(row));
                        data.push([]);
                    }
                });
            }
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    });

    const finalFilename = filename || `Multiple_Reports_${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, finalFilename);
};
