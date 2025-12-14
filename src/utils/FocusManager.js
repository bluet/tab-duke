/**
 * @fileoverview FocusManager - Focus restoration and navigation service
 * @description Manages complex focus state restoration across tab views with intelligent
 * position memory and accessibility-first design. Provides smooth scrolling utilities
 * and roving tabindex management for optimal keyboard navigation experience.
 *
 * @author TabDuke Development Team
 * @since 0.1.0
 * @version 1.0.0
 */

/**
 * FocusManager class - Advanced focus restoration and navigation service
 *
 * Extracted from popup.js following service-oriented architecture principles.
 * Manages complex focus restoration across tab views with intelligent position memory
 * and provides professional accessibility implementation with smart scrolling behavior.
 *
 * Key responsibilities:
 * - Independent focus restoration per tab view (current/all windows)
 * - Smart scrolling with sticky header awareness
 * - Roving tabindex management for WCAG compliance
 * - Relative position calculations for consistent UX
 * - Accessibility integration with screen readers
 *
 * @class FocusManager
 * @since 0.1.0
 *
 * @example
 * const focusManager = new FocusManager();
 * focusManager.focusAndUpdateIndex(item, 5, allItems, 'smooth');
 * focusManager.saveCurrentFocusPosition(items);
 * focusManager.restoreSavedFocusPosition(items);
 */
class FocusManager {
	/**
	 * Create a new FocusManager instance
	 *
	 * Initializes focus restoration data structure with independent focus tracking
	 * for both Current Window and All Windows views. Each view maintains its own
	 * position history, enabling seamless tab switching without losing context.
	 *
	 * @since 0.1.0
	 *
	 * @example
	 * const focusManager = new FocusManager();
	 * // Focus data is automatically initialized for both tab views
	 */
	constructor() {
		/**
		 * Focus restoration data structure
		 * @type {FocusRestoreData}
		 * @private
		 */
		this.focusRestoreData = {
			currentTab: {
				lastFocusedIndex: -1, // -1 means no previous focus data
				relativePosition: 0,
				currentIndex: 0 // Current focused index for this tab
			},
			allTab: {
				lastFocusedIndex: -1, // -1 means no previous focus data
				relativePosition: 0,
				currentIndex: 0 // Current focused index for this tab
			},
			activeTabName: 'currentTab' // 'currentTab' or 'allTab'
		};
	}

	/**
	 * @typedef {Object} FocusRestoreData
	 * @property {TabFocusData} currentTab - Focus data for Current Window view
	 * @property {TabFocusData} allTab - Focus data for All Windows view
	 * @property {string} activeTabName - Currently active tab ('currentTab' or 'allTab')
	 */

	/**
	 * @typedef {Object} TabFocusData
	 * @property {number} lastFocusedIndex - Last focused item index (-1 if none)
	 * @property {number} relativePosition - Relative position in list (0-1)
	 * @property {number} currentIndex - Current focused index for this view
	 */

	/**
	 * Set the global state reference (deprecated - now using per-tab indexes)
	 *
	 * Legacy method kept for compatibility. Focus management now uses independent
	 * per-tab indexing instead of a global state object. This method does nothing.
	 *
	 * @param {Object} state - Global state object with currentItemIndex (ignored)
	 * @deprecated Use per-tab focus tracking instead
	 * @since 0.1.0
	 */
	setState(state) {
		// Legacy method - no longer needed as we use per-tab indexing
	}

