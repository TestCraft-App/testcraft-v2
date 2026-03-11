import { ACTIONS } from '../lib/constants';
import { mapAxeViolations } from '../lib/accessibility';
import { useAccessibilityStore } from '../stores/accessibility-store';
import { AccessibilityResult } from './AccessibilityResult';
import { ContextInput } from './ContextInput';

export function AccessibilityTab() {
    const { violations, isScanning, error, setViolations, setScanning, setError } = useAccessibilityStore();

    const handleRunCheck = async () => {
        setScanning(true);
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                setError('No active tab found.');
                return;
            }

            const axeResults = await chrome.tabs.sendMessage(tab.id, {
                action: ACTIONS.RUN_AXE,
            });

            if (axeResults?.violations) {
                setViolations(mapAxeViolations(axeResults.violations));
            } else {
                setViolations([]);
            }
        } catch {
            setError('Failed to run accessibility check. Make sure you are on a web page.');
        } finally {
            setScanning(false);
        }
    };

    return (
        <div className="space-y-4">
            <button
                onClick={handleRunCheck}
                disabled={isScanning}
                className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isScanning
                        ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                }`}
            >
                {isScanning ? 'Scanning...' : 'Run Accessibility Check'}
            </button>

            <ContextInput tabKey="a11y" />

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                    <p className="font-medium">Error</p>
                    <p>{error}</p>
                </div>
            )}

            {!error && violations.length > 0 && <AccessibilityResult violations={violations} />}

            {!error && !isScanning && violations.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click the button above to scan the current page for WCAG accessibility violations.
                </p>
            )}
        </div>
    );
}
