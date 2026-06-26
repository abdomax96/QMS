export type AiReadToolName =
  | 'material_receiving.latest'
  | 'raw_material_suppliers.approved'
  | 'tasks.my_open'
  | 'tasks.lookup'
  | 'tasks.activity'
  | 'ncr.lookup'
  | 'documents.search'
  | 'documents.versions'
  | 'lab_v2.run_lookup'
  | 'lab_v2.run_details'
  | 'safe_query.structured';

export type AiWriteCapabilityName =
  | 'chat.send_message'
  | 'tasks.create'
  | 'tasks.update'
  | 'tasks.add_comment'
  | 'ncr.create_draft'
  | 'ncr.add_comment'
  | 'ncr.add_action'
  | 'documents.create_draft'
  | 'documents.create_version'
  | 'material_receiving.create_draft'
  | 'lab_v2.create_run'
  | 'lab_v2.add_measurement'
  | 'lab_v2.save_values'
  | 'lab_v2.complete_run'
  | 'lab_v2.approve_run'
  | 'lab_v2.reject_run';

export type AiCapabilityName = AiReadToolName | AiWriteCapabilityName;
export type AiCapabilityKind = 'read' | 'write';
export type AiCapabilityRiskLevel = 'low' | 'medium' | 'high';

export type AiCapabilityDefinition = {
  name: AiCapabilityName;
  kind: AiCapabilityKind;
  moduleCode: string;
  requiredAction: string;
  riskLevel: AiCapabilityRiskLevel;
  usesUserScope: boolean;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
};

export type AiReadToolDefinition = {
  name: AiReadToolName;
  kind: 'read';
  groundedOnly: boolean;
  allowModelFallback: boolean;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
};

const AI_READ_TOOL_REGISTRY: Record<AiReadToolName, AiReadToolDefinition> = {
  'material_receiving.latest': {
    name: 'material_receiving.latest',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'آخر استلام مختبر',
    labelEn: 'Latest Lab Receiving',
    descriptionAr: 'يعيد آخر سجل استلام مواد في المختبر من البيانات الحية.',
    descriptionEn: 'Returns the latest material receiving record from live data.',
  },
  'raw_material_suppliers.approved': {
    name: 'raw_material_suppliers.approved',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'الموردون المعتمدون للخامة',
    labelEn: 'Approved Suppliers For Material',
    descriptionAr: 'يعيد الموردين المعتمدين لخامة محددة من البيانات الحية.',
    descriptionEn: 'Returns approved suppliers for a specific raw material from live data.',
  },
  'tasks.my_open': {
    name: 'tasks.my_open',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'مهامي المفتوحة',
    labelEn: 'My Open Tasks',
    descriptionAr: 'يعيد المهام المفتوحة أو المتأخرة المسندة للمستخدم الحالي من البيانات الحية.',
    descriptionEn: 'Returns open or overdue tasks assigned to the current user from live data.',
  },
  'tasks.lookup': {
    name: 'tasks.lookup',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'تفاصيل مهمة',
    labelEn: 'Task Lookup',
    descriptionAr: 'يعيد تفاصيل مهمة محددة برقمها أو أحدث مهمة متاحة للمستخدم الحالي من البيانات الحية.',
    descriptionEn: 'Returns a specific task by number or the latest task available to the current user from live data.',
  },
  'tasks.activity': {
    name: 'tasks.activity',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'نشاط المهمة',
    labelEn: 'Task Activity',
    descriptionAr: 'يعيد أحدث تعليقات وسجل النشاط لمهمة محددة أو لأحدث مهمة متاحة للمستخدم الحالي من البيانات الحية.',
    descriptionEn: 'Returns recent comments and activity history for a specific task or the latest task available to the current user from live data.',
  },
  'ncr.lookup': {
    name: 'ncr.lookup',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'استعلام NCR',
    labelEn: 'NCR Lookup',
    descriptionAr: 'يعيد آخر NCR أو تفاصيل NCR محدد من البيانات الحية.',
    descriptionEn: 'Returns the latest NCR or a specific NCR from live data.',
  },
  'documents.search': {
    name: 'documents.search',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'بحث الوثائق',
    labelEn: 'Document Search',
    descriptionAr: 'يعيد وثائق مرئية للمستخدم من البيانات الحية مع مراعاة الصلاحيات.',
    descriptionEn: 'Returns user-visible documents from live data while respecting permissions.',
  },
  'documents.versions': {
    name: 'documents.versions',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'إصدارات الوثيقة',
    labelEn: 'Document Versions',
    descriptionAr: 'يعيد أحدث إصدارات وثيقة مرئية للمستخدم من البيانات الحية مع مراعاة الصلاحيات.',
    descriptionEn: 'Returns recent versions for a user-visible document from live data while respecting permissions.',
  },
  'lab_v2.run_lookup': {
    name: 'lab_v2.run_lookup',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'استعلام تشغيل مختبر V2',
    labelEn: 'Lab V2 Run Lookup',
    descriptionAr: 'يعيد آخر تشغيل مختبر V2 أو تفاصيل تشغيل محدد من البيانات الحية.',
    descriptionEn: 'Returns the latest Lab V2 test run or a specific run from live data.',
  },
  'lab_v2.run_details': {
    name: 'lab_v2.run_details',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'تفاصيل تشغيل مختبر V2',
    labelEn: 'Lab V2 Run Details',
    descriptionAr: 'يعيد تفاصيل تشغيل مختبر V2 مع القياسات والنتائج والمواد من البيانات الحية.',
    descriptionEn: 'Returns detailed Lab V2 run information with measurements, results, and materials from live data.',
  },
  'safe_query.structured': {
    name: 'safe_query.structured',
    kind: 'read',
    groundedOnly: true,
    allowModelFallback: false,
    labelAr: 'استعلام آمن من الكتالوج',
    labelEn: 'Structured Safe Catalog Query',
    descriptionAr: 'ينفذ استعلاماً آمناً على الجداول المسموح بها فقط.',
    descriptionEn: 'Executes a safe query only against allowed catalog tables.',
  },
};

