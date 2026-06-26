# AI Assistant Tool Inventory

## Objective

This document defines the tool surface the assistant should use across QMS modules.

Priority order:

1. read-only tools
2. draft or propose tools
3. approved write tools

Each tool should map to one service or one RPC, not to broad free-form access.

## Existing AI Entry Points

The existing assistant entry path is:

- [src/services/aiAssistantService.ts](c:\Users\abdal\Downloads\QMS\src\services\aiAssistantService.ts)
- [supabase/functions/ai-assistant/index.ts](c:\Users\abdal\Downloads\QMS\supabase\functions\ai-assistant\index.ts)

This inventory is the target expansion list.

## System And Settings

Relevant sources:

- [src/services/modulePermissionsService.ts](c:\Users\abdal\Downloads\QMS\src\services\modulePermissionsService.ts)
- [src/services/permissionService.ts](c:\Users\abdal\Downloads\QMS\src\services\permissionService.ts)
- [src/services/unifiedPermissionService.ts](c:\Users\abdal\Downloads\QMS\src\services\unifiedPermissionService.ts)
- [src/services/userManagementService.ts](c:\Users\abdal\Downloads\QMS\src\services\userManagementService.ts)

Read tools:

- `get_my_permissions`
- `get_user_modules`
- `list_departments`
- `list_roles`
- `get_module_access_matrix_summary`

Action tools:

- `create_user_draft`
- `update_user_profile_draft`
- `assign_role_to_user`
- `update_department_module_access`

Notes:

- direct security administration should remain highly restricted
- secrets and auth internals stay out of assistant visibility

## Documents, Forms, Folders, Reports

Relevant sources:

- [src/services/documentService.ts](c:\Users\abdal\Downloads\QMS\src\services\documentService.ts)
- [src/services/supabaseService.ts](c:\Users\abdal\Downloads\QMS\src\services\supabaseService.ts)
- [src/services/reportWorkflowService.ts](c:\Users\abdal\Downloads\QMS\src\services\reportWorkflowService.ts)
- [src/services/fileStorageService.ts](c:\Users\abdal\Downloads\QMS\src\services\fileStorageService.ts)

Read tools:

- `search_documents`
- `get_document_details`
- `get_document_versions`
- `get_report_review_queue`
- `get_document_history`
- `find_template_by_name`
- `list_folder_children`

Action tools:

- `create_document_draft`
- `create_document_version`
- `submit_document_for_review`
- `share_document`
- `archive_document`

Notes:

- document content search should use a dedicated safe retrieval path
- approval and publishing actions require confirmation

## Tasks

Relevant sources:

- [src/services/taskService.ts](c:\Users\abdal\Downloads\QMS\src\services\taskService.ts)
- [src/pages/tasks](c:\Users\abdal\Downloads\QMS\src\pages\tasks)

Read tools:

- `list_my_open_tasks`
- `get_task_details`
- `get_overdue_tasks`
- `list_tasks_by_status`
- `list_tasks_by_assignee`

Action tools:

- `create_task`
- `update_task_status`
- `assign_task`
- `add_task_comment`
- `attach_file_to_task`

Notes:

- task updates are good early write candidates because they are operational and scoped

## NCR

Relevant sources:

- [src/services/ncr](c:\Users\abdal\Downloads\QMS\src\services\ncr)
- [src/pages/ncr](c:\Users\abdal\Downloads\QMS\src\pages\ncr)

Read tools:

- `list_open_ncrs`
- `get_ncr_details`
- `list_ncrs_by_supplier`
- `list_ncrs_by_status`
- `get_ncr_cost_summary`
- `get_ncr_transfers`

Action tools:

- `create_ncr`
- `update_ncr_stage`
- `assign_ncr_responsibility`
- `add_ncr_message`
- `create_ncr_dispute`

Notes:

- NCR writes are medium/high risk and must remain confirmation-gated

## Chat

Relevant sources:

- [src/services/chatService.ts](c:\Users\abdal\Downloads\QMS\src\services\chatService.ts)

Read tools:

- `list_chat_conversations`
- `get_conversation_messages`
- `list_active_chat_users`

Action tools:

- `create_direct_conversation`
- `create_group_conversation`
- `send_chat_message`
- `edit_chat_message`

Notes:

- the assistant may later use chat as an execution output channel, but that should be explicit

## Lab Legacy

Relevant sources:

- [src/services/labService.ts](c:\Users\abdal\Downloads\QMS\src\services\labService.ts)
- [src/services/labTestConfigService.ts](c:\Users\abdal\Downloads\QMS\src\services\labTestConfigService.ts)
- [src/services/labTestExecutionService.ts](c:\Users\abdal\Downloads\QMS\src\services\labTestExecutionService.ts)
- [src/services/labTestScheduleService.ts](c:\Users\abdal\Downloads\QMS\src\services\labTestScheduleService.ts)
- [src/services/labEquipmentService.ts](c:\Users\abdal\Downloads\QMS\src\services\labEquipmentService.ts)

Read tools:

- `get_latest_material_receiving`
- `list_material_receivings`
- `find_approved_suppliers_by_material`
- `list_lab_test_runs`
- `get_lab_statistics`
- `list_overdue_lab_schedules`
- `list_lab_equipment`

Action tools:

