/**
 * Sample Tab Data for Testing
 *
 * Realistic tab and window data for comprehensive testing scenarios.
 * Based on TabDuke's extreme scale support (1300+ tabs, 30+ windows).
 */

export const sampleTabs = [
	// Window 1 - Development tabs
	{
		id: 1,
		title: 'GitHub - bluet/tab-duke: Chrome Extension',
		url: 'https://github.com/bluet/tab-duke',
		favIconUrl: 'https://github.com/favicon.ico',
		active: true,
		windowId: 1,
		index: 0,
		pinned: false
	},
	{
		id: 2,
		title: 'Chrome Extensions Developer Guide',
		url: 'https://developer.chrome.com/docs/extensions/',
		favIconUrl: 'https://developer.chrome.com/favicon.ico',
		active: false,
		windowId: 1,
		index: 1,
		pinned: true
	},
	{
		id: 3,
		title: 'Jest Documentation - Getting Started',
		url: 'https://jestjs.io/docs/getting-started',
		favIconUrl: 'https://jestjs.io/favicon.ico',
		active: false,
		windowId: 1,
		index: 2,
		pinned: false
	},

	// Window 2 - Research tabs
	{
		id: 4,
		title: 'Chrome Web Store - TabDuke',
		url: 'https://chromewebstore.google.com/detail/tab-duke/idkheoklicopfcfchakfdpbdijbmafmj',
		favIconUrl: 'https://ssl.gstatic.com/chrome/webstore/images/icon_96px.png',
		active: true,
		windowId: 2,
		index: 0,
		pinned: false
	},
	{
		id: 5,
		title: 'Stack Overflow - Chrome Extension Testing',
		url: 'https://stackoverflow.com/questions/chrome-extension-testing',
		favIconUrl: 'https://stackoverflow.com/favicon.ico',
		active: false,
		windowId: 2,
		index: 1,
		pinned: false
	},

	// Edge cases for testing
	{
		id: 6,
		title: 'New Tab',
		url: 'chrome://newtab/',
		favIconUrl: 'chrome://theme/IDR_EXTENSIONS_FAVICON',
		active: false,
		windowId: 1,
		index: 3,
		pinned: false
	},
	{
		id: 7,
		title: 'Very Long Tab Title That Might Cause Display Issues in the UI When Rendered',
		url: 'https://example.com/very-long-url-path/that/might/cause/issues/when/displayed/in/the/extension/popup',
		favIconUrl: 'https://example.com/favicon.ico',
		active: false,
		windowId: 2,
		index: 2,
		pinned: false
	},
	{
		id: 8,
		title: 'Tab with Special Characters: ñáéíóú & <script>',
		url: 'https://example.com/special-chars?q=test&lang=es',
		favIconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSI+PC9zdmc+',
		active: false,
		windowId: 1,
		index: 4,
		pinned: false
	}
];

export const sampleWindows = [
	{
		id: 1,
		focused: true,
		top: 100,
		left: 100,
		width: 1200,
		height: 800,
		incognito: false,
		type: 'normal',
		state: 'normal',
		tabs: sampleTabs.filter(tab => tab.windowId === 1)
	},
	{
		id: 2,
		focused: false,
		top: 200,
		left: 200,
		width: 1000,
		height: 600,
		incognito: false,
		type: 'normal',
		state: 'minimized',
		tabs: sampleTabs.filter(tab => tab.windowId === 2)
	}
];

// Search test scenarios
export const searchTestCases = [
	{
		description: 'should find tabs by title',
		searchTerm: 'GitHub',
		expectedTabs: [1]
	},
	{
		description: 'should find tabs by URL',
		searchTerm: 'chrome.com',
		expectedTabs: [2, 4]
	},
	{
		description: 'should handle case insensitive search',
		searchTerm: 'github',
		expectedTabs: [1]
	},
	{
		description: 'should handle partial matches',
		searchTerm: 'jest',
		expectedTabs: [3]
	},
	{
		description: 'should handle empty search',
		searchTerm: '',
		expectedTabs: [1, 2, 3, 4, 5, 6, 7, 8] // All tabs
	},
	{
		description: 'should handle no matches',
		searchTerm: 'nonexistentterm',
		expectedTabs: []
	},
	{
		description: 'should handle special characters',
		searchTerm: 'script',
		expectedTabs: [8]
	}
];

// Keyboard shortcut test scenarios
export const keyboardTestCases = [
	{
		description: 'Enter key should activate tab',
		key: 'Enter',
		expectedAction: 'activateTab'
	},
	{
		description: 'Delete key should close tab',
		key: 'Delete',
		expectedAction: 'closeTab'
	},
	{
		description: 'ArrowDown should navigate down',
		key: 'ArrowDown',
		expectedAction: 'navigateDown'
	},
	{
		description: 'ArrowUp should navigate up',
		key: 'ArrowUp',
		expectedAction: 'navigateUp'
	},
	{
		description: 'Space should toggle selection',
		key: ' ',
		expectedAction: 'toggleSelection'
	},
	{
		description: 'Escape should clear search',
		key: 'Escape',
		expectedAction: 'clearSearch'
	}
];

// Storage test scenarios
export const storageTestCases = {
	defaultSettings: {
		badgeDisplayOption: 'allWindows',
		showCurrentWindowTabsOnly: false,
		tabDedupe: false,
		tabJanitor: false,
		tabJanitorDays: 30
	},
	customSettings: {
		badgeDisplayOption: 'currentWindow',
		showCurrentWindowTabsOnly: true,
		tabDedupe: true,
		tabJanitor: true,
		tabJanitorDays: 7
	}
};

// Error scenarios for robust testing
export const errorScenarios = [
	{
		description: 'Tab not found error',
		chromeApiError: 'Tab not found',
		expectedBehavior: 'should handle gracefully'
	},
	{
		description: 'No permission error',
		chromeApiError: 'Cannot access tab',
		expectedBehavior: 'should show user-friendly message'
	},
	{
		description: 'Network timeout',
		chromeApiError: 'Timeout',
		expectedBehavior: 'should retry operation'
	}
];