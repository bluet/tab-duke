/**
 * Manages complex application state and coordinates cross-service operations.
 * Handles multi-select operations, keyboard navigation, and escape sequences.
 */

/**
 * Central state management service coordinating FocusManager, TabManager, SearchEngine.
 * Handles complex user interactions like multi-selection and keyboard navigation.
 */
class StateManager {
	/**
	 * Creates StateManager with service dependencies for coordinated state management.
	 * @param {FocusManager} focusManager - Focus management service
	 * @param {TabManager} tabManager - Tab operations service
	 * @param {SearchEngine} searchEngine - Search functionality service
	 * @param {AccessibilityHelpers} accessibilityHelpers - Accessibility support service
	 */
	constructor(focusManager, tabManager, searchEngine, accessibilityHelpers) {
		this.focusManager = focusManager;
		this.tabManager = tabManager;
		this.searchEngine = searchEngine;
		this.accessibilityHelpers = accessibilityHelpers;

		// State variables
		this.lastClickedIndex = -1; // For shift+click range selection

		// DOM references
		this.searchInput = null;
		this.tabs = null;
	}

	/**
	 * Initializes state manager with DOM references after DOM is ready.
	 * @param {HTMLElement} searchInput - Search input element
	 * @param {NodeList} tabs - Tab button elements for view switching
	 */
	initialize(searchInput, tabs) {
		this.searchInput = searchInput;
		this.tabs = tabs;
	}

	// State management methods

	/**
	 * Handles vertical navigation through tab lists with wrap-around behavior.
	 * Coordinates with FocusManager for smooth visual feedback and position tracking.
	 * @param {KeyboardEvent} e - Keyboard event (ArrowUp or ArrowDown)
	 * @param {NavigationContext} context - Navigation context with items and state
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
	 * Handles window section navigation (Alt+ArrowUp/Down) in "All Windows" view.
	 * Jumps between window sections, only active when focused on list items, not search input.
	 * @param {KeyboardEvent} e - Keyboard event (Alt+ArrowUp or Alt+ArrowDown)
	 * @param {NavigationContext} context - Navigation context with items and state
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
	 * Handles bulk delete operation for multiple selected tabs with parallel closure.
	 * Coordinates with TabManager for tab closure and SearchEngine for counter updates.
	 * @param {NavigationContext} context - Navigation context with active tab content
	 * @returns {Promise<TabCloseResults>} Results with success/failure arrays and accessibility announcements
	 */
	async handleBulkDelete(context) {
		const selectedItems = context.activeTabContent.querySelectorAll(".list-item.selected");
		if (selectedItems.length === 0) return;

		const tabIDs = Array.from(selectedItems).map(item => Number(item.dataset.tabid));

		// Close tabs via TabManager
		const results = await this.tabManager.closeTabs(tabIDs);

		// Remove only successfully closed tabs from DOM
		const successfulTabIds = new Set(results.success);
		selectedItems.forEach(item => {
			if (successfulTabIds.has(Number(item.dataset.tabid))) {
				item.remove();
			}
		});

		// Log any failures for debugging
		if (results.failed.length > 0) {
			console.warn('TabDuke: Failed to close', results.failed.length, 'tabs:', results.failed);
		}

		// Update counters (handled by SearchEngine or main)
		this.searchEngine?.performSearch(this.searchInput.value);
	}

