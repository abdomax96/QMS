/**
 * Arabic translations
 */

export const ar = {
    // Common
    common: {
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        add: 'إضافة',
        search: 'بحث',
        filter: 'فلتر',
        export: 'تصدير',
        import: 'استيراد',
        print: 'طباعة',
        refresh: 'تحديث',
        loading: 'جاري التحميل...',
        noData: 'لا توجد بيانات',
        confirm: 'تأكيد',
        close: 'إغلاق',
        yes: 'نعم',
        no: 'لا',
        all: 'الكل',
        select: 'اختر',
        required: 'مطلوب',
        optional: 'اختياري',
        success: 'تمت العملية بنجاح',
        error: 'حدث خطأ',
        warning: 'تحذير'
    },

    // Navigation
    nav: {
        dashboard: 'لوحة التحكم',
        reports: 'التقارير',
        forms: 'النماذج',
        ncr: 'تقارير عدم المطابقة',
        ncrDashboard: 'لوحة تحكم NCR',
        holds: 'المحتجزات',
        settings: 'الإعدادات',
        users: 'المستخدمين',
        profile: 'الملف الشخصي',
        logout: 'تسجيل الخروج'
    },

    // Dashboard
    dashboard: {
        title: 'لوحة التحكم',
        totalReports: 'إجمالي التقارير',
        totalTemplates: 'القوالب',
        totalFolders: 'المجلدات',
        recentActivity: 'النشاط الأخير',
        quickStats: 'إحصائيات سريعة',
        statusDistribution: 'توزيع الحالات'
    },

    // NCR
    ncr: {
        title: 'تقارير عدم المطابقة',
        newReport: 'تقرير جديد',
        reportNumber: 'رقم التقرير',
        department: 'القسم',
        date: 'التاريخ',
        severity: 'الخطورة',
        status: 'الحالة',
        description: 'الوصف',
        discoveredBy: 'اكتشف بواسطة',
        assignedTo: 'معين إلى',
        dueDate: 'تاريخ الاستحقاق',
        closedAt: 'تاريخ الإغلاق',
        daysOpen: 'أيام مفتوح',

        // Severity levels
        low: 'منخفض',
        medium: 'متوسط',
        high: 'مرتفع',

        // Status
        open: 'مفتوح',
        inProgress: 'قيد التنفيذ',
        pendingVerification: 'بانتظار التحقق',
        closed: 'مغلق',

        // Actions
        viewDetails: 'عرض التفاصيل',
        closeReport: 'إغلاق التقرير',
        reopenReport: 'إعادة فتح',
        advanceStage: 'المرحلة التالية',

        // Stages
        stages: {
            discovery: 'الاكتشاف',
            analysis: 'التحليل',
            corrective: 'الإجراء التصحيحي',
            verification: 'التحقق',
            closure: 'الإغلاق'
        },

        // Form fields
        product: 'المنتج',
        batchNumber: 'رقم الدفعة',
        quantity: 'الكمية',
        source: 'المصدر',
        defectType: 'نوع العيب',
        immediateAction: 'الإجراء الفوري',
        rootCause: 'السبب الجذري',
        correctiveAction: 'الإجراء التصحيحي',
        preventiveAction: 'الإجراء الوقائي'
    },

    // Reports
    reports: {
        title: 'التقارير',
        newReport: 'تقرير جديد',
        folders: 'المجلدات',
        templates: 'القوالب',
        allReports: 'جميع التقارير'
    },

    // Settings
    settings: {
        title: 'الإعدادات',
        general: 'عام',
        users: 'المستخدمين',
        departments: 'الأقسام',
        appearance: 'المظهر',
        language: 'اللغة',
        theme: 'السمة',
        darkMode: 'الوضع الداكن',
        lightMode: 'الوضع الفاتح'
    },

    // Users
    users: {
        title: 'المستخدمين',
        name: 'الاسم',
        email: 'البريد الإلكتروني',
        role: 'الدور',
        status: 'الحالة',
        active: 'نشط',
        inactive: 'غير نشط',

        // Roles
        admin: 'مدير',
        manager: 'مشرف',
        employee: 'موظف',
        viewer: 'مشاهد'
    },

    // Notifications
    notifications: {
        title: 'الإشعارات',
        noNotifications: 'لا توجد إشعارات',
        markAllRead: 'تحديد الكل كمقروء',
        clearAll: 'مسح الكل',
        newNcr: 'تقرير جديد',
        ncrAssigned: 'تم تعيين تقرير لك',
        ncrClosed: 'تم إغلاق التقرير',
        ncrOverdue: 'تقرير متأخر'
    },

    // Comments
    comments: {
        title: 'التعليقات',
        noComments: 'لا توجد تعليقات',
        addComment: 'أضف تعليقاً',
        reply: 'رد',
        edited: 'تم التعديل',
        deleteConfirm: 'هل أنت متأكد من حذف التعليق؟'
    },

    // Attachments
    attachments: {
        title: 'المرفقات',
        noAttachments: 'لا توجد مرفقات',
        upload: 'رفع ملفات',
        dragDrop: 'اسحب وأفلت الملفات هنا',
        maxSize: 'الحد الأقصى للملف',
        invalidType: 'نوع الملف غير مدعوم'
    },

    // Time
    time: {
        now: 'الآن',
        minutesAgo: 'منذ {count} دقيقة',
        hoursAgo: 'منذ {count} ساعة',
        daysAgo: 'منذ {count} يوم',
        weeksAgo: 'منذ {count} أسبوع'
    },

    // Validation
    validation: {
        required: 'هذا الحقل مطلوب',
        email: 'البريد الإلكتروني غير صحيح',
        minLength: 'الحد الأدنى {count} أحرف',
        maxLength: 'الحد الأقصى {count} أحرف'
    }
};

export default ar;