	/**
	 * Focus an item with smart scrolling and update all related state
	 *
	 * Core focus management method that coordinates focus changes with proper
	 * scrolling, accessibility updates, and state management. Updates roving
	 * tabindex, ARIA attributes, and optionally saves position for restoration.
	 *
	 * @param {HTMLElement} item - DOM element to focus
	 * @param {number} index - Index of the item in the items array
	 * @param {HTMLElement[]} items - All items in the current list
	 * @param {string} [scrollMode='instant'] - Scrolling behavior ('instant' or 'smooth')
	 * @param {boolean} [saveFocus=false] - Whether to save position for later restoration
	 * @since 0.1.0
	 *
	 * @example
	 * // Focus item with smooth scrolling and save position
	 * focusManager.focusAndUpdateIndex(tabItem, 10, allTabs, 'smooth', true);
	 *
	 * @example
	 * // Quick focus without saving position
	 * focusManager.focusAndUpdateIndex(tabItem, 5, allTabs);
	 */
	focusAndUpdateIndex(item, index, items, scrollMode = 'instant', saveFocus = false) {
		// Apply focus with appropriate scrolling
		if (scrollMode === 'smooth') {
			this.focusWithSmoothScroll(item);
		} else {
			this.focusWithInstantScroll(item);
		}

		// Update current tab's index
		this.updateActiveTabName();
		const tabData = this.getCurrentTabData();
		tabData.currentIndex = index;

		// Update accessibility
		this.updateRovingTabindex(items, index);
		this.updateActiveDescendant(item);

		// Save focus position if requested
		if (saveFocus) {
			this.saveCurrentFocusPosition(items);
		}
	}

	/**
	 * Restore focus to previously saved position for the current tab
	 *
	 * Intelligently restores focus using multiple fallback strategies:
	 * 1. Exact index match (if still valid and visible)
	 * 2. Relative position calculation
	 * 3. Currently active browser tab
	 * 4. First visible item
	 *
	 * Each tab view maintains independent focus history for seamless switching.
	 *
	 * @param {HTMLElement[]} items - Items in the current view to restore focus within
	 * @returns {boolean} True if focus was successfully restored, false otherwise
	 * @since 0.1.0
	 *
	 * @example
	 * // Restore focus after switching tab views
	 * const restored = focusManager.restoreSavedFocusPosition(currentViewItems);
	 * if (!restored) {
	 *   console.log('Could not restore focus - no valid items found');
	 * }
	 */
	restoreSavedFocusPosition(items) {
		this.updateActiveTabName(); // Update which tab is now active

		// Use current tab's own saved data (independent focus per tab)
		const tabData = this.getCurrentTabData();

		// Try to restore to the exact same index first (only if we have valid previous data)
		if (tabData.lastFocusedIndex >= 0 && tabData.lastFocusedIndex < items.length && items[tabData.lastFocusedIndex]) {
			const targetItem = items[tabData.lastFocusedIndex];
			if (targetItem.style.display !== 'none') {
				this.focusAndUpdateIndex(targetItem, tabData.lastFocusedIndex, items);
				return true;
			}
		}

		// Fallback to relative position if exact index doesn't work
		const targetIndex = Math.floor(tabData.relativePosition * items.length);
		const clampedIndex = Math.min(targetIndex, items.length - 1);
		const targetItem = items[clampedIndex];

		if (targetItem.style.display !== 'none') {
			this.focusAndUpdateIndex(targetItem, clampedIndex, items);
			return true;
		}

		// Better fallback: Look for current active tab first, then first visible
		const currentActiveItem = items.find(item => item.classList.contains('tab-active'));
		if (currentActiveItem) {
			const activeIndex = items.indexOf(currentActiveItem);
			this.focusAndUpdateIndex(currentActiveItem, activeIndex, items);
			return true;
		}

		// Final fallback to first visible if no current active tab found
		const firstVisible = this.findFirstVisibleItem(items);
		if (firstVisible) {
			this.focusAndUpdateIndex(firstVisible.item, firstVisible.index, items);
			return true;
		}

		return false;
	}

	/**
	 * Save the current focus position for later restoration
	 *
	 * Stores both exact index and relative position for robust restoration.
	 * Relative position provides fallback when list length changes.
	 *
	 * @param {HTMLElement[]} items - Current items list to calculate position within
	 * @since 0.1.0
	 *
	 * @example
	 * // Save current position before switching views
	 * focusManager.saveCurrentFocusPosition(currentItems);
	 */
	saveCurrentFocusPosition(items) {
		const tabData = this.getCurrentTabData();
		tabData.lastFocusedIndex = tabData.currentIndex;
		tabData.relativePosition = this.calculateRelativePosition(tabData.currentIndex, items.length);
	}

