import type { Tab } from '../entrypoints/sidepanel/App';

const tabs: { id: Tab; label: string }[] = [
    { id: 'ideas', label: 'Ideas' },
    { id: 'code', label: 'Code' },
    { id: 'accessibility', label: 'A11y' },
    { id: 'settings', label: 'Settings' },
];

interface TabBarProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
    return (
        <nav className="flex border-b border-gray-200" role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                            ? 'border-b-2 border-indigo-600 text-indigo-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}