- `create_material_receiving`
- `create_lab_test_run`
- `schedule_lab_test`
- `register_lab_equipment`

Notes:

- some direct-query logic already exists in the current Edge Function and should be upgraded into formal tools

## Lab V2

Relevant sources:

- [src/modules/lab_v2/services/testService.ts](c:\Users\abdal\Downloads\QMS\src\modules\lab_v2\services\testService.ts)
- [src/modules/lab_v2/services/testRunService.ts](c:\Users\abdal\Downloads\QMS\src\modules\lab_v2\services\testRunService.ts)
- [src/modules/lab_v2/services/chemicalService.ts](c:\Users\abdal\Downloads\QMS\src\modules\lab_v2\services\chemicalService.ts)
- [src/modules/lab_v2/services/deviceService.ts](c:\Users\abdal\Downloads\QMS\src\modules\lab_v2\services\deviceService.ts)
- [src/modules/lab_v2/services/runPrintSettingsService.ts](c:\Users\abdal\Downloads\QMS\src\modules\lab_v2\services\runPrintSettingsService.ts)

Read tools:

- `list_lab_v2_tests`
- `get_lab_v2_test_structure`
- `list_lab_v2_runs`
- `get_lab_v2_run_details`
- `list_lab_v2_chemicals`
- `list_lab_v2_devices`
- `get_lab_v2_print_settings`

Action tools:

- `create_lab_v2_test`
- `update_lab_v2_test`
- `create_lab_v2_run`
- `record_lab_v2_measurement`
- `update_lab_v2_print_settings`

Notes:

- lab v2 is a strong candidate for assistant-led execution because service boundaries are already explicit

## Pallet, Production, Loading

Relevant sources:

- [src/services/palletService.ts](c:\Users\abdal\Downloads\QMS\src\services\palletService.ts)
- [src/services/palletBatchService.ts](c:\Users\abdal\Downloads\QMS\src\services\palletBatchService.ts)
- [src/services/palletConfigService.ts](c:\Users\abdal\Downloads\QMS\src\services\palletConfigService.ts)
- [src/services/loadingService.ts](c:\Users\abdal\Downloads\QMS\src\services\loadingService.ts)
- [src/services/productionService.ts](c:\Users\abdal\Downloads\QMS\src\services\productionService.ts)
- [src/services/holdService.ts](c:\Users\abdal\Downloads\QMS\src\services\holdService.ts)

Read tools:

- `list_active_batches`
- `get_batch_details`
- `list_pallets_by_batch`
- `get_pallet_details`
- `list_active_holds`
- `get_loading_operations`

Action tools:

- `create_production_batch`
- `create_loading_operation`
- `update_pallet_status`
- `create_hold`
- `release_hold`

Notes:

- pallet and hold changes affect operations and should require stronger validation

## Products, Materials, Suppliers, Recipes

Relevant sources:

- [src/services/productService.ts](c:\Users\abdal\Downloads\QMS\src\services\productService.ts)
- [src/services/masterDataService.ts](c:\Users\abdal\Downloads\QMS\src\services\masterDataService.ts)
- [src/services/materialSupplierService.ts](c:\Users\abdal\Downloads\QMS\src\services\materialSupplierService.ts)
- [src/services/recipeService.ts](c:\Users\abdal\Downloads\QMS\src\services\recipeService.ts)
- [src/services/recipeVersionService.ts](c:\Users\abdal\Downloads\QMS\src\services\recipeVersionService.ts)

Read tools:

- `find_supplier_by_name`
- `find_material_by_name`
- `list_approved_suppliers_for_material`
- `get_recipe_details`
- `get_recipe_versions`
- `list_products`

Action tools:

- `create_supplier_draft`
- `update_material_supplier_link`
- `create_recipe_version`
- `restore_recipe_version`

Notes:

- synonym resolution is critical here because users ask in Arabic while records may be stored differently

## Notifications And Audit

Relevant sources:

- [src/services/notificationService.ts](c:\Users\abdal\Downloads\QMS\src\services\notificationService.ts)
- [src/services/auditService.ts](c:\Users\abdal\Downloads\QMS\src\services\auditService.ts)

Read tools:

- `list_my_notifications`
- `get_unread_notification_count`
- `get_entity_audit_history`
- `get_recent_audit_events`

Action tools:

- `mark_notification_read`
- `create_notification`

Notes:

- audit visibility should remain restricted by permission and business need

## Cross-Cutting Support Tools

These tools support almost every module.

Read tools:

- `resolve_business_term`
- `get_current_company_context`
- `search_by_keyword_across_safe_catalog`
- `lookup_user_by_display_name`

Action tools:

- `open_related_page_context`
- `create_followup_task_from_context`

## Tool Design Rules

Every tool must:

- be scoped by current company
- validate input schema
- enforce permissions before data access
- return deterministic structured output
- avoid leaking hidden fields
- log audit metadata for write actions

## Initial Build Order

Build these first:

1. `get_latest_material_receiving`
2. `find_approved_suppliers_by_material`
3. `list_my_open_tasks`
4. `get_ncr_details`
5. `search_documents`
6. `get_lab_v2_run_details`
7. `create_task`
8. `update_task_status`
9. `create_ncr`
10. `create_material_receiving_draft`

This gives the assistant immediate real business value without exposing the highest-risk write paths too early.
