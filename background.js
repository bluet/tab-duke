// Import centralized ChromeAPI to eliminate code duplication and ensure consistency
import ChromeAPI from './src/utils/ChromeAPI.js';

let windowsCount = 0;
let allWindowsTabCount = 0;
// CRITICAL MV3 FIX: Tab activation history must be persistent across service worker restarts
// Using chrome.storage.local instead of in-memory variable to prevent data loss

// PERFORMANCE: Cache frequently accessed settings to avoid storage I/O on every tab update
let cachedTabDedupeEnabled = false;

// FIXED: Race-condition-safe tab activation history management
const TAB_ACTIVATION_HISTORY_KEY = 'tab_activation_history';

/**
 * TabHistoryManager - Prevents storage race conditions with batched writes
 *
 * Fixes the get→mutate→set race condition by:
 * 1. Batching multiple updates into single atomic operations
 * 2. Debouncing writes to reduce storage I/O pressure
 * 3. Using individual keys for concurrent-safe operations
 */
class TabHistoryManager {
	constructor() {
		this.pendingWrites = new Map(); // tabId -> timestamp
		this.pendingDeletes = new Set(); // tabId set
		this.flushTimer = null;
		this.isFlushingWrites = false;

		// Batch flush after 500ms of inactivity to balance responsiveness vs efficiency
		this.FLUSH_DELAY_MS = 500;
	}

	/**
	 * Set tab activation timestamp (race-condition safe)
	 * @param {number} tabId - Tab ID to update
	 * @param {number} timestamp - Activation timestamp (defaults to now)
	 */
	async setActivationTime(tabId, timestamp = Date.now()) {
		// Add to pending writes and remove from pending deletes if present
		this.pendingWrites.set(tabId, timestamp);
		this.pendingDeletes.delete(tabId);

		this.scheduleFlush();
	}

	/**
	 * Remove tab from history (race-condition safe)
	 * @param {number} tabId - Tab ID to remove
	 */
	async removeTab(tabId) {
		// Add to pending deletes and remove from pending writes if present
		this.pendingDeletes.add(tabId);
		this.pendingWrites.delete(tabId);

		this.scheduleFlush();
	}

	/**
	 * Get current tab activation history (includes pending changes)
	 * @returns {Object} Tab activation history
	 */
	async getHistory() {
		const stored = await ChromeAPI.getStorage([TAB_ACTIVATION_HISTORY_KEY]);
		const history = { ...(stored[TAB_ACTIVATION_HISTORY_KEY] || {}) };

		// Apply pending writes
		for (const [tabId, timestamp] of this.pendingWrites.entries()) {
			history[tabId] = timestamp;
		}

		// Apply pending deletes
		for (const tabId of this.pendingDeletes) {
			delete history[tabId];
		}

		return history;
	}

	/**
	 * Schedule a batched flush operation (debounced)
	 */
	scheduleFlush() {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
		}

