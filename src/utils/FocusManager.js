/**
 * FocusManager - Focus restoration and navigation service
 *
 * Extracted from popup.js (lines 24-168) following the TODO.md plan
 * Manages complex focus restoration across tab views with position memory
 * and provides smooth scrolling utilities for optimal user experience.
 *
 * Key responsibilities:
 * - Focus restoration after tab view switching
 * - Smart scrolling with instant/smooth modes
 * - Roving tabindex management for accessibility
 * - Position memory across tab views (current/all)
 * - Relative position calculations
 *
 * Benefits:
 * - Centralized focus logic eliminates duplication
 * - Testable focus behavior
 * - Consistent scrolling behavior across the app
 * - Professional accessibility implementation
 */
class FocusManager {
	constructor() {
		// Focus restoration data - tracks focus state per tab view
		this.focusRestoreData = {
			currentTab: {
				lastFocusedIndex: -1, // -1 means no previous focus data
				relativePosition: 0
			},
			allTab: {
				lastFocusedIndex: -1, // -1 means no previous focus data
				relativePosition: 0
			},
			activeTabName: 'currentTab' // 'currentTab' or 'allTab'
		};

		// Global state reference (will be injected)
		this.currentItemIndex = 0;
	}

	/**
	 * Set the global state reference
	 * @param {Object} state - Global state object with currentItemIndex
	 */
	setState(state) {
		this.currentItemIndex = state.currentItemIndex;
	}

	/**
	 * Focus an item with smart scrolling and update all related state
	 * @param {HTMLElement} item - Element to focus
	 * @param {number} index - Index of the item
	 * @param {HTMLElement[]} items - All items in the list
	 * @param {string} scrollMode - 'instant' or 'smooth' scrolling
	 * @param {boolean} saveFocus - Whether to save focus position
	 */
	focusAndUpdateIndex(item, index, items, scrollMode = 'instant', saveFocus = false) {
		// Apply focus with appropriate scrolling
		if (scrollMode === 'smooth') {
			this.focusWithSmoothScroll(item);
		} else {
			this.focusWithInstantScroll(item);
		}

		// Update global state
		this.currentItemIndex = index;

		// Update accessibility
		this.updateRovingTabindex(items, index);
		this.updateActiveDescendant(item);

		// Save focus position if requested
		if (saveFocus) {
			this.saveCurrentFocusPosition(items);
		}
	}

