/**
 * FSSC 22000 V6 Detailed Templates
 * نماذج FSSC مع هيكل كامل للـ Form Builder
 */

import type { FormTemplate } from '../types';

const now = new Date().toISOString();

// ==================== UUID Generator ====================
function textToUUID(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const hex2 = (hash * 31).toString(16).padStart(8, '0').slice(0, 4);
    const hex3 = (hash * 17).toString(16).padStart(8, '0').slice(0, 4);
    const hex4 = (hash * 13).toString(16).padStart(8, '0').slice(0, 12);
    return `${hex.slice(0, 8)}-${hex2}-4${hex.slice(4, 7)}-8${hex3.slice(1)}-${hex4}`;
}

// ==================== 1. HACCP Plan Template ====================
export const haccpPlanTemplate: FormTemplate = {
    id: textToUUID('fssc-haccp-plan-detailed'),
    name: 'خطة HACCP',
    name_en: 'HACCP Plan',
    version: 1,
    created_at: now,
    type: 'form',
    folder_id: textToUUID('fssc-p1-operation'),
    template_type_config: {
        id: 'form',
        name: 'نموذج',
        description: 'خطة تحليل المخاطر ونقاط التحكم الحرجة',
        icon: 'shield-check',
        color: '#059669',
        default_sections: [],
        available_tools: [],
        required_properties: [],
        optional_properties: []
    },
    custom_properties: { docCode: 'FSSC020', pages: 5 },
    document_control: {
        doc_code: 'FSSC020',
        issue_no: '1',
        review_no: '0',
        issue_date: now.split('T')[0],
        review_date: ''
    },
    sections: {
        product_info: {
            id: 'product_info',
            name: 'معلومات المنتج',
            icon: 'cube',
            order: 1,
            tables: [{
                id: 'product_description',
                name: 'وصف المنتج',
                type: 'parameters',
                parameters: [
                    { name: 'اسم المنتج', limits: '', type: 'text', unit: '' },
                    { name: 'فئة المنتج', limits: '', type: 'dropdown', unit: '', options: ['منتج طازج', 'منتج مبرد', 'منتج مجمد', 'منتج جاف', 'معلبات'] },
                    { name: 'المكونات الرئيسية', limits: '', type: 'text', unit: '' },
                    { name: 'نوع التغليف', limits: '', type: 'text', unit: '' },
                    { name: 'ظروف التخزين', limits: '', type: 'text', unit: '' },
                    { name: 'مدة الصلاحية (يوم)', limits: '', type: 'integer', unit: 'يوم' },
                    { name: 'الاستخدام المقصود', limits: '', type: 'text', unit: '' },
                    { name: 'المستهلك المستهدف', limits: '', type: 'text', unit: '' }
                ]
            }]
        },
        hazard_analysis: {
            id: 'hazard_analysis',
            name: 'تحليل المخاطر',
            icon: 'exclamation-triangle',
            order: 2,
            tables: [{
                id: 'hazard_analysis_table',
                name: 'تحليل المخاطر',
                type: 'custom',
                allowDynamicRows: true,
                rows: 10,
                columns: [
                    { key: 'step', label: 'الخطوة', type: 'text', width: 120 },
                    { key: 'hazard_type', label: 'نوع الخطر', type: 'dropdown', width: 100, options: ['بيولوجي', 'كيميائي', 'فيزيائي', 'مسببات حساسية'] },
                    { key: 'hazard_desc', label: 'وصف الخطر', type: 'text', width: 200 },
                    { key: 'severity', label: 'الشدة', type: 'dropdown', width: 80, options: ['منخفض', 'متوسط', 'عالي', 'حرج'] },
                    { key: 'probability', label: 'الاحتمالية', type: 'dropdown', width: 80, options: ['منخفض', 'متوسط', 'عالي'] },
                    { key: 'is_significant', label: 'هل هام؟', type: 'boolean-yesno', width: 60 },
                    { key: 'justification', label: 'المبررات', type: 'text', width: 200 },
                    { key: 'control_measure', label: 'تدابير التحكم', type: 'text', width: 200 },
                    { key: 'is_ccp', label: 'CCP؟', type: 'boolean-yesno', width: 60 }
                ]
            }]
        },
        ccp_plan: {
            id: 'ccp_plan',
            name: 'خطة CCPs',
            icon: 'shield-exclamation',
            order: 3,
            tables: [{
                id: 'ccp_table',
                name: 'نقاط التحكم الحرجة',
                type: 'custom',
                allowDynamicRows: true,
                rows: 5,
                columns: [
                    { key: 'ccp_no', label: 'رقم CCP', type: 'text', width: 80 },
                    { key: 'process_step', label: 'خطوة العملية', type: 'text', width: 150 },
                    { key: 'hazard', label: 'الخطر', type: 'text', width: 150 },
                    { key: 'critical_limit', label: 'الحد الحرج', type: 'text', width: 120 },
                    { key: 'monitoring_what', label: 'ماذا يُراقب؟', type: 'text', width: 120 },
                    { key: 'monitoring_how', label: 'كيف؟', type: 'text', width: 120 },
                    { key: 'monitoring_frequency', label: 'التكرار', type: 'text', width: 100 },
                    { key: 'monitoring_who', label: 'من؟', type: 'text', width: 100 },
                    { key: 'corrective_action', label: 'الإجراء التصحيحي', type: 'text', width: 200 },
                    { key: 'records', label: 'السجلات', type: 'text', width: 150 },
                    { key: 'verification', label: 'التحقق', type: 'text', width: 150 }
                ]
            }]
        }
    }
};

