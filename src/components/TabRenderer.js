/**
 * TabRenderer - DOM rendering and event delegation service
 *
 * Extracted from popup.js (lines 251-458) following the TODO.md plan
 * Manages all DOM rendering operations for tab lists with optimized
 * performance and proper event delegation.
 *
 * Key responsibilities:
 * - Render tab lists in both Current and All Windows views
 * - Build individual tab list items with proper styling and accessibility
 * - Manage window grouping and headers
 * - Setup and manage event delegation for performance
 * - Handle favicon loading and error states
 *
 * Benefits:
 * - Centralized rendering logic
 * - Optimized DOM manipulation
 * - Consistent visual styling
 * - Professional event handling
 * - Easy to extend with new features
 */
class TabRenderer {
	constructor() {
		this.eventDelegationSetup = false;
		this.clickHandler = null;
	}

	/**
	 * Initialize the renderer with required dependencies
	 * @param {Function} tabClickHandler - Handler for tab click events
	 */
	initialize(tabClickHandler) {
		this.clickHandler = tabClickHandler;
	}

	/**
	 * Render tabs in both Current and All Windows views
	 * @param {chrome.tabs.Tab[]} items - Array of tab objects
	 * @param {number} currentWindowId - ID of the current window
	 */
	renderTabs(items, currentWindowId) {
		const tabContentCurrent = document.getElementById("currentWindow");
		const tabContentAll = document.getElementById("allWindow");

		if (!tabContentCurrent || !tabContentAll) {
			console.error('TabRenderer: Required DOM elements not found');
			return;
		}

		// Group items by window (preserve original structure)
		const windowMap = this.groupTabsByWindow(items);

		// Render using optimized approach - better performance at all scales
		this.renderOptimized(windowMap, currentWindowId, tabContentCurrent, tabContentAll);

		// Setup event delegation (only once)
		this.setupEventDelegation();

		// Focus active tab
		this.focusActiveTab(items, tabContentCurrent, tabContentAll);
	}

	/**
	 * Group tabs by window ID for organized rendering
	 * @param {chrome.tabs.Tab[]} items - Array of tab objects
	 * @returns {Map} - Map of windowId to tab arrays
	 */
	groupTabsByWindow(items) {
		const windowMap = new Map();

		items.forEach((item, tabIndex) => {
			if (!windowMap.has(item.windowId)) {
				windowMap.set(item.windowId, []);
			}
			windowMap.get(item.windowId).push(item);
		});

		return windowMap;
	}

	/**
	 * Render tabs with optimized DOM manipulation
	 * @param {Map} windowMap - Map of windowId to tab arrays
	 * @param {number} currentWindowId - ID of current window
	 * @param {HTMLElement} tabContentCurrent - Current window container
	 * @param {HTMLElement} tabContentAll - All windows container
	 */
	renderOptimized(windowMap, currentWindowId, tabContentCurrent, tabContentAll) {
		// Clear containers
		tabContentCurrent.textContent = '';
		tabContentAll.textContent = '';

		// Populate Current tab: Only current window items, NO window headers (flat list)
		this.renderCurrentWindowTab(windowMap, currentWindowId, tabContentCurrent);

		// Populate All tab: ALL windows with window headers and structure
		this.renderAllWindowsTab(windowMap, tabContentAll);
	}

	/**
	 * Render Current Window tab view (flat list)
	 * @param {Map} windowMap - Map of windowId to tab arrays
	 * @param {number} currentWindowId - ID of current window
	 * @param {HTMLElement} container - Container element
	 */
	renderCurrentWindowTab(windowMap, currentWindowId, container) {
		const currentWindowTabs = windowMap.get(currentWindowId) || [];

		currentWindowTabs.forEach((item, tabIndex) => {
			const listItem = this.buildListItem(item, tabIndex);
			container.appendChild(listItem);
		});
	}

