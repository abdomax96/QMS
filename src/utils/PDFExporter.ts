import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FormInstance, FormTemplate } from '../types';
import { formatDate } from './index';

/**
 * PDF Exporter for Form Reports
 * Generates professional PDF documents with RTL support for Arabic text
 */

interface PDFExportOptions {
    includeSignatures?: boolean;
    includeAttachments?: boolean;
    includeHeader?: boolean;
    includeFooter?: boolean;
    companyName?: string;
    companyLogo?: string;
}

export class PDFExporter {
    private doc: jsPDF;
    private currentY: number = 20;
    private pageWidth: number;
    private pageHeight: number;
    private margin: number = 20;

    constructor() {
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        this.pageWidth = this.doc.internal.pageSize.getWidth();
        this.pageHeight = this.doc.internal.pageSize.getHeight();
    }

    /**
     * Export form instance to PDF
     */
    async exportReport(
        instance: FormInstance,
        template: FormTemplate,
        options: PDFExportOptions = {}
    ): Promise<void> {
        const {
            includeHeader = true,
            includeFooter = true,
            includeSignatures = true,
            companyName = 'شركة الجودة'
        } = options;

        // Add header
        if (includeHeader) {
            this.addHeader(companyName, template.name);
        }

        // Add document control info
        if (template.document_control) {
            this.addDocumentControl(template.document_control);
        }

        // Add report metadata
        this.addReportMetadata(instance);

        // Add basic info
        if (template.basic_info) {
            this.addBasicInfo(template.basic_info);
        }

        // Add sections with tables
        this.addSections(instance, template);

        // Add quality criteria
        if (template.quality_criteria && template.quality_criteria.length > 0) {
            this.addQualityCriteria(template.quality_criteria);
        }

        // Add notes
        if (template.notes) {
            this.addNotes(template.notes);
        }

        // Add signatures
        if (includeSignatures && instance.signatures) {
            this.addSignatures(instance.signatures);
        }

        // Add footer to all pages
        if (includeFooter) {
            this.addPageNumbers();
        }

        // Save the PDF
        const filename = `${template.name}_${formatDate(instance.created_at, 'yyyy-MM-dd')}.pdf`;
        this.doc.save(filename);
    }

    /**
     * Add header section
     */
    private addHeader(companyName: string, templateName: string): void {
        this.doc.setFontSize(20);
        this.doc.setFont('helvetica', 'bold');

        // Company name (centered)
        const companyWidth = this.doc.getTextWidth(companyName);
        this.doc.text(companyName, (this.pageWidth - companyWidth) / 2, this.currentY);

        this.currentY += 10;

        // Template name
        this.doc.setFontSize(16);
        const titleWidth = this.doc.getTextWidth(templateName);
        this.doc.text(templateName, (this.pageWidth - titleWidth) / 2, this.currentY);

        this.currentY += 10;

        // Separator line
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
        this.currentY += 5;
    }