// ==================== 2. Cleaning & Sanitizing Record ====================
export const cleaningRecordTemplate: FormTemplate = {
    id: textToUUID('fssc-cleaning-record'),
    name: 'سجل التنظيف والتعقيم',
    name_en: 'Cleaning and Sanitizing Record',
    version: 1,
    created_at: now,
    type: 'form',
    folder_id: textToUUID('fssc-p2-cleaning'),
    template_type_config: {
        id: 'form',
        name: 'نموذج',
        description: 'سجل يومي للتنظيف والتعقيم',
        icon: 'sparkles',
        color: '#0EA5E9',
        default_sections: [],
        available_tools: [],
        required_properties: [],
        optional_properties: []
    },
    custom_properties: { docCode: 'FSSC148', pages: 2 },
    document_control: {
        doc_code: 'FSSC148',
        issue_no: '1',
        review_no: '0',
        issue_date: now.split('T')[0],
        review_date: ''
    },
    sections: {
        daily_cleaning: {
            id: 'daily_cleaning',
            name: 'التنظيف اليومي',
            icon: 'calendar',
            order: 1,
            tables: [{
                id: 'daily_cleaning_table',
                name: 'سجل التنظيف اليومي',
                type: 'sample',
                inspection_period: 60,
                sample_size: 1,
                allowDynamicRows: true,
                rows: 20,
                columns: [
                    { key: 'area', label: 'المنطقة/المعدة', type: 'text', width: 150 },
                    { key: 'cleaning_method', label: 'طريقة التنظيف', type: 'dropdown', width: 120, options: ['ماء', 'منظف', 'منظف + ماء', 'تعقيم'] },
                    { key: 'chemical_used', label: 'المادة الكيميائية', type: 'text', width: 120 },
                    { key: 'concentration', label: 'التركيز', type: 'text', width: 80 },
                    { key: 'cleaned_by', label: 'المنفذ', type: 'text', width: 100 },
                    { key: 'time', label: 'الوقت', type: 'time', width: 80 },
                    { key: 'verified_by', label: 'التحقق', type: 'text', width: 100 },
                    { key: 'status', label: 'الحالة', type: 'dropdown', width: 80, options: ['مطابق', 'غير مطابق', 'N/A'] },
                    { key: 'remarks', label: 'ملاحظات', type: 'text', width: 150 }
                ]
            }]
        },
        weekly_deep_cleaning: {
            id: 'weekly_deep_cleaning',
            name: 'التنظيف العميق الأسبوعي',
            icon: 'beaker',
            order: 2,
            tables: [{
                id: 'weekly_cleaning_table',
                name: 'سجل التنظيف العميق',
                type: 'checklist',
                items: [
                    { text: 'تنظيف الأسقف والأسطح العلوية', required: true },
                    { text: 'تنظيف التهوية والمراوح', required: true },
                    { text: 'تنظيف خلف وتحت المعدات', required: true },
                    { text: 'تنظيف المصارف', required: true },
                    { text: 'تنظيف الجدران', required: true },
                    { text: 'تنظيف الأرضيات العميق', required: true },
                    { text: 'تعقيم أسطح ملامسة الغذاء', required: true },
                    { text: 'فحص سلامة المعدات بعد التنظيف', required: true }
                ]
            }]
        }
    }
};

