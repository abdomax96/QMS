/**
 * User Domain Repository Interface
 */

import type {
    CreateUserInput,
    UpdateUserInput,
    UserSummaryDto,
    UserDetailDto,
    UserStatsDto
} from './dtos';

export interface IUserRepository {
    // ============ Query Operations ============

    /**
     * Find user by ID
     */
    findById(id: string): Promise<UserDetailDto | null>;

    /**
     * Find user by email
     */
    findByEmail(email: string): Promise<UserDetailDto | null>;

    /**
     * Get all active users
     */
    findActive(): Promise<UserSummaryDto[]>;

    /**
     * Get users by department
     */
    findByDepartment(department: string): Promise<UserSummaryDto[]>;

    /**
     * Get users by role
     */
    findByRole(role: string): Promise<UserSummaryDto[]>;

    /**
     * Get user statistics
     */
    getStats(): Promise<UserStatsDto>;

    /**
     * Search users by name or email
     */
    search(query: string): Promise<UserSummaryDto[]>;

    // ============ Command Operations ============

    /**
     * Create new user
     */
    create(input: CreateUserInput): Promise<UserDetailDto>;

    /**
     * Update user
     */
    update(id: string, input: UpdateUserInput): Promise<UserDetailDto>;

    /**
     * Deactivate user (soft delete)
     */
    deactivate(id: string): Promise<void>;

    /**
     * Reactivate user
     */
    reactivate(id: string): Promise<UserDetailDto>;

    /**
     * Update last login
     */
    updateLastLogin(id: string): Promise<void>;

    /**
     * Check if user has permission
     */
    hasPermission(userId: string, permission: string): Promise<boolean>;

    // ============ Real-time ============

    /**
     * Subscribe to user list
     */
    subscribe?(callback: (users: UserSummaryDto[]) => void): () => void;
}