	/**
	 * Restore focus to previously saved position
	 * @param {HTMLElement[]} items - Items in the current view
	 * @returns {boolean} - True if focus was successfully restored
	 */
	restoreSavedFocusPosition(items) {
		this.updateActiveTabName(); // Update which tab is now active
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
	 * @param {HTMLElement[]} items - Current items list
	 */
	saveCurrentFocusPosition(items) {
		const tabData = this.getCurrentTabData();
		tabData.lastFocusedIndex = this.currentItemIndex;
		tabData.relativePosition = this.calculateRelativePosition(this.currentItemIndex, items.length);
	}

	/**
	 * Initialize focus data for the currently active browser tab
	 * @param {number} currentTabId - ID of the currently active browser tab
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

		// Set currentItemIndex for the currently visible tab view
		this.updateActiveTabName();
		if (this.focusRestoreData.activeTabName === 'currentTab' && currentTabIndex >= 0) {
			this.currentItemIndex = currentTabIndex;
		} else if (this.focusRestoreData.activeTabName === 'allTab' && allTabIndex >= 0) {
			this.currentItemIndex = allTabIndex;
		}
	}

	// Scrolling utilities

	/**
	 * Focus element with smart scrolling behavior
	 * @param {HTMLElement} item - Element to focus
	 * @param {string} transition - 'instant' or 'smooth'
	 */
	focusWithSmartScroll(item, transition = 'instant') {
		item.focus();
		item.scrollIntoView({
			block: 'nearest',    // Only scroll if not fully visible
			behavior: transition
		});
	}

	/**
	 * Focus element with smooth scrolling
	 * @param {HTMLElement} item - Element to focus
	 */
	focusWithSmoothScroll(item) {
		this.focusWithSmartScroll(item, 'smooth');
	}

	/**
	 * Focus element with instant scrolling
	 * @param {HTMLElement} item - Element to focus
	 */
	focusWithInstantScroll(item) {
		this.focusWithSmartScroll(item, 'instant');
	}

	// Accessibility utilities

	/**
	 * Update roving tabindex for keyboard navigation
	 * @param {HTMLElement[]} items - All items in the list
	 * @param {number} focusedIndex - Index of the focused item
	 */
	updateRovingTabindex(items, focusedIndex) {
		items.forEach((item, index) => {
			item.tabIndex = (index === focusedIndex) ? 0 : -1;
		});
	}

	/**
	 * Update ARIA active descendant for accessibility
	 * @param {HTMLElement} focusedItem - Currently focused item
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
	 * @param {HTMLElement[]} items - Items to search
	 * @returns {Object|null} - {item: HTMLElement, index: number} or null
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
	 * @param {HTMLElement[]} items - Items to search
	 * @returns {Object|null} - {item: HTMLElement, index: number} or null
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
	 * @param {HTMLElement[]} items - Items to filter
	 * @returns {HTMLElement[]} - Array of visible items
	 */
	findVisibleItems(items) {
		return items.filter(item => item.style.display !== 'none');
	}

	// Private helper methods

	/**
	 * Calculate relative position within a list
	 * @private
	 * @param {number} currentIndex - Current index
	 * @param {number} totalItems - Total number of items
	 * @returns {number} - Relative position (0-1)
	 */
	calculateRelativePosition(currentIndex, totalItems) {
		return totalItems > 0 ? currentIndex / totalItems : 0;
	}

	/**
	 * Get the current tab's focus data
	 * @private
	 * @returns {Object} - Focus data for current tab
	 */
	getCurrentTabData() {
		return this.focusRestoreData[this.focusRestoreData.activeTabName];
	}

	/**
	 * Update the active tab name based on which tab is currently visible
	 * @private
	 */
	updateActiveTabName() {
		const tabs = document.querySelectorAll(".tab-button");
		const currentTabIndex = [...tabs].findIndex(tab => tab.classList.contains("active"));
		this.focusRestoreData.activeTabName = (currentTabIndex === 0) ? 'currentTab' : 'allTab';
	}

	/**
	 * Set current item index to the position of the currently active browser tab
	 * @param {number} currentTabId - ID of the currently active tab
	 */
	setCurrentItemIndexToActiveTab(currentTabId, currentWindowId = null) {
		const activeTabContent = document.querySelector(".tab-content.active");
		if (!activeTabContent) return;

		const items = activeTabContent.querySelectorAll(".list-item");
		let found = false;

		// First try: exact tabid match
		items.forEach((item, index) => {
			if (item.tabid == currentTabId) {
				this.currentItemIndex = index;
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
							this.currentItemIndex = index;
							found = true;
							return;
						}
					} else {
						// For "Current Window" view: use any tab-active (there should be only one)
						this.currentItemIndex = index;
						found = true;
						return;
					}
				}
			});

			// If All Windows view and we didn't find current window active, use first active as fallback
			if (!found && activeTabContent.id === 'allWindow') {
				items.forEach((item, index) => {
					if (item.classList.contains('tab-active')) {
						this.currentItemIndex = index;
						found = true;
						return;
					}
				});
			}
		}

		// Last resort: stay at 0
		if (!found) {
			this.currentItemIndex = 0;
		}
	}

	/**
	 * Get current item index
	 * @returns {number} - Current item index
	 */
	getCurrentItemIndex() {
		return this.currentItemIndex || 0;
	}
}

export default FocusManager;