		this.flushTimer = setTimeout(() => {
			this.flushPendingChanges();
		}, this.FLUSH_DELAY_MS);
	}

	/**
	 * Flush all pending changes to storage atomically
	 */
	async flushPendingChanges() {
		if (this.isFlushingWrites || (this.pendingWrites.size === 0 && this.pendingDeletes.size === 0)) {
			return;
		}

		this.isFlushingWrites = true;

		try {
			// Get current storage state using ChromeAPI wrapper
			const stored = await ChromeAPI.getStorage([TAB_ACTIVATION_HISTORY_KEY]);
			const currentHistory = stored[TAB_ACTIVATION_HISTORY_KEY] || {};

			// Apply all pending changes atomically
			const updatedHistory = { ...currentHistory };

			// Apply writes
			for (const [tabId, timestamp] of this.pendingWrites.entries()) {
				updatedHistory[tabId] = timestamp;
			}

			// Apply deletes
			for (const tabId of this.pendingDeletes) {
				delete updatedHistory[tabId];
			}

			// Single atomic write operation using ChromeAPI wrapper
			const success = await ChromeAPI.setStorage({ [TAB_ACTIVATION_HISTORY_KEY]: updatedHistory });

			if (success) {
				console.log(`TabHistoryManager: Flushed ${this.pendingWrites.size} writes, ${this.pendingDeletes.size} deletes`);
				// Clear pending operations only on successful write
				this.pendingWrites.clear();
				this.pendingDeletes.clear();
				this.flushTimer = null;
			} else {
				throw new Error('ChromeAPI.setStorage returned false');
			}

		} catch (error) {
			console.error('TabHistoryManager: Failed to flush changes:', error);
			// Reschedule flush on error
			this.scheduleFlush();
		} finally {
			this.isFlushingWrites = false;
		}
	}

	/**
	 * CRITICAL: Force flush all pending changes immediately (for service worker shutdown)
	 * This prevents data loss when service worker is terminated during debounce window
	 */
	async forceFlush() {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
		await this.flushPendingChanges();
	}
}

// Global instance for tab history management
const tabHistoryManager = new TabHistoryManager();

// Legacy wrapper functions for backward compatibility
async function getTabActivationHistory() {
	return await tabHistoryManager.getHistory();
}

async function setTabActivationTimestamp(tabId, timestamp = Date.now()) {
	await tabHistoryManager.setActivationTime(tabId, timestamp);
}

async function removeTabFromHistory(tabId) {
	await tabHistoryManager.removeTab(tabId);
}

// FIXED: Use ChromeAPI for consistent async patterns
async function updateBadgeTitle (count) {
	const iconTitle = `You have ${count} open tab(s).`;
	await ChromeAPI.setBadgeTitle(iconTitle);
}

// FIXED: Use ChromeAPI for consistent async patterns and error handling
async function updateBadgeText () {
	try {
		const data = await ChromeAPI.getStorage(["badgeDisplayOption"]);
		const displayOption = data.badgeDisplayOption;

		if (!displayOption || displayOption === "allWindows") {
			// show the tabs count in all windows
			await ChromeAPI.setBadgeText(String(allWindowsTabCount));
			await updateBadgeTitle(allWindowsTabCount);
		} else if (displayOption === "currentWindow") {
			// show the tabs count in current window
			const currentWindowTabs = await ChromeAPI.queryTabs({ "currentWindow": true });
			await ChromeAPI.setBadgeText(String(currentWindowTabs.length));
			await updateBadgeTitle(currentWindowTabs.length);
		} else if (displayOption === "windowsCount") {
			// show the windows count
			await ChromeAPI.setBadgeText(String(windowsCount));
			await updateBadgeTitle(windowsCount);
		}
	} catch (error) {
		console.error('Failed to update badge text:', error.message);
		// Fallback: show total count from global variable
		await ChromeAPI.setBadgeText(String(allWindowsTabCount));
	}
}

// count all tabs in all windows - MODERNIZED: async/await instead of callback
async function getAllStats () {
	try {
		const windows = await ChromeAPI.getAllWindows({ "populate": true });
		await displayResults(windows || []);
	} catch (error) {
		console.error('Failed to get all windows stats:', error.message);
		await displayResults([]); // Empty array on error
	}
}

async function displayResults (window_list) {
	windowsCount = window_list.length;
	allWindowsTabCount = window_list.reduce((count, win) => {return count + win.tabs.length;}, 0);
	await ChromeAPI.setStorage({
		"windowsCount": window_list.length,
		"allWindowsTabsCount": allWindowsTabCount
	});
	await updateBadgeText();
}


