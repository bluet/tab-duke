/**
 * Core service for Chrome tab operations with comprehensive error handling.
 * Optimized for extreme tab usage (1300+ tabs across 30+ windows).
 */

import ChromeAPI from '../utils/ChromeAPI.js';

/**
 * @example
 * // Basic usage with error handling
 * const tabManager = new TabManager();
 * try {
 *   const success = await tabManager.switchToTab(123, 456);
 *   if (success) console.log('Tab switched successfully');
 * } catch (error) {
 *   console.error('Tab operation failed:', error);
 * }
 *
 * @example
 * // Bulk operations with results tracking
 * const results = await tabManager.closeTabs([123, 456, 789]);
 * console.log(`Closed ${results.totalClosed} tabs, ${results.totalFailed} failed`);
 */

/**
 * TabManager class - Core service for Chrome tab operations
 *
 * Extracted from popup.js following service-oriented architecture principles.
 * Provides a clean, testable interface for all tab management operations.
 *
 * @class TabManager
 * @since 0.1.0
 *
 * @example
 * const tabManager = new TabManager();
 * await tabManager.switchToTab(tabId, windowId);
 */
class TabManager {
	/**
	 * Switches to a specific tab with smart window management.
	 * Handles same-window (direct) vs cross-window (focus first) cases automatically.
	 * @param {number} tabID - Tab ID to switch to
	 * @param {number} windowID - Window ID containing the tab
	 * @returns {Promise<boolean>} True if successful, false on error
	 */
	async switchToTab(tabID, windowID) {
		if (!tabID || !windowID) {
			console.error('TabManager.switchToTab: Missing tabID or windowID');
			return false;
		}

		try {
			// Check if target window is current window
			const currentWindow = await this.getCurrentWindow();
			if (!currentWindow) {
				return false; // Error already logged
			}

			const isCurrentWindow = windowID === currentWindow.id;

			if (isCurrentWindow) {
				// Current window - skip window focus, go directly to tab switch
				// (avoids popup closing before tab switch completes)
				return await this.activateTab(tabID);
			} else {
				// Other window - need to focus window first, then switch tab
				const windowFocused = await this.focusWindow(windowID);
				if (windowFocused) {
					return await this.activateTab(tabID);
				}
				return false;
			}
		} catch (error) {
			console.error('TabManager.switchToTab: Unexpected error:', error.message);
			return false;
		}
	}

	/**
	 * Close a specific tab using Chrome tabs API
	 *
	 * Safely closes a tab with proper error handling. The operation is asynchronous
	 * and will resolve to indicate success or failure.
	 *
	 * @param {number} tabID - Tab ID to close
	 * @returns {Promise<boolean>} True if tab was closed successfully, false otherwise
	 * @throws {Error} Returns false and logs error on failure
	 * @since 0.1.0
	 *
	 * @example
	 * const success = await tabManager.closeTab(123);
	 * if (success) {
	 *   console.log('Tab closed successfully');
	 *   // Update UI, remove from lists, etc.
	 * }
	 */
	async closeTab(tabID) {
		if (!tabID) {
			console.error('TabManager.closeTab: Missing tabID');
			return false;
		}

		return await ChromeAPI.removeTabs(tabID);
	}

	/**
	 * Closes multiple tabs in parallel for better performance.
	 * Processes multiple tab closures concurrently, useful for bulk operations.
	 * @param {number[]} tabIDs - Array of tab IDs to close
	 * @returns {Promise<{success: number[], failed: number[]}>} Results with success/failure arrays
	 */
	async closeTabs(tabIDs) {
		if (!Array.isArray(tabIDs) || tabIDs.length === 0) {
			console.error('TabManager.closeTabs: Invalid tabIDs array');
			return { success: [], failed: [] };
		}

		const results = { success: [], failed: [] };

		// Process tabs in parallel for better performance
		const promises = tabIDs.map(async (tabID) => {
			const success = await this.closeTab(tabID);
			if (success) {
				results.success.push(tabID);
			} else {
				results.failed.push(tabID);
			}
		});

		await Promise.all(promises);
		return results;
	}

	/**
	 * Gets all tabs in the current window for "Current Window" view.
	 * @returns {Promise<chrome.tabs.Tab[]>} Array of tab objects in current window
	 */
	async getCurrentWindowTabs() {
		return await ChromeAPI.queryTabs({ "currentWindow": true });
	}

	/**
	 * Gets all tabs across all windows for "All Windows" view and global operations.
	 * @returns {Promise<chrome.tabs.Tab[]>} Array of all tab objects, empty array on error
	 */
	async getAllTabs() {
		return await ChromeAPI.queryTabs({});
	}


	/**
	 * Gets the currently active tab in the current window.
	 * @returns {Promise<chrome.tabs.Tab|null>} Active tab object or null if not found
	 */
	async getActiveTab() {
		try {
			const currentWindow = await this.getCurrentWindow();
			if (!currentWindow) return null;

			const tabs = await ChromeAPI.queryTabs({ "active": true, "windowId": currentWindow.id });
			return tabs && tabs.length > 0 ? tabs[0] : null;
		} catch (error) {
			console.error('TabManager.getActiveTab: Unexpected error:', error.message);
			return null;
		}
	}

	// Private helper methods

	/**
	 * Gets the current window object from Chrome API.
	 * @private
	 * @returns {Promise<chrome.windows.Window|null>} Current window or null if failed
	 */
	async getCurrentWindow() {
		return await ChromeAPI.getCurrentWindow();
	}

	/**
	 * Activates a specific tab using Chrome tabs.update API.
	 * @private
	 * @param {number} tabID - Tab ID to activate
	 * @returns {Promise<boolean>} True if successful
	 */
	async activateTab(tabID) {
		const result = await ChromeAPI.updateTab(tabID, { "active": true });
		return result !== null;
	}

	/**
	 * Focuses a specific window using Chrome windows.update API.
	 * @private
	 * @param {number} windowID - Window ID to focus
	 * @returns {Promise<boolean>} True if successful
	 */
	async focusWindow(windowID) {
		return await ChromeAPI.focusWindow(windowID);
	}
}

export default TabManager;