	/**
	 * Initialize focus data for the currently active browser tab
	 *
	 * Sets initial focus positions in both tab views based on the currently
	 * active browser tab. Ensures consistent starting position across views.
	 *
	 * @param {number} currentTabId - ID of the currently active browser tab
	 * @since 0.1.0
	 *
	 * @example
	 * // Initialize focus to current active tab
	 * focusManager.initializeFocusToCurrentTab(activeTab.id);
	 */
	initializeFocusToCurrentTab(currentTabId) {
		// Find the currently active tab in both tab views and set initial focus data
		const currentWindowItems = [...document.getElementById("currentWindow").querySelectorAll('.list-item')];
		const allWindowItems = [...document.getElementById("allWindow").querySelectorAll('.list-item')];

		// Set focus data for Current tab view
		const currentTabIndex = currentWindowItems.findIndex(item => item.tabid === currentTabId);
		if (currentTabIndex >= 0) {
			this.focusRestoreData.currentTab.lastFocusedIndex = currentTabIndex;
			this.focusRestoreData.currentTab.relativePosition = this.calculateRelativePosition(currentTabIndex, currentWindowItems.length);
		}

		// Set focus data for All tab view
		const allTabIndex = allWindowItems.findIndex(item => item.tabid === currentTabId);
		if (allTabIndex >= 0) {
			this.focusRestoreData.allTab.lastFocusedIndex = allTabIndex;
			this.focusRestoreData.allTab.relativePosition = this.calculateRelativePosition(allTabIndex, allWindowItems.length);
		}

		// Set currentIndex for the currently visible tab view
		this.updateActiveTabName();
		if (this.focusRestoreData.activeTabName === 'currentTab' && currentTabIndex >= 0) {
			this.focusRestoreData.currentTab.currentIndex = currentTabIndex;
		} else if (this.focusRestoreData.activeTabName === 'allTab' && allTabIndex >= 0) {
			this.focusRestoreData.allTab.currentIndex = allTabIndex;
		}
	}

	// Scrolling utilities

	/**
	 * Focus element with smart scrolling behavior
	 *
	 * Intelligently scrolls only when needed, avoiding unnecessary movement
	 * when items are already visible. Accounts for sticky header positioning.
	 *
	 * @param {HTMLElement} item - Element to focus
	 * @param {string} [transition='instant'] - Scroll transition ('instant' or 'smooth')
	 * @since 0.1.0
	 *
	 * @example
	 * // Focus with smooth scrolling
	 * focusManager.focusWithSmartScroll(item, 'smooth');
	 */
	focusWithSmartScroll(item, transition = 'instant') {
		item.focus();

		// Check if item is already reasonably visible before scrolling
		if (this.isItemReasonablyVisible(item)) {
			return; // No scrolling needed
		}

		// Use 'start' to force scrolling when item is covered by sticky header
		// CSS scroll-margin-top will position it correctly below the header
		item.scrollIntoView({
			block: 'start',
			behavior: transition
		});
	}

	/**
	 * Check if an item is reasonably visible (not covered by sticky header)
	 *
	 * Determines if scrolling is needed by checking if the item is positioned
	 * below the sticky header with adequate margin for comfortable viewing.
	 *
	 * @param {HTMLElement} item - Element to check visibility for
	 * @returns {boolean} True if item is fully visible below sticky header
	 * @since 0.1.0
	 *
	 * @example
	 * // Check before scrolling
	 * if (!focusManager.isItemReasonablyVisible(item)) {
	 *   item.scrollIntoView();
	 * }
	 */
	isItemReasonablyVisible(item) {
		const rect = item.getBoundingClientRect();

		// Find the sticky header
		const stickyHeader = document.getElementById('tabMenu');
		if (!stickyHeader) return true; // If no header, assume visible

		const headerRect = stickyHeader.getBoundingClientRect();
		const margin = 16; // Small breathing room

		// Item is visible if it starts below the sticky header with some margin
		return rect.top >= (headerRect.bottom + margin);
	}

	/**
	 * Focus element with smooth scrolling
	 *
	 * Convenience method for focusing with smooth scroll transition.
	 * Uses smart scrolling to avoid unnecessary movement.
	 *
	 * @param {HTMLElement} item - Element to focus
	 * @since 0.1.0
	 */
	focusWithSmoothScroll(item) {
		this.focusWithSmartScroll(item, 'smooth');
	}