// FIXED: Global Tab Dedupe handler - registered only once to prevent duplicate listeners
async function handleTabUpdate(tabId, changeInfo, tab) {
	// PERFORMANCE: Use cached setting to avoid storage I/O on every tab update
	if (!cachedTabDedupeEnabled) {
		return; // Skip if dedupe is disabled
	}

	if (changeInfo.url) {
		try {
			const tabs = await ChromeAPI.queryTabs({ "url": changeInfo.url });
			if (tabs.length >= 2 && changeInfo.url !== "chrome://newtab/") {
				const oldTab = tabs[0].id === tabId ? tabs[1] : tabs[0];

				// Check for existing notification for this URL to prevent spam
				const urlKey = `pending_dedupe_url_${encodeURIComponent(changeInfo.url)}`;
				const { [urlKey]: existingNotification } = await ChromeAPI.getStorage([urlKey]);

				if (existingNotification) {
					return;
				}

				// Create notification instead of confirm() - CRITICAL MV3 FIX
				const notificationId = `dedupe-${tabId}-${oldTab.id}`;

				try {
					// Check notification permission first
					const permissionLevel = await chrome.notifications.getPermissionLevel();

					await chrome.notifications.create(notificationId, {
						type: 'basic',
						iconUrl: 'images/icon48.png',
						title: 'Duplicate Tab Detected',
						message: `Switch to existing "${oldTab.title}" tab?`,
						buttons: [
							{ title: 'Switch & Close Duplicate' },
							{ title: 'Keep Both Tabs' }
						]
					});
				} catch (notificationError) {
					console.log('TabDuke: Notifications blocked by user, using direct deduplication fallback');
					// Fallback: directly switch to existing tab and close duplicate
					try {
						await ChromeAPI.updateTab(oldTab.id, { active: true });
						await ChromeAPI.focusWindow(oldTab.windowId);
						await ChromeAPI.removeTabs(tabId);
						return; // Skip storage context creation
					} catch (fallbackError) {
						console.error('TabDuke: Fallback deduplication failed:', fallbackError.message);
						return; // Give up gracefully
					}
				}

				// Store context for notification click handler AND track pending URL
				await ChromeAPI.setStorage({
					[`dedupe_${notificationId}`]: {
						newTabId: tabId,
						oldTabId: oldTab.id,
						oldWindowId: oldTab.windowId,
						url: changeInfo.url // Store URL for cleanup
					},
					[urlKey]: { notificationId, timestamp: Date.now() }
				});
			}
		} catch (error) {
			console.error('TabDuke: Failed to query tabs for deduplication:', error.message);
			// Skip deduplication on error - tab will remain as is
		}
	}
}

// FIXED: Registration guard to prevent duplicate listener registration
let tabDedupeListenerRegistered = false;

function registerTabDedupeHandler() {
	if (tabDedupeListenerRegistered) {
		return;
	}

	chrome.tabs.onUpdated.addListener(handleTabUpdate);
	tabDedupeListenerRegistered = true;
}

/**
 * Clean up orphaned dedupe contexts that may persist after service worker termination
 * Removes dedupe contexts older than 10 minutes and their associated URL locks
 */
async function cleanupOrphanedDedupeContexts() {
	try {
		const storage = await ChromeAPI.getStorage(null);
		const currentTime = Date.now();
		const orphanedKeys = [];

		for (const [key, value] of Object.entries(storage)) {
			// Clean up pending URL locks older than 10 minutes
			if (key.startsWith('pending_dedupe_url_') && value.timestamp) {
				if (currentTime - value.timestamp > 10 * 60 * 1000) {
					orphanedKeys.push(key);
				}
			}
			// Clean up dedupe contexts without checking timestamp (notification should have cleared them)
			else if (key.startsWith('dedupe_dedupe-')) {
				orphanedKeys.push(key);
			}
		}

		if (orphanedKeys.length > 0) {
			await ChromeAPI.removeStorage(orphanedKeys);
			console.log(`TabDuke: Cleaned up ${orphanedKeys.length} orphaned dedupe contexts`);
		}
	} catch (error) {
		console.error('TabDuke: Failed to cleanup orphaned dedupe contexts:', error.message);
	}
}

