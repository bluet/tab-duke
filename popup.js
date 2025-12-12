// Import all service modules - Service-Oriented Architecture
import TabManager from './src/core/TabManager.js';
import StateManager from './src/core/StateManager.js';
import SearchEngine from './src/components/SearchEngine.js';
import KeyboardNavigation from './src/components/KeyboardNavigation.js';
import TabRenderer from './src/components/TabRenderer.js';
import FocusManager from './src/utils/FocusManager.js';
import AccessibilityHelpers from './src/utils/AccessibilityHelpers.js';

const tabs = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const searchInput = document.getElementById("searchInput");

// Main App class - coordinates all services per TODO.md architecture
class TabDukeApp {
	constructor() {
		// Initialize all services
		this.tabManager = new TabManager();
		this.focusManager = new FocusManager();
		this.accessibilityHelpers = new AccessibilityHelpers();
		this.searchEngine = new SearchEngine();
		this.tabRenderer = new TabRenderer();

		// StateManager needs access to other services
		this.stateManager = new StateManager(
			this.focusManager,
			this.tabManager,
			this.searchEngine,
			this.accessibilityHelpers
		);

		// KeyboardNavigation coordinates between all services
		this.keyboardNavigation = new KeyboardNavigation(
			this.focusManager,
			this.tabManager,
			this.searchEngine,
			this.stateManager
		);

		// DOM references
		this.tabs = tabs;
		this.tabContents = tabContents;
		this.searchInput = searchInput;
	}

	async initialize() {
		// Setup accessibility foundation
		this.accessibilityHelpers.initializeScreenReaderSupport();

		// Initialize services with DOM references
		this.searchEngine.initialize(this.searchInput, () => this.updateCounterText());
		this.stateManager.initialize(this.searchInput, this.tabs);
		this.keyboardNavigation.initialize(this.searchInput, this.tabs);
		this.tabRenderer.initialize((e) => this.handleTabClick(e));

		// Setup main tab content
		await this.initializeTabContent();

		// Setup UI event handlers
		this.setupTabClickHandlers();
		this.setupShortcutBanner();

		// Check and show shortcut banner if needed
		await this.checkKeyboardShortcut();
	}

	async initializeTabContent() {
		const tabs = await this.tabManager.getAllTabs();
		const currentWindow = await this.tabManager.getCurrentWindow();

		if (currentWindow && tabs.length > 0) {
			const currentWindowId = currentWindow.id;

			// Render tabs using TabRenderer service
			this.tabRenderer.renderTabs(tabs, currentWindowId);
			this.updateCounterText();

			// Initialize focus system after DOM is ready
			setTimeout(() => {
				// CRITICAL FIX: Find the active tab from the CURRENT window, not just any active tab
				const activeTab = tabs.find(tab => tab.active && tab.windowId === currentWindowId);

				if (activeTab) {
					// CRITICAL: Set currentItemIndex to active tab position FIRST
					this.focusManager.setCurrentItemIndexToActiveTab(activeTab.id, currentWindowId);
					this.focusManager.initializeFocusToCurrentTab(activeTab.id);
				}
			}, 0);
		}
	}

	setupTabClickHandlers() {
		// Tab switching handlers
		this.tabs.forEach((tab, index) => {
			tab.addEventListener("click", () => {
				this.handleTabSwitch(tab, index);
			});
		});
	}

	handleTabSwitch(tab, index) {
		const target = document.querySelector(tab.dataset.tabTarget);

		// Update DOM classes
		this.tabContents.forEach((tabContent) => {
			tabContent.classList.remove("active");
		});
		this.tabs.forEach((t) => {
			t.classList.remove("active");
		});
		tab.classList.add("active");
		target.classList.add("active");

		// Update counter and search
		if (this.searchInput.value) {
			this.searchEngine.performSearch(this.searchInput.value);
		} else {
			this.updateCounterText();
		}

		// Update accessibility states
		this.accessibilityHelpers.updateTabAriaStates(index);
		const tabName = tab.textContent.includes('Current') ? 'Current Window' : 'All Windows';
		this.accessibilityHelpers.announceToScreenReader(`Switched to ${tabName} view`);
	}