	/**
	 * Focus element with instant scrolling
	 *
	 * Convenience method for focusing with instant scroll transition.
	 * Uses smart scrolling to avoid unnecessary movement.
	 *
	 * @param {HTMLElement} item - Element to focus
	 * @since 0.1.0
	 */
	focusWithInstantScroll(item) {
		this.focusWithSmartScroll(item, 'instant');
	}

	// Accessibility utilities

	/**
	 * Update roving tabindex for keyboard navigation
	 *
	 * Implements WCAG-compliant roving tabindex pattern where only the
	 * currently focused item is tabbable (tabIndex=0), all others are
	 * excluded from tab sequence (tabIndex=-1).
	 *
	 * @param {HTMLElement[]} items - All items in the list
	 * @param {number} focusedIndex - Index of the currently focused item
	 * @since 0.1.0
	 *
	 * @example
	 * // Update tabindex after focus change
	 * focusManager.updateRovingTabindex(allItems, newFocusIndex);
	 */
	updateRovingTabindex(items, focusedIndex) {
		items.forEach((item, index) => {
			item.tabIndex = (index === focusedIndex) ? 0 : -1;
		});
	}

	/**
	 * Update ARIA active descendant for accessibility
	 *
	 * Placeholder for ARIA active-descendant updates. Implementation
	 * is delegated to AccessibilityHelpers service for consistency.
	 *
	 * @param {HTMLElement} focusedItem - Currently focused item
	 * @since 0.1.0
	 * @todo Move to AccessibilityHelpers service
	 */
	updateActiveDescendant(focusedItem) {
		// This will be implemented by AccessibilityHelpers
		// Placeholder for now to maintain compatibility
		if (typeof updateActiveDescendant === 'function') {
			updateActiveDescendant(focusedItem);
		}
	}

	// Utility functions

