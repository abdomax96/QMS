import type { FormTemplate } from '../types';

const TEMPLATE_BACKUP_KIND = 'qms.form_template_backup';
const TEMPLATE_BACKUP_VERSION = 1;
const TEMPLATE_BACKUP_MIME = 'application/vnd.qms.form-template+json';
const TEMPLATE_BACKUP_EXTENSION = '.qms-template.json';

interface TemplateBackupPayloadV1 {
    kind: typeof TEMPLATE_BACKUP_KIND;
    version: typeof TEMPLATE_BACKUP_VERSION;
    exported_at: string;
    template: FormTemplate;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isTemplateLike(value: unknown): value is FormTemplate {
    if (!isObject(value)) return false;
    return (
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.created_at === 'string' &&
        typeof value.version === 'number' &&
        typeof value.type === 'string' &&
        isObject(value.sections)
    );
}

function sanitizeFileNamePart(value: string): string {
    return value
        .trim()
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, '_')
        .slice(0, 80);
}

function toBackupFileName(templateName: string, exportedAt: string): string {
    const safeName = sanitizeFileNamePart(templateName || 'template');
    const stamp = exportedAt.replace(/[:.]/g, '-');
    return `${safeName}_${stamp}${TEMPLATE_BACKUP_EXTENSION}`;
}

function downloadJson(content: string, fileName: string): void {
    const blob = new Blob([content], { type: TEMPLATE_BACKUP_MIME });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function extractTemplateFromPayload(payload: unknown): FormTemplate {
    if (isTemplateLike(payload)) {
        return payload;
    }

    if (
        isObject(payload) &&
        payload.kind === TEMPLATE_BACKUP_KIND &&
        payload.version === TEMPLATE_BACKUP_VERSION &&
        isTemplateLike(payload.template)
    ) {
        return payload.template;
    }

    throw new Error('INVALID_TEMPLATE_BACKUP');
}

export function exportTemplateBackupFile(template: FormTemplate): void {
    const exportedAt = new Date().toISOString();
    const payload: TemplateBackupPayloadV1 = {
        kind: TEMPLATE_BACKUP_KIND,
        version: TEMPLATE_BACKUP_VERSION,
        exported_at: exportedAt,
        template,
    };

    const json = JSON.stringify(payload, null, 2);
    const fileName = toBackupFileName(template.name, exportedAt);
    downloadJson(json, fileName);
}

export async function parseTemplateBackupFile(file: File): Promise<FormTemplate> {
    const rawContent = await file.text();
    let parsed: unknown;

    try {
        parsed = JSON.parse(rawContent);
    } catch {
        throw new Error('INVALID_TEMPLATE_BACKUP_JSON');
    }

    const template = extractTemplateFromPayload(parsed);
    // Use deep clone to avoid accidental references to parsed object.
    return JSON.parse(JSON.stringify(template)) as FormTemplate;
}

