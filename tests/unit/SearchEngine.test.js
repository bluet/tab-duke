/**
 * SearchEngine Unit Tests - CORRECTED IMPLEMENTATION
 *
 * Tests the REAL SearchEngine class from src/components/SearchEngine.js
 * - Imports actual 342-line ES6 class implementation
 * - Tests real DOM manipulation algorithms and event handling
 * - Proper JSDOM setup for realistic browser environment testing
 */

import SearchEngine from '../../src/components/SearchEngine.js';

describe('SearchEngine Unit Tests - Real Implementation', () => {
	let searchEngine;
	let mockSearchInput;
	let mockUpdateCounter;

	// Setup realistic DOM environment for SearchEngine testing
	const setupMockDOM = () => {
		// Create mock elements that SearchEngine actually uses
		const mockTabContent = document.createElement('div');
		mockTabContent.className = 'tab-content';
		document.body.appendChild(mockTabContent);

		// Create mock search input matching actual popup.html
		const searchInput = document.createElement('input');
		searchInput.id = 'searchInput';
		searchInput.type = 'text';
		document.body.appendChild(searchInput);

		return { mockTabContent, searchInput };
	};

	const createMockTabItem = (title, url, visible = true) => {
		const item = document.createElement('div');
		item.className = 'list-item';
		item.textContent = `${title} - ${url}`;
		item.style.display = visible ? 'flex' : 'none';
		return item;
	};

	const createMockWindow = (items = []) => {
		const windowDiv = document.createElement('div');
		windowDiv.className = 'window';
		items.forEach(item => windowDiv.appendChild(item));
		return windowDiv;
	};

	beforeEach(() => {
		// Clear DOM safely before each test
		while (document.body.firstChild) {
			document.body.removeChild(document.body.firstChild);
		}

		// Initialize REAL SearchEngine instance
		searchEngine = new SearchEngine();

		// Setup mock callback
		mockUpdateCounter = jest.fn();

		// Setup DOM environment
		const { searchInput } = setupMockDOM();
		mockSearchInput = searchInput;
	});

	describe('SearchEngine Initialization', () => {
		test('should initialize with default state', () => {
			// Test actual SearchEngine properties
			expect(searchEngine.searchInput).toBeNull();
			expect(searchEngine.updateCounterCallback).toBeNull();
			expect(searchEngine.lastSearchTerm).toBe('');
		});

		test('should initialize with provided dependencies', () => {
			// Test real initialize method
			searchEngine.initialize(mockSearchInput, mockUpdateCounter);

			expect(searchEngine.searchInput).toBe(mockSearchInput);
			expect(searchEngine.updateCounterCallback).toBe(mockUpdateCounter);
		});

		test('should setup event listeners on initialization', () => {
			// Mock addEventListener to verify it's called
			const addEventListenerSpy = jest.spyOn(mockSearchInput, 'addEventListener');

			searchEngine.initialize(mockSearchInput, mockUpdateCounter);

			// Verify the real SearchEngine sets up event listeners
			expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function));
			expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
		});
	});

	describe('Core Search Logic Tests', () => {
		beforeEach(() => {
			searchEngine.initialize(mockSearchInput, mockUpdateCounter);
		});

		describe('itemMatchesSearch - Real Implementation', () => {
			test('should return true for empty search term', () => {
				const mockItem = createMockTabItem('GitHub', 'https://github.com');
				const result = searchEngine.itemMatchesSearch(mockItem, '');
				expect(result).toBe(true);
			});

			test('should return true for matching title', () => {
				const mockItem = createMockTabItem('GitHub', 'https://github.com');
				const result = searchEngine.itemMatchesSearch(mockItem, 'github');
				expect(result).toBe(true);
			});

			test('should return true for matching URL', () => {
				const mockItem = createMockTabItem('GitHub', 'https://github.com');
				const result = searchEngine.itemMatchesSearch(mockItem, 'github.com');
				expect(result).toBe(true);
			});

			test('should be case insensitive', () => {
				const mockItem = createMockTabItem('GitHub', 'https://github.com');

				// Test case insensitive matching - FIXED implementation should handle all cases
				const lowercaseResult = searchEngine.itemMatchesSearch(mockItem, 'github');
				expect(lowercaseResult).toBe(true);

				const uppercaseResult = searchEngine.itemMatchesSearch(mockItem, 'GITHUB');
				expect(uppercaseResult).toBe(true);

				const mixedCaseResult = searchEngine.itemMatchesSearch(mockItem, 'GitHuB');
				expect(mixedCaseResult).toBe(true);
			});

			test('should return false for non-matching term', () => {
				const mockItem = createMockTabItem('GitHub', 'https://github.com');
				const result = searchEngine.itemMatchesSearch(mockItem, 'stackoverflow');
				expect(result).toBe(false);
			});
		});

		describe('windowHasVisibleTabs - Real Implementation', () => {
			test('should return true when window has visible tabs', () => {
				const visibleItem = createMockTabItem('GitHub', 'https://github.com', true);
				const hiddenItem = createMockTabItem('Stack Overflow', 'https://stackoverflow.com', false);
				const windowDiv = createMockWindow([visibleItem, hiddenItem]);

				const result = searchEngine.windowHasVisibleTabs(windowDiv);
				expect(result).toBe(true);
			});

			test('should return false when window has no visible tabs', () => {
				const hiddenItem1 = createMockTabItem('GitHub', 'https://github.com', false);
				const hiddenItem2 = createMockTabItem('Stack Overflow', 'https://stackoverflow.com', false);
				const windowDiv = createMockWindow([hiddenItem1, hiddenItem2]);

				const result = searchEngine.windowHasVisibleTabs(windowDiv);
				expect(result).toBe(false);
			});

			test('should return false for empty window', () => {
				const windowDiv = createMockWindow([]);
				const result = searchEngine.windowHasVisibleTabs(windowDiv);
				expect(result).toBe(false);
			});
		});

		describe('updateWindowVisibility - Real Implementation', () => {
			test('should hide windows with no visible tabs', () => {
				const tabContent = document.createElement('div');
				tabContent.className = 'tab-content';

				const hiddenItem = createMockTabItem('GitHub', 'https://github.com', false);
				const windowDiv = createMockWindow([hiddenItem]);
				tabContent.appendChild(windowDiv);

				searchEngine.updateWindowVisibility(tabContent);

				expect(windowDiv.style.display).toBe('none');
			});

			test('should show windows with visible tabs', () => {
				const tabContent = document.createElement('div');
				tabContent.className = 'tab-content';

				const visibleItem = createMockTabItem('GitHub', 'https://github.com', true);
				const windowDiv = createMockWindow([visibleItem]);
				windowDiv.style.display = 'none'; // Initially hidden
				tabContent.appendChild(windowDiv);

				searchEngine.updateWindowVisibility(tabContent);

				expect(windowDiv.style.display).toBe('block');
			});
		});

		describe('filterTabContent - Real Implementation', () => {
			test('should filter items and update window visibility', () => {
				const tabContent = document.createElement('div');
				tabContent.className = 'tab-content';

				const matchingItem = createMockTabItem('GitHub', 'https://github.com', true);
				const nonMatchingItem = createMockTabItem('Google', 'https://google.com', true);
				const windowDiv = createMockWindow([matchingItem, nonMatchingItem]);
				tabContent.appendChild(windowDiv);

				searchEngine.filterTabContent(tabContent, 'github');

				expect(matchingItem.style.display).toBe('flex');
				expect(nonMatchingItem.style.display).toBe('none');
				expect(windowDiv.style.display).toBe('block'); // Should remain visible
			});
		});

		describe('performSearch - Real Implementation', () => {
			test('should call update counter callback', () => {
				// Add a tab-content element to the DOM
				const tabContent = document.createElement('div');
				tabContent.className = 'tab-content';
				document.body.appendChild(tabContent);

				searchEngine.performSearch('test');

				expect(mockUpdateCounter).toHaveBeenCalled();
			});

			test('should handle missing callback gracefully', () => {
				searchEngine.updateCounterCallback = null;

				expect(() => {
					searchEngine.performSearch('test');
				}).not.toThrow();
			});
		});
	});

	describe('Search State Management', () => {
		beforeEach(() => {
			searchEngine.initialize(mockSearchInput, mockUpdateCounter);
		});

		describe('clearSearch - Real Implementation', () => {
			test('should clear search input and perform empty search', () => {
				mockSearchInput.value = 'test search';

				// Add tab-content for search to work on
				const tabContent = document.createElement('div');
				tabContent.className = 'tab-content';
				document.body.appendChild(tabContent);

				searchEngine.clearSearch();

				expect(mockSearchInput.value).toBe('');
				expect(mockUpdateCounter).toHaveBeenCalled();
			});

			test('should handle missing search input gracefully', () => {
				searchEngine.searchInput = null;

				expect(() => {
					searchEngine.clearSearch();
				}).not.toThrow();
			});
		});

		describe('getSearchTerm - Real Implementation', () => {
			test('should return lowercase search term', () => {
				mockSearchInput.value = 'GitHub';
				const result = searchEngine.getSearchTerm();
				expect(result).toBe('github');
			});

			test('should return empty string for missing input', () => {
				searchEngine.searchInput = null;
				const result = searchEngine.getSearchTerm();
				expect(result).toBe('');
			});
		});

		describe('setSearchTerm - Real Implementation', () => {
			test('should set search term and perform search', () => {
				// Add tab-content for search to work on
				const tabContent = document.createElement('div');
				tabContent.className = 'tab-content';
				document.body.appendChild(tabContent);

				searchEngine.setSearchTerm('GitHub');

				expect(mockSearchInput.value).toBe('GitHub');
				expect(mockUpdateCounter).toHaveBeenCalled();
			});
		});

		describe('isSearchActive - Real Implementation', () => {
			test('should return true for non-empty search', () => {
				mockSearchInput.value = 'test';
				expect(searchEngine.isSearchActive()).toBe(true);
			});

			test('should return false for empty search', () => {
				mockSearchInput.value = '';
				expect(searchEngine.isSearchActive()).toBe(false);
			});
		});

		describe('getVisibleItemsCount - Real Implementation', () => {
			test('should count visible items correctly', () => {
				const tabContent = document.createElement('div');
				tabContent.className = 'tab-content';

				const visibleItem = createMockTabItem('GitHub', 'https://github.com', true);
				const hiddenItem = createMockTabItem('Google', 'https://google.com', false);
				tabContent.appendChild(visibleItem);
				tabContent.appendChild(hiddenItem);

				const count = searchEngine.getVisibleItemsCount(tabContent);
				expect(count).toBe(1);
			});

			test('should return 0 for all hidden items', () => {
				const tabContent = document.createElement('div');
				tabContent.className = 'tab-content';

				const hiddenItem1 = createMockTabItem('GitHub', 'https://github.com', false);
				const hiddenItem2 = createMockTabItem('Google', 'https://google.com', false);
				tabContent.appendChild(hiddenItem1);
				tabContent.appendChild(hiddenItem2);

				const count = searchEngine.getVisibleItemsCount(tabContent);
				expect(count).toBe(0);
			});
		});
	});

	describe('Advanced Search Features', () => {
		beforeEach(() => {
			searchEngine.initialize(mockSearchInput, mockUpdateCounter);
		});

		describe('searchWithRegex - Real Implementation', () => {
			test('should call update counter after regex search', () => {
				// Add tab-content for search to work on
				const tabContent = document.createElement('div');
				tabContent.className = 'tab-content';
				document.body.appendChild(tabContent);

				searchEngine.searchWithRegex('test', 'i');

				expect(mockUpdateCounter).toHaveBeenCalled();
			});

			test('should handle invalid regex patterns', () => {
				const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

				searchEngine.searchWithRegex('[invalid regex');

				expect(consoleSpy).toHaveBeenCalledWith(
					'SearchEngine: Invalid regex pattern:',
					expect.any(String)
				);

				consoleSpy.mockRestore();
			});
		});
	});

	describe('Edge Cases and Error Handling', () => {
		test('should handle null/undefined search terms gracefully', () => {
			const mockItem = createMockTabItem('Test Content', 'https://test.com');

			expect(searchEngine.itemMatchesSearch(mockItem, null)).toBe(true);
			expect(searchEngine.itemMatchesSearch(mockItem, undefined)).toBe(true);
		});

		test('should handle empty DOM queries', () => {
			expect(() => {
				searchEngine.performSearch('test');
			}).not.toThrow();
		});

		test('should handle items without textContent', () => {
			const mockItem = document.createElement('div');
			mockItem.textContent = null;

			expect(() => {
				searchEngine.itemMatchesSearch(mockItem, 'test');
			}).not.toThrow();
		});

		test('should handle custom events dispatch', () => {
			// Add tab-content for search to work on
			const tabContent = document.createElement('div');
			tabContent.className = 'tab-content';
			document.body.appendChild(tabContent);

			const dispatchSpy = jest.spyOn(document, 'dispatchEvent');

			searchEngine.performSearch('test');

			expect(dispatchSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'tabSearch',
					detail: expect.objectContaining({
						term: 'test',
						isActive: true
					})
				})
			);
		});
	});

	describe('Real DOM Integration', () => {
		test('should work with actual DOM structure matching popup.html', () => {
			// Create DOM structure matching actual popup.html
			const currentWindow = document.createElement('div');
			currentWindow.id = 'currentWindow';
			currentWindow.className = 'tab-content';

			const allWindow = document.createElement('div');
			allWindow.id = 'allWindow';
			allWindow.className = 'tab-content';

			document.body.appendChild(currentWindow);
			document.body.appendChild(allWindow);

			// Add some test items
			const item1 = createMockTabItem('GitHub', 'https://github.com');
			const item2 = createMockTabItem('Stack Overflow', 'https://stackoverflow.com');

			currentWindow.appendChild(item1);
			allWindow.appendChild(item2);

			// Initialize and test
			searchEngine.initialize(mockSearchInput, mockUpdateCounter);
			searchEngine.performSearch('github');

			// Should filter items correctly
			expect(item1.style.display).toBe('flex');
			expect(item2.style.display).toBe('none');
			expect(mockUpdateCounter).toHaveBeenCalled();
		});
	});
});