	/**
	 * Render All Windows tab view (grouped by window)
	 * @param {Map} windowMap - Map of windowId to tab arrays
	 * @param {HTMLElement} container - Container element
	 */
	renderAllWindowsTab(windowMap, container) {
		windowMap.forEach((windowTabs, windowID) => {
			const windowDiv = this.createWindowContainer(windowID);

			windowTabs.forEach((item, tabIndex) => {
				const listItem = this.buildListItem(item, tabIndex);
				windowDiv.appendChild(listItem);
			});

			container.appendChild(windowDiv);
		});
	}

	/**
	 * Create a window container with header
	 * @param {number} windowID - Window ID
	 * @returns {HTMLElement} - Window container div
	 */
	createWindowContainer(windowID) {
		const windowDiv = document.createElement("div");
		windowDiv.windowId = windowID;
		windowDiv.classList.add("window");

		const windowHeader = document.createElement("h2");
		windowHeader.textContent = `Window ${windowID}`;
		windowDiv.appendChild(windowHeader);

		return windowDiv;
	}

	/**
	 * Build an individual tab list item
	 * @param {chrome.tabs.Tab} data - Tab data object
	 * @param {number} tabIndex - Index of the tab
	 * @returns {HTMLElement} - List item element
	 */
	buildListItem(data, tabIndex) {
		const listItem = document.createElement("div");
		const tabID = data.id;

		// Basic styling and attributes
		listItem.classList.add("flex", "items-center", "p-2", "rounded", "list-item");
		if (data.active) {
			listItem.classList.add("tab-active");
		}
		listItem.tabIndex = -1; // Roving tabindex: only focused item has tabIndex="0"
		listItem.tabid = tabID;
		listItem.windowId = data.windowId;

		// ARIA attributes for accessibility
		this.addAccessibilityAttributes(listItem, data, tabID);

		// Add favicon
		const favicon = this.createFavicon(data);
		listItem.appendChild(favicon);

		// Add title
		const titleDiv = this.createTitle(data, tabID);
		listItem.appendChild(titleDiv);

		// Add remove button
		const removeBtn = this.createRemoveButton();
		listItem.appendChild(removeBtn);

		// Add hidden description for screen readers
		const description = this.createAccessibilityDescription(data, tabID);
		listItem.appendChild(description);

		return listItem;
	}

	/**
	 * Add accessibility attributes to list item
	 * @param {HTMLElement} listItem - List item element
	 * @param {chrome.tabs.Tab} data - Tab data
	 * @param {number} tabID - Tab ID
	 */
	addAccessibilityAttributes(listItem, data, tabID) {
		listItem.setAttribute('role', 'option');
		listItem.setAttribute('aria-selected', 'false');
		listItem.setAttribute('id', `tab-option-${tabID}`);
		listItem.setAttribute('aria-describedby', `tab-${tabID}-description`);
	}

	/**
	 * Create favicon image element
	 * @param {chrome.tabs.Tab} data - Tab data
	 * @returns {HTMLElement} - Favicon image element
	 */
	createFavicon(data) {
		const favicon = document.createElement("img");
		favicon.classList.add("mr-2");
		favicon.setAttribute("width", "16");
		favicon.setAttribute("height", "16");
		favicon.setAttribute("alt", "favicon");

		if (data.favIconUrl) {
			favicon.src = data.favIconUrl;
		}

		// Handle broken favicon images gracefully
		favicon.addEventListener('error', function() {
			this.classList.add('favicon-broken');
		});

		return favicon;
	}

	/**
	 * Create title element
	 * @param {chrome.tabs.Tab} data - Tab data
	 * @param {number} tabID - Tab ID
	 * @returns {HTMLElement} - Title container element
	 */
	createTitle(data, tabID) {
		const titleDiv = document.createElement("div");
		titleDiv.classList.add("truncated");

		const titleSpan = document.createElement("span");
		titleSpan.style.cursor = "pointer";
		titleSpan.setAttribute("tabid", tabID);
		titleSpan.setAttribute("title", data.url || "");
		titleSpan.textContent = data.title || "Untitled";

		titleDiv.appendChild(titleSpan);
		return titleDiv;
	}

