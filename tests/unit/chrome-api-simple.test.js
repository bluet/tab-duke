/**
 * Chrome API Working Test Suite - Verified patterns for TabDuke testing
 */

describe('Chrome API Working Patterns', () => {
    beforeEach(() => {
        // Simple reset without calling global.resetChromeMocks()
        chrome.runtime.lastError = null;
    });

    test('tabs.query promise pattern (background.js style)', async () => {
        const tabs = await chrome.tabs.query({ currentWindow: true });

        expect(tabs).toBeDefined();
        expect(Array.isArray(tabs)).toBe(true);
        expect(tabs.length).toBeGreaterThan(0);
        expect(tabs[0]).toHaveProperty('id');
    });

    test('storage.local.get promise pattern (background.js style)', async () => {
        const result = await chrome.storage.local.get(['testKey']);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
    });

    test('windows.getCurrent promise pattern', async () => {
        const window = await chrome.windows.getCurrent();

        expect(window).toBeDefined();
        expect(window).toHaveProperty('id');
    });

    test('action.setBadgeText promise pattern (background.js style)', async () => {
        // This should complete without throwing
        await chrome.action.setBadgeText({ text: '5' });

        expect(true).toBe(true); // If we get here, no error was thrown
    });

    test('error handling with chrome.runtime.lastError', async () => {
        // Set error condition
        chrome.runtime.lastError = { message: 'Test error' };

        try {
            await chrome.tabs.query({ currentWindow: true });
            fail('Should have thrown an error');
        } catch (error) {
            expect(error.message).toContain('Test error');
        }

        // Clean up
        chrome.runtime.lastError = null;
    });

    test('background.js workflow simulation', async () => {
        // Exact pattern from background.js lines 21-22
        const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });
        await chrome.action.setBadgeText({ text: String(currentWindowTabs.length) });

        expect(currentWindowTabs).toBeDefined();
        expect(currentWindowTabs.length).toBeGreaterThan(0);
    });
});