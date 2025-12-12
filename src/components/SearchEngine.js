/**
 * SearchEngine - Search and filtering service
 *
 * Extracted from popup.js (lines 1150-1178) following the TODO.md plan
 * Provides fast, real-time search functionality across all tab views
 * with window visibility management and counter updates.
 *
 * Key responsibilities:
 * - Real-time tab filtering based on search terms
 * - Window visibility management (hide empty windows)
 * - Search input event handling
 * - Integration with counter updates
 * - Search state management
 *
 * Benefits:
 * - Centralized search logic
 * - Consistent filtering across all views
 * - Optimized search performance
 * - Easy to extend with advanced search features
 */
class SearchEngine {
	constructor() {
		this.searchInput = null;
		this.updateCounterCallback = null;
		this.lastSearchTerm = '';
	}

	/**
	 * Initialize the search engine with required dependencies
	 * @param {HTMLElement} searchInput - Search input element
	 * @param {Function} updateCounterCallback - Callback to update counters
	 */
	initialize(searchInput, updateCounterCallback) {
		this.searchInput = searchInput;
		this.updateCounterCallback = updateCounterCallback;

		// Setup event listeners
		this.setupEventListeners();
	}

	/**
	 * Setup event listeners for search functionality
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

		// Search in the text content of the item
		const text = item.textContent.toLowerCase();
		return text.includes(searchTerm);
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

	/**
	 * Search in specific fields (title, URL, etc.)
	 * @param {string} searchTerm - Term to search for
	 * @param {string[]} fields - Fields to search in ['title', 'url']
	 */
	searchInFields(searchTerm, fields = ['title', 'url']) {
		// This would require additional data attributes on items
		// Implementation would depend on how tab data is structured
		console.log('Advanced field search not yet implemented');
	}
}

export default SearchEngine;