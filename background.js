let windowsCount = 0;
let allWindowsTabCount = 0;
let tab_activation_history = {};

// set icon's tooltip
function updateBadgeTitle (count) {
	const iconTitle = `You have ${count} open tab(s).`;
	chrome.action.setTitle({ "title": iconTitle });
}

// set icon's text
async function updateBadgeText () {
	try {
		const { "badgeDisplayOption": displayOption } = await chrome.storage.local.get(["badgeDisplayOption"]);
		if (!displayOption || displayOption === "allWindows") {
			// show the tabs count in all windows
			chrome.action.setBadgeText({ "text": String(allWindowsTabCount) });
			updateBadgeTitle(allWindowsTabCount);
		} else if (displayOption === "currentWindow") {
			// show the tabs count in current window
			const currentWindowTabs = await chrome.tabs.query({ "currentWindow": true });
			chrome.action.setBadgeText({ "text": String(currentWindowTabs.length) });
		} else if (displayOption === "windowsCount") {
			// show the windows count
			chrome.action.setBadgeText({ "text": String(windowsCount) });
			updateBadgeTitle(windowsCount);
		}
	} catch (error) {
		console.error('Failed to update badge text:', error.message);
		// Fallback: show total count from global variable
		chrome.action.setBadgeText({ "text": String(allWindowsTabCount) });
	}
}

// count all tabs in all windows
function getAllStats (callback) {
	chrome.windows.getAll({ "populate": true }, (windows) => {
		if (chrome.runtime.lastError) {
			console.error('Failed to get all windows stats:', chrome.runtime.lastError.message);
			callback([]); // Return empty array on error
			return;
		}
		callback(windows || []);
	});
}

function displayResults (window_list) {
	windowsCount = window_list.length;
	allWindowsTabCount = window_list.reduce((count, win) => {return count + win.tabs.length;}, 0);
	chrome.storage.local.set({
		"windowsCount": window_list.length,
		"allWindowsTabsCount": allWindowsTabCount
	});
	updateBadgeText();
}

function registerTabDedupeHandler () {
	chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
		if (changeInfo.url) {
			try {
				const tabs = await chrome.tabs.query({ "url": changeInfo.url });
				if (tabs.length === 2 && changeInfo.url !== "chrome://newtab/") {
					const oldTab = tabs[0].id === tabId ? tabs[1] : tabs[0];
					const dedupe = confirm("Duplicate tab detected. Switch to existing open tab?");
					if (dedupe) {
						chrome.tabs.update(oldTab.id, { "active": true }, () => {
							if (chrome.runtime.lastError) {
								console.error('Failed to switch to existing tab during dedupe:', chrome.runtime.lastError.message);
								return; // Don't continue with window focus if tab switch failed
							}
							chrome.windows.update(oldTab.windowId, { "focused": true }, () => {
								if (chrome.runtime.lastError) {
									console.error('Failed to focus window during dedupe:', chrome.runtime.lastError.message);
									return; // Don't remove duplicate tab if window focus failed
								}
								chrome.tabs.remove(tabId, () => {
									if (chrome.runtime.lastError) {
										console.error('Failed to remove duplicate tab:', chrome.runtime.lastError.message);
										// Tab removal failed, but user was already switched to existing tab
									}
								});
							});
						});
					}
				}
			} catch (error) {
				console.error('Failed to query tabs for deduplication:', error.message);
				// Skip deduplication on error - tab will remain as is
			}
		}
	});
}

// Use chrome.alarms instead of setInterval
function registerTabJanitor (days) {
	chrome.alarms.create("tabJanitor", { "periodInMinutes": 60 });
	chrome.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === "tabJanitor") {
			const now = Date.now();
			for (const [tabId, ts] of Object.entries(tab_activation_history)) {
				if (now - ts > 1000 * 60 * 60 * 24 * days) {
					chrome.tabs.remove(parseInt(tabId), () => {
						if (chrome.runtime.lastError) {
							console.error(`Failed to remove inactive tab ${tabId}:`, chrome.runtime.lastError.message);
							// Tab might have been already closed or invalid - continue with cleanup
						} else {
							// Successfully removed tab, clean up history
							delete tab_activation_history[tabId];
						}
					});
				}
			}
		}
	});
}

/* Keeps track of the last timestamp each tab was activated */
chrome.tabs.onActivated.addListener((activeInfo) => {
	tab_activation_history[activeInfo.tabId] = Date.now();
});

async function init () {
	const { tabDedupe, tabJanitor, tabJanitorDays } = await chrome.storage.local.get(["tabDedupe", "tabJanitor", "tabJanitorDays"]);

	// Action taken when a new tab is opened.
	chrome.tabs.onCreated.addListener(() => {return getAllStats(displayResults);});

	// Action taken when a tab is closed.
	chrome.tabs.onRemoved.addListener(() => {return getAllStats(displayResults);});

	// Action taken when a new window is opened
	chrome.windows.onCreated.addListener(() => {return getAllStats(displayResults);});

	// Action taken when a windows is closed.
	chrome.windows.onRemoved.addListener(() => {return getAllStats(displayResults);});

	// to change badge text on switching current tab
	chrome.windows.onFocusChanged.addListener(async () => {
		// only if the badgeDisplayOption is set to "currentWindow"
		const { "badgeDisplayOption": displayOption } = await chrome.storage.local.get(["badgeDisplayOption"]);
		if (displayOption === "currentWindow") {
			updateBadgeText();
		}
	});

	// Initialize the stats to start off with.
	getAllStats(displayResults);

	// Activate tab de-dupe detector if enabled in options.
	if (tabDedupe) {
		registerTabDedupeHandler();
	}

	// Activate tab janitor if enabled.
	if (tabJanitor) {
		registerTabJanitor(tabJanitorDays);
	}
}

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
