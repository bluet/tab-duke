/**
 * @fileoverview StateManager - Complex state operations and keyboard orchestration
 * @description Manages complex application state including multi-select operations,
 * context-aware keyboard navigation, and sophisticated escape sequences. Extracted from
 * popup.js following service-oriented architecture principles.
 *
 * @author TabDuke Development Team
 * @since 0.1.0
 * @version 1.0.0
 * @chrome-extension Manifest V3 compatible
 * @requires chrome.tabs - For tab state management and operations
 * @performance Optimized for 1300+ tabs across 30+ windows
 * @complexity O(n) for most operations where n = visible tab count
 * @imports {NavigationContext, KeyboardEventContext, AccessibilityState} from '../types/TabDukeTypes.js'
 */

/**
 * StateManager class - Manages UI state and coordinates cross-service operations
 *
 * Central state management service that coordinates between FocusManager, TabManager,
 * SearchEngine, and AccessibilityHelpers. Handles complex user interactions like
 * multi-selection, keyboard navigation, and state persistence.
 *
 * @class StateManager
 * @since 0.1.0
 *
 * @example
 * const stateManager = new StateManager(
 *   focusManager, tabManager, searchEngine, accessibilityHelpers
 * );
 * stateManager.initialize(searchInput, tabs);
 */
class StateManager {
	/**
	 * Create a new StateManager instance
	 *
	 * Initializes the state manager with references to other core services.
	 * Sets up initial state variables and prepares for DOM initialization.
	 *
	 * @param {FocusManager} focusManager - Focus management service
	 * @param {TabManager} tabManager - Tab operations service
	 * @param {SearchEngine} searchEngine - Search functionality service
	 * @param {AccessibilityHelpers} accessibilityHelpers - Accessibility support service
	 * @since 0.1.0
	 */
	constructor(focusManager, tabManager, searchEngine, accessibilityHelpers) {
		this.focusManager = focusManager;
		this.tabManager = tabManager;
		this.searchEngine = searchEngine;
		this.accessibilityHelpers = accessibilityHelpers;

		// State variables
		this.multiSelectWarningActive = false;
		this.lastClickedIndex = -1; // For shift+click range selection

		// DOM references
		this.searchInput = null;
		this.tabs = null;
	}

	/**
	 * Initialize state manager with DOM references
	 *
	 * Must be called after DOM is ready to establish references to key UI elements.
	 * Enables the state manager to interact with the user interface.
	 *
	 * @param {HTMLElement} searchInput - Search input element
	 * @param {NodeList} tabs - Tab button elements for view switching
	 * @since 0.1.0
	 *
	 * @example
	 * const searchInput = document.getElementById('searchInput');
	 * const tabs = document.querySelectorAll('.tab-button');
	 * stateManager.initialize(searchInput, tabs);
	 */
	initialize(searchInput, tabs) {
		this.searchInput = searchInput;
		this.tabs = tabs;
	}

	// State management methods

	/**
	 * Handle list navigation (ArrowUp/Down in list)
	 *
	 * Manages vertical navigation through tab lists with wrap-around behavior.
	 * Updates focus position and coordinates with FocusManager for visual feedback.
	 *
	 * @param {KeyboardEvent} e - Keyboard event (ArrowUp or ArrowDown)
	 * @param {NavigationContext} context - Navigation context with items and state
	 * @since 0.1.0
	 *
	 * @typedef {Object} NavigationContext
	 * @property {HTMLElement[]} items - Array of list items
	 * @property {number} currentTabIndex - Currently active tab index
	 * @property {HTMLElement} activeTabContent - Active tab content element
	 */
	handleListNavigation(e, context) {
		const direction = e.key === 'ArrowUp' ? -1 : 1;
		const currentIndex = this.focusManager.getCurrentItemIndex();
		const newIndex = (currentIndex + direction + context.items.length) % context.items.length;
		this.focusManager.focusAndUpdateIndex(context.items[newIndex], newIndex, context.items, 'instant', true);
	}

