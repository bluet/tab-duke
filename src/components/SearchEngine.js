/**
 * @fileoverview SearchEngine - Search and filtering service
 * @description Provides fast, real-time search functionality across all tab views
 * with intelligent window visibility management and counter updates. Extracted from
 * popup.js following service-oriented architecture principles.
 *
 * @author TabDuke Development Team
 * @since 0.1.0
 * @version 1.0.0
 */

/**
 * SearchEngine class - Search and filtering service
 *
 * Extracted from popup.js following the TODO.md service decomposition plan.
 * Provides fast, real-time search functionality with intelligent filtering
 * and window visibility management for optimal user experience.
 *
 * Key responsibilities:
 * - Real-time tab filtering based on search terms (title, URL matching)
 * - Intelligent window visibility management (hide windows with no visible tabs)
 * - Search input event handling with performance optimization
 * - Integration with counter updates for accurate statistics
 * - Search state management and persistence
 * - Case-insensitive and flexible matching algorithms
 *
 * Performance features:
 * - Efficient DOM filtering without re-rendering
 * - Optimized search algorithms for large tab collections
 * - Debounced counter updates for smooth UX
 * - Smart window grouping visibility logic
 *
 * @class SearchEngine
 * @since 0.1.0
 *
 * @example
 * const searchEngine = new SearchEngine();
 * searchEngine.initialize(searchInput, updateCounterCallback);
 * searchEngine.performSearch('github');
 */
class SearchEngine {
	/**
	 * Create a new SearchEngine instance
	 *
	 * Initializes the search engine with default state. Search input and callback
	 * are configured during initialization for clean separation of concerns.
	 *
	 * @since 0.1.0
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
	 * Initialize the search engine with required dependencies
	 *
	 * Must be called before performing searches to establish DOM references
	 * and callback functions. Sets up real-time event listeners.
	 *
	 * @param {HTMLElement} searchInput - Search input DOM element
	 * @param {Function} updateCounterCallback - Callback to update tab counters
	 * @since 0.1.0
	 *
	 * @example
	 * searchEngine.initialize(
	 *   document.getElementById('searchInput'),
	 *   (current, all) => updateCounters(current, all)
	 * );
	 */
	initialize(searchInput, updateCounterCallback) {
		this.searchInput = searchInput;
		this.updateCounterCallback = updateCounterCallback;

		// Setup event listeners
		this.setupEventListeners();
	}

	/**
	 * Setup event listeners for search functionality
	 *
	 * Attaches real-time search listeners to the search input element.
	 * Provides immediate visual feedback as user types.
	 *
	 * @private
	 * @since 0.1.0
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
	 * Handle search input events with real-time filtering
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
	 * Perform the actual search filtering
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
	 * Filter items within a specific tab content area
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
	 * Check if an item matches the search term
	 * @param {HTMLElement} item - List item to check
	 * @param {string} searchTerm - Search term
	 * @returns {boolean} - True if item matches search
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
	 * Update window visibility based on whether they contain visible tabs
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
	 * Check if a window has any visible tabs
	 * @param {HTMLElement} windowDiv - Window container element
	 * @returns {boolean} - True if window has visible tabs
	 */
	windowHasVisibleTabs(windowDiv) {
		const items = windowDiv.querySelectorAll(".list-item");
		return Array.from(items).some(item => item.style.display !== "none");
	}

	/**
	 * Clear the search and show all items
	 */
	clearSearch() {
		if (this.searchInput) {
			this.searchInput.value = '';
			this.performSearch('');
		}
	}

	/**
	 * Get current search term
	 * @returns {string} - Current search term
	 */
	getSearchTerm() {
		return this.searchInput ? this.searchInput.value.toLowerCase() : '';
	}

	/**
	 * Set search term programmatically
	 * @param {string} term - Search term to set
	 */
	setSearchTerm(term) {
		if (this.searchInput) {
			this.searchInput.value = term;
			this.performSearch(term.toLowerCase());
		}
	}

	/**
	 * Check if search is currently active
	 * @returns {boolean} - True if there's an active search
	 */
	isSearchActive() {
		return this.getSearchTerm().length > 0;
	}

	/**
	 * Get all currently visible items across all tab contents
	 * @returns {HTMLElement[]} - Array of visible items
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
	 * Get visible items count for a specific tab content
	 * @param {HTMLElement} tabContent - Tab content container
	 * @returns {number} - Number of visible items
	 */
	getVisibleItemsCount(tabContent) {
		const items = tabContent.querySelectorAll(".list-item");
		return Array.from(items).filter(item => item.style.display !== "none").length;
	}

	/**
	 * Focus the search input
	 */
	focusSearch() {
		if (this.searchInput) {
			this.searchInput.focus();
		}
	}

	/**
	 * Dispatch search event for other components to listen to
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
	 * Advanced search features (extensible for future enhancements)
	 */

	/**
	 * Search with regular expression
	 * @param {string} pattern - Regex pattern
	 * @param {string} flags - Regex flags
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