const AI_WRITE_CAPABILITY_REGISTRY: Record<AiWriteCapabilityName, AiCapabilityDefinition> = {
  'chat.send_message': {
    name: 'chat.send_message',
    kind: 'write',
    moduleCode: 'chat',
    requiredAction: 'send_message',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: 'إرسال رسالة دردشة',
    labelEn: 'Send Chat Message',
    descriptionAr: 'يرسل رسالة جديدة داخل محادثة مسموح بها للمستخدم الحالي.',
    descriptionEn: 'Sends a new message to a conversation available to the current user.',
  },
  'tasks.create': {
    name: 'tasks.create',
    kind: 'write',
    moduleCode: 'tasks',
    requiredAction: 'create',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'إنشاء مهمة',
    labelEn: 'Create Task',
    descriptionAr: 'ينشئ مهمة جديدة ضمن صلاحيات المستخدم الحالية.',
    descriptionEn: 'Creates a new task within the current user permissions.',
  },
  'tasks.update': {
    name: 'tasks.update',
    kind: 'write',
    moduleCode: 'tasks',
    requiredAction: 'edit',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'تحديث مهمة',
    labelEn: 'Update Task',
    descriptionAr: 'يحدّث حقول مهمة موجودة ضمن صلاحيات المستخدم الحالية.',
    descriptionEn: 'Updates fields on an existing task within the current user permissions.',
  },
  'tasks.add_comment': {
    name: 'tasks.add_comment',
    kind: 'write',
    moduleCode: 'tasks',
    requiredAction: 'edit',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: 'إضافة تعليق مهمة',
    labelEn: 'Add Task Comment',
    descriptionAr: 'يضيف تعليقًا جديدًا إلى مهمة متاحة للمستخدم.',
    descriptionEn: 'Adds a new comment to a task available to the user.',
  },
  'documents.create_draft': {
    name: 'documents.create_draft',
    kind: 'write',
    moduleCode: 'documents',
    requiredAction: 'create',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'إنشاء وثيقة مسودة',
    labelEn: 'Create Draft Document',
    descriptionAr: 'ينشئ وثيقة جديدة بحالة مسودة ضمن صلاحيات المستخدم.',
      descriptionEn: 'Creates a new draft document within the current user permissions.',
  },
  'documents.create_version': {
    name: 'documents.create_version',
    kind: 'write',
    moduleCode: 'documents',
    requiredAction: 'edit',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'إنشاء إصدار وثيقة',
    labelEn: 'Create Document Version',
    descriptionAr: 'ينشئ إصدارًا جديدًا لوثيقة مرئية للمستخدم.',
    descriptionEn: 'Creates a new version for a document visible to the current user.',
  },
  'ncr.create_draft': {
    name: 'ncr.create_draft',
    kind: 'write',
    moduleCode: 'ncr',
    requiredAction: 'create',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'إنشاء NCR',
    labelEn: 'Create NCR Draft',
    descriptionAr: 'ينشئ تقرير عدم مطابقة جديدًا ضمن صلاحيات المستخدم الحالية.',
    descriptionEn: 'Creates a new NCR record within the current user permissions.',
  },
  'ncr.add_comment': {
    name: 'ncr.add_comment',
    kind: 'write',
    moduleCode: 'ncr',
    requiredAction: 'edit',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: 'إضافة تعليق NCR',
    labelEn: 'Add NCR Comment',
    descriptionAr: 'يضيف تعليقًا جديدًا إلى NCR مرئي للمستخدم.',
    descriptionEn: 'Adds a new comment to an NCR visible to the current user.',
  },
  'ncr.add_action': {
    name: 'ncr.add_action',
    kind: 'write',
    moduleCode: 'ncr',
    requiredAction: 'edit',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'إضافة إجراء NCR',
    labelEn: 'Add NCR Action',
    descriptionAr: 'يضيف إجراءً تصحيحيًا أو وقائيًا إلى NCR مرئي للمستخدم.',
    descriptionEn: 'Adds a corrective or preventive action to an NCR visible to the current user.',
  },
  'material_receiving.create_draft': {
    name: 'material_receiving.create_draft',
    kind: 'write',
    moduleCode: 'lab',
    requiredAction: 'create',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'إنشاء استلام مادة',
    labelEn: 'Create Material Receiving Draft',
    descriptionAr: 'ينشئ سجل استلام مادة جديدًا كمسودة/معلّق ضمن صلاحيات المستخدم.',
    descriptionEn: 'Creates a new material receiving record as a draft/pending entry within the current user permissions.',
  },
  'lab_v2.create_run': {
    name: 'lab_v2.create_run',
    kind: 'write',
    moduleCode: 'lab',
    requiredAction: 'create',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'إنشاء تشغيل مختبر',
    labelEn: 'Create Lab Run',
    descriptionAr: 'ينشئ تشغيل فحص جديد في المختبر ضمن صلاحيات المستخدم.',
    descriptionEn: 'Creates a new lab test run within the current user permissions.',
  },
  'lab_v2.add_measurement': {
    name: 'lab_v2.add_measurement',
    kind: 'write',
    moduleCode: 'lab',
    requiredAction: 'edit',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'إضافة قياس مختبر',
    labelEn: 'Add Lab Measurement',
    descriptionAr: 'يضيف قياسًا جديدًا إلى تشغيل مختبر متاح للمستخدم.',
    descriptionEn: 'Adds a new measurement to a lab run available to the user.',
  },
  'lab_v2.save_values': {
    name: 'lab_v2.save_values',
    kind: 'write',
    moduleCode: 'lab',
    requiredAction: 'edit',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'تسجيل قيم تشغيل مختبر',
    labelEn: 'Record Lab Run Values',
    descriptionAr: 'يسجل قيمة أو نتيجة باراميتر داخل تشغيل مختبر متاح للمستخدم ويعيد تقييمه.',
    descriptionEn: 'Records a parameter value/result inside an accessible lab run and re-evaluates it.',
  },
  'lab_v2.complete_run': {
    name: 'lab_v2.complete_run',
    kind: 'write',
    moduleCode: 'lab',
    requiredAction: 'edit',
    riskLevel: 'medium',
    usesUserScope: true,
    labelAr: 'إكمال تشغيل مختبر',
    labelEn: 'Complete Lab Run',
    descriptionAr: 'ينهي تشغيل المختبر الحالي مع حفظ ملاحظات الإكمال.',
    descriptionEn: 'Completes the current lab run with optional completion notes.',
  },
  'lab_v2.approve_run': {
    name: 'lab_v2.approve_run',
    kind: 'write',
    moduleCode: 'lab',
    requiredAction: 'approve',
    riskLevel: 'high',
    usesUserScope: true,
    labelAr: 'اعتماد تشغيل مختبر',
    labelEn: 'Approve Lab Run',
    descriptionAr: 'يعتمد تشغيل مختبر بعد المراجعة ضمن صلاحيات الاعتماد.',
    descriptionEn: 'Approves a lab run after review within approval permissions.',
  },
  'lab_v2.reject_run': {
    name: 'lab_v2.reject_run',
    kind: 'write',
    moduleCode: 'lab',
    requiredAction: 'approve',
    riskLevel: 'high',
    usesUserScope: true,
    labelAr: 'رفض تشغيل مختبر',
    labelEn: 'Reject Lab Run',
    descriptionAr: 'يرفض تشغيل مختبر مع سبب الرفض ضمن صلاحيات الاعتماد.',
    descriptionEn: 'Rejects a lab run with a rejection reason within approval permissions.',
  },
};