	// Delegate tab click handling to services
	handleTabClick(event) {
		const listItem = event.target.closest('.list-item');
		if (!listItem) return;

		const tabId = listItem.tabid;
		const windowId = listItem.windowId;

		if (event.target.classList.contains('remove-btn')) {
			// Remove button clicked
			event.stopPropagation();
			this.removeTabItem(tabId);
		} else if (event.ctrlKey || event.metaKey) {
			// Ctrl+click: Toggle individual selection
			this.handleCtrlClick(event, listItem);
		} else if (event.shiftKey && this.stateManager.lastClickedIndex >= 0) {
			// Shift+click: Range selection
			this.handleShiftClick(event, listItem);
		} else {
			// Regular click: Navigate to tab
			this.tabManager.switchToTab(tabId, windowId);
			this.updateCounterText();
		}
	}

	async removeTabItem(tabId) {
		// Use services to handle tab removal
		await this.tabManager.closeTab(tabId);
		this.tabRenderer.removeTabItem(tabId);
		this.updateCounterText();
	}

	handleCtrlClick(event, listItem) {
		event.preventDefault();
		const activeTabContent = document.querySelector(".tab-content.active");
		const items = [...activeTabContent.querySelectorAll(".list-item")];
		const clickedIndex = items.indexOf(listItem);

		// Toggle selection
		listItem.classList.toggle("selected");
		listItem.classList.toggle("bg-blue-100");

		// Update accessibility and state
		this.accessibilityHelpers.updateAriaSelected();
		const selectedCount = document.querySelectorAll('.tab-content.active .list-item.selected').length;
		this.accessibilityHelpers.announceSelectionChange(selectedCount);

		// Update focus
		this.focusManager.focusAndUpdateIndex(listItem, clickedIndex, items, 'instant');
		this.stateManager.setCurrentItemIndex(clickedIndex);
		this.stateManager.lastClickedIndex = clickedIndex;
	}

	handleShiftClick(event, listItem) {
		event.preventDefault();
		const activeTabContent = document.querySelector(".tab-content.active");
		const items = [...activeTabContent.querySelectorAll(".list-item")];
		const clickedIndex = items.indexOf(listItem);

		// Clear existing selections
		items.forEach(item => {
			item.classList.remove("selected", "bg-blue-100");
		});

		// Select range
		const startIndex = Math.min(this.stateManager.lastClickedIndex, clickedIndex);
		const endIndex = Math.max(this.stateManager.lastClickedIndex, clickedIndex);

		for (let i = startIndex; i <= endIndex; i++) {
			if (items[i] && items[i].style.display !== 'none') {
				items[i].classList.add("selected", "bg-blue-100");
			}
		}

		// Update accessibility and state
		this.accessibilityHelpers.updateAriaSelected();
		this.focusManager.focusAndUpdateIndex(listItem, clickedIndex, items, 'instant');
		this.stateManager.setCurrentItemIndex(clickedIndex);
		this.stateManager.lastClickedIndex = clickedIndex;
	}

