import type { Pallet } from '../types/pallet';
import { addDays, addMonths, isValid, parseISO, subDays } from 'date-fns';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { supabase } from '../config/supabase';

const SHELF_LIFE_MONTH_KEYS = new Set([
    'shelf_life_months',
    'shelf_life_month',
    'shelf_life',
    'expiry_months',
    'expiry_month',
    'مدة_الصلاحية_بالشهور',
    'مدة_الصلاحية_بالشهر',
    'مدة_الصلاحية',
    'مدةالصلاحية'
]);

const parseNumber = (raw: string | null | undefined): number | null => {
    if (!raw) return null;
    const match = String(raw).match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeKey = (key: string): string =>
    key.trim().toLowerCase().replace(/\s+/g, '_');

const parseDateSafe = (value?: string | null): Date | null => {
    if (!value) return null;
    const parsed = parseISO(value);
    if (isValid(parsed)) return parsed;
    const fallback = new Date(value);
    return isValid(fallback) ? fallback : null;
};

const resolveShiftLabel = async (pallet: Pallet): Promise<string | null> => {
    if (pallet.shift) return pallet.shift;
    if (!pallet.id) return null;

    try {
        const { data } = await supabase
            .from('pallet_contributions')
            .select('shift')
            .eq('pallet_id', pallet.id)
            .order('added_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        return data?.shift ?? null;
    } catch (error) {
        console.warn('Failed to resolve pallet shift:', error);
        return null;
    }
};

interface PrintOptions {
    labelType: 'text' | 'barcode' | 'qr' | 'full';
    labelSize: 'a4' | 'thermal_100x150' | 'custom';
    copies: number;
    printer?: string;
}

export const printService = {
    /**
     * Generate Data URL for QR Code
     */
    async generateQRDataUrl(data: string): Promise<string> {
        try {
            return await QRCode.toDataURL(data, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 150,
            });
        } catch (err) {
            console.error('QR Generation failed:', err);
            return '';
        }
    },

    /**
     * Generate Data URL for Barcode
     */
    generateBarcodeDataUrl(text: string): string {
        try {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, text, {
                format: 'CODE128',
                displayValue: true,
                fontSize: 14,
                width: 2,
                height: 50,
                margin: 0
            });
            return canvas.toDataURL('image/png');
        } catch (err) {
            console.error('Barcode Generation failed:', err);
            return '';
        }
    },

    /**
     * Generate ZPL code for Zebra printers
     */
    generateZPL(pallet: Pallet, options: PrintOptions): string {
        // ... (ZPL logic remains valid as string generation)
        const batchDisplay = pallet.batch_number || pallet.batch_id;
        let zpl = `^XA
^FO50,50^A0N,50,50^FDPallet ID:^FS
^FO50,100^A0N,70,70^FD${pallet.pallet_number}^FS
^FO50,180^A0N,30,30^FDProduct:^FS
^FO50,210^A0N,30,30^FDPotato Chips (ID: ${pallet.product_id})^FS
^FO50,270^A0N,30,30^FDBatch: ${batchDisplay}^FS
^FO50,310^A0N,30,30^FDQuantity: ${pallet.actual_cartons} / ${pallet.standard_cartons_per_pallet}^FS
^FO50,350^A0N,30,30^FDDate: ${new Date(pallet.created_at).toLocaleDateString()}^FS
`;

        if (options.labelType === 'barcode' || options.labelType === 'full') {
            zpl += `^FO50,420^BY3^BCN,100,Y,N,N
^FD${pallet.pallet_number}^FS
`;
        }

        if (options.labelType === 'qr' || options.labelType === 'full') {
            const qrData = JSON.stringify({
                id: pallet.id,
                num: pallet.pallet_number,
                batch: pallet.batch_id
            });
            zpl += `^FO400,420^BQN,2,10
^FDQA,${qrData}^FS
`;
        }

        zpl += '^XZ';
        return zpl;
    },

    /**
     * Print label via browser window
     */
    async printBrowser(pallet: Pallet, options: PrintOptions) {
        // Resolve production date
        let productionDate = parseDateSafe(pallet.production_date);
        if (!productionDate && pallet.batch_id) {
            try {
                const { data: batch } = await supabase
                    .from('pallet_batches')
                    .select('production_date')
                    .eq('id', pallet.batch_id)
                    .single();
                productionDate = parseDateSafe(batch?.production_date);
            } catch (error) {
                console.warn('Failed to load batch production date:', error);
            }
        }

        const shiftLabel = await resolveShiftLabel(pallet);

        const productionDateLabel = productionDate
            ? productionDate.toLocaleDateString('ar-EG')
            : new Date(pallet.created_at).toLocaleString('ar-EG');

        // Resolve shelf life (selected SOP variable > SOP variables by name > product shelf_life_days)
        let shelfLifeMonths: number | null = null;
        let shelfLifeDays: number | null = null;
        try {
            const [{ data: product, error: productError }, { data: config }] = await Promise.all([
                supabase
                    .from('products')
                    .select('sop_document_id, shelf_life_days')
                    .eq('id', pallet.product_id)
                    .single(),
                supabase
                    .from('product_pallet_config')
                    .select('shelf_life_variable_id')
                    .eq('product_id', pallet.product_id)
                    .maybeSingle()
            ]);

            if (productError) throw productError;

            shelfLifeDays = product?.shelf_life_days ?? null;

            if (config?.shelf_life_variable_id) {
                const { data: variable, error: variableError } = await supabase
                    .from('variables')
                    .select('name, value, unit')
                    .eq('id', config.shelf_life_variable_id)
                    .single();

                if (variableError) throw variableError;
                shelfLifeMonths = parseNumber(variable?.value);
            }

            if (shelfLifeMonths === null && product?.sop_document_id) {
                const { data: variables } = await supabase
                    .from('variables')
                    .select('name, value')
                    .eq('source_document_id', product.sop_document_id);

                if (variables && variables.length > 0) {
                    const match = variables.find(v => SHELF_LIFE_MONTH_KEYS.has(normalizeKey(v.name)));
                    shelfLifeMonths = parseNumber(match?.value);
                }
            }
        } catch (error) {
            console.warn('Failed to resolve shelf life:', error);
        }

        let expiryDateLabel = '-';
        if (productionDate) {
            if (shelfLifeMonths !== null) {
                const expiry = subDays(addMonths(productionDate, shelfLifeMonths), 1);
                expiryDateLabel = expiry.toLocaleDateString('ar-EG');
            } else if (shelfLifeDays !== null) {
                const expiry = subDays(addDays(productionDate, shelfLifeDays), 1);
                expiryDateLabel = expiry.toLocaleDateString('ar-EG');
            }
        }

        const finishedAtValue = pallet.finished_at || pallet.completed_at || null;
        const finishedAtDate = parseDateSafe(finishedAtValue);
        const finishedAtLabel = finishedAtDate ? finishedAtDate.toLocaleString('ar-EG') : '-';

        // Generate Images first
        const qrData = JSON.stringify({
            id: pallet.id,
            num: pallet.pallet_number,
            batch_id: pallet.batch_id,
            batch_number: pallet.batch_number || null
        });

        const qrImage = (options.labelType === 'qr' || options.labelType === 'full')
            ? await this.generateQRDataUrl(qrData)
            : '';

        const barcodeImage = (options.labelType === 'barcode' || options.labelType === 'full')
            ? this.generateBarcodeDataUrl(pallet.pallet_number)
            : '';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print labels');
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <title>Print Label - ${pallet.pallet_number}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        direction: rtl;
                    }
                    .label-container {
                        border: 2px solid #000;
                        padding: 20px;
                        max-width: 500px;
                        margin: 0 auto;
                        position: relative;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    .header h1 { margin: 0 0 10px; font-size: 24px; }
                    .header h2 { margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 1px; }
                    .row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        font-size: 18px;
                        border-bottom: 1px dashed #eee;
                        padding-bottom: 8px;
                    }
                    .label {
                        font-weight: bold;
                    }
                    .codes-container {
                        margin-top: 25px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 15px;
                        border-top: 1px dotted #ccc;
                        padding-top: 20px;
                    }
                    .barcode-img {
                        max-width: 100%;
                        height: auto;
                    }
                    .qr-img {
                        width: 120px;
                        height: 120px;
                    }
                    @media print {
                        .no-print { display: none; }
                        body { padding: 0; margin: 0; }
                        .label-container { 
                            border: none; 
                            width: 100%; 
                            max-width: 100%; 
                            padding: 0;
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="label-container">
                    <div class="header">
                        <h1>بطاقة تعريف بالتة</h1>
                        <h2>${pallet.pallet_number}</h2>
                    </div>
                    
                    <div class="row">
                        <span class="label">رقم التشغيلة:</span>
                        <span style="font-family: monospace;">${pallet.batch_number || pallet.batch_id}</span>
                    </div>

                    <div class="row">
                        <span class="label">الوردية:</span>
                        <span>${shiftLabel || '-'}</span>
                    </div>
                    
                    <div class="row">
                        <span class="label">الكمية:</span>
                        <span style="font-weight: bold;">${pallet.actual_cartons} كرتونة</span>
                    </div>

                    <div class="row">
                        <span class="label">تاريخ الإنتاج:</span>
                        <span>${productionDateLabel}</span>
                    </div>

                    <div class="row">
                        <span class="label">وقت انتهاء البالتة:</span>
                        <span>${finishedAtLabel}</span>
                    </div>
                    
                    <div class="row">
                        <span class="label">تاريخ الانتهاء:</span>
                        <span>${expiryDateLabel}</span>
                    </div>

                    <div class="codes-container">
                        ${barcodeImage ? `<img src="${barcodeImage}" class="barcode-img" alt="Barcode" />` : ''}
                        ${qrImage ? `<img src="${qrImage}" class="qr-img" alt="QR Code" />` : ''}
                    </div>

                    <div class="footer" style="margin-top: 20px; text-align: center; font-size: 10px; color: #666;">
                        Generated by QMS System | ${new Date().toLocaleString()}
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        // setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }
};
