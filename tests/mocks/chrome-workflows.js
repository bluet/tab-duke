/**
 * Chrome API Workflow Mocks
 *
 * Realistic Chrome API workflow mocking for integration tests.
 * Based on ast-grep analysis of actual Chrome API usage patterns in TabDuke.
 */

/**
 * Mock tab close workflow
 * Tests both success and failure scenarios for chrome.tabs.remove
 *
 * @param {boolean} shouldFail - Whether the operation should fail
 * @param {string} errorMessage - Custom error message for failures
 */
export const mockTabCloseWorkflow = (shouldFail = false, errorMessage = 'Tab not found') => {
	chrome.tabs.remove.mockImplementation((tabId, callback) => {
		if (shouldFail) {
			chrome.runtime.lastError = { message: errorMessage };
		} else {
			chrome.runtime.lastError = null;
		}

		// Simulate async behavior
		setTimeout(() => {
			callback && callback();
		}, 10);
	});
};

/**
 * Mock tab query workflow
 * Simulates chrome.tabs.query with realistic tab data
 *
 * @param {Array} tabs - Array of tab objects to return
 * @param {boolean} shouldFail - Whether the query should fail
 */
export const mockTabQueryWorkflow = (tabs = [], shouldFail = false) => {
	chrome.tabs.query.mockImplementation((query, callback) => {
		if (shouldFail) {
			chrome.runtime.lastError = { message: 'Query failed' };
			callback && callback([]);
		} else {
			chrome.runtime.lastError = null;
			// Filter tabs based on query parameters
			let filteredTabs = tabs;

			if (query.currentWindow) {
				filteredTabs = tabs.filter(tab => tab.windowId === 1); // Assume window 1 is current
			}

			if (query.active !== undefined) {
				filteredTabs = filteredTabs.filter(tab => tab.active === query.active);
			}

			setTimeout(() => {
				callback && callback(filteredTabs);
			}, 10);
		}
	});
};

/**
 * Mock tab update workflow (switch to tab)
 * Simulates chrome.tabs.update for tab switching
 *
 * @param {boolean} shouldFail - Whether the update should fail
 */
export const mockTabUpdateWorkflow = (shouldFail = false) => {
	chrome.tabs.update.mockImplementation((tabId, updateInfo, callback) => {
		if (shouldFail) {
			chrome.runtime.lastError = { message: 'Cannot access tab' };
		} else {
			chrome.runtime.lastError = null;
		}

		setTimeout(() => {
			callback && callback();
		}, 10);
	});
};

/**
 * Mock window operations workflow
 * Simulates chrome.windows operations
 *
 * @param {Array} windows - Array of window objects to return
 * @param {boolean} shouldFail - Whether operations should fail
 */
export const mockWindowOperationsWorkflow = (windows = [], shouldFail = false) => {
	chrome.windows.getAll.mockImplementation((options, callback) => {
		if (shouldFail) {
			chrome.runtime.lastError = { message: 'Cannot access windows' };
			callback && callback([]);
		} else {
			chrome.runtime.lastError = null;
			setTimeout(() => {
				callback && callback(windows);
			}, 10);
		}
	});

	chrome.windows.getCurrent.mockImplementation((callback) => {
		const currentWindow = windows.find(w => w.focused) || windows[0];
		if (shouldFail || !currentWindow) {
			chrome.runtime.lastError = { message: 'No current window' };
			callback && callback(null);
		} else {
			chrome.runtime.lastError = null;
			setTimeout(() => {
				callback && callback(currentWindow);
			}, 10);
		}
	});
};

/**
 * Mock badge operations workflow
 * Simulates chrome.action.setBadgeText and setTitle
 */
export const mockBadgeWorkflow = () => {
	chrome.action.setBadgeText.mockImplementation((details) => {
		// Mock successful badge setting
		chrome.runtime.lastError = null;
	});

	chrome.action.setTitle.mockImplementation((details) => {
		// Mock successful title setting
		chrome.runtime.lastError = null;
	});
};

/**
 * Mock storage operations workflow
 * Simulates chrome.storage.local operations
 *
 * @param {Object} initialStorage - Initial storage state
 */
export const mockStorageWorkflow = (initialStorage = {}) => {
	let storage = { ...initialStorage };

	chrome.storage.local.get.mockImplementation((keys, callback) => {
		chrome.runtime.lastError = null;

		let result = {};
		if (keys === null) {
			result = storage; // Return all
		} else if (typeof keys === 'string') {
			result[keys] = storage[keys];
		} else if (Array.isArray(keys)) {
			keys.forEach(key => {
				result[key] = storage[key];
			});
		} else if (typeof keys === 'object') {
			Object.keys(keys).forEach(key => {
				result[key] = storage[key] || keys[key]; // Use default if not found
			});
		}

		setTimeout(() => {
			callback && callback(result);
		}, 10);
	});

	chrome.storage.local.set.mockImplementation((items, callback) => {
		chrome.runtime.lastError = null;
		Object.assign(storage, items);

		setTimeout(() => {
			callback && callback();
		}, 10);
	});

	chrome.storage.local.remove.mockImplementation((keys, callback) => {
		chrome.runtime.lastError = null;
		const keysArray = Array.isArray(keys) ? keys : [keys];
		keysArray.forEach(key => {
			delete storage[key];
		});

		setTimeout(() => {
			callback && callback();
		}, 10);
	});

	// Return getter for testing
	return {
		getStorage: () => ({ ...storage }),
		setStorage: (newStorage) => { storage = { ...newStorage }; }
	};
};