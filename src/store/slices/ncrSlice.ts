import type { StateCreator } from 'zustand';
import type { NcrRecord } from '../../types/ncr';

export interface NcrState {
    // NCR Data
    ncrs: NcrRecord[];
    selectedNcrId: string | null;
    isLoadingNcrs: boolean;
    ncrError: string | null;

    // NCR Filters
    ncrFilters: {
        department: string;
        status: 'open' | 'closed' | '';
        severity: string;
        search: string;
        dateFrom: string;
        dateTo: string;
    };

    // NCR Settings
    ncrSettings: {
        departments: string[];
        defectTypes: string[];
        users: Array<{ id: string; name: string }>;
    };
}

export interface NcrActions {
    // NCR CRUD
    setNcrs: (ncrs: NcrRecord[]) => void;
    addNcr: (ncr: NcrRecord) => void;
    updateNcr: (id: string, updates: Partial<NcrRecord>) => void;
    deleteNcr: (id: string) => void;
    selectNcr: (id: string | null) => void;

    // NCR Loading State
    setNcrLoading: (loading: boolean) => void;
    setNcrError: (error: string | null) => void;

    // NCR Filters
    setNcrFilter: (key: keyof NcrState['ncrFilters'], value: string) => void;
    clearNcrFilters: () => void;

    // NCR Settings
    setNcrSettings: (settings: Partial<NcrState['ncrSettings']>) => void;

    // Computed
    getFilteredNcrs: () => NcrRecord[];
    getNcrById: (id: string) => NcrRecord | undefined;
    getNcrStats: () => {
        total: number;
        open: number;
        closed: number;
        high: number;
    };
}

export type NcrSlice = NcrState & NcrActions;

const initialNcrFilters: NcrState['ncrFilters'] = {
    department: '',
    status: '',
    severity: '',
    search: '',
    dateFrom: '',
    dateTo: ''
};

export const createNcrSlice: StateCreator<NcrSlice, [], [], NcrSlice> = (set, get) => ({
    // Initial State
    ncrs: [],
    selectedNcrId: null,
    isLoadingNcrs: false,
    ncrError: null,
    ncrFilters: initialNcrFilters,
    ncrSettings: {
        departments: [],
        defectTypes: [],
        users: []
    },

    // Actions
    setNcrs: (ncrs) => set({ ncrs }),

    addNcr: (ncr) => set((state) => ({
        ncrs: [ncr, ...state.ncrs]
    })),

    updateNcr: (id, updates) => set((state) => ({
        ncrs: state.ncrs.map((ncr) =>
            ncr.id === id ? { ...ncr, ...updates, updatedAt: new Date().toISOString() } : ncr
        )
    })),

    deleteNcr: (id) => set((state) => ({
        ncrs: state.ncrs.filter((ncr) => ncr.id !== id),
        selectedNcrId: state.selectedNcrId === id ? null : state.selectedNcrId
    })),

    selectNcr: (id) => set({ selectedNcrId: id }),

    setNcrLoading: (loading) => set({ isLoadingNcrs: loading }),

    setNcrError: (error) => set({ ncrError: error }),

    setNcrFilter: (key, value) => set((state) => ({
        ncrFilters: { ...state.ncrFilters, [key]: value }
    })),

    clearNcrFilters: () => set({ ncrFilters: initialNcrFilters }),

    setNcrSettings: (settings) => set((state) => ({
        ncrSettings: { ...state.ncrSettings, ...settings }
    })),

    // Computed
    getFilteredNcrs: () => {
        const { ncrs, ncrFilters } = get();
        return ncrs.filter((ncr) => {
            if (ncrFilters.department && ncr.department !== ncrFilters.department) return false;
            if (ncrFilters.status === 'open' && ncr.closedAt) return false;
            if (ncrFilters.status === 'closed' && !ncr.closedAt) return false;
            if (ncrFilters.severity && ncr.severity !== ncrFilters.severity) return false;
            if (ncrFilters.search) {
                const term = ncrFilters.search.toLowerCase();
                const haystack = `${ncr.number} ${ncr.description} ${ncr.department}`.toLowerCase();
                if (!haystack.includes(term)) return false;
            }
            if (ncrFilters.dateFrom && ncr.date < ncrFilters.dateFrom) return false;
            if (ncrFilters.dateTo && ncr.date > ncrFilters.dateTo) return false;
            return true;
        });
    },

    getNcrById: (id) => {
        return get().ncrs.find((ncr) => ncr.id === id);
    },

    getNcrStats: () => {
        const { ncrs } = get();
        return {
            total: ncrs.length,
            open: ncrs.filter((n) => !n.closedAt).length,
            closed: ncrs.filter((n) => !!n.closedAt).length,
            high: ncrs.filter((n) => n.severity === 'high' && !n.closedAt).length
        };
    }
});