	// Delegate counter updates to SearchEngine
	updateCounterText() {
		const currentWindowContent = document.getElementById("currentWindow");
		const allWindowContent = document.getElementById("allWindow");
		const isSearching = this.searchInput.value.trim() !== "";
		const searchIcon = isSearching ? "🔎 " : "";

		let currentVisibleCount, allVisibleCount;

		if (isSearching) {
			currentVisibleCount = this.searchEngine.getVisibleItemsCount(currentWindowContent);
			allVisibleCount = this.searchEngine.getVisibleItemsCount(allWindowContent);
		} else {
			currentVisibleCount = currentWindowContent.querySelectorAll(".list-item").length;
			allVisibleCount = allWindowContent.querySelectorAll(".list-item").length;
		}

		// Update search placeholder
		const activeTabContent = document.querySelector(".tab-content.active");
		const activeCount = activeTabContent === currentWindowContent ? currentVisibleCount : allVisibleCount;
		this.searchInput.placeholder = `Search... (${activeCount} items)`;

		// Update tab titles
		const tabTitleCurrent = document.getElementById("tabTitleCurrent");
		const tabTitleAll = document.getElementById("tabTitleAll");

		tabTitleCurrent.textContent = `${searchIcon}Current (${currentVisibleCount})`;

		// Count windows asynchronously
		this.tabManager.getCurrentWindow().then(() => {
			chrome.windows.getAll({}, (window_list) => {
				if (chrome.runtime.lastError) {
					console.error('Failed to get window list for counter:', chrome.runtime.lastError.message);
					tabTitleAll.textContent = `${searchIcon}All (${allVisibleCount})`;
					return;
				}

				let visibleWindowCount = window_list ? window_list.length : 0;
				if (isSearching) {
					const windows = allWindowContent.querySelectorAll(".window");
					visibleWindowCount = Array.from(windows).filter(w => w.style.display !== "none").length;
				}
				tabTitleAll.textContent = `${searchIcon}All (${allVisibleCount} in ${visibleWindowCount})`;
			});
		});
	}

	// Keyboard shortcut banner functionality
	async checkKeyboardShortcut() {
		const { shortcutBannerDismissed } = await chrome.storage.local.get(['shortcutBannerDismissed']);
		if (shortcutBannerDismissed) return;

		chrome.commands.getAll((commands) => {
			if (chrome.runtime.lastError) {
				console.error('Failed to get commands for shortcut check:', chrome.runtime.lastError.message);
				return;
			}
			const actionCommand = commands ? commands.find(cmd => cmd.name === '_execute_action') : null;

			if (!actionCommand || !actionCommand.shortcut) {
				const banner = document.getElementById('shortcutBanner');
				if (banner) {
					banner.classList.remove('hidden');
				}
			}
		});
	}

	setupShortcutBanner() {
		const openBtn = document.getElementById('openShortcutsBtn');
		const dismissBtn = document.getElementById('dismissBannerBtn');

		if (openBtn) {
			openBtn.addEventListener('click', () => {
				chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }, (tab) => {
					if (chrome.runtime.lastError) {
						console.error('Failed to open shortcuts page:', chrome.runtime.lastError.message);
					}
				});
			});
		}

		if (dismissBtn) {
			dismissBtn.addEventListener('click', async () => {
				const banner = document.getElementById('shortcutBanner');
				if (banner) {
					banner.classList.add('hidden');
				}
				await chrome.storage.local.set({ shortcutBannerDismissed: true });
			});
		}
	}
}

// Global App instance
let app = null;




// Initialize the new service-oriented architecture
async function init() {
	try {
		// Create and initialize the main App instance
		app = new TabDukeApp();
		await app.initialize();
	} catch (error) {
		console.error('TabDuke initialization failed:', error);
		// Fallback: Extension should still work with basic functionality
	}
}

// Global error boundary for unhandled JavaScript exceptions
window.addEventListener('error', (event) => {
	console.error('TabDuke Global Error:', {
		message: event.message,
		filename: event.filename,
		line: event.lineno,
		column: event.colno,
		stack: event.error?.stack,
		error: event.error
	});
	// Keep extension functional - don't propagate error
	return true; // Prevents browser's default error handling
});

window.addEventListener('unhandledrejection', (event) => {
	console.error('TabDuke Unhandled Promise Rejection:', {
		reason: event.reason,
		promise: event.promise
	});
	// Keep extension functional - don't propagate error
	event.preventDefault();
});

// Ensure event listeners are added after DOM content is loaded
document.addEventListener("DOMContentLoaded", (event) => {
	init();
});
