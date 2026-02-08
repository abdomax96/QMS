/**
 * FSSC 22000 V6 Seed Data
 * بيانات البذور لنظام وثائق FSSC 22000
 */

import type { Folder, FormTemplate } from '../types';

// ==================== UUID Generator ====================
// Generate a deterministic UUID-like string from a text ID
// This ensures consistent IDs between runs while being valid UUIDs
function textToUUID(text: string): string {
    // Simple hash function to generate consistent values
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Create UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const hex2 = (hash * 31).toString(16).padStart(8, '0').slice(0, 4);
    const hex3 = (hash * 17).toString(16).padStart(8, '0').slice(0, 4);
    const hex4 = (hash * 13).toString(16).padStart(8, '0').slice(0, 12);

    return `${hex.slice(0, 8)}-${hex2}-4${hex.slice(4, 7)}-8${hex3.slice(1)}-${hex4}`;
}

// ==================== Folder IDs (now UUIDs) ====================
const FSSC_ROOT = textToUUID('fssc-22000-v6-root');

// Part 1: ISO 22000:2018
const PART1_ROOT = textToUUID('fssc-part1-iso22000');
const PART1_MANUAL = textToUUID('fssc-p1-manual');
const PART1_CONTEXT = textToUUID('fssc-p1-context');
const PART1_LEADERSHIP = textToUUID('fssc-p1-leadership');
const PART1_PLANNING = textToUUID('fssc-p1-planning');
const PART1_SUPPORT = textToUUID('fssc-p1-support');
const PART1_OPERATION = textToUUID('fssc-p1-operation');
const PART1_PERFORMANCE = textToUUID('fssc-p1-performance');
const PART1_IMPROVEMENT = textToUUID('fssc-p1-improvement');

// Part 2: ISO/TS 22002-1:2009
const PART2_ROOT = textToUUID('fssc-part2-isots22002');
const PART2_BUILDING = textToUUID('fssc-p2-building');
const PART2_LAYOUT = textToUUID('fssc-p2-layout');
const PART2_UTILITIES = textToUUID('fssc-p2-utilities');
const PART2_WASTE = textToUUID('fssc-p2-waste');
const PART2_EQUIPMENT = textToUUID('fssc-p2-equipment');
const PART2_PURCHASING = textToUUID('fssc-p2-purchasing');
const PART2_CROSSCONTAM = textToUUID('fssc-p2-crosscontam');
const PART2_CLEANING = textToUUID('fssc-p2-cleaning');
const PART2_PEST = textToUUID('fssc-p2-pest');
const PART2_HYGIENE = textToUUID('fssc-p2-hygiene');
const PART2_REWORK = textToUUID('fssc-p2-rework');
const PART2_RECALL = textToUUID('fssc-p2-recall');
const PART2_WAREHOUSING = textToUUID('fssc-p2-warehousing');
const PART2_PRODUCTINFO = textToUUID('fssc-p2-productinfo');

// Part 3: FSSC 22000 V6 Additional
const PART3_ROOT = textToUUID('fssc-part3-additional');
const PART3_SERVICES = textToUUID('fssc-p3-services');
const PART3_LABELING = textToUUID('fssc-p3-labeling');
const PART3_FOODDEFENSE = textToUUID('fssc-p3-fooddefense');
const PART3_FOODFRAUD = textToUUID('fssc-p3-foodfraud');
const PART3_LOGO = textToUUID('fssc-p3-logo');
const PART3_ALLERGEN = textToUUID('fssc-p3-allergen');
const PART3_ENVMONITOR = textToUUID('fssc-p3-envmonitor');
const PART3_CULTURE = textToUUID('fssc-p3-culture');
const PART3_QC = textToUUID('fssc-p3-qc');
const PART3_TRANSPORT = textToUUID('fssc-p3-transport');
const PART3_HAZARD = textToUUID('fssc-p3-hazard');
const PART3_PRPVERIF = textToUUID('fssc-p3-prpverif');
const PART3_PRODUCTDEV = textToUUID('fssc-p3-productdev');
const PART3_EQUIPMGMT = textToUUID('fssc-p3-equipmgmt');
const PART3_FOODWASTE = textToUUID('fssc-p3-foodwaste');
const PART3_COMMUNICATION = textToUUID('fssc-p3-communication');
const PART3_MULTISITE = textToUUID('fssc-p3-multisite');

// ==================== Helper Functions ====================
const now = new Date().toISOString();

function createFolder(
    id: string,
    name: string,
    parentId: string | null,
    color: string = '#3B82F6'
): Folder {
    return {
        id,
        name,
        type: 'standard',
        icon: 'folder',
        color,
        parent_id: parentId,
        path: parentId ? `/${parentId}/${id}` : `/${id}`,
        created_at: now,
        created_by: 'system',
        modified_at: now,
        permissions: { owner: 'system', editors: [], viewers: [] },
        metadata: {},
        stats: { form_templates_count: 0, reports_count: 0, storage_used_mb: 0 }
    };
}