// ==================== 3. Pest Control Record ====================
export const pestControlRecordTemplate: FormTemplate = {
    id: textToUUID('fssc-pest-control-record'),
    name: 'سجل مكافحة الآفات',
    name_en: 'Pest Control Record',
    version: 1,
    created_at: now,
    type: 'form',
    folder_id: textToUUID('fssc-p2-pest'),
    template_type_config: {
        id: 'form',
        name: 'نموذج',
        description: 'سجل فحص ومكافحة الآفات',
        icon: 'bug',
        color: '#EF4444',
        default_sections: [],
        available_tools: [],
        required_properties: [],
        optional_properties: []
    },
    custom_properties: { docCode: 'FSSC164', pages: 2 },
    document_control: {
        doc_code: 'FSSC164',
        issue_no: '1',
        review_no: '0',
        issue_date: now.split('T')[0],
        review_date: ''
    },
    sections: {
        inspection: {
            id: 'inspection',
            name: 'فحص الآفات',
            icon: 'magnifying-glass',
            order: 1,
            tables: [{
                id: 'pest_inspection_table',
                name: 'فحص علامات الآفات',
                type: 'custom',
                allowDynamicRows: true,
                rows: 15,
                columns: [
                    { key: 'location', label: 'الموقع', type: 'text', width: 150 },
                    { key: 'trap_type', label: 'نوع المصيدة', type: 'dropdown', width: 120, options: ['مصيدة قوارض', 'مصيدة حشرات', 'مصيدة UV', 'طُعم'] },
                    { key: 'trap_id', label: 'رقم المصيدة', type: 'text', width: 80 },
                    { key: 'status', label: 'الحالة', type: 'dropdown', width: 100, options: ['نظيف', 'يوجد أثر', 'يوجد صيد', 'تالف'] },
                    { key: 'pest_type', label: 'نوع الآفة', type: 'dropdown', width: 100, options: ['لا يوجد', 'فأر', 'صرصور', 'ذبابة', 'أخرى'] },
                    { key: 'quantity', label: 'العدد', type: 'integer', width: 60 },
                    { key: 'action_taken', label: 'الإجراء', type: 'text', width: 150 },
                    { key: 'inspector', label: 'المفتش', type: 'text', width: 100 }
                ]
            }]
        },
        treatments: {
            id: 'treatments',
            name: 'المعالجات',
            icon: 'shield-check',
            order: 2,
            tables: [{
                id: 'treatment_table',
                name: 'سجل المعالجات',
                type: 'custom',
                allowDynamicRows: true,
                rows: 5,
                columns: [
                    { key: 'date', label: 'التاريخ', type: 'date', width: 100 },
                    { key: 'area', label: 'المنطقة', type: 'text', width: 150 },
                    { key: 'pest_type', label: 'نوع الآفة', type: 'text', width: 100 },
                    { key: 'chemical', label: 'المادة المستخدمة', type: 'text', width: 150 },
                    { key: 'concentration', label: 'التركيز', type: 'text', width: 80 },
                    { key: 'method', label: 'طريقة التطبيق', type: 'text', width: 120 },
                    { key: 'applicator', label: 'المُنفذ', type: 'text', width: 100 },
                    { key: 'reentry_time', label: 'وقت إعادة الدخول', type: 'text', width: 100 }
                ]
            }]
        }
    }
};