	/**
	 * Create remove button element
	 * @returns {HTMLElement} - Remove button element
	 */
	createRemoveButton() {
		const removeBtn = document.createElement("span");
		removeBtn.classList.add("remove-btn", "text-red-500");
		removeBtn.textContent = "❌";
		return removeBtn;
	}

	/**
	 * Create accessibility description for screen readers
	 * @param {chrome.tabs.Tab} data - Tab data
	 * @param {number} tabID - Tab ID
	 * @returns {HTMLElement} - Description element
	 */
	createAccessibilityDescription(data, tabID) {
		const description = document.createElement('div');
		description.id = `tab-${tabID}-description`;
		description.className = 'sr-only';
		description.textContent = `Tab in window ${data.windowId}. ${data.url || ''}`;
		return description;
	}

	/**
	 * Setup event delegation for optimal performance
	 */
	setupEventDelegation() {
		if (this.eventDelegationSetup || !this.clickHandler) {
			return;
		}

		const currentWindow = document.getElementById('currentWindow');
		const allWindow = document.getElementById('allWindow');

		if (!currentWindow || !allWindow) {
			console.error('TabRenderer: Cannot setup event delegation - containers not found');
			return;
		}

		// Remove existing listeners if any (simple approach)
		currentWindow.removeEventListener('click', this.clickHandler);
		allWindow.removeEventListener('click', this.clickHandler);

		// Add single delegated listeners
		currentWindow.addEventListener('click', this.clickHandler);
		allWindow.addEventListener('click', this.clickHandler);

		this.eventDelegationSetup = true;
	}

	/**
	 * Focus the active tab after rendering
	 * @param {chrome.tabs.Tab[]} items - Array of tab objects
	 * @param {HTMLElement} tabContentCurrent - Current tab container
	 * @param {HTMLElement} tabContentAll - All tabs container
	 */
	focusActiveTab(items, tabContentCurrent, tabContentAll) {
		const activeTab = items.find(item => item.active);
		if (activeTab) {
			setTimeout(() => {
				const activeItem = tabContentCurrent.querySelector('.tab-active') ||
				                 tabContentAll.querySelector('.tab-active');
				if (activeItem) {
					activeItem.focus();
				}
			}, 0);
		}
	}

	/**
	 * Clear all rendered content
	 */
	clearAll() {
		const tabContentCurrent = document.getElementById("currentWindow");
		const tabContentAll = document.getElementById("allWindow");

		if (tabContentCurrent) {
			tabContentCurrent.textContent = '';
		}
		if (tabContentAll) {
			tabContentAll.textContent = '';
		}
	}

	/**
	 * Get all rendered tab items
	 * @returns {HTMLElement[]} - Array of tab list items
	 */
	getAllTabItems() {
		return Array.from(document.querySelectorAll('.list-item'));
	}

	/**
	 * Get tab items for a specific window
	 * @param {number} windowId - Window ID
	 * @returns {HTMLElement[]} - Array of tab items for the window
	 */
	getTabItemsForWindow(windowId) {
		return Array.from(document.querySelectorAll(`.list-item[windowId="${windowId}"]`));
	}

	/**
	 * Update the visual state of a tab item
	 * @param {number} tabID - Tab ID
	 * @param {Object} updates - Updates to apply {active: boolean, selected: boolean}
	 */
	updateTabItem(tabID, updates) {
		const items = document.querySelectorAll(`.list-item[tabid="${tabID}"]`);

		items.forEach(item => {
			if (updates.active !== undefined) {
				if (updates.active) {
					item.classList.add('tab-active');
				} else {
					item.classList.remove('tab-active');
				}
			}

			if (updates.selected !== undefined) {
				if (updates.selected) {
					item.classList.add('selected', 'bg-blue-100');
				} else {
					item.classList.remove('selected', 'bg-blue-100');
				}
			}
		});
	}

	/**
	 * Remove a tab item from the DOM
	 * @param {number} tabID - Tab ID to remove
	 */
	removeTabItem(tabID) {
		const items = document.querySelectorAll(`.list-item[tabid="${tabID}"]`);
		items.forEach(item => item.remove());
	}
}

export default TabRenderer;