function createTemplate(
    docCode: string,
    name: string,
    type: 'policy' | 'procedure' | 'form' | 'checklist' | 'manual' | 'risk-assessment',
    folderId: string,
    pages: number = 1
): FormTemplate {
    return {
        id: textToUUID(docCode), // Use UUID format
        name,
        version: 1,
        created_at: now,
        type,
        folder_id: folderId,
        template_type_config: {
            id: type,
            name: type === 'policy' ? 'سياسة' : type === 'procedure' ? 'إجراء' : type === 'form' ? 'نموذج' : type === 'checklist' ? 'قائمة تحقق' : type === 'manual' ? 'دليل' : 'تقييم مخاطر',
            description: '',
            icon: 'document',
            color: type === 'policy' ? '#8B5CF6' : type === 'procedure' ? '#3B82F6' : '#10B981',
            default_sections: [],
            available_tools: [],
            required_properties: [],
            optional_properties: []
        },
        custom_properties: { pages, docCode },
        document_control: {
            doc_code: docCode,
            issue_no: '1',
            review_no: '0',
            issue_date: now.split('T')[0],
            review_date: ''
        },
        sections: {
            main: {
                id: 'main',
                name: 'المحتوى',
                icon: 'document',
                order: 1,
                tables: []
            }
        }
    };
}

// ==================== Folders ====================
export const fsscFolders: Folder[] = [
    // Root
    createFolder(FSSC_ROOT, 'FSSC 22000 V6', null, '#059669'),

    // Part 1: ISO 22000:2018
    createFolder(PART1_ROOT, 'الجزء 1: ISO 22000:2018', FSSC_ROOT, '#3B82F6'),
    createFolder(PART1_MANUAL, '1.1 دليل نظام سلامة الغذاء', PART1_ROOT, '#6366F1'),
    createFolder(PART1_CONTEXT, '1.2 سياق المنظمة (البند 4)', PART1_ROOT, '#6366F1'),
    createFolder(PART1_LEADERSHIP, '1.3 القيادة (البند 5)', PART1_ROOT, '#6366F1'),
    createFolder(PART1_PLANNING, '1.4 التخطيط (البند 6)', PART1_ROOT, '#6366F1'),
    createFolder(PART1_SUPPORT, '1.5 الدعم (البند 7)', PART1_ROOT, '#6366F1'),
    createFolder(PART1_OPERATION, '1.6 العمليات (البند 8)', PART1_ROOT, '#6366F1'),
    createFolder(PART1_PERFORMANCE, '1.7 تقييم الأداء (البند 9)', PART1_ROOT, '#6366F1'),
    createFolder(PART1_IMPROVEMENT, '1.8 التحسين (البند 10)', PART1_ROOT, '#6366F1'),

    // Part 2: ISO/TS 22002-1:2009
    createFolder(PART2_ROOT, 'الجزء 2: ISO/TS 22002-1:2009', FSSC_ROOT, '#F59E0B'),
    createFolder(PART2_BUILDING, '2.1 بناء وتخطيط المباني', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_LAYOUT, '2.2 تخطيط المباني ومساحات العمل', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_UTILITIES, '2.3 المرافق (هواء، ماء، طاقة)', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_WASTE, '2.4 التحكم في النفايات', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_EQUIPMENT, '2.5 صيانة ونظافة المعدات', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_PURCHASING, '2.6 إدارة المواد المشتراة', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_CROSSCONTAM, '2.7 منع التلوث المتبادل', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_CLEANING, '2.8 التنظيف والتعقيم', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_PEST, '2.9 مكافحة الآفات', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_HYGIENE, '2.10 النظافة الشخصية', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_REWORK, '2.11 إعادة التصنيع', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_RECALL, '2.12 سحب المنتجات', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_WAREHOUSING, '2.13 التخزين', PART2_ROOT, '#FBBF24'),
    createFolder(PART2_PRODUCTINFO, '2.14-2.15 معلومات المنتج والدفاع', PART2_ROOT, '#FBBF24'),

    // Part 3: FSSC 22000 V6 Additional
    createFolder(PART3_ROOT, 'الجزء 3: متطلبات FSSC V6 الإضافية', FSSC_ROOT, '#EC4899'),
    createFolder(PART3_SERVICES, '3.1 إدارة الخدمات والمشتريات', PART3_ROOT, '#F472B6'),
    createFolder(PART3_LABELING, '3.2 الملصقات والمواد المطبوعة', PART3_ROOT, '#F472B6'),
    createFolder(PART3_FOODDEFENSE, '3.3 الدفاع الغذائي', PART3_ROOT, '#F472B6'),
    createFolder(PART3_FOODFRAUD, '3.4 منع الغش الغذائي', PART3_ROOT, '#F472B6'),
    createFolder(PART3_LOGO, '3.5 استخدام الشعار', PART3_ROOT, '#F472B6'),
    createFolder(PART3_ALLERGEN, '3.6 إدارة مسببات الحساسية', PART3_ROOT, '#F472B6'),
    createFolder(PART3_ENVMONITOR, '3.7 المراقبة البيئية', PART3_ROOT, '#F472B6'),
    createFolder(PART3_CULTURE, '3.8 ثقافة سلامة الغذاء', PART3_ROOT, '#F472B6'),
    createFolder(PART3_QC, '3.9 ضبط الجودة', PART3_ROOT, '#F472B6'),
    createFolder(PART3_TRANSPORT, '3.10 النقل والتخزين', PART3_ROOT, '#F472B6'),
    createFolder(PART3_HAZARD, '3.11 التحكم في المخاطر', PART3_ROOT, '#F472B6'),
    createFolder(PART3_PRPVERIF, '3.12 التحقق من PRPs', PART3_ROOT, '#F472B6'),
    createFolder(PART3_PRODUCTDEV, '3.13 تصميم وتطوير المنتجات', PART3_ROOT, '#F472B6'),
    createFolder(PART3_EQUIPMGMT, '3.15 إدارة المعدات', PART3_ROOT, '#F472B6'),
    createFolder(PART3_FOODWASTE, '3.16 هدر الغذاء', PART3_ROOT, '#F472B6'),
    createFolder(PART3_COMMUNICATION, '3.17 متطلبات الاتصال', PART3_ROOT, '#F472B6'),
    createFolder(PART3_MULTISITE, '3.18 الشهادة متعددة المواقع', PART3_ROOT, '#F472B6'),
];