	/**
	 * Find the first visible item in a list
	 *
	 * Searches through items to find the first one that is not hidden
	 * by display:none styling (from search filtering).
	 *
	 * @param {HTMLElement[]} items - Items to search through
	 * @returns {VisibleItem|null} Object with item and index, or null if none found
	 * @since 0.1.0
	 *
	 * @typedef {Object} VisibleItem
	 * @property {HTMLElement} item - The visible DOM element
	 * @property {number} index - Index of the item in the original array
	 *
	 * @example
	 * const firstVisible = focusManager.findFirstVisibleItem(allItems);
	 * if (firstVisible) {
	 *   focusManager.focusAndUpdateIndex(firstVisible.item, firstVisible.index, allItems);
	 * }
	 */
	findFirstVisibleItem(items) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].style.display !== 'none') {
				return { item: items[i], index: i };
			}
		}
		return null;
	}

	/**
	 * Find the last visible item in a list
	 *
	 * Searches backward through items to find the last one that is not hidden.
	 * Used for End key navigation and boundary detection.
	 *
	 * @param {HTMLElement[]} items - Items to search through
	 * @returns {VisibleItem|null} Object with item and index, or null if none found
	 * @since 0.1.0
	 */
	findLastVisibleItem(items) {
		for (let i = items.length - 1; i >= 0; i--) {
			if (items[i].style.display !== 'none') {
				return { item: items[i], index: i };
			}
		}
		return null;
	}

	/**
	 * Find all visible items in a list
	 *
	 * Filters the items array to return only visible elements,
	 * excluding those hidden by search filtering.
	 *
	 * @param {HTMLElement[]} items - Items to filter
	 * @returns {HTMLElement[]} Array of visible DOM elements
	 * @since 0.1.0
	 *
	 * @example
	 * const visibleItems = focusManager.findVisibleItems(allItems);
	 * console.log(`Found ${visibleItems.length} visible items`);
	 */
	findVisibleItems(items) {
		return items.filter(item => item.style.display !== 'none');
	}

	// Private helper methods

	/**
	 * Calculate relative position within a list
	 *
	 * Converts absolute index to relative position (0-1) for consistent
	 * restoration when list length changes due to search filtering.
	 *
	 * @private
	 * @param {number} currentIndex - Current absolute index in the list
	 * @param {number} totalItems - Total number of items in the list
	 * @returns {number} Relative position as decimal (0-1)
	 * @since 0.1.0
	 */
	calculateRelativePosition(currentIndex, totalItems) {
		return totalItems > 0 ? currentIndex / totalItems : 0;
	}

	/**
	 * Get the current tab's focus data
	 *
	 * Returns the focus data object for the currently active tab view
	 * (currentTab or allTab), enabling independent focus tracking.
	 *
	 * @private
	 * @returns {TabFocusData} Focus data for currently active tab view
	 * @since 0.1.0
	 */
	getCurrentTabData() {
		return this.focusRestoreData[this.focusRestoreData.activeTabName];
	}

	/**
	 * Update the active tab name based on which tab is currently visible
	 *
	 * Determines which tab view is currently active by checking the 'active'
	 * class on tab buttons and updates the internal tracking accordingly.
	 *
	 * @private
	 * @since 0.1.0
	 */
	updateActiveTabName() {
		const tabs = document.querySelectorAll(".tab-button");
		const currentTabIndex = [...tabs].findIndex(tab => tab.classList.contains("active"));
		this.focusRestoreData.activeTabName = (currentTabIndex === 0) ? 'currentTab' : 'allTab';
	}

	/**
	 * Set current item index to the position of the currently active browser tab
	 *
	 * Finds the currently active browser tab in the current view and sets the
	 * focus index to that position. Includes fallback strategies for complex
	 * multi-window scenarios.
	 *
	 * @param {number} currentTabId - ID of the currently active browser tab
	 * @param {number} [currentWindowId=null] - Current window ID for All Windows view
	 * @since 0.1.0
	 *
	 * @example
	 * // Set focus to active tab in current view
	 * focusManager.setCurrentItemIndexToActiveTab(activeTab.id);
	 *
	 * @example
	 * // Set focus in All Windows view with window context
	 * focusManager.setCurrentItemIndexToActiveTab(activeTab.id, currentWindow.id);
	 */
	setCurrentItemIndexToActiveTab(currentTabId, currentWindowId = null) {
		const activeTabContent = document.querySelector(".tab-content.active");
		if (!activeTabContent) return;

		const items = activeTabContent.querySelectorAll(".list-item");
		let found = false;

		// Get current tab data to update the correct tab's index
		this.updateActiveTabName();
		const tabData = this.getCurrentTabData();

		// First try: exact tabid match
		items.forEach((item, index) => {
			if (item.tabid == currentTabId) {
				tabData.currentIndex = index;
				found = true;
				return;
			}
		});

		// Second try: fallback to tab-active class
		if (!found) {
			items.forEach((item, index) => {
				if (item.classList.contains('tab-active')) {
					// For "All Windows" view: find tab-active from current window
					if (activeTabContent.id === 'allWindow' && currentWindowId) {
						if (item.windowId == currentWindowId) {
							tabData.currentIndex = index;
							found = true;
							return;
						}
					} else {
						// For "Current Window" view: use any tab-active (there should be only one)
						tabData.currentIndex = index;
						found = true;
						return;
					}
				}
			});

			// If All Windows view and we didn't find current window active, use first active as fallback
			if (!found && activeTabContent.id === 'allWindow') {
				items.forEach((item, index) => {
					if (item.classList.contains('tab-active')) {
						tabData.currentIndex = index;
						found = true;
						return;
					}
				});
			}
		}

		// Last resort: stay at 0
		if (!found) {
			tabData.currentIndex = 0;
		}
	}

	/**
	 * Get current item index for the active tab
	 *
	 * Returns the current focus position for the currently active tab view.
	 * Each tab view (Current/All Windows) maintains independent focus tracking.
	 *
	 * @returns {number} Current item index for the active tab view
	 * @since 0.1.0
	 *
	 * @example
	 * const currentIndex = focusManager.getCurrentItemIndex();
	 * console.log(`Currently focused on item ${currentIndex}`);
	 */
	getCurrentItemIndex() {
		this.updateActiveTabName();
		const tabData = this.getCurrentTabData();
		return tabData.currentIndex || 0;
	}
}

export default FocusManager;