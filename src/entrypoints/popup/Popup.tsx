export function Popup() {
    const openSidePanel = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            await chrome.sidePanel.open({ tabId: tab.id });
            window.close();
        }
    };

    return (
        <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '16px' }}>TestCraft</h2>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#666' }}>
                Open the side panel to get started.
            </p>
            <button
                onClick={openSidePanel}
                style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    background: '#4f46e5',
                    color: 'white',
                }}
            >
                Open Side Panel
            </button>
        </div>
    );
}