    /**
     * Add document control information
     */
    private addDocumentControl(docControl: any): void {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');

        const data = [
            ['Document Code:', docControl.doc_code || 'N/A'],
            ['Issue No:', docControl.issue_no || 'N/A'],
            ['Review No:', docControl.review_no || 'N/A'],
            ['Issue Date:', docControl.issue_date || 'N/A'],
            ['Review Date:', docControl.review_date || 'N/A']
        ];

        autoTable(this.doc, {
            startY: this.currentY,
            head: [],
            body: data,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 },
                1: { cellWidth: 'auto' }
            }
        });

        this.currentY = (this.doc as any).lastAutoTable.finalY + 5;
    }

    /**
     * Add report metadata
     */
    private addReportMetadata(instance: FormInstance): void {
        this.addSectionTitle('Report Information');

        const data = [
            ['Report Date:', formatDate(instance.form_data.report_date, 'dd/MM/yyyy')],
            ['Batch Number:', instance.form_data.batch_number || 'N/A'],
            ['Shift:', instance.form_data.shift || 'N/A'],
            ['Status:', instance.status],
            ['Created By:', instance.created_by],
            ['Created At:', formatDate(instance.created_at, 'dd/MM/yyyy HH:mm')]
        ];

        if (instance.form_data.production_line) {
            data.push(['Production Line:', instance.form_data.production_line]);
        }
        if (instance.form_data.operator) {
            data.push(['Operator:', instance.form_data.operator]);
        }

        autoTable(this.doc, {
            startY: this.currentY,
            body: data,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 50 },
                1: { cellWidth: 'auto' }
            }
        });

        this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }

    /**
     * Add basic info section
     */
    private addBasicInfo(basicInfo: any): void {
        this.addSectionTitle('Basic Information');

        const data = [
            ['Standard Weight:', `${basicInfo.standard_weight || 0} kg`],
            ['Shelf Life:', `${basicInfo.shelf_life_months || 0} months`],
            ['Cartons/Pallet:', basicInfo.cartons_per_pallet || 0],
            ['Packs/Box:', basicInfo.packs_per_box || 0],
            ['Boxes/Carton:', basicInfo.boxes_per_carton || 0],
            ['AQL Level:', basicInfo.aql_level || 'N/A']
        ];

        autoTable(this.doc, {
            startY: this.currentY,
            body: data,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 50 },
                1: { cellWidth: 'auto' }
            }
        });

        this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }

    /**
     * Add sections with tables
     */
    private addSections(instance: FormInstance, template: FormTemplate): void {
        const sections = template.sections;
        const formData = instance.form_data.sections;

        for (const [sectionId, section] of Object.entries(sections)) {
            this.addSectionTitle(section.name);

            const sectionData = formData?.[sectionId];

            if (section.tables && section.tables.length > 0) {
                section.tables.forEach((table, index) => {
                    this.addTable(table, sectionData?.tables?.[table.id]?.data || []);
                });
            }

            this.currentY += 5;
        }
    }

    /**
     * Add a table to the PDF
     */
    private addTable(table: any, data: any[][]): void {
        if (!table.columns || table.columns.length === 0) return;

        // Check if we need a new page
        if (this.currentY > this.pageHeight - 50) {
            this.doc.addPage();
            this.currentY = 20;
        }

        // Table title
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(table.name, this.margin, this.currentY);
        this.currentY += 7;

        // Prepare table headers
        const headers = table.columns.map((col: any) => col.label);

        // Prepare table body
        const body = data.length > 0 ? data : [Array(headers.length).fill('-')];

        autoTable(this.doc, {
            startY: this.currentY,
            head: [headers],
            body: body,
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 2,
                overflow: 'linebreak',
                halign: 'center'
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            }
        });

        this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
    }

    /**
     * Add quality criteria section
     */
    private addQualityCriteria(criteria: any[]): void {
        this.addSectionTitle('Quality Criteria');

        criteria.forEach((criterion) => {
            this.doc.setFontSize(10);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(criterion.title, this.margin, this.currentY);
            this.currentY += 5;

            const items = criterion.items.map((item: any) => [
                item.parameter,
                item.specification,
                item.result || '-'
            ]);

            autoTable(this.doc, {
                startY: this.currentY,
                head: [['Parameter', 'Specification', 'Result']],
                body: items,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: criterion.color || '#10b981' }
            });

            this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
        });
    }

    /**
     * Add notes section
     */
    private addNotes(notes: string): void {
        this.addSectionTitle('Notes');

        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');

        const splitText = this.doc.splitTextToSize(notes, this.pageWidth - 2 * this.margin);
        this.doc.text(splitText, this.margin, this.currentY);

        this.currentY += splitText.length * 5 + 10;
    }

    /**
     * Add signatures section
     */
    private addSignatures(signatures: any[]): void {
        this.addSectionTitle('Signatures');

        const sigData = signatures.map(sig => [
            sig.role,
            sig.name || '-',
            sig.timestamp ? formatDate(sig.timestamp, 'dd/MM/yyyy HH:mm') : '-'
        ]);

        autoTable(this.doc, {
            startY: this.currentY,
            head: [['Role', 'Name', 'Date & Time']],
            body: sigData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 }
        });

        this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }

    /**
     * Add section title
     */
    private addSectionTitle(title: string): void {
        // Check if we need a new page
        if (this.currentY > this.pageHeight - 30) {
            this.doc.addPage();
            this.currentY = 20;
        }

        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFillColor(240, 240, 240);
        this.doc.rect(this.margin, this.currentY - 4, this.pageWidth - 2 * this.margin, 8, 'F');
        this.doc.text(title, this.margin + 2, this.currentY + 2);
        this.currentY += 10;
    }

    /**
     * Add page numbers to all pages
     */
    private addPageNumbers(): void {
        const pageCount = this.doc.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(9);
            this.doc.setFont('helvetica', 'normal');

            const pageText = `Page ${i} of ${pageCount}`;
            const textWidth = this.doc.getTextWidth(pageText);
            this.doc.text(pageText, (this.pageWidth - textWidth) / 2, this.pageHeight - 10);

            // Add date/time
            const dateText = formatDate(new Date(), 'dd/MM/yyyy HH:mm');
            this.doc.text(dateText, this.margin, this.pageHeight - 10);
        }
    }
}

// Export utility function
export const exportReportToPDF = async (
    instance: FormInstance,
    template: FormTemplate,
    options?: PDFExportOptions
): Promise<void> => {
    const exporter = new PDFExporter();
    await exporter.exportReport(instance, template, options);
};
