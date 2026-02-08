import { cn } from '../../../utils';

// Helper function to generate time headers based on inspection interval
export const generateTimeHeaders = (startTime: string, durationHours: number, intervalMinutes: number): string[] => {
    const headers: string[] = [];

    // Validate inputs
    if (!startTime || typeof startTime !== 'string' || !startTime.includes(':')) {
        console.warn('⚠️ Invalid startTime for generateTimeHeaders:', startTime, 'Using default 08:00');
        startTime = '08:00';
    }
    if (!durationHours || durationHours <= 0) {
        console.warn('⚠️ Invalid durationHours:', durationHours, 'Using default 8');
        durationHours = 8;
    }
    if (!intervalMinutes || intervalMinutes <= 0) {
        console.warn('⚠️ Invalid intervalMinutes:', intervalMinutes, 'Using default 30');
        intervalMinutes = 30;
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const totalMinutes = durationHours * 60;
    const columnsCount = Math.floor(totalMinutes / intervalMinutes);

    for (let i = 0; i < columnsCount; i++) {
        const minutesFromStart = i * intervalMinutes;
        const totalMins = startHour * 60 + startMinute + minutesFromStart;
        const hour = Math.floor(totalMins / 60) % 24;
        const minute = totalMins % 60;
        headers.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }

    return headers;
};

// Get base class for cell inputs
export const getCellBaseClass = (isSelected: boolean, className: string = '') => {
    return cn(
        'w-full h-full px-3 py-2 text-center text-sm border-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200',
        'dark:bg-gray-800 dark:text-white min-h-[40px]',
        isSelected && 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100',
        className
    );
};
