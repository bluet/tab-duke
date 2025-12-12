/**
 * AccessibilityHelpers - ARIA management and screen reader support
 *
 * Extracted from popup.js (lines 463-501) following the TODO.md plan
 * Provides comprehensive accessibility support for the TabDuke extension
 * with proper ARIA attributes and screen reader announcements.
 *
 * Key responsibilities:
 * - ARIA active descendant management
 * - Selection state announcements
 * - Tab state management for accessibility
 * - Screen reader live region announcements
 * - Accessibility attribute coordination
 *
 * Benefits:
 * - Centralized accessibility logic
 * - Consistent ARIA implementation
 * - Professional accessibility support
 * - Easy to maintain and extend
 */
class AccessibilityHelpers {
	constructor() {
		// Screen reader announcement element
		this.announceElement = null;
		this.initializeScreenReaderSupport();
	}

	/**
	 * Initialize screen reader support elements
	 */
	initializeScreenReaderSupport() {
		// Create announcement element if it doesn't exist
		let announceElement = document.getElementById('sr-announcements');
		if (!announceElement) {
			announceElement = document.createElement('div');
			announceElement.id = 'sr-announcements';
			announceElement.setAttribute('aria-live', 'polite');
			announceElement.setAttribute('aria-atomic', 'true');
			announceElement.className = 'sr-only';
			document.body.appendChild(announceElement);
		}
		this.announceElement = announceElement;
	}

	/**
	 * Update ARIA active descendant for focused item
	 * @param {HTMLElement} focusedItem - Currently focused item
	 */
	updateActiveDescendant(focusedItem) {
		if (!focusedItem) return;

		const listbox = focusedItem.closest('[role="listbox"]');
		if (listbox) {
			listbox.setAttribute('aria-activedescendant', focusedItem.id || '');
		}
	}

	/**
	 * Update ARIA selection states for all items in active view
	 */
	updateAriaSelected() {
		const activeTabContent = document.querySelector('.tab-content.active');
		if (!activeTabContent) return;

		const items = activeTabContent.querySelectorAll('.list-item');

		items.forEach(item => {
			const isSelected = item.classList.contains('selected');
			item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
		});
	}

	/**
	 * Update tab states for accessibility
	 * @param {number} activeTabIndex - Index of the active tab
	 */
	updateTabAriaStates(activeTabIndex) {
		const tabs = document.querySelectorAll('[role="tab"]');

		tabs.forEach((tab, index) => {
			const isActive = index === activeTabIndex;
			tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
			tab.setAttribute('tabindex', isActive ? '0' : '-1');

			// Update corresponding tabpanel
			const tabpanel = document.querySelector(tab.getAttribute('data-tab-target'));
			if (tabpanel) {
				tabpanel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
			}
		});
	}

	/**
	 * Announce message to screen readers
	 * @param {string} message - Message to announce
	 * @param {string} priority - 'polite' (default) or 'assertive'
	 */
	announceToScreenReader(message, priority = 'polite') {
		if (!this.announceElement || !message) return;

		// Update priority if needed
		if (this.announceElement.getAttribute('aria-live') !== priority) {
			this.announceElement.setAttribute('aria-live', priority);
		}

		// Clear any existing message first
		this.announceElement.textContent = '';

		// Use setTimeout to ensure screen readers pick up the change
		setTimeout(() => {
			this.announceElement.textContent = message;

			// Clear after 1 second to avoid clutter
			setTimeout(() => {
				if (this.announceElement.textContent === message) {
					this.announceElement.textContent = '';
				}
			}, 1000);
		}, 10);
	}

	/**
	 * Set up ARIA attributes for tab list items
	 * @param {HTMLElement} listItem - List item element
	 * @param {Object} tabData - Tab data object
	 * @param {number} tabID - Tab ID
	 */
	setupTabItemAccessibility(listItem, tabData, tabID) {
		// Basic ARIA attributes
		listItem.setAttribute('role', 'option');
		listItem.setAttribute('aria-selected', 'false');
		listItem.setAttribute('id', `tab-option-${tabID}`);
		listItem.setAttribute('aria-describedby', `tab-${tabID}-description`);

		// Add keyboard interaction hints
		listItem.setAttribute('aria-label', `${tabData.title || 'Untitled'} - Press Space to select, Delete to close`);

		// Add state information
		if (tabData.active) {
			listItem.setAttribute('aria-current', 'true');
		}

		// Add window context
		listItem.setAttribute('aria-setsize', '-1'); // Will be updated when rendering complete
		listItem.setAttribute('aria-posinset', '-1'); // Will be updated when rendering complete
	}

