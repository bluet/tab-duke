/**
 * Jest Setup - Chrome Extension API Mocks
 *
 * Comprehensive Chrome API mocking based on ast-grep analysis:
 * - 20+ Chrome API calls across 4 namespaces (tabs, windows, action, runtime)
 * - Focus on callback patterns and chrome.runtime.lastError handling
 * - Realistic error scenarios for production-like testing
 */

/**
 * Create dual-pattern mock function supporting both callbacks and Promises
 *
 * TabDuke uses mixed Chrome API patterns:
 * - TabManager.js: chrome.tabs.query({}, callback)
 * - background.js: await chrome.tabs.query({})
 *
 * @param {*} defaultReturn - Default value for successful operations
 * @param {*} errorReturn - Value to return on error (null/undefined)
 */
function createDualPatternMock(defaultReturn, errorReturn = null) {
	return jest.fn((optionsOrCallback, callback) => {
		// Pattern 1: Single callback - chrome.tabs.query(callback)
		if (typeof optionsOrCallback === 'function' && callback === undefined) {
			const cb = optionsOrCallback;
			// Simulate async callback execution
			setTimeout(() => cb(global.chrome.runtime.lastError ? errorReturn : defaultReturn), 0);
			return;
		}

		// Pattern 2: Options + callback - chrome.tabs.query({}, callback)
		if (typeof optionsOrCallback === 'object' && typeof callback === 'function') {
			setTimeout(() => callback(global.chrome.runtime.lastError ? errorReturn : defaultReturn), 0);
			return;
		}

		// Pattern 3: Promise pattern - await chrome.tabs.query({}) or chrome.tabs.query()
		if (global.chrome.runtime.lastError) {
			return Promise.reject(new Error(global.chrome.runtime.lastError.message || 'Chrome API Error'));
		}
		return Promise.resolve(defaultReturn);
	});
}

/**
 * Create mock for void operations (like chrome.tabs.remove)
 */
function createVoidDualMock() {
	return jest.fn((tabIdOrOptions, callback) => {
		// Pattern 1: Single callback
		if (typeof tabIdOrOptions === 'function' && callback === undefined) {
			const cb = tabIdOrOptions;
			setTimeout(() => cb(), 0);
			return;
		}

		// Pattern 2: Options + callback
		if (callback && typeof callback === 'function') {
			setTimeout(() => callback(), 0);
			return;
		}

		// Pattern 3: Promise pattern
		if (global.chrome.runtime.lastError) {
			return Promise.reject(new Error(global.chrome.runtime.lastError.message || 'Chrome API Error'));
		}
		return Promise.resolve();
	});
}

// Sample test data
const mockTabs = [
	{ id: 1, windowId: 1, title: 'GitHub', url: 'https://github.com', active: true },
	{ id: 2, windowId: 1, title: 'Stack Overflow', url: 'https://stackoverflow.com', active: false },
	{ id: 3, windowId: 2, title: 'MDN Web Docs', url: 'https://developer.mozilla.org', active: true }
];

const mockWindows = [
	{ id: 1, focused: true, type: 'normal' },
	{ id: 2, focused: false, type: 'normal' }
];

// Global Chrome API mock - FIXED FOR DUAL PATTERNS
global.chrome = {
	// TABS API - supports both callback and Promise patterns
	tabs: {
		query: createDualPatternMock(mockTabs),
		remove: createVoidDualMock(),
		update: createDualPatternMock({ id: 1, active: true }),
		create: createDualPatternMock({ id: 999, windowId: 1 }),
		onActivated: { addListener: jest.fn() },
		onCreated: { addListener: jest.fn() },
		onRemoved: { addListener: jest.fn() },
		onUpdated: { addListener: jest.fn() }
	},

	// WINDOWS API - supports both callback and Promise patterns
	windows: {
		getCurrent: createDualPatternMock(mockWindows[0]),
		update: createDualPatternMock(mockWindows[0]),
		getAll: createDualPatternMock(mockWindows),
		onCreated: { addListener: jest.fn() },
		onRemoved: { addListener: jest.fn() },
		onFocusChanged: { addListener: jest.fn() }
	},

	// ACTION API - supports both callback and Promise patterns
	action: {
		setBadgeText: createVoidDualMock(),
		setTitle: createVoidDualMock()
	},

	// RUNTIME API
	runtime: {
		getManifest: jest.fn().mockReturnValue({
			version: '1.2.0',
			name: 'TabDuke Tabs management Chrome extension'
		}),
		lastError: null, // Critical for error handling tests
		onStartup: { addListener: jest.fn() }
	},

	// STORAGE API - supports both callback and Promise patterns
	storage: {
		local: {
			get: createDualPatternMock({}),
			set: createVoidDualMock(),
			remove: createVoidDualMock()
		}
	},

	// COMMANDS API (for keyboard shortcuts)
	commands: {
		getAll: createDualPatternMock([])
	},

	// ALARMS API
	alarms: {
		create: createVoidDualMock(),
		onAlarm: { addListener: jest.fn() }
	},

	// NOTIFICATIONS API
	notifications: {
		create: createVoidDualMock(),
		clear: createVoidDualMock(),
		onButtonClicked: { addListener: jest.fn() },
		onClosed: { addListener: jest.fn() }
	}
};

// Mock DOM globals for JSDOM environment
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // deprecated
		removeListener: jest.fn(), // deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

// Mock console methods to reduce test noise
global.console = {
	...console,
	// Keep errors and warnings for debugging
	debug: jest.fn(),
	log: jest.fn(),
	// Keep error and warn for actual issues
};

// Helper function to reset all Chrome API mocks
global.resetChromeMocks = () => {
	Object.values(chrome.tabs).forEach(method => {
		if (jest.isMockFunction(method)) {
			method.mockReset();
		}
	});
	Object.values(chrome.windows).forEach(method => {
		if (jest.isMockFunction(method)) {
			method.mockReset();
		}
	});
	Object.values(chrome.action).forEach(method => {
		if (jest.isMockFunction(method)) {
			method.mockReset();
		}
	});
	Object.values(chrome.storage.local).forEach(method => {
		if (jest.isMockFunction(method)) {
			method.mockReset();
		}
	});
	chrome.runtime.lastError = null;
};