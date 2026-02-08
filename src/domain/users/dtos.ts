/**
 * User Domain DTOs
 */

// ============ Input DTOs ============

export interface CreateUserInput {
    name: string;
    email: string;
    department?: string;
    title?: string;
    role: 'admin' | 'manager' | 'employee' | 'viewer';
}

export interface UpdateUserInput {
    name?: string;
    email?: string;
    department?: string;
    title?: string;
    role?: 'admin' | 'manager' | 'employee' | 'viewer';
}

// ============ Output DTOs ============

export interface UserSummaryDto {
    id: string;
    name: string;
    email: string;
    department?: string;
    role: string;
    isActive: boolean;
}

export interface UserDetailDto extends UserSummaryDto {
    title?: string;
    permissions: string[];
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
}

export interface UserStatsDto {
    total: number;
    active: number;
    inactive: number;
    byDepartment: Record<string, number>;
    byRole: Record<string, number>;
}

// ============ Mappers ============

export function getDisplayName(user: UserSummaryDto): string {
    return user.name || user.email;
}

export function getUserInitials(name: string): string {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