	/**
	 * Handle page jump navigation (PageUp/PageDown)
	 *
	 * Enables fast navigation through long tab lists by jumping 10 items at a time.
	 * Only considers visible items to respect search filtering.
	 *
	 * @param {number} direction - Navigation direction (-10 for PageUp, +10 for PageDown)
	 * @param {NavigationContext} context - Navigation context with items and state
	 * @since 0.1.0
	 *
	 * @example
	 * // PageDown pressed - jump forward 10 items
	 * stateManager.handlePageJump(10, context);
	 */
	handlePageJump(direction, context) {
		const visibleItems = this.focusManager.findVisibleItems(context.items);
		if (visibleItems.length === 0) return;

		const currentIndex = this.focusManager.getCurrentItemIndex();
		const currentVisibleIndex = visibleItems.findIndex(item => item === context.items[currentIndex]);
		const targetIndex = Math.max(0, Math.min(visibleItems.length - 1, currentVisibleIndex + direction));
		const targetItem = visibleItems[targetIndex];
		const actualIndex = context.items.indexOf(targetItem);

		this.focusManager.focusAndUpdateIndex(targetItem, actualIndex, context.items);
	}

	/**
	 * Handle tab view switching (Ctrl+ArrowLeft/Right)
	 *
	 * Switches between "Current Window" and "All Windows" views while preserving
	 * focus position. Includes defensive checks for tab availability.
	 *
	 * @param {KeyboardEvent} e - Keyboard event (Ctrl+ArrowLeft or Ctrl+ArrowRight)
	 * @param {NavigationContext} context - Navigation context with current tab state
	 * @since 0.1.0
	 *
	 * @example
	 * // User presses Ctrl+ArrowRight to switch to next tab view
	 * stateManager.handleTabViewSwitch(event, context);
	 */
	handleTabViewSwitch(e, context) {
		e.preventDefault();

		// Defensive check for tabs
		if (!this.tabs || this.tabs.length === 0) {
			console.error('StateManager.handleTabViewSwitch: No tabs available');
			return;
		}

		const direction = e.key === 'ArrowLeft' ? -1 : 1;
		const newTabIndex = (context.currentTabIndex + direction + this.tabs.length) % this.tabs.length;

		this.focusManager.saveCurrentFocusPosition(context.items);

		// Defensive check for specific tab
		if (!this.tabs[newTabIndex]) {
			console.error(`StateManager.handleTabViewSwitch: Tab at index ${newTabIndex} not found`);
			return;
		}

		this.tabs[newTabIndex].click();

		// Restore focus after tab switch - each tab restores its own independent position
		setTimeout(() => {
			if (!this.tabs[newTabIndex] || !this.tabs[newTabIndex].dataset.tabTarget) {
				console.error(`StateManager.handleTabViewSwitch: Tab at index ${newTabIndex} missing dataset.tabTarget`);
				return;
			}

			const newTarget = document.querySelector(this.tabs[newTabIndex].dataset.tabTarget);
			if (!newTarget) {
				console.error(`StateManager.handleTabViewSwitch: Target element not found for ${this.tabs[newTabIndex].dataset.tabTarget}`);
				return;
			}

			const newItems = [...newTarget.querySelectorAll('.list-item')];
			if (newItems.length > 0) {
				// Let target tab restore its own saved position (independent focus per tab)
				this.focusManager.restoreSavedFocusPosition(newItems);
			}
		}, 10);
	}