const AI_CAPABILITY_REGISTRY: Record<AiCapabilityName, AiCapabilityDefinition> = {
  'material_receiving.latest': {
    name: 'material_receiving.latest',
    kind: 'read',
    moduleCode: 'lab',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['material_receiving.latest'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['material_receiving.latest'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['material_receiving.latest'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['material_receiving.latest'].descriptionEn,
  },
  'raw_material_suppliers.approved': {
    name: 'raw_material_suppliers.approved',
    kind: 'read',
    moduleCode: 'master_data',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['raw_material_suppliers.approved'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['raw_material_suppliers.approved'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['raw_material_suppliers.approved'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['raw_material_suppliers.approved'].descriptionEn,
  },
  'tasks.my_open': {
    name: 'tasks.my_open',
    kind: 'read',
    moduleCode: 'tasks',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['tasks.my_open'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['tasks.my_open'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['tasks.my_open'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['tasks.my_open'].descriptionEn,
  },
  'tasks.lookup': {
    name: 'tasks.lookup',
    kind: 'read',
    moduleCode: 'tasks',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['tasks.lookup'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['tasks.lookup'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['tasks.lookup'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['tasks.lookup'].descriptionEn,
  },
  'tasks.activity': {
    name: 'tasks.activity',
    kind: 'read',
    moduleCode: 'tasks',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['tasks.activity'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['tasks.activity'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['tasks.activity'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['tasks.activity'].descriptionEn,
  },
  'ncr.lookup': {
    name: 'ncr.lookup',
    kind: 'read',
    moduleCode: 'ncr',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['ncr.lookup'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['ncr.lookup'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['ncr.lookup'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['ncr.lookup'].descriptionEn,
  },
  'documents.search': {
    name: 'documents.search',
    kind: 'read',
    moduleCode: 'documents',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['documents.search'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['documents.search'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['documents.search'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['documents.search'].descriptionEn,
  },
  'documents.versions': {
    name: 'documents.versions',
    kind: 'read',
    moduleCode: 'documents',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['documents.versions'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['documents.versions'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['documents.versions'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['documents.versions'].descriptionEn,
  },
  'lab_v2.run_lookup': {
    name: 'lab_v2.run_lookup',
    kind: 'read',
    moduleCode: 'lab',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['lab_v2.run_lookup'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['lab_v2.run_lookup'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['lab_v2.run_lookup'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['lab_v2.run_lookup'].descriptionEn,
  },
  'lab_v2.run_details': {
    name: 'lab_v2.run_details',
    kind: 'read',
    moduleCode: 'lab',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['lab_v2.run_details'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['lab_v2.run_details'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['lab_v2.run_details'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['lab_v2.run_details'].descriptionEn,
  },
  'safe_query.structured': {
    name: 'safe_query.structured',
    kind: 'read',
    moduleCode: 'system',
    requiredAction: 'view',
    riskLevel: 'low',
    usesUserScope: true,
    labelAr: AI_READ_TOOL_REGISTRY['safe_query.structured'].labelAr,
    labelEn: AI_READ_TOOL_REGISTRY['safe_query.structured'].labelEn,
    descriptionAr: AI_READ_TOOL_REGISTRY['safe_query.structured'].descriptionAr,
    descriptionEn: AI_READ_TOOL_REGISTRY['safe_query.structured'].descriptionEn,
  },
  ...AI_WRITE_CAPABILITY_REGISTRY,
};

export function getAiReadToolDefinition(name: AiReadToolName): AiReadToolDefinition {
  return AI_READ_TOOL_REGISTRY[name];
}

export function getAiCapabilityDefinition(name: AiCapabilityName): AiCapabilityDefinition {
  return AI_CAPABILITY_REGISTRY[name];
}

export function buildAiReadToolTag(name: AiReadToolName, variant?: string): string {
  const suffix = variant ? `.${variant}` : '';
  return `tool:read.${name}${suffix}`;
}
