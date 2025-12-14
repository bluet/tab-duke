/**
 * @fileoverview TabManager - Core service for Chrome tab operations
 * @description Centralizes all Chrome tab API operations with comprehensive error handling,
 * type safety, and production-ready reliability patterns. Extracted from popup.js following
 * service-oriented architecture principles for optimal maintainability.
 *
 * @author TabDuke Development Team
 * @since 0.1.0
 * @version 1.0.0
 * @chrome-extension Manifest V3 compatible with chrome.tabs and chrome.windows APIs
 * @requires chrome.tabs - Full Chrome tabs API access for tab operations
 * @requires chrome.windows - Chrome windows API for window management
 * @chrome-permissions tabs, activeTab - Required for tab access and manipulation
 * @performance Optimized for extreme tab usage (1300+ tabs across 30+ windows)
 * @error-handling Comprehensive Chrome API error handling with fallback strategies
 * @imports {ChromeTabExtended, ChromeWindowExtended, TabCloseResults, ChromeExtensionError} from '../types/TabDukeTypes.js'
 *
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
	 * Switch to a specific tab, handling same-window vs cross-window cases
	 *
	 * Intelligently switches to a tab by first determining if it's in the current
	 * window or a different window, then applying the appropriate switching strategy.
	 * For current window tabs, switches directly. For other window tabs, focuses
	 * the window first, then switches to the tab.
	 *
	 * @param {number} tabID - Tab ID to switch to
	 * @param {number} windowID - Window ID containing the tab
	 * @returns {Promise<boolean>} True if successful, false if failed
	 * @throws {Error} Returns false and logs error on failure
	 * @since 0.1.0
	 *
	 * @example
	 * // Switch to tab in current window
	 * const success = await tabManager.switchToTab(123, 456);
	 *
	 * @example
	 * // Switch to tab in different window
	 * const success = await tabManager.switchToTab(789, 101112);
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
	 * Close multiple tabs in parallel for better performance
	 *
	 * Processes multiple tab closures concurrently and returns detailed results.
	 * Useful for bulk operations like closing selected tabs.
	 *
	 * @param {number[]} tabIDs - Array of tab IDs to close
	 * @returns {Promise<TabCloseResults>} Results summary with success and failure arrays
	 * @throws {Error} Returns empty result object if input is invalid
	 * @since 0.1.0
	 *
	 * @typedef {Object} TabCloseResults
	 * @property {number[]} success - Array of successfully closed tab IDs
	 * @property {number[]} failed - Array of tab IDs that failed to close
	 *
	 * @example
	 * const results = await tabManager.closeTabs([123, 456, 789]);
	 * console.log(`Closed ${results.success.length} tabs successfully`);
	 * if (results.failed.length > 0) {
	 *   console.warn(`Failed to close ${results.failed.length} tabs`);
	 * }
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
	 * Get all tabs in the current window
	 *
	 * Queries Chrome API for tabs in the currently focused window only.
	 * Returns an empty array on error to ensure consistent return type.
	 *
	 * @returns {Promise<chrome.tabs.Tab[]>} Array of tab objects in current window
	 * @since 0.1.0
	 *
	 * @example
	 * const currentTabs = await tabManager.getCurrentWindowTabs();
	 * console.log(`Current window has ${currentTabs.length} tabs`);
	 * currentTabs.forEach(tab => {
	 *   console.log(`${tab.title}: ${tab.url}`);
	 * });
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
	 *
	 * Queries Chrome API for every tab in every window. Useful for the "All Windows"
	 * view and global tab operations. Returns empty array on error.
	 *
	 * @returns {Promise<chrome.tabs.Tab[]>} Array of all tab objects across all windows
	 * @since 0.1.0
	 *
	 * @example
	 * const allTabs = await tabManager.getAllTabs();
	 * console.log(`Total tabs across all windows: ${allTabs.length}`);
	 *
	 * // Group tabs by window
	 * const tabsByWindow = allTabs.reduce((acc, tab) => {
	 *   acc[tab.windowId] = acc[tab.windowId] || [];
	 *   acc[tab.windowId].push(tab);
	 *   return acc;
	 * }, {});
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
	 *
	 * Removes the corresponding DOM elements for a tab from both the current window
	 * and all windows tab lists. Used after successful tab closure.
	 *
	 * @param {number} tabID - Tab ID to remove from lists
	 * @throws {Error} Logs error if tabID is missing
	 * @since 0.1.0
	 *
	 * @example
	 * // After closing a tab
	 * await tabManager.closeTab(123);
	 * tabManager.removeFromLists(123); // Clean up DOM
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
	 * Get the currently active tab in the current window
	 *
	 * Finds the tab that is currently active (focused) in the current window.
	 * Returns null if no active tab is found or on error.
	 *
	 * @returns {Promise<chrome.tabs.Tab|null>} Active tab object or null if not found
	 * @since 0.1.0
	 *
	 * @example
	 * const activeTab = await tabManager.getActiveTab();
	 * if (activeTab) {
	 *   console.log(`Currently viewing: ${activeTab.title}`);
	 *   console.log(`URL: ${activeTab.url}`);
	 * }
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
	 * Get the current window object from Chrome API
	 *
	 * Internal helper method for getting the currently focused window.
	 * Used by other methods that need window context.
	 *
	 * @private
	 * @returns {Promise<chrome.windows.Window|null>} Current window object or null if failed
	 * @since 0.1.0
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
	 * Activate a specific tab using Chrome tabs.update API
	 *
	 * Internal helper method that sets a tab as active. Used by switchToTab
	 * after determining the appropriate switching strategy.
	 *
	 * @private
	 * @param {number} tabID - Tab ID to activate
	 * @returns {Promise<boolean>} True if tab activation was successful
	 * @since 0.1.0
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
	 * Focus a specific window using Chrome windows.update API
	 *
	 * Internal helper method that brings a window to the foreground.
	 * Used when switching to tabs in different windows.
	 *
	 * @private
	 * @param {number} windowID - Window ID to focus
	 * @returns {Promise<boolean>} True if window focus was successful
	 * @since 0.1.0
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