	/**
	 * Handle window section navigation (Alt+ArrowUp/Down in All Windows tab)
	 *
	 * Enables jumping between window sections in the "All Windows" view using
	 * Alt+ArrowUp and Alt+ArrowDown. Only works when focused on list items,
	 * not when search input is active.
	 *
	 * @param {KeyboardEvent} e - Keyboard event (Alt+ArrowUp or Alt+ArrowDown)
	 * @param {NavigationContext} context - Navigation context with items and state
	 * @since 0.1.0
	 *
	 * @example
	 * // User presses Alt+ArrowDown in All Windows tab
	 * stateManager.handleWindowSectionNavigation(event, context);
	 */
	handleWindowSectionNavigation(e, context) {
		if (context.currentTabIndex !== 1 || this.searchInput === document.activeElement) return;

		e.preventDefault();
		const allWindowContent = document.getElementById("allWindow");
		const windowDivs = [...allWindowContent.querySelectorAll(".window")].filter(w => w.style.display !== "none");

		if (windowDivs.length <= 1) return;

		const currentIndex = this.focusManager.getCurrentItemIndex();
		const currentItem = context.items[currentIndex];
		const currentWindowDiv = currentItem.closest('.window');
		const currentWindowIndex = windowDivs.indexOf(currentWindowDiv);

		const direction = e.key === 'ArrowUp' ? -1 : 1;
		const targetWindowIndex = (currentWindowIndex + direction + windowDivs.length) % windowDivs.length;
		const targetWindowDiv = windowDivs[targetWindowIndex];

		const targetItems = [...targetWindowDiv.querySelectorAll('.list-item')].filter(item => item.style.display !== 'none');
		if (targetItems.length > 0) {
			const targetIndex = context.items.indexOf(targetItems[0]);
			this.focusManager.focusAndUpdateIndex(targetItems[0], targetIndex, context.items, 'smooth');
		}
	}

	/**
	 * Toggle selection of current item
	 *
	 * Toggles the selection state of a tab item and updates visual indicators.
	 * Used for multi-selection functionality with Space key or Ctrl+Click.
	 *
	 * @param {number} itemIndex - Index of item to toggle in the items array
	 * @param {HTMLElement[]} items - Array of all list items in current view
	 * @since 0.1.0
	 *
	 * @example
	 * // Toggle selection of item at index 5
	 * stateManager.toggleSelection(5, allListItems);
	 */
	toggleSelection(itemIndex, items) {
		const item = items[itemIndex];
		if (!item) return;

		item.classList.toggle("selected");
		item.classList.toggle("bg-blue-100");

		this.accessibilityHelpers.updateAriaSelected();
	}

	/**
	 * Select all visible items
	 *
	 * Selects all currently visible (non-filtered) items in the current view.
	 * Used for Ctrl+A functionality to enable bulk operations on filtered results.
	 * Announces the action to screen readers for accessibility.
	 *
	 * @param {HTMLElement[]} items - Array of all list items in current view
	 * @since 0.1.0
	 *
	 * @example
	 * // Select all visible tabs (respects current search filter)
	 * stateManager.selectAllVisible(currentViewItems);
	 */
	selectAllVisible(items) {
		const visibleItems = this.focusManager.findVisibleItems(items);
		visibleItems.forEach(item => {
			item.classList.add("selected", "bg-blue-100");
		});

		this.accessibilityHelpers.updateAriaSelected();
		this.accessibilityHelpers.announceToScreenReader(`Selected all ${visibleItems.length} visible tabs`);
	}

	/**
	 * Handle bulk delete operation
	 *
	 * Closes multiple selected tabs in parallel and removes them from the DOM.
	 * Coordinates with TabManager for actual tab closure and SearchEngine for
	 * counter updates. Used when Delete key is pressed with multiple selections.
	 *
	 * @param {NavigationContext} context - Navigation context with active tab content
	 * @returns {Promise<TabCloseResults>} Promise resolving to closure results with error details
	 * @throws {chrome.runtime.lastError} When Chrome API tab closure fails
	 * @throws {Error} When no tabs are selected or context is invalid
	 * @performance Parallel tab closure for optimal speed with large selections
	 * @chrome-api Uses ChromeAPI.removeTabs() via TabManager with error handling
	 * @accessibility Announces closure results to screen readers
	 * @since 0.1.0
	 *
	 * @example
	 * // Close all selected tabs with error handling
	 * const results = await stateManager.handleBulkDelete(navigationContext);
	 * if (!results.allSuccessful) {
	 *   console.warn(`Failed to close ${results.totalFailed} tabs`);
	 * }
	 */
	async handleBulkDelete(context) {
		const selectedItems = context.activeTabContent.querySelectorAll(".list-item.selected");
		if (selectedItems.length === 0) return;

		const tabIDs = Array.from(selectedItems).map(item => item.tabid);

		// Close tabs via TabManager
		const results = await this.tabManager.closeTabs(tabIDs);

		// Remove items from DOM
		selectedItems.forEach(item => item.remove());

		// Update counters (handled by SearchEngine or main)
		this.searchEngine?.performSearch(this.searchInput.value);
	}

