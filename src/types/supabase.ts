/**
 * Supabase Database Types
 * Auto-generated type definitions for QMS database tables
 * 
 * This file provides TypeScript interfaces for all database tables
 * to enable type-safe database operations.
 */

// ==================== Database Helper Type ====================
export interface Database {
    public: {
        Tables: {
            unified_folders: {
                Row: UnifiedFolder;
                Insert: Partial<UnifiedFolder> & { name: string; type: string; path: string };
                Update: Partial<UnifiedFolder>;
            };
            content_shares: {
                Row: ContentShare;
                Insert: Partial<ContentShare> & { content_type: string; content_id: string; shared_by_user_id: string; share_type: string };
                Update: Partial<ContentShare>;
            };
            users: {
                Row: User;
                Insert: Partial<User> & { id: string; email: string };
                Update: Partial<User>;
            };
            departments: {
                Row: Department;
                Insert: Partial<Department> & { name: string };
                Update: Partial<Department>;
            };
            roles: {
                Row: Role;
                Insert: Partial<Role> & { code: string; name: string };
                Update: Partial<Role>;
            };
            user_roles: {
                Row: UserRole;
                Insert: { user_id: string; role_id: string };
                Update: Partial<UserRole>;
            };
            form_templates: {
                Row: FormTemplate;
                Insert: Partial<FormTemplate> & { name: string };
                Update: Partial<FormTemplate>;
            };
            form_instances: {
                Row: FormInstance;
                Insert: Partial<FormInstance> & { template_id: string };
                Update: Partial<FormInstance>;
            };
            ncr_reports: {
                Row: NcrReport;
                Insert: Partial<NcrReport> & { title: string };
                Update: Partial<NcrReport>;
            };
            tasks: {
                Row: Task;
                Insert: Partial<Task> & { title: string };
                Update: Partial<Task>;
            };
            notifications: {
                Row: Notification;
                Insert: Partial<Notification> & { user_id: string };
                Update: Partial<Notification>;
            };
            variables: {
                Row: Variable;
                Insert: Partial<Variable> & { name: string; value: string; company_id: string };
                Update: Partial<Variable>;
            };
        };
    };
}

// ==================== Core Tables ====================