	/**
	 * Handle Enter navigation with multi-select confirmation
	 *
	 * Handles Enter key behavior with context awareness. From search input,
	 * navigates to first visible item. From list with multiple selections,
	 * shows confirmation dialog before navigating to focused item.
	 *
	 * @param {KeyboardEvent} e - Keyboard event (Enter key)
	 * @param {NavigationContext} context - Navigation context with active tab content
	 * @since 0.1.0
	 *
	 * @example
	 * // User presses Enter with multiple tabs selected
	 * stateManager.handleEnterNavigation(event, context);
	 * // Shows confirm dialog: "⚠️ Unable to open 3 selected tabs at once.\nDo you mean to open focused 'GitHub'?"
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

			if (selectedItems.length > 1) {
				// Show blocking confirmation dialog for multi-select + Enter
				const currentIndex = this.focusManager.getCurrentItemIndex();
				const currentItem = context.items[currentIndex];

				if (currentItem) {
					const tabTitle = currentItem.querySelector('.truncated span')?.textContent || 'this tab';
					const confirmed = confirm(`⚠️ Unable to open ${selectedItems.length} selected tabs at once.\nDo you mean to open focused "${tabTitle}"?`);

					if (confirmed) {
						this.tabManager.switchToTab(Number(currentItem.dataset.tabid), Number(currentItem.dataset.windowid));
					}
					// If canceled, do nothing - selections remain intact
				}
			} else {
				// Normal navigation for single/no selection
				const currentIndex = this.focusManager.getCurrentItemIndex();
				const currentItem = context.items[currentIndex];
				if (currentItem) {
					this.tabManager.switchToTab(Number(currentItem.dataset.tabid), Number(currentItem.dataset.windowid));
				}
			}
		}
	}

	/**
	 * Handles progressive Escape sequence with context-aware state clearing.
	 * Priority system: multi-select warning → selections → search text → search focus → popup close.
	 * @param {KeyboardEvent} e - Keyboard event (Escape key)
	 * @param {NavigationContext} context - Navigation context with active tab content
	 */
	handleEscapeSequence(e, context) {
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
	 * Jump to currently active tab with context-aware behavior (forward).
	 * Current Window: jump to active tab; All Windows: cycle forward through active tabs.
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
	 * Jump to currently active tab with context-aware behavior (reverse).
	 * Current Window: same as forward; All Windows: cycle backward through active tabs.
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
	 * Finds and focuses the currently active tab in Current Window view.
	 * Used by both forward and reverse active tab jumping.
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
	 * Cycles forward through active tabs across all windows in All Windows view.
	 * Delegates to the generic cycling method with forward direction.
	 */
	cycleToNextActiveTabInAllView() {
		this.cycleActiveTabsInAllView(1); // Forward direction
	}

	/**
	 * Cycles backward through active tabs across all windows in All Windows view.
	 * Delegates to the generic cycling method with backward direction.
	 */
	cycleToPreviousActiveTabInAllView() {
		this.cycleActiveTabsInAllView(-1); // Backward direction
	}

	/**
	 * Core implementation for cycling through active tabs across windows.
	 * Handles complex logic for determining next target based on current focus position.
	 * @param {number} direction - Navigation direction (1 for forward, -1 for backward)
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
	 * Removes selection state from all provided items and updates ARIA attributes.
	 * Used by Escape sequence and other deselection operations.
	 * @param {NodeList|HTMLElement[]} selectedItems - Selected items to clear
	 */
	clearSelections(selectedItems) {
		selectedItems.forEach(item => {
			item.classList.remove("selected", "bg-blue-100");
		});
		this.accessibilityHelpers.updateAriaSelected();
	}

	// State getters and setters

	/**
	 * Returns the index of the currently focused item by delegating to FocusManager.
	 * FocusManager is the single source of truth for focus position.
	 * @returns {number} Current item index in the active view
	 */
	getCurrentItemIndex() {
		return this.focusManager.getCurrentItemIndex();
	}

	/**
	 * Legacy method kept for compatibility - does nothing.
	 * FocusManager is the single source of truth for focus position.
	 * @param {number} index - New current item index (ignored)
	 * @deprecated Use FocusManager methods directly for focus manipulation
	 */
	setCurrentItemIndex(index) {
		// StateManager no longer maintains its own currentItemIndex
		// This method is kept for compatibility but does nothing
		// FocusManager is the single source of truth
	}

}

export default StateManager;