// ==================== Templates ====================
export const fsscTemplates: FormTemplate[] = [
    // PART 1.1: Manual
    createTemplate('FSSC001', 'دليل نظام إدارة سلامة الغذاء', 'manual', PART1_MANUAL, 45),
    createTemplate('FSSC227', 'سياسة سلامة الغذاء', 'policy', PART1_MANUAL, 4),
    createTemplate('FSSC228', 'أهداف ومقاييس سلامة الغذاء والجودة', 'form', PART1_MANUAL, 2),

    // PART 1.2: Context
    createTemplate('FSSC002', 'إجراء سياق المنظمة', 'procedure', PART1_CONTEXT, 18),
    createTemplate('FSSC003', 'احتياجات وتوقعات الأطراف المعنية', 'form', PART1_CONTEXT, 3),

    // PART 1.3: Leadership
    createTemplate('FSSC005', 'إجراء القيادة', 'procedure', PART1_LEADERSHIP, 5),
    createTemplate('FSSC006', 'الهيكل التنظيمي', 'form', PART1_LEADERSHIP, 1),

    // PART 1.4: Planning
    createTemplate('FSSC007', 'إجراء التخطيط', 'procedure', PART1_PLANNING, 9),
    createTemplate('FSSC202', 'نموذج الأهداف', 'form', PART1_PLANNING, 1),

    // PART 1.5: Support
    createTemplate('FSSC008', 'إجراء الدعم', 'procedure', PART1_SUPPORT, 10),
    createTemplate('FSSC009', 'إجراء التدريب', 'procedure', PART1_SUPPORT, 5),
    createTemplate('FSSC010', 'إجراء الاتصال', 'procedure', PART1_SUPPORT, 8),
    createTemplate('FSSC011', 'مصفوفة الاتصالات', 'form', PART1_SUPPORT, 2),
    createTemplate('FSSC012', 'ترميز الوثائق', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC013', 'إجراء التحكم في النماذج والبيانات', 'procedure', PART1_SUPPORT, 8),
    createTemplate('FSSC032', 'خدمة العملاء', 'form', PART1_SUPPORT, 4),
    createTemplate('FSSC042', 'نموذج فريق سلامة الغذاء', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC064', 'إجراء شكاوى العملاء', 'procedure', PART1_SUPPORT, 2),
    createTemplate('FSSC067', 'متطلبات المهارات', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC175', 'نموذج ملاحظات العملاء', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC176', 'تقرير شكوى العميل', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC180', 'نموذج ملاحظة التغيير', 'form', PART1_SUPPORT, 2),
    createTemplate('FSSC182', 'القائمة الرئيسية لتوزيع النماذج', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC183', 'القائمة الرئيسية للسجلات', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC194', 'تقرير التدريب', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC195', 'تقرير التدريب التعريفي', 'form', PART1_SUPPORT, 2),
    createTemplate('FSSC196', 'الوصف والمواصفات الوظيفية', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC197', 'مصفوفة المهارات', 'form', PART1_SUPPORT, 1),
    createTemplate('FSSC200', 'قائمة النماذج', 'form', PART1_SUPPORT, 4),
    createTemplate('FSSC205', 'الوثائق الخارجية (اللوائح)', 'form', PART1_SUPPORT, 2),
    createTemplate('FSSC211', 'التحكم في السجلات', 'procedure', PART1_SUPPORT, 4),
    createTemplate('FSSC254', 'قائمة تحقق تغيير الإدارة', 'checklist', PART1_SUPPORT, 2),

    // PART 1.6: Operation
    createTemplate('FSSC004', 'مصفوفة تقييم المخاطر', 'risk-assessment', PART1_OPERATION, 1),
    createTemplate('FSSC014', 'إجراء العمليات', 'procedure', PART1_OPERATION, 12),
    createTemplate('FSSC015', 'إجراء برنامج المتطلبات الأساسية', 'procedure', PART1_OPERATION, 7),
    createTemplate('FSSC016', 'إجراء التعريف والتتبع', 'procedure', PART1_OPERATION, 4),
    createTemplate('FSSC017', 'إجراء الاستعداد والاستجابة للطوارئ', 'procedure', PART1_OPERATION, 10),
    createTemplate('FSSC018', 'إجراء منهجية HACCP', 'procedure', PART1_OPERATION, 13),
    createTemplate('FSSC019', 'تقرير تحليل HACCP', 'form', PART1_OPERATION, 42),
    createTemplate('FSSC020', 'خطة HACCP', 'form', PART1_OPERATION, 5),
    createTemplate('FSSC021', 'إجراء التحكم في معدات الرصد والقياس', 'procedure', PART1_OPERATION, 5),
    createTemplate('FSSC022', 'إجراء التصحيح والإجراءات التصحيحية والوقائية', 'procedure', PART1_OPERATION, 6),
    createTemplate('FSSC023', 'التخلص من المنتجات غير المطابقة', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC024', 'إجراء التحكم في المنتجات غير المطابقة', 'procedure', PART1_OPERATION, 4),
    createTemplate('FSSC029', 'التحليل الأولي لعملية الإنتاج', 'procedure', PART1_OPERATION, 3),
    createTemplate('FSSC030', 'إجراء تحديد المخاطر', 'procedure', PART1_OPERATION, 2),
    createTemplate('FSSC031', 'إجراء خطة HACCP', 'procedure', PART1_OPERATION, 7),
    createTemplate('FSSC041', 'تدفق عملية الإنتاج', 'form', PART1_OPERATION, 3),
    createTemplate('FSSC044', 'نموذج وصف المنتج (فارغ)', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC046', 'مخطط تدفق العملية (فارغ)', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC048', 'تقرير تحليل المخاطر (فارغ)', 'form', PART1_OPERATION, 2),
    createTemplate('FSSC050', 'خطة HACCP (فارغ)', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC052', 'خطة الإجراء التصحيحي لـ CCP (فارغ)', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC056', 'برامج المتطلبات التشغيلية (فارغ)', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC058', 'برامج المتطلبات الأساسية (فارغ)', 'form', PART1_OPERATION, 14),
    createTemplate('FSSC065', 'إجراء التحقق', 'procedure', PART1_OPERATION, 6),
    createTemplate('FSSC155', 'فحص الخشب', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC157', 'برامج المتطلبات التشغيلية', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC162', 'التخلص من المنتجات غير المطابقة', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC172', 'ورقة سجل الحالة الطبيعية', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC173', 'تقرير التحقق', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC181', 'تقرير الإجراءات التصحيحية', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC199', 'برنامج المتطلبات الأساسية', 'form', PART1_OPERATION, 4),
    createTemplate('FSSC208', 'إجراء مواصفات المنتج', 'procedure', PART1_OPERATION, 2),
    createTemplate('FSSC212', 'إجراء سحب واستدعاء المنتج', 'procedure', PART1_OPERATION, 4),
    createTemplate('FSSC223', 'مواصفات المنتج', 'form', PART1_OPERATION, 3),
    createTemplate('FSSC224', 'نموذج المنتج غير المطابق', 'form', PART1_OPERATION, 2),
    createTemplate('FSSC225', 'سجل جرد المنتج النهائي', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC226', 'نموذج إطلاق منتج المخازن', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC229', 'نموذج التعريف والتتبع', 'form', PART1_OPERATION, 2),
    createTemplate('FSSC230', 'تتبع المنتج الفائض', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC255', 'سجل تقرير الجودة اليومي أثناء العملية', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC256', 'نموذج الانحراف', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC259', 'سجل إطلاق وظيفة ضبط الجودة', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC262', 'سجل إطلاق ضبط الجودة', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC264', 'خطط العمل', 'form', PART1_OPERATION, 1),
    createTemplate('FSSC267', 'رقم الوظيفة ووصف المنتج', 'form', PART1_OPERATION, 1),

    // PART 1.7: Performance Evaluation
    createTemplate('FSSC025', 'إجراء تقييم الأداء', 'procedure', PART1_PERFORMANCE, 4),
    createTemplate('FSSC026', 'إجراء التدقيق الداخلي', 'procedure', PART1_PERFORMANCE, 5),
    createTemplate('FSSC027', 'إجراء مراجعة الإدارة', 'procedure', PART1_PERFORMANCE, 4),
    createTemplate('FSSC039', 'عمليات قائد فريق سلامة الغذاء', 'form', PART1_PERFORMANCE, 3),
    createTemplate('FSSC040', 'تدفق عملية نشاط التدريب', 'form', PART1_PERFORMANCE, 3),
    createTemplate('FSSC060', 'استبيان تدقيق FSSC 22000', 'checklist', PART1_PERFORMANCE, 19),
    createTemplate('FSSC061', 'استبيان تدقيق ISO 22000 حسب البند', 'checklist', PART1_PERFORMANCE, 14),
    createTemplate('FSSC184', 'خطة التدقيق', 'form', PART1_PERFORMANCE, 1),
    createTemplate('FSSC185', 'تقرير عدم المطابقة', 'form', PART1_PERFORMANCE, 1),
    createTemplate('FSSC186', 'تقرير مراجعة التدقيق حسب البند', 'form', PART1_PERFORMANCE, 3),
    createTemplate('FSSC213', 'قائمة تفتيش المرافق الداخلية', 'checklist', PART1_PERFORMANCE, 3),
    createTemplate('FSSC231', 'جدول أعمال ومحاضر مراجعة الإدارة', 'form', PART1_PERFORMANCE, 4),

    // PART 1.8: Improvement
    createTemplate('FSSC028', 'إجراء التحسين', 'procedure', PART1_IMPROVEMENT, 4),
    createTemplate('FSSC188', 'خطة التحسين المستمر', 'form', PART1_IMPROVEMENT, 1),

    // PART 2.1: Building Construction
    createTemplate('FSSC033', 'الهندسة (الصيانة)', 'form', PART2_BUILDING, 3),
    createTemplate('FSSC075', 'بناء وتخطيط المبنى', 'procedure', PART2_BUILDING, 1),
    createTemplate('FSSC138', 'تقرير فحص الشاشات', 'form', PART2_BUILDING, 1),
    createTemplate('FSSC140', 'سجل الأعطال', 'form', PART2_BUILDING, 1),
    createTemplate('FSSC141', 'جدول الصيانة الوقائية', 'form', PART2_BUILDING, 1),
    createTemplate('FSSC142', 'نقاط فحص الصيانة الوقائية', 'form', PART2_BUILDING, 6),
    createTemplate('FSSC143', 'نقاط فحص الصيانة الوقائية اليومية', 'form', PART2_BUILDING, 2),
    createTemplate('FSSC144', 'نقاط فحص الصيانة للمباني والأعمال المدنية', 'form', PART2_BUILDING, 1),

    // PART 2.2: Layout
    createTemplate('FSSC076', 'إجراء تخطيط المباني ومساحات العمل', 'procedure', PART2_LAYOUT, 1),
    createTemplate('FSSC077', 'إجراء تخطيط المعدات', 'procedure', PART2_LAYOUT, 1),

    // PART 2.3: Utilities
    createTemplate('FSSC078', 'إجراء الهواء والنفايات والطاقة والغاز وكيماويات الغلايات', 'procedure', PART2_UTILITIES, 1),
    createTemplate('FSSC253', 'قائمة تحقق معالجة المياه', 'checklist', PART2_UTILITIES, 1),

    // PART 2.4: Waste
    createTemplate('FSSC079', 'إجراء التخلص من النفايات', 'procedure', PART2_WASTE, 3),
    createTemplate('FSSC220', 'قائمة تحقق التحكم في النفايات اليومية', 'checklist', PART2_WASTE, 1),

    // PART 2.5: Equipment
    createTemplate('FSSC036', 'تدفق عملية الشراء الخارجي', 'form', PART2_EQUIPMENT, 6),
    createTemplate('FSSC080', 'إجراء التخليص الصحي', 'procedure', PART2_EQUIPMENT, 1),
    createTemplate('FSSC146', 'تقرير أعمال الصيانة المؤقتة', 'form', PART2_EQUIPMENT, 1),
    createTemplate('FSSC158', 'تقرير تنظيف خزان المياه', 'form', PART2_EQUIPMENT, 1),
    createTemplate('FSSC159', 'تقرير تنظيف خط المياه', 'form', PART2_EQUIPMENT, 1),
    createTemplate('FSSC171', 'تقرير معايرة مقياس pH', 'form', PART2_EQUIPMENT, 2),
    createTemplate('FSSC187', 'التحكم في المغناطيس', 'form', PART2_EQUIPMENT, 1),
    createTemplate('FSSC189', 'حالة معايرة الأجهزة', 'form', PART2_EQUIPMENT, 1),
    createTemplate('FSSC210', 'بطاقة عمل الصيانة', 'form', PART2_EQUIPMENT, 2),

    // PART 2.6: Purchasing
    createTemplate('FSSC081', 'إجراء استلام/إصدار المواد في الإرسال', 'procedure', PART2_PURCHASING, 2),
    createTemplate('FSSC082', 'إجراء شراء مواد التعبئة', 'procedure', PART2_PURCHASING, 3),
    createTemplate('FSSC083', 'إجراء الشراء', 'procedure', PART2_PURCHASING, 4),
    createTemplate('FSSC136', 'تقرير/إيصال التعبئة', 'form', PART2_PURCHASING, 1),
    createTemplate('FSSC137', 'تقرير فحص الأكياس/مواد التعبئة الأخرى', 'form', PART2_PURCHASING, 1),
    createTemplate('FSSC163', 'أمر الشراء', 'form', PART2_PURCHASING, 2),
    createTemplate('FSSC164', 'سجل الطلب والفحص الوارد', 'form', PART2_PURCHASING, 1),
    createTemplate('FSSC165', 'قائمة الموردين المعتمدين وأوامر الشراء المفتوحة', 'form', PART2_PURCHASING, 1),
    createTemplate('FSSC166', 'نموذج تسجيل المورد', 'form', PART2_PURCHASING, 1),
    createTemplate('FSSC167', 'أمر الشراء المفتوح', 'form', PART2_PURCHASING, 2),
    createTemplate('FSSC168', 'جدول تدقيق الموردين', 'form', PART2_PURCHASING, 1),
    createTemplate('FSSC169', 'قائمة تحقق تدقيق الموردين', 'checklist', PART2_PURCHASING, 4),
    createTemplate('FSSC174', 'نموذج الطلب / تأكيد الطلب', 'form', PART2_PURCHASING, 1),

    // PART 2.7: Cross-contamination
    createTemplate('FSSC084', 'إجراء الاختبارات الميكروبيولوجية', 'procedure', PART2_CROSSCONTAM, 6),
    createTemplate('FSSC085', 'إجراء حماية المنتج', 'procedure', PART2_CROSSCONTAM, 3),
    createTemplate('FSSC086', 'إجراء منع التلوث المتبادل', 'procedure', PART2_CROSSCONTAM, 2),
    createTemplate('FSSC087', 'إجراء خلط المواد/العمليات/المنتجات', 'procedure', PART2_CROSSCONTAM, 1),
    createTemplate('FSSC088', 'إجراء مسببات الحساسية', 'procedure', PART2_CROSSCONTAM, 8),
    createTemplate('FSSC089', 'تقييم مخاطر مسببات الحساسية', 'risk-assessment', PART2_CROSSCONTAM, 4),
    createTemplate('FSSC090', 'تقييم مسببات الحساسية', 'form', PART2_CROSSCONTAM, 1),
    createTemplate('FSSC091', 'إجراء إدارة الكسر', 'procedure', PART2_CROSSCONTAM, 2),
    createTemplate('FSSC092', 'إجراء تركيب الزجاج الجديد', 'procedure', PART2_CROSSCONTAM, 1),
    createTemplate('FSSC093', 'إجراء إدارة المعدن والخشب والزجاج والبلاستيك الهش', 'procedure', PART2_CROSSCONTAM, 2),
    createTemplate('FSSC218', 'قائمة تحقق ما قبل البدء', 'checklist', PART2_CROSSCONTAM, 2),
    createTemplate('FSSC260', 'مخطط مراقبة الرطوبة', 'form', PART2_CROSSCONTAM, 1),

    // PART 2.8: Cleaning
    createTemplate('FSSC094', 'إجراء تنظيف وتعقيم أسطح ملامسة الغذاء', 'procedure', PART2_CLEANING, 2),
    createTemplate('FSSC095', 'إجراء التدبير المنزلي العام', 'procedure', PART2_CLEANING, 2),
    createTemplate('FSSC147', 'قائمة تحقق التدبير المنزلي', 'checklist', PART2_CLEANING, 5),
    createTemplate('FSSC148', 'جدول التنظيف الرئيسي', 'form', PART2_CLEANING, 5),
    createTemplate('FSSC151', 'تقرير تدقيق الصرف الصحي اليومي', 'form', PART2_CLEANING, 2),
    createTemplate('FSSC191', 'قائمة المواد الكيميائية في الموقع', 'form', PART2_CLEANING, 1),
    createTemplate('FSSC204', 'جدول التنظيف والتعقيم', 'form', PART2_CLEANING, 1),

    // PART 2.9: Pest Control
    createTemplate('FSSC096', 'إجراء مكافحة الآفات', 'procedure', PART2_PEST, 4),
    createTemplate('FSSC150', 'تقرير التبخير', 'form', PART2_PEST, 1),
    createTemplate('FSSC156', 'سجل اصطياد القوارض', 'form', PART2_PEST, 1),

    // PART 2.10: Personnel Hygiene
    createTemplate('FSSC097', 'إجراء غسيل معدات الحماية الشخصية', 'procedure', PART2_HYGIENE, 1),
    createTemplate('FSSC098', 'إجراء الدخول والخروج - النظافة الشخصية', 'procedure', PART2_HYGIENE, 1),
    createTemplate('FSSC099', 'إجراء صحة ونظافة الموظفين', 'procedure', PART2_HYGIENE, 3),
    createTemplate('FSSC100', 'إجراء السلامة', 'procedure', PART2_HYGIENE, 1),
    createTemplate('FSSC160', 'تقرير الفحص الطبي', 'form', PART2_HYGIENE, 2),
    createTemplate('FSSC198', 'استبيان صحي', 'form', PART2_HYGIENE, 1),
    createTemplate('FSSC216', 'قائمة تحقق النظافة الشخصية اليومية', 'checklist', PART2_HYGIENE, 1),
    createTemplate('FSSC219', 'قائمة تحقق إصدار الملابس الواقية', 'checklist', PART2_HYGIENE, 2),

    // PART 2.11: Rework
    createTemplate('FSSC101', 'إجراء إعادة التصنيع', 'procedure', PART2_REWORK, 2),
    createTemplate('FSSC257', 'سجل التعليق وإعادة التصنيع', 'form', PART2_REWORK, 1),

    // PART 2.12: Product Recall
    createTemplate('FSSC102', 'إجراء سحب واستدعاء المنتج', 'procedure', PART2_RECALL, 1),
    createTemplate('FSSC145', 'تقرير الحادث', 'form', PART2_RECALL, 1),
    createTemplate('FSSC170', 'تقرير الاستدعاء الإيجابي', 'form', PART2_RECALL, 1),
    createTemplate('FSSC214', 'إجراء استدعاء المنتج وإدارة الحوادث', 'procedure', PART2_RECALL, 10),
    createTemplate('FSSC215', 'محاضر الاستدعاء الوهمي', 'form', PART2_RECALL, 2),

    // PART 2.13: Warehousing
    createTemplate('FSSC034', 'تدفق عملية الإرسال', 'form', PART2_WAREHOUSING, 2),
    createTemplate('FSSC038', 'تدفق عملية المخازن', 'form', PART2_WAREHOUSING, 5),
    createTemplate('FSSC103', 'إجراء التخزين والتوزيع والنقل', 'procedure', PART2_WAREHOUSING, 3),
    createTemplate('FSSC104', 'إجراء إطلاق المنتج', 'procedure', PART2_WAREHOUSING, 5),
    createTemplate('FSSC105', 'إجراء استلام/إصدار المواد في الإرسال', 'procedure', PART2_WAREHOUSING, 2),
    createTemplate('FSSC106', 'إجراء استلام/إصدار/تخزين المواد الخام والتعبئة والعامة', 'procedure', PART2_WAREHOUSING, 2),

    // PART 2.14-15: Product Info & Food Defense
    createTemplate('FSSC107', 'إجراء معلومات المنتج ووعي المستهلك والدفاع الغذائي', 'procedure', PART2_PRODUCTINFO, 2),
    createTemplate('FSSC108', 'إجراء الدفاع الغذائي', 'procedure', PART2_PRODUCTINFO, 4),
    createTemplate('FSSC109', 'تقييم التهديد', 'form', PART2_PRODUCTINFO, 1),
    createTemplate('FSSC209', 'قائمة تحقق الدفاع الغذائي', 'checklist', PART2_PRODUCTINFO, 3),

    // PART 3.1: Services Management
    createTemplate('FSSC069', 'مواصفات المواد الخام', 'form', PART3_SERVICES, 1),
    createTemplate('FSSC110', 'إجراء إدارة الخدمات', 'procedure', PART3_SERVICES, 3),
    createTemplate('FSSC111', 'الشراء الطارئ', 'form', PART3_SERVICES, 2),
    createTemplate('FSSC112', 'إجراء الشراء الطارئ', 'procedure', PART3_SERVICES, 5),
    createTemplate('FSSC113', 'مراقبة أداء الموردين', 'form', PART3_SERVICES, 2),
    createTemplate('FSSC222', 'استبيان موافقة الموردين', 'form', PART3_SERVICES, 3),

    // PART 3.2: Labeling
    createTemplate('FSSC114', 'إجراء معلومات المنتج ووعي المستهلك', 'procedure', PART3_LABELING, 4),
    createTemplate('FSSC232', 'إجراء التحكم في التصميم الجرافيكي والأعمال الفنية', 'procedure', PART3_LABELING, 3),

    // PART 3.3: Food Defense
    createTemplate('FSSC070', 'تقييم الأمن', 'form', PART3_FOODDEFENSE, 1),
    createTemplate('FSSC071', 'تقييم التهديد', 'form', PART3_FOODDEFENSE, 1),
    createTemplate('FSSC072', 'تقييم الضعف', 'form', PART3_FOODDEFENSE, 1),
    createTemplate('FSSC073', 'قالب تقييم المخاطر', 'risk-assessment', PART3_FOODDEFENSE, 3),
    createTemplate('FSSC149', 'تقرير دخول الزوار', 'form', PART3_FOODDEFENSE, 1),
    createTemplate('FSSC179', 'تصريح المرور', 'form', PART3_FOODDEFENSE, 1),
    createTemplate('FSSC192', 'قائمة تحقق الدفاع الغذائي', 'checklist', PART3_FOODDEFENSE, 1),
    createTemplate('FSSC240', 'إجراء الدفاع الغذائي', 'procedure', PART3_FOODDEFENSE, 3),

    // PART 3.4: Food Fraud
    createTemplate('FSSC116', 'إجراء منع الغش الغذائي', 'procedure', PART3_FOODFRAUD, 5),
    createTemplate('FSSC117', 'إجراء الحماية من غش الأغذية', 'procedure', PART3_FOODFRAUD, 1),
    createTemplate('FSSC118', 'تعليمات استخدام أداة الغش الغذائي', 'form', PART3_FOODFRAUD, 2),

    // PART 3.5: Logo Use
    createTemplate('FSSC207', 'إجراء استخدام شعار FSSC 22000', 'procedure', PART3_LOGO, 2),

    // PART 3.6: Allergen Management
    createTemplate('FSSC120', 'إدارة مسببات الحساسية', 'form', PART3_ALLERGEN, 1),

    // PART 3.7: Environmental Monitoring
    createTemplate('FSSC054', 'خطة المراقبة البيئية (فارغ)', 'form', PART3_ENVMONITOR, 1),
    createTemplate('FSSC055', 'خطة المراقبة البيئية (مثال)', 'form', PART3_ENVMONITOR, 1),
    createTemplate('FSSC121', 'إجراء المراقبة البيئية', 'procedure', PART3_ENVMONITOR, 4),
    createTemplate('FSSC122', 'تقييم مخاطر المراقبة البيئية', 'risk-assessment', PART3_ENVMONITOR, 5),
    createTemplate('FSSC124', 'جدول وخطة الاختبار', 'form', PART3_ENVMONITOR, 3),

    // PART 3.8: Food Safety Culture
    createTemplate('FSSC131', 'إجراء ثقافة سلامة الغذاء', 'procedure', PART3_CULTURE, 4),
    createTemplate('FSSC132', 'استبيان ثقافة سلامة الغذاء', 'form', PART3_CULTURE, 4),
    createTemplate('FSSC193', 'تقرير فحص سلامة الغذاء الشهري', 'form', PART3_CULTURE, 3),
    createTemplate('FSSC233', 'خطة تحسين ثقافة سلامة وجودة المنتج', 'form', PART3_CULTURE, 1),

    // PART 3.9: Quality Control
    createTemplate('FSSC037', 'تدفق عملية ضبط الجودة', 'form', PART3_QC, 4),
    createTemplate('FSSC068', 'خطة الجودة', 'form', PART3_QC, 1),
    createTemplate('FSSC161', 'خطة الإنتاج', 'form', PART3_QC, 1),
    createTemplate('FSSC221', 'نموذج التحكم في الإنتاج', 'form', PART3_QC, 1),
    createTemplate('FSSC234', 'فحص خط الإنتاج', 'form', PART3_QC, 1),
    createTemplate('FSSC235', 'قائمة تحقق ما قبل البدء', 'checklist', PART3_QC, 2),
    createTemplate('FSSC236', 'سياسة الجودة', 'policy', PART3_QC, 2),
    createTemplate('FSSC237', 'سياسة بدء الخط وتغييره', 'policy', PART3_QC, 3),
    createTemplate('FSSC238', 'قائمة تحقق ضبط جودة المنتج', 'checklist', PART3_QC, 1),
    createTemplate('FSSC239', 'نموذج إطلاق المنتج', 'form', PART3_QC, 1),
    createTemplate('FSSC265', 'تقرير ضبط الجودة', 'form', PART3_QC, 1),

    // PART 3.10: Transport & Storage
    createTemplate('FSSC126', 'تخزين وتوزيع ونقل المنتج النهائي', 'procedure', PART3_TRANSPORT, 2),
    createTemplate('FSSC127', 'ورقة التحكم في مخزون البضائع الجاهزة', 'form', PART3_TRANSPORT, 1),
    createTemplate('FSSC139', 'تقرير فحص مركبة التحميل', 'form', PART3_TRANSPORT, 1),
    createTemplate('FSSC177', 'بيان المخزون اليومي', 'form', PART3_TRANSPORT, 1),
    createTemplate('FSSC203', 'تقرير فحص مركبة التفريغ', 'form', PART3_TRANSPORT, 1),
    createTemplate('FSSC241', 'النقل والتخزين', 'policy', PART3_TRANSPORT, 2),

    // PART 3.11: Hazard Control
    createTemplate('FSSC242', 'إجراء المعدات', 'procedure', PART3_HAZARD, 4),
    createTemplate('FSSC243', 'التحكم في المخاطر وتدابير منع التلوث المتبادل', 'procedure', PART3_HAZARD, 2),
    createTemplate('FSSC244', 'إجراء معدات الكشف عن المواد الغريبة وإزالتها', 'procedure', PART3_HAZARD, 9),

    // PART 3.12: PRP Verification
    createTemplate('FSSC128', 'التحقق من برنامج المتطلبات الأساسية', 'form', PART3_PRPVERIF, 3),

    // PART 3.13: Product Development
    createTemplate('FSSC129', 'إجراء تطوير المنتجات الجديدة', 'procedure', PART3_PRODUCTDEV, 3),
    createTemplate('FSSC130', 'اقتراح منتج جديد', 'form', PART3_PRODUCTDEV, 7),
    createTemplate('FSSC178', 'سجلات التصميم والتطوير', 'form', PART3_PRODUCTDEV, 1),
    createTemplate('FSSC261', 'تطوير المنتج', 'form', PART3_PRODUCTDEV, 2),
    createTemplate('FSSC263', 'شهادة التحقق', 'form', PART3_PRODUCTDEV, 1),

    // PART 3.15: Equipment Management
    createTemplate('FSSC245', 'إجراء تشغيل المعدات', 'procedure', PART3_EQUIPMGMT, 3),
    createTemplate('FSSC246', 'قائمة تحقق ما قبل التشغيل', 'checklist', PART3_EQUIPMGMT, 4),
    createTemplate('FSSC247', 'مواصفات شراء المعدات', 'form', PART3_EQUIPMGMT, 4),
    createTemplate('FSSC248', 'الفحص النهائي بعد التركيب (المعدات)', 'form', PART3_EQUIPMGMT, 1),

    // PART 3.16: Food Waste
    createTemplate('FSSC249', 'تتبع المنتج الفائض', 'form', PART3_FOODWASTE, 1),
    createTemplate('FSSC250', 'سياسة هدر وفقدان الغذاء', 'policy', PART3_FOODWASTE, 3),

    // PART 3.17: Communication
    createTemplate('FSSC190', 'تقرير الاتصالات', 'form', PART3_COMMUNICATION, 1),
    createTemplate('FSSC251', 'إجراء الاتصال مع جهة الاعتماد', 'procedure', PART3_COMMUNICATION, 2),

    // PART 3.18: Multi-site
    createTemplate('FSSC252', 'إجراء الشهادة متعددة المواقع', 'procedure', PART3_MULTISITE, 3),
];

// ==================== Initialize Function ====================
export function initializeFSSC22000Data(
    addFolder: (folder: Folder) => void,
    addFormTemplate: (template: FormTemplate) => void
): void {
    // Add all folders
    fsscFolders.forEach(folder => addFolder(folder));

    // Add all templates
    fsscTemplates.forEach(template => addFormTemplate(template));
}

export default {
    folders: fsscFolders,
    templates: fsscTemplates,
    initialize: initializeFSSC22000Data
};