	/**
	 * Handle Enter navigation with multi-select warning system
	 *
	 * Handles Enter key behavior with context awareness. From search input,
	 * navigates to first visible item. From list, implements multi-select warning
	 * system to prevent accidental navigation when multiple tabs are selected.
	 *
	 * @param {KeyboardEvent} e - Keyboard event (Enter key)
	 * @param {NavigationContext} context - Navigation context with active tab content
	 * @since 0.1.0
	 *
	 * @example
	 * // User presses Enter with multiple tabs selected
	 * stateManager.handleEnterNavigation(event, context);
	 * // Shows warning instead of navigating
	 */
	handleEnterNavigation(e, context) {
		if (this.searchInput === document.activeElement) {
			// From search: navigate to first visible item
			const firstVisible = this.focusManager.findFirstVisibleItem(context.items);
			if (firstVisible) {
				this.focusManager.focusAndUpdateIndex(firstVisible.item, firstVisible.index, context.items, 'smooth');
			}
		} else {
			// From list: handle multi-select warning system
			const selectedItems = context.activeTabContent.querySelectorAll(".list-item.selected");

			if (selectedItems.length > 1 && !this.multiSelectWarningActive) {
				this.showMultiSelectWarning(selectedItems.length);
			} else if (this.multiSelectWarningActive) {
				this.clearMultiSelectWarning();
			} else {
				// Normal navigation
				const currentIndex = this.focusManager.getCurrentItemIndex();
				const currentItem = context.items[currentIndex];
				this.tabManager.switchToTab(currentItem.tabid, currentItem.windowId);
			}
		}
	}

	/**
	 * Handle Escape sequence (improved context-aware state clearing)
	 *
	 * Implements a 5-priority context-aware Escape sequence designed for list-centric UX.
	 * Priority system: multi-select warning → selections → search text → search focus → popup close.
	 * Provides intuitive state clearing that respects user context and workflow.
	 *
	 * @param {KeyboardEvent} e - Keyboard event (Escape key)
	 * @param {NavigationContext} context - Navigation context with active tab content
	 * @since 0.1.0
	 *
	 * @example
	 * // Progressive escape behavior:
	 * // 1st press: Clear multi-select warning
	 * // 2nd press: Clear selections or search text (context-dependent)
	 * // 3rd press: Jump between search and list
	 * // 4th press: Allow popup close
	 */
	handleEscapeSequence(e, context) {
		// Priority 1: Always clear multi-select warning first
		this.clearMultiSelectWarning();

		const selectedItems = context.activeTabContent.querySelectorAll(".list-item.selected");
		const searchHasText = this.searchInput.value !== "";
		const focusInSearch = this.searchInput === document.activeElement;

		if (focusInSearch) {
			// Search field context
			if (searchHasText) {
				// Priority 4: Search field + has text → Clear text, stay in search
				this.searchInput.value = "";
				this.searchEngine.performSearch("");
				e.preventDefault();
			} else {
				// Priority 5: Search field + empty → Jump back to list (restore focus)
				this.focusManager.restoreSavedFocusPosition(context.items);
				e.preventDefault();
			}
		} else {
			// List context (default focus state)
			if (selectedItems.length > 0) {
				// Priority 2: List + selections → Clear selections, stay in list
				this.clearSelections(selectedItems);
				e.preventDefault();
			} else if (searchHasText) {
				// Priority 3A: List + no selections + search has text → Jump to search
				this.focusManager.saveCurrentFocusPosition(context.items);
				this.searchInput.focus();
				e.preventDefault();
			} else {
				// Priority 3B: List + no selections + search empty → Allow popup close
				return; // No preventDefault() - let browser close popup
			}
		}
	}

