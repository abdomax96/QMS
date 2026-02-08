// ==================== Roles Index ====================
// Central export for all role definitions organized by category

import type { Role, RoleCategory } from '../../../types/rbac';

// Import role categories
import { EXECUTIVE_ROLES } from './executive';
import { QUALITY_ROLES } from './quality';
import { LABORATORY_ROLES } from './laboratory';
import { SUPPORT_ROLES } from './support';

// Re-export helpers
export {
    createFullPermissionMatrix,
    grantPermissions,
    grantAllPermissions,
    createBaseRole
} from './helpers';

// Re-export role categories for individual access
export { EXECUTIVE_ROLES } from './executive';
export { QUALITY_ROLES } from './quality';
export { LABORATORY_ROLES } from './laboratory';
export { SUPPORT_ROLES } from './support';

// ==================== Combined Default System Roles ====================
export const DEFAULT_SYSTEM_ROLES: Role[] = [
    ...EXECUTIVE_ROLES,
    ...QUALITY_ROLES,
    ...LABORATORY_ROLES,
    ...SUPPORT_ROLES,
];

// ==================== Role Category Colors ====================
export const ROLE_CATEGORY_COLORS: Record<RoleCategory, string> = {
    executive: '#1E40AF',
    quality: '#047857',
    production: '#B45309',
    maintenance: '#7C3AED',
    supply_chain: '#0E7490',
    laboratory: '#BE185D',
    support: '#6B7280',
    special: '#DC2626',
};

// ==================== Role Category Labels ====================
export const ROLE_CATEGORY_LABELS: Record<RoleCategory, { en: string; ar: string }> = {
    executive: { en: 'Executive & Management', ar: 'الإدارة التنفيذية' },
    quality: { en: 'Quality Assurance', ar: 'ضمان الجودة' },
    production: { en: 'Production / Manufacturing', ar: 'الإنتاج / التصنيع' },
    maintenance: { en: 'Maintenance & Engineering', ar: 'الصيانة والهندسة' },
    supply_chain: { en: 'Supply Chain & Logistics', ar: 'سلسلة التوريد واللوجستيات' },
    laboratory: { en: 'Laboratory & Testing', ar: 'المختبر والفحص' },
    support: { en: 'Support & Administrative', ar: 'الدعم والإدارة' },
    special: { en: 'Special Access', ar: 'الوصول الخاص' },
};

// ==================== Role Statistics ====================
export const ROLE_STATS = {
    total: DEFAULT_SYSTEM_ROLES.length,
    systemRoles: DEFAULT_SYSTEM_ROLES.filter(r => r.is_system).length,
    lockedRoles: DEFAULT_SYSTEM_ROLES.filter(r => r.is_locked).length,
    activeRoles: DEFAULT_SYSTEM_ROLES.filter(r => r.is_active).length,
    byCategory: {
        executive: EXECUTIVE_ROLES.length,
        quality: QUALITY_ROLES.length,
        laboratory: LABORATORY_ROLES.length,
        support: SUPPORT_ROLES.length,
    },
};