// FIXED: Global Tab Janitor alarm handler - registered only once to prevent duplicate listeners
async function handleTabJanitorAlarm() {
	const { tabJanitor, tabJanitorDays } = await ChromeAPI.getStorage(['tabJanitor', 'tabJanitorDays']);

	// Skip if janitor is disabled
	if (!tabJanitor) {
		console.log('Tab Janitor: Skipping cleanup - feature disabled');
		return;
	}

	// SECURITY: Defensive validation - clamp days between 1-30 to prevent immediate tab closure
	let validatedDays = Number(tabJanitorDays);
	if (isNaN(validatedDays) || validatedDays < 1) {
		validatedDays = 5; // Safe default
		console.warn(`Tab Janitor: Invalid days value "${tabJanitorDays}", using default 5 days`);
	} else if (validatedDays > 30) {
		validatedDays = 30; // Maximum allowed
		console.warn(`Tab Janitor: Days value "${tabJanitorDays}" too high, clamping to 30 days`);
	}

	const now = Date.now();
	const history = await getTabActivationHistory();
	console.log(`Tab Janitor: Checking ${Object.keys(history).length} tabs for inactivity > ${validatedDays} days`);

	for (const [tabId, ts] of Object.entries(history)) {
		const daysSinceActive = (now - ts) / (1000 * 60 * 60 * 24);
		if (daysSinceActive > validatedDays) {
			console.log(`Tab Janitor: Removing inactive tab ${tabId} (inactive for ${daysSinceActive.toFixed(1)} days)`);
			try {
				// MODERNIZED: Use ChromeAPI wrapper with async/await instead of callback
				await ChromeAPI.removeTabs(parseInt(tabId));
				// Successfully removed tab, clean up persistent history
				await removeTabFromHistory(tabId);
				console.log(`Tab Janitor: Successfully removed tab ${tabId} and cleaned history`);
			} catch (error) {
				console.error(`Failed to remove inactive tab ${tabId}:`, error.message);
				// Tab might have been already closed or invalid - clean up history anyway
				await removeTabFromHistory(tabId);
			}
		}
	}
}

// Use chrome.alarms instead of setInterval - simplified to just manage the alarm
function registerTabJanitor () {
	chrome.alarms.create("tabJanitor", { "periodInMinutes": 60 });
	console.log('Tab Janitor: Alarm registered (cleanup threshold determined dynamically from storage)');
}

/* Keeps track of the last timestamp each tab was activated */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
	await setTabActivationTimestamp(activeInfo.tabId);
	console.log(`Tab activation recorded for tab ${activeInfo.tabId}`);
});

