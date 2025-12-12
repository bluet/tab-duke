/**
 * TabManager - Core service for tab operations
 *
 * Extracted from popup.js (lines 538-662) following the TODO.md plan
 * Centralizes all Chrome tab API operations with proper error handling
 * and provides a clean service interface for tab management operations.
 *
 * Key responsibilities:
 * - Tab switching (same window vs different window)
 * - Tab closing with proper error handling
 * - Tab querying (current window vs all tabs)
 * - DOM list item removal coordination
 *
 * Benefits:
 * - Single source of truth for tab operations
 * - Consistent error handling across all tab operations
 * - Reusable by other parts of the extension (options.js, background.js)
 * - Easy to test and mock for unit tests
 */
class TabManager {
	/**
	 * Switch to a specific tab, handling same-window vs cross-window cases
	 * @param {number} tabID - Tab ID to switch to
	 * @param {number} windowID - Window ID containing the tab
	 * @returns {Promise<boolean>} - True if successful, false if failed
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
	 * Close a specific tab
	 * @param {number} tabID - Tab ID to close
	 * @returns {Promise<boolean>} - True if successful, false if failed
	 */
	async closeTab(tabID) {
		if (!tabID) {
			console.error('TabManager.closeTab: Missing tabID');
			return false;
		}

		return new Promise((resolve) => {
			chrome.tabs.remove(tabID, () => {
				if (chrome.runtime.lastError) {
					console.error('TabManager.closeTab: Failed to close tab:', chrome.runtime.lastError.message);
					resolve(false);
				} else {
					resolve(true);
				}
			});
		});
	}

	/**
	 * Close multiple tabs
	 * @param {number[]} tabIDs - Array of tab IDs to close
	 * @returns {Promise<{success: number[], failed: number[]}>} - Results summary
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
	 * Get tabs in the current window
	 * @returns {Promise<chrome.tabs.Tab[]>} - Array of tabs in current window
	 */
	async getCurrentWindowTabs() {
		return new Promise((resolve) => {
			chrome.tabs.query({ "currentWindow": true }, (tabs) => {
				if (chrome.runtime.lastError) {
					console.error('TabManager.getCurrentWindowTabs: Failed to get current window tabs:', chrome.runtime.lastError.message);
					resolve([]); // Return empty array on error
					return;
				}
				resolve(tabs || []);
			});
		});
	}

	/**
	 * Get all tabs across all windows
	 * @returns {Promise<chrome.tabs.Tab[]>} - Array of all tabs
	 */
	async getAllTabs() {
		return new Promise((resolve) => {
			chrome.tabs.query({}, (tabs) => {
				if (chrome.runtime.lastError) {
					console.error('TabManager.getAllTabs: Failed to get all tabs:', chrome.runtime.lastError.message);
					resolve([]); // Return empty array on error
					return;
				}
				resolve(tabs || []);
			});
		});
	}

	/**
	 * Remove tab items from DOM lists (both current and all windows views)
	 * @param {number} tabID - Tab ID to remove from lists
	 */
	removeFromLists(tabID) {
		if (!tabID) {
			console.error('TabManager.removeFromLists: Missing tabID');
			return;
		}

		const currentWindowContent = document.getElementById("currentWindow");
		const allWindowContent = document.getElementById("allWindow");

		if (currentWindowContent) {
			const currentWindowItems = currentWindowContent.querySelectorAll(".list-item");
			currentWindowItems.forEach((item) => {
				if (item.tabid === tabID) {
					item.remove();
				}
			});
		}

		if (allWindowContent) {
			const allWindowItems = allWindowContent.querySelectorAll(".list-item");
			allWindowItems.forEach((item) => {
				if (item.tabid === tabID) {
					item.remove();
				}
			});
		}
	}

	/**
	 * Get currently active tab
	 * @returns {Promise<chrome.tabs.Tab|null>} - Active tab or null if not found
	 */
	async getActiveTab() {
		try {
			const currentWindow = await this.getCurrentWindow();
			if (!currentWindow) return null;

			return new Promise((resolve) => {
				chrome.tabs.query({ "active": true, "windowId": currentWindow.id }, (tabs) => {
					if (chrome.runtime.lastError) {
						console.error('TabManager.getActiveTab: Failed to get active tab:', chrome.runtime.lastError.message);
						resolve(null);
						return;
					}
					resolve(tabs && tabs.length > 0 ? tabs[0] : null);
				});
			});
		} catch (error) {
			console.error('TabManager.getActiveTab: Unexpected error:', error.message);
			return null;
		}
	}

	// Private helper methods

	/**
	 * Get the current window
	 * @private
	 * @returns {Promise<chrome.windows.Window|null>} - Current window or null if failed
	 */
	async getCurrentWindow() {
		return new Promise((resolve) => {
			chrome.windows.getCurrent((currentWindow) => {
				if (chrome.runtime.lastError) {
					console.error('TabManager.getCurrentWindow: Failed to get current window:', chrome.runtime.lastError.message);
					resolve(null);
					return;
				}
				resolve(currentWindow);
			});
		});
	}

	/**
	 * Activate a specific tab
	 * @private
	 * @param {number} tabID - Tab ID to activate
	 * @returns {Promise<boolean>} - True if successful
	 */
	async activateTab(tabID) {
		return new Promise((resolve) => {
			chrome.tabs.update(tabID, { "active": true }, () => {
				if (chrome.runtime.lastError) {
					console.error('TabManager.activateTab: Failed to switch to tab:', chrome.runtime.lastError.message);
					resolve(false);
				} else {
					resolve(true);
				}
			});
		});
	}

	/**
	 * Focus a specific window
	 * @private
	 * @param {number} windowID - Window ID to focus
	 * @returns {Promise<boolean>} - True if successful
	 */
	async focusWindow(windowID) {
		return new Promise((resolve) => {
			chrome.windows.update(windowID, { "focused": true }, () => {
				if (chrome.runtime.lastError) {
					console.error('TabManager.focusWindow: Failed to focus window:', chrome.runtime.lastError.message);
					resolve(false);
				} else {
					resolve(true);
				}
			});
		});
	}
}

export default TabManager;