	/**
	 * Jump to currently active tab with context-aware behavior (forward)
	 *
	 * Provides context-aware active tab jumping that adapts based on current view:
	 * - Current Window view: Jump to active tab in current window
	 * - All Windows view: Cycle forward through active tabs across all windows
	 *
	 * @since 0.1.0
	 *
	 * @example
	 * // In Current Window view: jumps to active tab
	 * // In All Windows view: cycles to next active tab across windows
	 * stateManager.jumpToCurrentlyActiveTab();
	 */
	jumpToCurrentlyActiveTab() {
		const currentlyActiveTabContent = document.querySelector('.tab-content.active');

		if (currentlyActiveTabContent.id === 'currentWindow') {
			// Current tab behavior: Jump to active tab in current window (original behavior)
			this.jumpToActiveTabInCurrentView();
		} else {
			// All tab behavior: Cycle forward through active tabs across windows
			this.cycleToNextActiveTabInAllView();
		}
	}

	/**
	 * Jump to currently active tab with context-aware behavior (reverse)
	 *
	 * Provides reverse context-aware active tab jumping:
	 * - Current Window view: Jump to active tab in current window (same as forward)
	 * - All Windows view: Cycle backward through active tabs across all windows
	 *
	 * @since 0.1.0
	 *
	 * @example
	 * // In Current Window view: same as forward (jumps to active tab)
	 * // In All Windows view: cycles backward to previous active tab
	 * stateManager.jumpToCurrentlyActiveTabReverse();
	 */
	jumpToCurrentlyActiveTabReverse() {
		const currentlyActiveTabContent = document.querySelector('.tab-content.active');

		if (currentlyActiveTabContent.id === 'currentWindow') {
			// Current tab behavior: Same as forward - jump to active tab in current window
			this.jumpToActiveTabInCurrentView();
		} else {
			// All tab behavior: Cycle backward through active tabs across windows
			this.cycleToPreviousActiveTabInAllView();
		}
	}

	/**
	 * Jump to active tab in current view (for Current tab)
	 *
	 * Finds and focuses the currently active tab in the Current Window view.
	 * Used by both forward and reverse active tab jumping in Current Window context.
	 *
	 * @since 0.1.0
	 *
	 * @example
	 * // Jump to the active tab in current window view
	 * stateManager.jumpToActiveTabInCurrentView();
	 */
	jumpToActiveTabInCurrentView() {
		const currentTabContent = document.getElementById('currentWindow');
		const activeItem = currentTabContent.querySelector('.list-item.tab-active');

		if (activeItem) {
			const items = [...currentTabContent.querySelectorAll('.list-item')];
			const activeIndex = items.indexOf(activeItem);
			this.focusManager.focusAndUpdateIndex(activeItem, activeIndex, items, 'smooth');
			this.accessibilityHelpers.announceToScreenReader('Jumped to current active tab');
		}
	}

	/**
	 * Cycle through active tabs across windows in All view (forward)
	 *
	 * Cycles forward through active tabs across all windows in the All Windows view.
	 * Delegates to the generic cycling method with forward direction.
	 *
	 * @since 0.1.0
	 *
	 * @example
	 * // Move to next active tab across all windows
	 * stateManager.cycleToNextActiveTabInAllView();
	 */
	cycleToNextActiveTabInAllView() {
		this.cycleActiveTabsInAllView(1); // Forward direction
	}

