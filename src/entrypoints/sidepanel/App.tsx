import { useCallback, useState } from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { TabBar } from '../../components/TabBar';
import { IdeasTab } from '../../components/IdeasTab';
import { CodeTab } from '../../components/CodeTab';
import { AccessibilityTab } from '../../components/AccessibilityTab';
import { SettingsTab } from '../../components/SettingsTab';
import type { PickedElement } from '../../lib/types';

export type Tab = 'ideas' | 'code' | 'accessibility' | 'settings';

export function App() {
    const [activeTab, setActiveTab] = useState<Tab>('ideas');
    const [pendingAutomation, setPendingAutomation] = useState<{
        ideas: string[];
        element: PickedElement;
    } | null>(null);

    const handleAutomateSelected = useCallback((ideas: string[], element: PickedElement) => {
        setPendingAutomation({ ideas, element });
        setActiveTab('code');
    }, []);

    const handleClearPending = useCallback(() => {
        setPendingAutomation(null);
    }, []);

    return (
        <ErrorBoundary>
            <div className="flex h-screen flex-col bg-white text-gray-900">
                <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
                <main className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'ideas' && <IdeasTab onAutomateSelected={handleAutomateSelected} />}
                    {activeTab === 'code' && (
                        <CodeTab
                            pendingAutomation={pendingAutomation}
                            onClearPending={handleClearPending}
                        />
                    )}
                    {activeTab === 'accessibility' && <AccessibilityTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </main>
            </div>
        </ErrorBoundary>
    );
}
