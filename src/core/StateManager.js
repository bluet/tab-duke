/**
 * StateManager - Focus and selection state management service
 *
 * Extracted from popup.js following the TODO.md plan
 * Manages the complex state operations that coordinate between multiple services.
 * Handles focus/selection state, multi-select warnings, and complex user interactions.
 *
 * Key responsibilities:
 * - Current item index and selection state management
 * - Multi-select warning system coordination
 * - Complex keyboard operation orchestration
 * - State persistence and restoration
 * - Cross-service coordination for complex operations
 *
 * Benefits:
 * - Single source of truth for all UI state
 * - Coordinated operations across services
 * - Professional state management patterns
 * - Easy to test and extend
 */
class StateManager {
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
	 * @param {HTMLElement} searchInput - Search input element
	 * @param {NodeList} tabs - Tab button elements
	 */
	initialize(searchInput, tabs) {
		this.searchInput = searchInput;
		this.tabs = tabs;
	}

	// State management methods

	/**
	 * Handle list navigation (ArrowUp/Down in list)
	 * @param {KeyboardEvent} e - Keyboard event
	 * @param {Object} context - Navigation context
	 */
	handleListNavigation(e, context) {
		const direction = e.key === 'ArrowUp' ? -1 : 1;
		const currentIndex = this.focusManager.getCurrentItemIndex();
		const newIndex = (currentIndex + direction + context.items.length) % context.items.length;
		this.focusManager.focusAndUpdateIndex(context.items[newIndex], newIndex, context.items, 'instant', true);
	}

	/**
	 * Handle page jump navigation (PageUp/PageDown)
	 * @param {number} direction - -10 for PageUp, +10 for PageDown
	 * @param {Object} context - Navigation context
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
	 * @param {KeyboardEvent} e - Keyboard event
	 * @param {Object} context - Navigation context
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

		// Restore focus after tab switch
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
				this.focusManager.restoreFocusAfterTabSwitch(newItems);
			}
		}, 10);
	}

	/**
	 * Handle window section navigation (Alt+ArrowUp/Down in All Windows tab)
	 * @param {KeyboardEvent} e - Keyboard event
	 * @param {Object} context - Navigation context
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
	 * @param {number} itemIndex - Index of item to toggle
	 * @param {HTMLElement[]} items - Array of all items
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
	 * @param {HTMLElement[]} items - Array of all items
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
	 * @param {Object} context - Navigation context
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
	 * @param {KeyboardEvent} e - Keyboard event
	 * @param {Object} context - Navigation context
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
	 * Handle Escape sequence (context-aware state clearing)
	 * @param {KeyboardEvent} e - Keyboard event
	 * @param {Object} context - Navigation context
	 */
	handleEscapeSequence(e, context) {
		// Always clear multi-select warning first
		this.clearMultiSelectWarning();

		if (this.searchInput === document.activeElement && this.searchInput.value !== "") {
			// Clear search text, stay in search
			this.searchInput.value = "";
			this.searchEngine.performSearch("");
			e.preventDefault();
		} else if (this.searchInput === document.activeElement) {
			// Empty search: allow popup close (don't preventDefault)
			return;
		} else {
			// In list: check for selections or move to search
			const selectedItems = context.activeTabContent.querySelectorAll(".list-item.selected");
			if (selectedItems.length > 0) {
				this.clearSelections(selectedItems);
				e.preventDefault();
			} else {
				this.focusManager.saveCurrentFocusPosition(context.items);
				this.searchInput.focus();
				e.preventDefault();
			}
		}
	}

	/**
	 * Jump to currently active tab with context-aware behavior (forward)
	 * - Current tab: Jump to active tab in current window
	 * - All tab: Cycle forward through active tabs across all windows
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
	 * - Current tab: Jump to active tab in current window (same as forward)
	 * - All tab: Cycle backward through active tabs across all windows
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
	 */
	cycleToNextActiveTabInAllView() {
		this.cycleActiveTabsInAllView(1); // Forward direction
	}

	/**
	 * Cycle through active tabs across windows in All view (backward)
	 */
	cycleToPreviousActiveTabInAllView() {
		this.cycleActiveTabsInAllView(-1); // Backward direction
	}

	/**
	 * Generic cycling method for active tabs in All view
	 * @param {number} direction - 1 for forward, -1 for backward
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
	 * @param {number} count - Number of selected items
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
	 * @param {NodeList} selectedItems - Selected items to clear
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
	 * @returns {number} - Current item index
	 */
	getCurrentItemIndex() {
		return this.focusManager.getCurrentItemIndex();
	}

	/**
	 * Set current item index (delegates to FocusManager)
	 * @param {number} index - New current item index
	 */
	setCurrentItemIndex(index) {
		// StateManager no longer maintains its own currentItemIndex
		// This method is kept for compatibility but does nothing
		// FocusManager is the single source of truth
	}

	/**
	 * Check if multi-select warning is active
	 * @returns {boolean} - True if warning is active
	 */
	isMultiSelectWarningActive() {
		return this.multiSelectWarningActive;
	}
}

export default StateManager;