	/**
	 * Cycle through active tabs across windows in All view (backward)
	 *
	 * Cycles backward through active tabs across all windows in the All Windows view.
	 * Delegates to the generic cycling method with backward direction.
	 *
	 * @since 0.1.0
	 *
	 * @example
	 * // Move to previous active tab across all windows
	 * stateManager.cycleToPreviousActiveTabInAllView();
	 */
	cycleToPreviousActiveTabInAllView() {
		this.cycleActiveTabsInAllView(-1); // Backward direction
	}

	/**
	 * Generic cycling method for active tabs in All view
	 *
	 * Core implementation for cycling through active tabs across windows.
	 * Handles complex logic for determining the next target based on current
	 * focus position and active tab locations across multiple windows.
	 *
	 * @param {number} direction - Navigation direction (1 for forward, -1 for backward)
	 * @since 0.1.0
	 *
	 * @example
	 * // Cycle forward through active tabs
	 * stateManager.cycleActiveTabsInAllView(1);
	 *
	 * @example
	 * // Cycle backward through active tabs
	 * stateManager.cycleActiveTabsInAllView(-1);
	 */
	cycleActiveTabsInAllView(direction) {
		const allTabContent = document.getElementById('allWindow');
		const allActiveItems = [...allTabContent.querySelectorAll('.list-item.tab-active')];

		if (allActiveItems.length === 0) return;

		// Find current focused item to determine next target
		const currentIndex = this.focusManager.getCurrentItemIndex();
		const allItems = [...allTabContent.querySelectorAll('.list-item')];
		const currentItem = allItems[currentIndex];

		// Find which active item to jump to next
		let targetActiveItem = null;

		if (currentItem && currentItem.classList.contains('tab-active')) {
			// Currently on an active item - find next/previous active item
			const currentActiveIndex = allActiveItems.indexOf(currentItem);
			let nextActiveIndex;
			if (direction === 1) {
				// Forward: next item (wrap to 0 at end)
				nextActiveIndex = (currentActiveIndex + 1) % allActiveItems.length;
			} else {
				// Backward: previous item (wrap to last at beginning)
				nextActiveIndex = (currentActiveIndex - 1 + allActiveItems.length) % allActiveItems.length;
			}
			targetActiveItem = allActiveItems[nextActiveIndex];
		} else {
			// Not on active item - jump to first active item in current window or next window
			// Find current item's window
			const currentWindow = currentItem ? currentItem.closest('.window') : null;

			if (currentWindow) {
				// Look for active item in current window first
				const activeInCurrentWindow = currentWindow.querySelector('.list-item.tab-active');
				if (activeInCurrentWindow) {
					targetActiveItem = activeInCurrentWindow;
				} else {
					// No active in current window, go to first/last active overall
					targetActiveItem = direction === 1 ? allActiveItems[0] : allActiveItems[allActiveItems.length - 1];
				}
			} else {
				// Fallback to first/last active item
				targetActiveItem = direction === 1 ? allActiveItems[0] : allActiveItems[allActiveItems.length - 1];
			}
		}

		if (targetActiveItem) {
			const targetIndex = allItems.indexOf(targetActiveItem);
			const windowTitle = targetActiveItem.closest('.window').querySelector('h2').textContent;
			this.focusManager.focusAndUpdateIndex(targetActiveItem, targetIndex, allItems, 'smooth');
			const directionText = direction === 1 ? 'forward to' : 'backward to';
			this.accessibilityHelpers.announceToScreenReader(`Jumped ${directionText} active tab in ${windowTitle}`);
		}
	}

	// Helper methods for complex state operations