// ==================== 4. Internal Audit Checklist ====================
export const internalAuditChecklistTemplate: FormTemplate = {
    id: textToUUID('fssc-internal-audit-checklist'),
    name: 'استبيان تدقيق FSSC 22000',
    name_en: 'FSSC 22000 Audit Checklist',
    version: 1,
    created_at: now,
    type: 'checklist',
    folder_id: textToUUID('fssc-p1-performance'),
    template_type_config: {
        id: 'checklist',
        name: 'قائمة تحقق',
        description: 'استبيان التدقيق الداخلي لـ FSSC 22000',
        icon: 'clipboard-document-check',
        color: '#8B5CF6',
        default_sections: [],
        available_tools: [],
        required_properties: [],
        optional_properties: []
    },
    custom_properties: { docCode: 'FSSC060', pages: 19 },
    document_control: {
        doc_code: 'FSSC060',
        issue_no: '1',
        review_no: '0',
        issue_date: now.split('T')[0],
        review_date: ''
    },
    sections: {
        context: {
            id: 'context',
            name: 'البند 4: سياق المنظمة',
            icon: 'building-office',
            order: 1,
            tables: [{
                id: 'context_checklist',
                name: 'متطلبات سياق المنظمة',
                type: 'checklist',
                items: [
                    { text: 'هل تم تحديد القضايا الخارجية والداخلية المتعلقة بنظام إدارة سلامة الغذاء؟', required: true },
                    { text: 'هل تم تحديد الأطراف المعنية وفهم احتياجاتها وتوقعاتها؟', required: true },
                    { text: 'هل تم تحديد نطاق نظام إدارة سلامة الغذاء؟', required: true },
                    { text: 'هل تم توثيق نطاق FSMS والحفاظ عليه كمعلومات موثقة؟', required: true },
                    { text: 'هل يشمل النطاق المنتجات والعمليات ومواقع الإنتاج؟', required: true }
                ]
            }]
        },
        leadership: {
            id: 'leadership',
            name: 'البند 5: القيادة',
            icon: 'user-group',
            order: 2,
            tables: [{
                id: 'leadership_checklist',
                name: 'متطلبات القيادة',
                type: 'checklist',
                items: [
                    { text: 'هل تُظهر الإدارة العليا القيادة والالتزام?', required: true },
                    { text: 'هل تم وضع سياسة سلامة الغذاء ونشرها؟', required: true },
                    { text: 'هل السياسة متوافقة مع التوجه الاستراتيجي للمنظمة؟', required: true },
                    { text: 'هل تم تعيين قائد فريق سلامة الغذاء؟', required: true },
                    { text: 'هل تم تحديد المسؤوليات والصلاحيات؟', required: true }
                ]
            }]
        },
        operation: {
            id: 'operation',
            name: 'البند 8: العمليات',
            icon: 'cog',
            order: 3,
            tables: [{
                id: 'operation_checklist',
                name: 'متطلبات العمليات',
                type: 'checklist',
                items: [
                    { text: 'هل تم تنفيذ برامج المتطلبات الأساسية (PRPs)؟', required: true },
                    { text: 'هل تم إنشاء نظام التتبع؟', required: true },
                    { text: 'هل تم الاستعداد للطوارئ؟', required: true },
                    { text: 'هل تم تحليل المخاطر (HACCP)؟', required: true },
                    { text: 'هل تم تحديد CCPs و OPRPs؟', required: true },
                    { text: 'هل تم وضع خطة التحكم في المخاطر؟', required: true },
                    { text: 'هل تم معايرة معدات القياس؟', required: true },
                    { text: 'هل تم التحقق من PRPs و خطة التحكم؟', required: true }
                ]
            }]
        },
        improvement: {
            id: 'improvement',
            name: 'البند 10: التحسين',
            icon: 'arrow-trending-up',
            order: 4,
            tables: [{
                id: 'improvement_checklist',
                name: 'متطلبات التحسين',
                type: 'checklist',
                items: [
                    { text: 'هل يتم التحسين المستمر لـ FSMS؟', required: true },
                    { text: 'هل يتم تحديث FSMS بناءً على مراجعة الإدارة؟', required: true },
                    { text: 'هل يتم التعامل مع حالات عدم المطابقة؟', required: true },
                    { text: 'هل يتم اتخاذ إجراءات تصحيحية؟', required: true }
                ]
            }]
        }
    }
};

