/**
 * Fast, real-time search functionality across all tab views with intelligent window visibility management.
 * Extracted from popup.js following service-oriented architecture principles.
 */

/**
 * Search and filtering service with real-time tab filtering and intelligent window visibility management.
 * Handles search input events, DOM filtering, counter updates, and search state management.
 */
class SearchEngine {
	/**
	 * Creates a new SearchEngine instance with default state.
	 * Search input and callback are configured during initialization.
	 */
	constructor() {
		/** @private */
		this.searchInput = null;
		/** @private */
		this.updateCounterCallback = null;
		/** @private */
		this.lastSearchTerm = '';
	}

	/**
	 * Initialize the search engine with DOM references and callback functions.
	 * Must be called before performing searches. Sets up real-time event listeners.
	 * @param {HTMLElement} searchInput - Search input DOM element
	 * @param {Function} updateCounterCallback - Callback to update tab counters
	 */
	initialize(searchInput, updateCounterCallback) {
		this.searchInput = searchInput;
		this.updateCounterCallback = updateCounterCallback;

		// Setup event listeners
		this.setupEventListeners();
	}

	/**
	 * Attaches real-time search listeners to the search input element.
	 * Provides immediate visual feedback as user types.
	 * @private
	 */
	setupEventListeners() {
		if (!this.searchInput) {
			console.error('SearchEngine: Search input not initialized');
			return;
		}

		// Real-time search as user types
		this.searchInput.addEventListener('input', (e) => {
			this.handleSearchInput(e);
		});

		// Handle other search-related events
		this.searchInput.addEventListener('keydown', (e) => {
			// Handle special keys like Escape to clear search
			if (e.key === 'Escape' && this.searchInput.value !== '') {
				this.clearSearch();
				e.preventDefault();
			}
		});
	}

	/**
	 * Handles search input events with real-time filtering and performance optimization.
	 * @param {Event} e - Input event from search field
	 */
	handleSearchInput(e) {
		const searchTerm = this.searchInput.value.toLowerCase();

		// Skip if search term hasn't changed (performance optimization)
		if (searchTerm === this.lastSearchTerm) {
			return;
		}

		this.lastSearchTerm = searchTerm;
		this.performSearch(searchTerm);
	}

	/**
	 * Performs search filtering across all tab content areas and updates counters.
	 * @param {string} searchTerm - Term to search for
	 */
	performSearch(searchTerm) {
		// Get all tab content areas (Current and All tabs)
		const allTabContents = document.querySelectorAll(".tab-content");

		allTabContents.forEach((tabContent) => {
			this.filterTabContent(tabContent, searchTerm);
		});

		// Update counters for both tabs after filtering
		if (this.updateCounterCallback) {
			this.updateCounterCallback();
		}

		// Trigger search event for other components
		this.dispatchSearchEvent(searchTerm);
	}

	/**
	 * Filters items within a specific tab content area and updates window visibility.
	 * @param {HTMLElement} tabContent - Tab content container
	 * @param {string} searchTerm - Search term to filter by
	 */
	filterTabContent(tabContent, searchTerm) {
		const items = tabContent.querySelectorAll(".list-item");

		// Filter individual tab items
		items.forEach((item) => {
			const isVisible = this.itemMatchesSearch(item, searchTerm);
			item.style.display = isVisible ? "flex" : "none";
		});

		// Hide windows that have no visible tabs (CRITICAL for "All" tab functionality)
		this.updateWindowVisibility(tabContent);
	}

	/**
	 * Checks if an item matches the search term with case-insensitive text matching.
	 * @param {HTMLElement} item - List item to check
	 * @param {string} searchTerm - Search term
	 * @returns {boolean} True if item matches search
	 */
	itemMatchesSearch(item, searchTerm) {
		if (!searchTerm) {
			return true; // Empty search shows all items
		}

		// Search in the text content of the item - FIXED: case-insensitive search
		const text = item.textContent.toLowerCase();
		return text.includes(searchTerm.toLowerCase());
	}

