import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Blocks navigation when `when` is true.
 * Shows a confirmation dialog.
 */
export function usePrompt(message: string, when: boolean) {
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            when && currentLocation.pathname !== nextLocation.pathname
    );
    const confirmOpen = useRef(false);

    useEffect(() => {
        if (blocker.state === 'blocked' && !confirmOpen.current) {
            confirmOpen.current = true;
            // Wrap in setTimeout to ensure state is settled before alert
            const timer = setTimeout(() => {
                if (window.confirm(message)) {
                    blocker.proceed();
                } else {
                    blocker.reset();
                }
                confirmOpen.current = false;
            }, 50);

            return () => {
                clearTimeout(timer);
                confirmOpen.current = false;
            };
        }
    }, [blocker, message]);
}