// ==================== 5. Food Defense Checklist ====================
export const foodDefenseChecklistTemplate: FormTemplate = {
    id: textToUUID('fssc-food-defense-checklist'),
    name: 'قائمة تحقق الدفاع الغذائي',
    name_en: 'Food Defense Checklist',
    version: 1,
    created_at: now,
    type: 'checklist',
    folder_id: textToUUID('fssc-p3-fooddefense'),
    template_type_config: {
        id: 'checklist',
        name: 'قائمة تحقق',
        description: 'فحص متطلبات الدفاع الغذائي',
        icon: 'shield-check',
        color: '#DC2626',
        default_sections: [],
        available_tools: [],
        required_properties: [],
        optional_properties: []
    },
    custom_properties: { docCode: 'FSSC192', pages: 2 },
    document_control: {
        doc_code: 'FSSC192',
        issue_no: '1',
        review_no: '0',
        issue_date: now.split('T')[0],
        review_date: ''
    },
    sections: {
        physical_security: {
            id: 'physical_security',
            name: 'الأمن المادي',
            icon: 'lock-closed',
            order: 1,
            tables: [{
                id: 'physical_security_checklist',
                name: 'فحص الأمن المادي',
                type: 'checklist',
                items: [
                    { text: 'هل جميع المداخل والمخارج مؤمنة؟', required: true },
                    { text: 'هل كاميرات المراقبة تعمل بشكل صحيح؟', required: true },
                    { text: 'هل الإضاءة الخارجية كافية؟', required: true },
                    { text: 'هل الأسوار والحواجز سليمة؟', required: true },
                    { text: 'هل يتم التحكم في دخول الزوار؟', required: true },
                    { text: 'هل توجد سجلات للزوار؟', required: true }
                ]
            }]
        },
        materials_security: {
            id: 'materials_security',
            name: 'أمن المواد',
            icon: 'cube',
            order: 2,
            tables: [{
                id: 'materials_security_checklist',
                name: 'فحص أمن المواد',
                type: 'checklist',
                items: [
                    { text: 'هل المواد الخام محفوظة في مناطق آمنة؟', required: true },
                    { text: 'هل يتم فحص الشحنات الواردة؟', required: true },
                    { text: 'هل المواد الكيميائية مخزنة ومؤمنة بشكل صحيح؟', required: true },
                    { text: 'هل يوجد جرد للمواد الحساسة؟', required: true },
                    { text: 'هل المنتجات النهائية محفوظة بشكل آمن؟', required: true }
                ]
            }]
        }
    }
};

// Export all detailed templates
export const detailedFSSCTemplates: FormTemplate[] = [
    haccpPlanTemplate,
    cleaningRecordTemplate,
    pestControlRecordTemplate,
    internalAuditChecklistTemplate,
    foodDefenseChecklistTemplate
];