async function init () {
	const { tabDedupe, tabJanitor, tabJanitorDays } = await ChromeAPI.getStorage(["tabDedupe", "tabJanitor", "tabJanitorDays"]);

	// PERFORMANCE: Initialize cached settings to avoid storage I/O on frequent events
	cachedTabDedupeEnabled = Boolean(tabDedupe);

	// Action taken when a new tab is opened.
	chrome.tabs.onCreated.addListener(async (tab) => {
		// FIXED: Set initial timestamp for newly created tabs to ensure Tab Janitor tracking
		await setTabActivationTimestamp(tab.id);
		console.log(`Initial timestamp set for new tab ${tab.id}`);
		return getAllStats();
	});

	// Action taken when a tab is closed.
	chrome.tabs.onRemoved.addListener(async (tabId) => {
		// Clean up persistent activation history to prevent storage bloat
		await removeTabFromHistory(tabId);
		return getAllStats();
	});

	// Action taken when a new window is opened
	chrome.windows.onCreated.addListener(() => {return getAllStats();});

	// Action taken when a windows is closed.
	chrome.windows.onRemoved.addListener(() => {return getAllStats();});

	// to change badge text on switching current tab
	chrome.windows.onFocusChanged.addListener(async () => {
		// only if the badgeDisplayOption is set to "currentWindow"
		const { "badgeDisplayOption": displayOption } = await ChromeAPI.getStorage(["badgeDisplayOption"]);
		if (displayOption === "currentWindow") {
			await updateBadgeText();
		}
	});

	// FIXED: Register global Tab Janitor alarm handler once to prevent duplicate listeners
	chrome.alarms.onAlarm.addListener(async (alarm) => {
		if (alarm.name === "tabJanitor") {
			await handleTabJanitorAlarm();
		} else if (alarm.name === "dedupeContextCleanup") {
			await cleanupOrphanedDedupeContexts();
		}
	});

	// FIXED: Register Tab Dedupe notification handlers once to prevent duplicate listeners
	chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
		if (notificationId.startsWith('dedupe-')) {
			const contextKey = `dedupe_${notificationId}`;
			const { [contextKey]: context } = await ChromeAPI.getStorage([contextKey]);

			if (context && buttonIndex === 0) { // Switch & Close Duplicate
				try {
					// Switch to existing tab
					await ChromeAPI.updateTab(context.oldTabId, { active: true });
					await ChromeAPI.focusWindow(context.oldWindowId);

					// Close duplicate tab
					await ChromeAPI.removeTabs(context.newTabId);
				} catch (error) {
					console.error('Failed to handle tab dedupe:', error.message);
				}
			}

			// Cleanup context and URL tracking
			if (context && context.url) {
				const urlKey = `pending_dedupe_url_${encodeURIComponent(context.url)}`;
				await ChromeAPI.removeStorage([contextKey, urlKey]);
			} else {
				await ChromeAPI.removeStorage([contextKey]);
			}
			await chrome.notifications.clear(notificationId);
		}
	});

	// Auto-clear notifications after 10 seconds
	chrome.notifications.onClosed.addListener(async (notificationId) => {
		if (notificationId.startsWith('dedupe-')) {
			const contextKey = `dedupe_${notificationId}`;
			const { [contextKey]: context } = await ChromeAPI.getStorage([contextKey]);

			// Cleanup context and URL tracking
			if (context && context.url) {
				const urlKey = `pending_dedupe_url_${encodeURIComponent(context.url)}`;
				await ChromeAPI.removeStorage([contextKey, urlKey]);
			} else {
				await ChromeAPI.removeStorage([contextKey]);
			}
		}
	});

	// Setup periodic cleanup for orphaned dedupe contexts (only if dedupe is enabled)
	if (tabDedupe) {
		chrome.alarms.create("dedupeContextCleanup", { periodInMinutes: 30 });
		console.log('Dedupe context cleanup alarm created');
	}

	// Initialize the stats to start off with.
	getAllStats();

	// CRITICAL: Initialize activation history for existing tabs after service worker restart
	// This ensures tab janitor works correctly across service worker restarts
	try {
		const tabs = await ChromeAPI.queryTabs({});
		const history = await getTabActivationHistory();
		let newTabsFound = 0;

		for (const tab of tabs) {
			// Only add tabs that don't already have activation history
			if (!history[tab.id]) {
				// Use current time as fallback - this is better than losing tracking completely
				await setTabActivationTimestamp(tab.id);
				newTabsFound++;
			}
		}

		if (newTabsFound > 0) {
			console.log(`Tab Janitor: Initialized activation history for ${newTabsFound} existing tabs after service worker restart`);
		}
	} catch (error) {
		console.error('Failed to initialize tab activation history:', error);
	}

	// Activate tab de-dupe detector if enabled in options.
	if (tabDedupe) {
		registerTabDedupeHandler();
	}

	// Activate tab janitor if enabled.
	if (tabJanitor) {
		registerTabJanitor();
	}

	// CRITICAL: Listen for settings changes to enable/disable features dynamically
	chrome.storage.onChanged.addListener(async (changes, namespace) => {
		if (namespace !== 'local') return;

		// Handle tabDedupe setting changes
		if ('tabDedupe' in changes) {
			// PERFORMANCE: Update cached setting to avoid storage reads on tab updates
			cachedTabDedupeEnabled = Boolean(changes.tabDedupe.newValue);

			if (changes.tabDedupe.newValue && !changes.tabDedupe.oldValue) {
				// Enable tab dedupe
				registerTabDedupeHandler();
				// Also enable cleanup alarm when dedupe is enabled
				chrome.alarms.create("dedupeContextCleanup", { periodInMinutes: 30 });
				console.log('Dedupe context cleanup alarm created');
			} else if (!changes.tabDedupe.newValue && changes.tabDedupe.oldValue) {
				// Disable cleanup alarm when dedupe is disabled
				chrome.alarms.clear('dedupeContextCleanup');
				console.log('Dedupe context cleanup alarm cleared');
			}
			// Note: Cannot easily disable dedupe once registered due to listener architecture
		}

		// Handle tabJanitor setting changes
		if ('tabJanitor' in changes) {
			console.log(`Tab Janitor setting changed: ${changes.tabJanitor.oldValue} → ${changes.tabJanitor.newValue}`);
			if (changes.tabJanitor.newValue && !changes.tabJanitor.oldValue) {
				// Enable tab janitor
				registerTabJanitor();
			} else if (!changes.tabJanitor.newValue && changes.tabJanitor.oldValue) {
				// Disable tab janitor by clearing the alarm
				chrome.alarms.clear('tabJanitor');
				console.log('Tab Janitor disabled - alarm cleared');
			}
		}

		// Handle tabJanitorDays setting changes (reconfigure if janitor is active)
		if ('tabJanitorDays' in changes) {
			console.log(`Tab Janitor Days changed: ${changes.tabJanitorDays.oldValue} → ${changes.tabJanitorDays.newValue}`);
			ChromeAPI.getStorage(['tabJanitor']).then(({tabJanitor}) => {
				if (tabJanitor) {
					// Re-register alarm (days value will be read dynamically from storage)
					chrome.alarms.clear('tabJanitor'); // Clear existing alarm
					registerTabJanitor();
					console.log(`Tab Janitor reconfigured with ${changes.tabJanitorDays.newValue} days`);
				}
			});
		}

		// Handle badgeDisplayOption setting changes
		if ('badgeDisplayOption' in changes) {
			console.log(`Badge Display Option changed: ${changes.badgeDisplayOption.oldValue} → ${changes.badgeDisplayOption.newValue}`);
			// Update badge immediately when setting changes
			await updateBadgeText();
		}
	});
}