	/**
	 * Updates window visibility based on whether they contain visible tabs.
	 * Critical for "All Windows" tab functionality.
	 * @param {HTMLElement} tabContent - Tab content container
	 */
	updateWindowVisibility(tabContent) {
		const windows = tabContent.querySelectorAll(".window");

		windows.forEach((windowDiv) => {
			const hasVisibleTabs = this.windowHasVisibleTabs(windowDiv);
			windowDiv.style.display = hasVisibleTabs ? "block" : "none";
		});
	}

	/**
	 * Checks if a window has any visible tabs.
	 * @param {HTMLElement} windowDiv - Window container element
	 * @returns {boolean} True if window has visible tabs
	 */
	windowHasVisibleTabs(windowDiv) {
		const items = windowDiv.querySelectorAll(".list-item");
		return Array.from(items).some(item => item.style.display !== "none");
	}

	/**
	 * Clears the search input and shows all items.
	 */
	clearSearch() {
		if (this.searchInput) {
			this.searchInput.value = '';
			this.performSearch('');
		}
	}

	/**
	 * Gets current search term.
	 * @returns {string} Current search term
	 */
	getSearchTerm() {
		return this.searchInput ? this.searchInput.value.toLowerCase() : '';
	}

	/**
	 * Sets search term programmatically and performs the search.
	 * @param {string} term - Search term to set
	 */
	setSearchTerm(term) {
		if (this.searchInput) {
			this.searchInput.value = term;
			this.performSearch(term.toLowerCase());
		}
	}

	/**
	 * Checks if search is currently active.
	 * @returns {boolean} True if there's an active search
	 */
	isSearchActive() {
		return this.getSearchTerm().length > 0;
	}

	/**
	 * Gets all currently visible items across all tab contents.
	 * @returns {HTMLElement[]} Array of visible items
	 */
	getVisibleItems() {
		const visibleItems = [];
		const allItems = document.querySelectorAll(".tab-content .list-item");

		allItems.forEach(item => {
			if (item.style.display !== "none") {
				visibleItems.push(item);
			}
		});

		return visibleItems;
	}

	/**
	 * Gets visible items count for a specific tab content.
	 * @param {HTMLElement} tabContent - Tab content container
	 * @returns {number} Number of visible items
	 */
	getVisibleItemsCount(tabContent) {
		const items = tabContent.querySelectorAll(".list-item");
		return Array.from(items).filter(item => item.style.display !== "none").length;
	}

	/**
	 * Focuses the search input.
	 */
	focusSearch() {
		if (this.searchInput) {
			this.searchInput.focus();
		}
	}

	/**
	 * Dispatches search event for other components to listen to.
	 * @param {string} searchTerm - Current search term
	 */
	dispatchSearchEvent(searchTerm) {
		const searchEvent = new CustomEvent('tabSearch', {
			detail: {
				term: searchTerm,
				isActive: searchTerm.length > 0,
				visibleCount: this.getVisibleItems().length
			}
		});

		document.dispatchEvent(searchEvent);
	}

	/**
	 * Searches with regular expression support for advanced filtering.
	 * @param {string} pattern - Regex pattern
	 * @param {string} flags - Regex flags (default: 'i' for case-insensitive)
	 */
	searchWithRegex(pattern, flags = 'i') {
		try {
			const regex = new RegExp(pattern, flags);
			const allTabContents = document.querySelectorAll(".tab-content");

			allTabContents.forEach((tabContent) => {
				const items = tabContent.querySelectorAll(".list-item");

				items.forEach((item) => {
					const text = item.textContent;
					const isVisible = regex.test(text);
					item.style.display = isVisible ? "flex" : "none";
				});

				this.updateWindowVisibility(tabContent);
			});

			if (this.updateCounterCallback) {
				this.updateCounterCallback();
			}
		} catch (error) {
			console.error('SearchEngine: Invalid regex pattern:', error.message);
		}
	}

}

export default SearchEngine;