/** User account */
export interface User {
    id: string;
    email: string;
    name: string | null;
    display_name: string | null;
    phone: string | null;
    title: string | null;
    department: string | null;
    department_id: string | null;
    job_title_id: string | null;
    company_id: string | null;
    avatar_url: string | null;
    roles: string[] | null;
    permissions: string[] | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

/** Department/organizational unit */
export interface Department {
    id: string;
    name: string;
    name_en: string | null;
    code: string | null;
    description: string | null;
    parent_id: string | null;
    manager_id: string | null;
    company_id: string | null;
    is_active: boolean | null;
    settings: Record<string, any> | null;
    created_at: string | null;
    updated_at: string | null;
}

/** System role */
export interface Role {
    id: string;
    code: string;
    name: string;
    name_en: string | null;
    description: string | null;
    category: string | null;
    level: number | null;
    is_system: boolean | null;
    is_locked: boolean | null;
    deprecated: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

/** User to role mapping */
export interface UserRole {
    id: string;
    user_id: string;
    role_id: string;
    assigned_by: string | null;
    assigned_at: string | null;
    created_at: string | null;
}

// ==================== Unified Folders ====================

/** Unified folder for forms and reports */
export interface UnifiedFolder {
    id: string;
    name: string;
    name_en: string | null;
    type: string;
    department_id: string | null;
    is_default_for_department: boolean | null;
    parent_id: string | null;
    path: string;
    depth: number | null;
    icon: string | null;
    color: string | null;
    cover_image: string | null;
    content_types: string[] | null;
    description: string | null;
    tags: string[] | null;
    is_favorite: boolean | null;
    sort_order: number | null;
    is_public: boolean | null;
    is_system: boolean | null;
    visibility_scope: string | null;
    stats: Record<string, any> | null;
    created_at: string | null;
    created_by: string | null;
    updated_at: string | null;
    updated_by: string | null;
    archived: boolean | null;
    archived_at: string | null;
    archived_by: string | null;
    version: number | null;
}

// ==================== Content Sharing ====================

/** Content share record */
export interface ContentShare {
    id: string;
    content_type: string;
    content_id: string;
    shared_by_user_id: string;
    shared_by_department_id: string | null;
    share_type: string;
    shared_with_departments: string[] | null;
    shared_with_users: string[] | null;
    shared_with_roles: string[] | null;
    auto_assign_to_new_role_members: boolean | null;
    permission_level: string | null;
    custom_permissions: Record<string, any> | null;
    expires_at: string | null;
    is_active: boolean | null;
    require_password: boolean | null;
    password_hash: string | null;
    max_views: number | null;
    current_views: number | null;
    title: string | null;
    note: string | null;
    tags: string[] | null;
    notify_on_access: boolean | null;
    notify_on_edit: boolean | null;
    created_at: string | null;
    updated_at: string | null;
    last_accessed_at: string | null;
    access_count: number | null;
    stats: Record<string, any> | null;
}

// ==================== Forms & Reports ====================

/** Form template definition */
export interface FormTemplate {
    id: string;
    name: string;
    name_en: string | null;
    version: number | null;
    type: string | null;
    folder_id: string | null;
    template_type_config: Record<string, any> | null;
    custom_properties: Record<string, any> | null;
    basic_info: Record<string, any> | null;
    document_control: Record<string, any> | null;
    batch_configuration: Record<string, any> | null;
    custom_variables: Record<string, any> | null;
    sections: Record<string, any> | null;
    quality_criteria: Record<string, any> | null;
    notes: string | null;
    signatures: Record<string, any> | null;
    recipe: Record<string, any> | null;
    archived: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

/** Form instance (submitted form) */
export interface FormInstance {
    id: string;
    name: string | null;
    template_id: string;
    template_version: string | null;
    folder_id: string | null;
    status: string | null;
    form_data: Record<string, any> | null;
    calculations: Record<string, any> | null;
    signatures: Record<string, any> | null;
    workflow: Record<string, any> | null;
    company_id: string | null;
    archived: boolean | null;
    created_at: string | null;
    created_by: string | null;
    submitted_at: string | null;
    submitted_by: string | null;
    updated_at: string | null;
}

// ==================== NCR (Non-Conformance Reports) ====================

/** NCR report */
export interface NcrReport {
    id: string;
    ncr_number: string | null;
    number: string | null;
    title: string;
    description: string | null;
    category: string | null;
    severity: string | null;
    status: string | null;
    source: string | null;
    department: string | null;
    source_department_id: string | null;
    target_department_id: string | null;
    product_name: string | null;
    batch_number: string | null;
    quantity_affected: number | null;
    root_cause: string | null;
    corrective_action: string | null;
    preventive_action: string | null;
    assigned_to: string | null;
    assigned_to_id: string | null;
    created_by: string | null;
    created_by_id: string | null;
    due_date: string | null;
    closed_at: string | null;
    closed_by: string | null;
    current_stage: string | null;
    completed_stages: any[] | null;
    stage_history: any[] | null;
    actions: any[] | null;
    holds: any[] | null;
    verification: Record<string, any> | null;
    attachments: any[] | null;
    company_id: string | null;
    version: number | null;
    created_at: string | null;
    updated_at: string | null;
}

// ==================== Tasks ====================

/** Task record */
export interface Task {
    id: string;
    task_number: string | null;
    title: string;
    description: string | null;
    type: string | null;
    status: string | null;
    priority: string | null;
    assigned_to: string | null;
    assigned_by: string | null;
    department_id: string | null;
    due_date: string | null;
    completed_at: string | null;
    company_id: string | null;
    metadata: Record<string, any> | null;
    created_at: string | null;
    updated_at: string | null;
}

// ==================== Notifications ====================

/** Notification record */
export interface Notification {
    id: string;
    user_id: string;
    type: string | null;
    title: string | null;
    message: string | null;
    data: Record<string, any> | null;
    is_read: boolean | null;
    read_at: string | null;
    action_url: string | null;
    created_at: string | null;
}

// ==================== Audit ====================

/** Audit trail entry */
export interface AuditTrail {
    id: string;
    table_name: string;
    record_id: string;
    operation: string;
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
    performed_by: string | null;
    entity_name: string | null;
    checksum: string | null;
    created_at: string | null;
}

/** Audit log entry */
export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    operation: string;
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
    performed_by: string | null;
    entity_name: string | null;
    created_at: string | null;
}

// ==================== RBAC/Permissions ====================

/** Role module permission */
export interface RoleModulePermission {
    id: string;
    role_id: string;
    module_code: string;
    can_access: boolean | null;
    granted_actions: string[] | null;
    created_at: string | null;
    updated_at: string | null;
}

/** Permission audit log */
export interface PermissionAuditLog {
    id: string;
    action: string;
    details: Record<string, any> | null;
    performed_by: string | null;
    created_at: string | null;
}

// ==================== Lab & Raw Materials ====================

/** Lab test record */
export interface LabTest {
    id: string;
    test_number: string | null;
    sample_id: string | null;
    test_type: string | null;
    status: string | null;
    results: Record<string, any> | null;
    performed_by: string | null;
    verified_by: string | null;
    company_id: string | null;
    created_at: string | null;
    updated_at: string | null;
}

/** Raw material record */
export interface RawMaterial {
    id: string;
    name: string;
    name_en: string | null;
    code: string | null;
    category: string | null;
    unit: string | null;
    specifications: Record<string, any> | null;
    company_id: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

/** Material receiving record */
export interface MaterialReceiving {
    id: string;
    receiving_number: string | null;
    material_id: string | null;
    supplier_id: string | null;
    batch_number: string | null;
    quantity: number | null;
    unit: string | null;
    status: string | null;
    inspection_result: string | null;
    company_id: string | null;
    received_by: string | null;
    received_at: string | null;
    created_at: string | null;
    updated_at: string | null;
}

// Note: All interfaces are already exported via their definitions above

// ==================== Variables ====================

/** Global Variable record */
export interface Variable {
    id: string;
    company_id: string;
    name: string;
    value: string;
    unit: string | null;
    source_document_id: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
}

