import { useEffect } from 'react';
import { ACTIONS } from '../lib/constants';
import type { PickedElement } from '../lib/types';
import { useElementStore } from '../stores/element-store';

export function useElementPicker() {
    const { isPicking, setPickedElement, setIsPicking, loadFromStorage } = useElementStore();

    useEffect(() => {
        loadFromStorage();
    }, [loadFromStorage]);

    useEffect(() => {
        const listener = (message: { action: string; payload?: PickedElement }) => {
            if (message.action === ACTIONS.ELEMENT_PICKED && message.payload) {
                const element = message.payload;
                setPickedElement(element);
                chrome.runtime
                    .sendMessage({
                        action: ACTIONS.CAPTURE_SCREENSHOT,
                        payload: { boundingRect: element.boundingRect },
                    })
                    .then((result) => {
                        if (result?.screenshot) {
                            setPickedElement({ ...element, screenshot: result.screenshot });
                        }
                    })
                    .catch(() => {
                        // Screenshot capture may fail (e.g. chrome:// pages) — continue without it
                    });
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, [setPickedElement]);

    const handlePickElement = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        if (isPicking) {
            await chrome.tabs.sendMessage(tab.id, { action: ACTIONS.STOP_PICKING });
            setIsPicking(false);
        } else {
            await chrome.tabs.sendMessage(tab.id, { action: ACTIONS.START_PICKING });
            setIsPicking(true);
        }
    };

    return { handlePickElement };
}
