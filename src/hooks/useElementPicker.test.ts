import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useElementPicker } from './useElementPicker';
import { useElementStore } from '../stores/element-store';

describe('useElementPicker', () => {
    beforeEach(() => {
        useElementStore.setState({ pickedElement: null, isPicking: false });
        vi.clearAllMocks();
    });

    it('sends start-picking message when handlePickElement is called', async () => {
        const { result } = renderHook(() => useElementPicker());

        await act(async () => {
            await result.current.handlePickElement();
        });

        expect(chrome.tabs.query).toHaveBeenCalled();
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'start-picking' });
    });

    it('sends stop-picking message when picking is active', async () => {
        useElementStore.setState({ isPicking: true });
        const { result } = renderHook(() => useElementPicker());

        await act(async () => {
            await result.current.handlePickElement();
        });

        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'stop-picking' });
    });

    it('sets isPicking to true after starting', async () => {
        const { result } = renderHook(() => useElementPicker());

        await act(async () => {
            await result.current.handlePickElement();
        });

        expect(useElementStore.getState().isPicking).toBe(true);
    });

    it('sets isPicking to false after stopping', async () => {
        useElementStore.setState({ isPicking: true });
        const { result } = renderHook(() => useElementPicker());

        await act(async () => {
            await result.current.handlePickElement();
        });

        expect(useElementStore.getState().isPicking).toBe(false);
    });
});
