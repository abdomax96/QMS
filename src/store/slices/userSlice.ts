import type { StateCreator } from 'zustand';

export interface AppUser {
    id: string;
    uid?: string;
    name: string;
    email: string;
    title?: string;
    department?: string;
    role: 'admin' | 'manager' | 'employee' | 'viewer';
    permissions?: string[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserState {
    // Users Data
    users: AppUser[];
    currentUser: AppUser | null;
    selectedUserId: string | null;
    isLoadingUsers: boolean;
    userError: string | null;

    // Auth State
    isAuthenticated: boolean;
    authLoading: boolean;
}

export interface UserActions {
    // User CRUD
    setUsers: (users: AppUser[]) => void;
    addUser: (user: AppUser) => void;
    updateUser: (id: string, updates: Partial<AppUser>) => void;
    deleteUser: (id: string) => void;
    selectUser: (id: string | null) => void;

    // Current User
    setCurrentUser: (user: AppUser | null) => void;

    // Loading State
    setUserLoading: (loading: boolean) => void;
    setUserError: (error: string | null) => void;

    // Auth
    setAuthenticated: (isAuth: boolean) => void;
    setAuthLoading: (loading: boolean) => void;

    // Computed
    getUserById: (id: string) => AppUser | undefined;
    getUsersByDepartment: (department: string) => AppUser[];
    getActiveUsers: () => AppUser[];
    hasPermission: (permission: string) => boolean;
}

export type UserSlice = UserState & UserActions;

export const createUserSlice: StateCreator<UserSlice, [], [], UserSlice> = (set, get) => ({
    // Initial State
    users: [],
    currentUser: null,
    selectedUserId: null,
    isLoadingUsers: false,
    userError: null,
    isAuthenticated: false,
    authLoading: true,

    // Actions
    setUsers: (users) => set({ users }),

    addUser: (user) => set((state) => ({
        users: [...state.users, user]
    })),

    updateUser: (id, updates) => set((state) => ({
        users: state.users.map((user) =>
            user.id === id ? { ...user, ...updates, updatedAt: new Date().toISOString() } : user
        )
    })),

    deleteUser: (id) => set((state) => ({
        users: state.users.filter((user) => user.id !== id),
        selectedUserId: state.selectedUserId === id ? null : state.selectedUserId
    })),

    selectUser: (id) => set({ selectedUserId: id }),

    setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),

    setUserLoading: (loading) => set({ isLoadingUsers: loading }),

    setUserError: (error) => set({ userError: error }),

    setAuthenticated: (isAuth) => set({ isAuthenticated: isAuth }),

    setAuthLoading: (loading) => set({ authLoading: loading }),

    // Computed
    getUserById: (id) => {
        return get().users.find((user) => user.id === id);
    },

    getUsersByDepartment: (department) => {
        return get().users.filter((user) => user.department === department);
    },

    getActiveUsers: () => {
        return get().users.filter((user) => user.isActive);
    },

    hasPermission: (permission) => {
        const currentUser = get().currentUser;
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        return currentUser.permissions?.includes(permission) || false;
    }
});
