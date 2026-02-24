/**
 * Collaboration Telemetry Service
 * Minimal client-side telemetry for collaboration reliability diagnostics.
 */

export type CollaborationTelemetryLevel = 'info' | 'warn' | 'error';

export type CollaborationTelemetryEvent =
    | 'init_failed'
    | 'channel_error'
    | 'reconnect_scheduled'
    | 'reconnected'
    | 'broadcast_failed'
    | 'conflict_detected'
    | 'change_log_fetch_failed'
    | 'manual_reload_after_conflict'
    | 'manual_reconnect';

export interface CollaborationTelemetryEntry {
    id: string;
    at: string;
    level: CollaborationTelemetryLevel;
    event: CollaborationTelemetryEvent;
    message: string;
    instanceId?: string;
    userId?: string;
    details?: Record<string, any>;
}

const STORAGE_KEY = 'qms_collaboration_telemetry_v1';
const MAX_STORED_ENTRIES = 200;

class CollaborationTelemetryService {
    log(input: Omit<CollaborationTelemetryEntry, 'id' | 'at'>): void {
        const entry: CollaborationTelemetryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            at: new Date().toISOString(),
            ...input,
        };

        this.writeToConsole(entry);
        this.persist(entry);
    }

    getRecent(limit = 100): CollaborationTelemetryEntry[] {
        if (typeof window === 'undefined') {
            return [];
        }

        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return [];
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.slice(0, Math.max(1, limit));
        } catch (error) {
            console.warn('[CollabTelemetry] Failed reading local telemetry:', error);
            return [];
        }
    }

    clear(): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn('[CollabTelemetry] Failed clearing local telemetry:', error);
        }
    }

    private writeToConsole(entry: CollaborationTelemetryEntry): void {
        const payload = {
            event: entry.event,
            message: entry.message,
            instanceId: entry.instanceId,
            userId: entry.userId,
            details: entry.details,
            at: entry.at,
        };

        if (entry.level === 'error') {
            console.error('[CollabTelemetry]', payload);
            return;
        }

        if (entry.level === 'warn') {
            console.warn('[CollabTelemetry]', payload);
            return;
        }

        console.info('[CollabTelemetry]', payload);
    }

    private persist(entry: CollaborationTelemetryEntry): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const current = this.getRecent(MAX_STORED_ENTRIES);
            const next = [entry, ...current].slice(0, MAX_STORED_ENTRIES);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (error) {
            console.warn('[CollabTelemetry] Failed writing local telemetry:', error);
        }
    }
}

export const collaborationTelemetryService = new CollaborationTelemetryService();

export default collaborationTelemetryService;