// CRITICAL: Service worker shutdown protection for TabHistoryManager
// This prevents data loss when service worker is terminated during the debounce window
self.addEventListener('beforeunload', async (event) => {
	console.log('TabDuke: Service worker shutting down, flushing pending tab history');
	try {
		await tabHistoryManager.forceFlush();
	} catch (error) {
		console.error('TabDuke: Failed to flush tab history on shutdown:', error);
	}
});

// Additional protection using Chrome extension-specific suspend event
chrome.runtime.onSuspend?.addListener(async () => {
	console.log('TabDuke: Extension suspending, flushing pending tab history');
	try {
		await tabHistoryManager.forceFlush();
	} catch (error) {
		console.error('TabDuke: Failed to flush tab history on suspend:', error);
	}
});

// Global error boundary for unhandled JavaScript exceptions in background script (service worker)
self.addEventListener('error', (error) => {
	console.error('TabDuke Background Global Error:', {
		message: error.message,
		filename: error.filename,
		line: error.lineno,
		column: error.colno,
		stack: error.error?.stack
	});
});

self.addEventListener('unhandledrejection', (event) => {
	console.error('TabDuke Background Unhandled Promise Rejection:', {
		reason: event.reason,
		promise: event.promise
	});
	// Don't prevent default in service worker context - just log
});

// Initialize the extension.
init();