	/**
	 * Show multi-select warning
	 *
	 * Displays a warning message when user attempts navigation with multiple
	 * selected items. Updates search input placeholder and styling to indicate
	 * warning state. Auto-clears after 5 seconds.
	 *
	 * @param {number} count - Number of selected items triggering the warning
	 * @since 0.1.0
	 *
	 * @example
	 * // Show warning for 5 selected tabs
	 * stateManager.showMultiSelectWarning(5);
	 * // Displays: "⚠️ 5 tabs selected - Use Delete to close all, Escape to cancel"
	 */
	showMultiSelectWarning(count) {
		this.searchInput.placeholder = `⚠️ ${count} tabs selected - Use Delete to close all, Escape to cancel`;
		this.searchInput.classList.add('warning-state');
		this.multiSelectWarningActive = true;

		setTimeout(() => {
			this.clearMultiSelectWarning();
		}, 5000);
	}

	/**
	 * Clear multi-select warning
	 *
	 * Removes the multi-select warning state and restores normal search input
	 * appearance. Resets placeholder text and removes warning styling.
	 *
	 * @since 0.1.0
	 *
	 * @example
	 * // Clear any active multi-select warning
	 * stateManager.clearMultiSelectWarning();
	 */
	clearMultiSelectWarning() {
		if (this.multiSelectWarningActive) {
			this.multiSelectWarningActive = false;
			this.searchInput.classList.remove('warning-state');
			// Restore original placeholder (would need to be stored)
			this.searchInput.placeholder = "Search tabs...";
		}
	}

	/**
	 * Clear all selections
	 *
	 * Removes selection state from all provided items and updates ARIA attributes
	 * for accessibility. Used by Escape sequence and other deselection operations.
	 *
	 * @param {NodeList|HTMLElement[]} selectedItems - Selected items to clear
	 * @since 0.1.0
	 *
	 * @example
	 * // Clear all currently selected items
	 * const selected = document.querySelectorAll('.list-item.selected');
	 * stateManager.clearSelections(selected);
	 */
	clearSelections(selectedItems) {
		selectedItems.forEach(item => {
			item.classList.remove("selected", "bg-blue-100");
		});
		this.accessibilityHelpers.updateAriaSelected();
	}

	// State getters and setters

	/**
	 * Get current item index (delegates to FocusManager)
	 *
	 * Returns the index of the currently focused item by delegating to FocusManager.
	 * FocusManager is the single source of truth for focus position.
	 *
	 * @returns {number} Current item index in the active view
	 * @since 0.1.0
	 *
	 * @example
	 * // Get the currently focused item index
	 * const currentIndex = stateManager.getCurrentItemIndex();
	 * console.log(`Currently focused on item ${currentIndex}`);
	 */
	getCurrentItemIndex() {
		return this.focusManager.getCurrentItemIndex();
	}

	/**
	 * Set current item index (delegates to FocusManager)
	 *
	 * Legacy method kept for compatibility. StateManager no longer maintains
	 * its own currentItemIndex - FocusManager is the single source of truth.
	 * This method does nothing but is preserved to avoid breaking existing code.
	 *
	 * @param {number} index - New current item index (ignored)
	 * @deprecated Use FocusManager methods directly for focus manipulation
	 * @since 0.1.0
	 *
	 * @example
	 * // This method is deprecated - use FocusManager directly instead
	 * // focusManager.focusAndUpdateIndex(item, index, items);
	 */
	setCurrentItemIndex(index) {
		// StateManager no longer maintains its own currentItemIndex
		// This method is kept for compatibility but does nothing
		// FocusManager is the single source of truth
	}

	/**
	 * Check if multi-select warning is active
	 *
	 * Returns the current state of the multi-select warning system.
	 * Used to determine if warning is currently displayed to user.
	 *
	 * @returns {boolean} True if multi-select warning is currently active
	 * @since 0.1.0
	 *
	 * @example
	 * // Check if warning is active before showing another warning
	 * if (!stateManager.isMultiSelectWarningActive()) {
	 *   stateManager.showMultiSelectWarning(count);
	 * }
	 */
	isMultiSelectWarningActive() {
		return this.multiSelectWarningActive;
	}
}

export default StateManager;