	/**
	 * Update position information for items (after rendering)
	 * @param {HTMLElement[]} items - All items in the list
	 */
	updatePositionInfo(items) {
		const visibleItems = items.filter(item => item.style.display !== 'none');

		visibleItems.forEach((item, index) => {
			item.setAttribute('aria-setsize', visibleItems.length.toString());
			item.setAttribute('aria-posinset', (index + 1).toString());
		});
	}

	/**
	 * Set up listbox ARIA attributes for containers
	 * @param {HTMLElement} container - Container element
	 * @param {string} label - Accessible label for the listbox
	 */
	setupListboxAccessibility(container, label) {
		if (!container) return;

		container.setAttribute('role', 'listbox');
		container.setAttribute('aria-label', label);
		container.setAttribute('aria-multiselectable', 'true');
		container.setAttribute('tabindex', '0');
	}

	/**
	 * Announce search results
	 * @param {number} totalCount - Total number of results
	 * @param {string} searchTerm - Current search term
	 */
	announceSearchResults(totalCount, searchTerm) {
		let message;
		if (!searchTerm || searchTerm === '') {
			message = `Showing all tabs`;
		} else if (totalCount === 0) {
			message = `No tabs found for "${searchTerm}"`;
		} else if (totalCount === 1) {
			message = `1 tab found for "${searchTerm}"`;
		} else {
			message = `${totalCount} tabs found for "${searchTerm}"`;
		}

		this.announceToScreenReader(message);
	}

	/**
	 * Announce selection changes
	 * @param {number} selectedCount - Number of selected items
	 * @param {string} action - Action performed ('selected', 'deselected', 'cleared')
	 */
	announceSelectionChange(selectedCount, action = 'selected') {
		let message;

		switch (action) {
			case 'selected':
				if (selectedCount === 0) {
					message = 'No items selected';
				} else if (selectedCount === 1) {
					message = '1 item selected';
				} else {
					message = `${selectedCount} items selected`;
				}
				break;
			case 'deselected':
				message = 'Item deselected';
				break;
			case 'cleared':
				message = 'All selections cleared';
				break;
			default:
				message = `Selection ${action}`;
		}

		this.announceToScreenReader(message);
	}

	/**
	 * Announce navigation changes
	 * @param {string} location - Description of new location
	 */
	announceNavigation(location) {
		this.announceToScreenReader(location);
	}

	/**
	 * Announce tab operations
	 * @param {string} operation - Operation performed ('closed', 'switched', 'focused')
	 * @param {number} count - Number of items affected (optional)
	 */
	announceTabOperation(operation, count = 1) {
		let message;

		switch (operation) {
			case 'closed':
				message = count === 1 ? 'Tab closed' : `${count} tabs closed`;
				break;
			case 'switched':
				message = 'Switched to tab';
				break;
			case 'focused':
				message = 'Tab focused';
				break;
			default:
				message = `Tab ${operation}`;
		}

		this.announceToScreenReader(message);
	}

	/**
	 * Set up keyboard shortcut hints using safe DOM methods
	 * @param {HTMLElement} container - Container to add hints to
	 */
	addKeyboardHints(container) {
		if (!container) return;

		const hintsContainer = document.createElement('div');
		hintsContainer.className = 'sr-only';

		// Create paragraphs safely using DOM methods
		const hint1 = document.createElement('p');
		hint1.textContent = 'Keyboard navigation: Use Arrow keys to navigate, Space to select, Delete to close tabs.';

		const hint2 = document.createElement('p');
		hint2.textContent = 'Tab key to switch between search and list. Ctrl+A to select all.';

		const hint3 = document.createElement('p');
		hint3.textContent = 'Ctrl+G to jump to active tab. Escape to clear selections or search.';

		hintsContainer.appendChild(hint1);
		hintsContainer.appendChild(hint2);
		hintsContainer.appendChild(hint3);

		container.appendChild(hintsContainer);
	}

	/**
	 * Update focus trap for modal-like behavior
	 * @param {HTMLElement} container - Container to trap focus within
	 * @param {boolean} enable - Whether to enable or disable focus trap
	 */
	updateFocusTrap(container, enable = true) {
		if (!container) return;

		if (enable) {
			container.setAttribute('aria-modal', 'true');
			container.setAttribute('role', 'dialog');

			// Add focus trap event listeners if needed
			// This would be implemented based on specific focus trap requirements
		} else {
			container.removeAttribute('aria-modal');
			container.removeAttribute('role');
		}
	}

	/**
	 * Clean up accessibility resources
	 */
	cleanup() {
		if (this.announceElement && this.announceElement.parentNode) {
			this.announceElement.parentNode.removeChild(this.announceElement);
		}
	}
}

export default AccessibilityHelpers;