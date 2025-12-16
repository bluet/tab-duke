/**
 * ChromeAPI - Consistent Promise-based Chrome extension API wrapper
 *
 * Standardizes all Chrome API calls with:
 * 1. Consistent async/await patterns (no mixed callback/Promise styles)
 * 2. Comprehensive error handling with chrome.runtime.lastError
 * 3. Sensible fallback values for all API failures
 * 4. Consistent logging patterns across all operations
 *
 * @fileoverview Shared Chrome API utilities for TabDuke extension
 * @version 1.2.0
 * @since 1.2.0
 */
export default class ChromeAPI {
	// === Tabs API ===

	/**
	 * Query tabs with consistent error handling
	 * @param {Object} queryInfo - Chrome tabs query parameters
	 * @returns {Promise<chrome.tabs.Tab[]>} Array of tabs (empty on error)
	 */
	static async queryTabs(queryInfo = {}) {
		return new Promise((resolve) => {
			chrome.tabs.query(queryInfo, (tabs) => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.queryTabs: Failed to query tabs:', chrome.runtime.lastError.message);
					resolve([]);
					return;
				}
				resolve(tabs || []);
			});
		});
	}

	/**
	 * Remove tabs by ID with detailed error reporting
	 * @param {number|number[]} tabIds - Single tab ID or array of tab IDs
	 * @returns {Promise<boolean>} Success status
	 */
	static async removeTabs(tabIds) {
		return new Promise((resolve) => {
			chrome.tabs.remove(tabIds, () => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.removeTabs: Failed to remove tabs:', chrome.runtime.lastError.message);
					resolve(false);
					return;
				}
				resolve(true);
			});
		});
	}

	/**
	 * Update tab properties
	 * @param {number} tabId - Tab ID to update
	 * @param {Object} updateProperties - Properties to update
	 * @returns {Promise<chrome.tabs.Tab|null>} Updated tab or null on error
	 */
	static async updateTab(tabId, updateProperties) {
		return new Promise((resolve) => {
			chrome.tabs.update(tabId, updateProperties, (tab) => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.updateTab: Failed to update tab:', chrome.runtime.lastError.message);
					resolve(null);
					return;
				}
				resolve(tab);
			});
		});
	}

	// === Windows API ===

	/**
	 * Get current window information
	 * @returns {Promise<chrome.windows.Window|null>} Current window or null on error
	 */
	static async getCurrentWindow() {
		return new Promise((resolve) => {
			chrome.windows.getCurrent((window) => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.getCurrentWindow: Failed to get current window:', chrome.runtime.lastError.message);
					resolve(null);
					return;
				}
				resolve(window);
			});
		});
	}

	/**
	 * Focus a window
	 * @param {number} windowId - Window ID to focus
	 * @returns {Promise<boolean>} Success status
	 */
	static async focusWindow(windowId) {
		return new Promise((resolve) => {
			chrome.windows.update(windowId, { focused: true }, () => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.focusWindow: Failed to focus window:', chrome.runtime.lastError.message);
					resolve(false);
					return;
				}
				resolve(true);
			});
		});
	}

	/**
	 * Get all windows
	 * @param {Object} getInfo - Optional window query parameters
	 * @returns {Promise<chrome.windows.Window[]>} Array of windows (empty on error)
	 */
	static async getAllWindows(getInfo = {}) {
		return new Promise((resolve) => {
			chrome.windows.getAll(getInfo, (windows) => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.getAllWindows: Failed to get all windows:', chrome.runtime.lastError.message);
					resolve([]);
					return;
				}
				resolve(windows || []);
			});
		});
	}

	// === Storage API ===

	/**
	 * Get items from chrome.storage.local
	 * @param {string|string[]|Object} keys - Keys to retrieve
	 * @returns {Promise<Object>} Retrieved data (empty object on error)
	 */
	static async getStorage(keys) {
		return new Promise((resolve) => {
			chrome.storage.local.get(keys, (data) => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.getStorage: Failed to get storage:', chrome.runtime.lastError.message);
					resolve({});
					return;
				}
				resolve(data || {});
			});
		});
	}

	/**
	 * Set items in chrome.storage.local
	 * @param {Object} items - Key-value pairs to store
	 * @returns {Promise<boolean>} Success status
	 */
	static async setStorage(items) {
		return new Promise((resolve) => {
			chrome.storage.local.set(items, () => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.setStorage: Failed to set storage:', chrome.runtime.lastError.message);
					resolve(false);
					return;
				}
				resolve(true);
			});
		});
	}

	/**
	 * Remove items from chrome.storage.local
	 * @param {string|string[]} keys - Key or array of keys to remove
	 * @returns {Promise<boolean>} Success status
	 */
	static async removeStorage(keys) {
		return new Promise((resolve) => {
			chrome.storage.local.remove(keys, () => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.removeStorage: Failed to remove storage:', chrome.runtime.lastError.message);
					resolve(false);
					return;
				}
				resolve(true);
			});
		});
	}

	// === Action API ===

	/**
	 * Set badge text
	 * @param {string} text - Text to display on badge
	 * @returns {Promise<boolean>} Success status
	 */
	static async setBadgeText(text) {
		return new Promise((resolve) => {
			chrome.action.setBadgeText({ text }, () => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.setBadgeText: Failed to set badge text:', chrome.runtime.lastError.message);
					resolve(false);
					return;
				}
				resolve(true);
			});
		});
	}

	/**
	 * Set badge title (tooltip)
	 * @param {string} title - Title to display on badge hover
	 * @returns {Promise<boolean>} Success status
	 */
	static async setBadgeTitle(title) {
		return new Promise((resolve) => {
			chrome.action.setTitle({ title }, () => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.setBadgeTitle: Failed to set badge title:', chrome.runtime.lastError.message);
					resolve(false);
					return;
				}
				resolve(true);
			});
		});
	}

	// === Runtime API ===

	/**
	 * Get extension manifest
	 * @returns {chrome.runtime.Manifest} Extension manifest
	 */
	static getManifest() {
		return chrome.runtime.getManifest();
	}

	/**
	 * Get all extension commands (keyboard shortcuts)
	 * @returns {Promise<chrome.commands.Command[]>} Array of commands
	 */
	static async getCommands() {
		return new Promise((resolve) => {
			chrome.commands.getAll((commands) => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.getCommands: Failed to get commands:', chrome.runtime.lastError.message);
					resolve([]);
					return;
				}
				resolve(commands || []);
			});
		});
	}

	/**
	 * Create a new tab
	 * @param {Object} createProperties - Properties for the new tab
	 * @returns {Promise<chrome.tabs.Tab|null>} Created tab or null on error
	 */
	static async createTab(createProperties) {
		return new Promise((resolve) => {
			chrome.tabs.create(createProperties, (tab) => {
				if (chrome.runtime.lastError) {
					console.error('ChromeAPI.createTab: Failed to create tab:', chrome.runtime.lastError.message);
					resolve(null);
					return;
				}
				resolve(tab);
			});
		});
	}
}