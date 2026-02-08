/**
 * English translations
 */

export const en = {
    // Common
    common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        print: 'Print',
        refresh: 'Refresh',
        loading: 'Loading...',
        noData: 'No data',
        confirm: 'Confirm',
        close: 'Close',
        yes: 'Yes',
        no: 'No',
        all: 'All',
        select: 'Select',
        required: 'Required',
        optional: 'Optional',
        success: 'Operation successful',
        error: 'An error occurred',
        warning: 'Warning'
    },

    // Navigation
    nav: {
        dashboard: 'Dashboard',
        reports: 'Reports',
        forms: 'Forms',
        ncr: 'Non-Conformance Reports',
        ncrDashboard: 'NCR Dashboard',
        holds: 'Holds',
        settings: 'Settings',
        users: 'Users',
        profile: 'Profile',
        logout: 'Logout'
    },

    // Dashboard
    dashboard: {
        title: 'Dashboard',
        totalReports: 'Total Reports',
        totalTemplates: 'Templates',
        totalFolders: 'Folders',
        recentActivity: 'Recent Activity',
        quickStats: 'Quick Stats',
        statusDistribution: 'Status Distribution'
    },

    // NCR
    ncr: {
        title: 'Non-Conformance Reports',
        newReport: 'New Report',
        reportNumber: 'Report Number',
        department: 'Department',
        date: 'Date',
        severity: 'Severity',
        status: 'Status',
        description: 'Description',
        discoveredBy: 'Discovered By',
        assignedTo: 'Assigned To',
        dueDate: 'Due Date',
        closedAt: 'Closed At',
        daysOpen: 'Days Open',

        // Severity levels
        low: 'Low',
        medium: 'Medium',
        high: 'High',

        // Status
        open: 'Open',
        inProgress: 'In Progress',
        pendingVerification: 'Pending Verification',
        closed: 'Closed',

        // Actions
        viewDetails: 'View Details',
        closeReport: 'Close Report',
        reopenReport: 'Reopen',
        advanceStage: 'Next Stage',

        // Stages
        stages: {
            discovery: 'Discovery',
            analysis: 'Analysis',
            corrective: 'Corrective Action',
            verification: 'Verification',
            closure: 'Closure'
        },

        // Form fields
        product: 'Product',
        batchNumber: 'Batch Number',
        quantity: 'Quantity',
        source: 'Source',
        defectType: 'Defect Type',
        immediateAction: 'Immediate Action',
        rootCause: 'Root Cause',
        correctiveAction: 'Corrective Action',
        preventiveAction: 'Preventive Action'
    },

    // Reports
    reports: {
        title: 'Reports',
        newReport: 'New Report',
        folders: 'Folders',
        templates: 'Templates',
        allReports: 'All Reports'
    },

    // Settings
    settings: {
        title: 'Settings',
        general: 'General',
        users: 'Users',
        departments: 'Departments',
        appearance: 'Appearance',
        language: 'Language',
        theme: 'Theme',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode'
    },

    // Users
    users: {
        title: 'Users',
        name: 'Name',
        email: 'Email',
        role: 'Role',
        status: 'Status',
        active: 'Active',
        inactive: 'Inactive',

        // Roles
        admin: 'Admin',
        manager: 'Manager',
        employee: 'Employee',
        viewer: 'Viewer'
    },

    // Notifications
    notifications: {
        title: 'Notifications',
        noNotifications: 'No notifications',
        markAllRead: 'Mark all as read',
        clearAll: 'Clear all',
        newNcr: 'New Report',
        ncrAssigned: 'Report assigned to you',
        ncrClosed: 'Report closed',
        ncrOverdue: 'Overdue report'
    },

    // Comments
    comments: {
        title: 'Comments',
        noComments: 'No comments',
        addComment: 'Add a comment',
        reply: 'Reply',
        edited: 'Edited',
        deleteConfirm: 'Are you sure you want to delete this comment?'
    },

    // Attachments
    attachments: {
        title: 'Attachments',
        noAttachments: 'No attachments',
        upload: 'Upload files',
        dragDrop: 'Drag and drop files here',
        maxSize: 'Max file size',
        invalidType: 'File type not supported'
    },

    // Time
    time: {
        now: 'Now',
        minutesAgo: '{count} minute(s) ago',
        hoursAgo: '{count} hour(s) ago',
        daysAgo: '{count} day(s) ago',
        weeksAgo: '{count} week(s) ago'
    },

    // Validation
    validation: {
        required: 'This field is required',
        email: 'Invalid email address',
        minLength: 'Minimum {count} characters',
        maxLength: 'Maximum {count} characters'
    }
};

export default en;
