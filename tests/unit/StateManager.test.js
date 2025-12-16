/**
 * StateManager Unit Tests - REAL Implementation Testing
 *
 * Tests the actual StateManager class from src/core/StateManager.js
 * Focuses on complex state orchestration and user interaction flows:
 * - Navigation state management (lists, page jumps, tab switching)
 * - Multi-select operations and warning system
 * - Context-aware escape sequences and keyboard navigation
 * - Active tab jumping with context awareness
 * - Service coordination between FocusManager, TabManager, SearchEngine
 */

import StateManager from '../../src/core/StateManager.js';

describe('StateManager Unit Tests - Real Implementation', () => {
    let stateManager;
    let mockFocusManager;
    let mockTabManager;
    let mockSearchEngine;
    let mockAccessibilityHelpers;

    // Mock DOM elements
    let mockSearchInput;
    let mockTabs;
    let mockActiveTabContent;
    let mockCurrentWindow;
    let mockAllWindow;

    beforeEach(() => {
        // Create mock service dependencies
        mockFocusManager = {
            getCurrentItemIndex: jest.fn().mockReturnValue(0),
            focusAndUpdateIndex: jest.fn(),
            findVisibleItems: jest.fn().mockReturnValue([]),
            saveCurrentFocusPosition: jest.fn(),
            restoreSavedFocusPosition: jest.fn(),
            findFirstVisibleItem: jest.fn().mockReturnValue({ item: null, index: 0 })
        };

        mockTabManager = {
            switchToTab: jest.fn().mockResolvedValue(true),
            closeTabs: jest.fn().mockResolvedValue({ success: [], failed: [] })
        };

        mockSearchEngine = {
            performSearch: jest.fn()
        };

        mockAccessibilityHelpers = {
            updateAriaSelected: jest.fn(),
            announceToScreenReader: jest.fn()
        };

        // Create StateManager with mocked dependencies
        stateManager = new StateManager(
            mockFocusManager,
            mockTabManager,
            mockSearchEngine,
            mockAccessibilityHelpers
        );

        // Setup mock DOM elements
        setupMockDOM();

        // Initialize StateManager with mock DOM references
        stateManager.initialize(mockSearchInput, mockTabs);

        // Reset Chrome API state
        chrome.runtime.lastError = null;
    });

    const setupMockDOM = () => {
        // Clear document body safely
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }

        // Create search input
        mockSearchInput = document.createElement('input');
        mockSearchInput.id = 'searchInput';
        mockSearchInput.type = 'text';
        mockSearchInput.placeholder = 'Search tabs...';
        document.body.appendChild(mockSearchInput);

        // Create tab buttons
        const tab1 = document.createElement('button');
        tab1.className = 'tab-button';
        tab1.dataset.tabTarget = '#currentWindow';

        const tab2 = document.createElement('button');
        tab2.className = 'tab-button';
        tab2.dataset.tabTarget = '#allWindow';

        mockTabs = [tab1, tab2];
        document.body.appendChild(tab1);
        document.body.appendChild(tab2);

        // Create tab content areas
        mockCurrentWindow = document.createElement('div');
        mockCurrentWindow.id = 'currentWindow';
        mockCurrentWindow.className = 'tab-content';
        document.body.appendChild(mockCurrentWindow);

        mockAllWindow = document.createElement('div');
        mockAllWindow.id = 'allWindow';
        mockAllWindow.className = 'tab-content';
        document.body.appendChild(mockAllWindow);

        // Set active tab content
        mockActiveTabContent = mockCurrentWindow;
        mockCurrentWindow.classList.add('active');

        // Add some mock list items to each tab content
        for (let i = 1; i <= 3; i++) {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.tabid = i;
            item.windowId = 1;
            item.textContent = `Tab ${i}`;
            mockCurrentWindow.appendChild(item);

            const allItem = document.createElement('div');
            allItem.className = 'list-item';
            allItem.tabid = i + 10;
            allItem.windowId = 2;
            allItem.textContent = `All Tab ${i}`;
            mockAllWindow.appendChild(allItem);
        }

        // Add window structure to All Windows tab
        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';
        const windowTitle = document.createElement('h2');
        windowTitle.textContent = 'Window 2';
        windowDiv.appendChild(windowTitle);
        mockAllWindow.appendChild(windowDiv);
    };

    describe('StateManager Initialization', () => {
        test('should initialize with service dependencies', () => {
            expect(stateManager.focusManager).toBe(mockFocusManager);
            expect(stateManager.tabManager).toBe(mockTabManager);
            expect(stateManager.searchEngine).toBe(mockSearchEngine);
            expect(stateManager.accessibilityHelpers).toBe(mockAccessibilityHelpers);
        });

        test('should initialize with correct default state', () => {
            expect(stateManager.lastClickedIndex).toBe(-1);
        });

        test('should initialize DOM references correctly', () => {
            expect(stateManager.searchInput).toBe(mockSearchInput);
            expect(stateManager.tabs).toBe(mockTabs);
        });
    });

    describe('List Navigation Management', () => {
        test('should handle list navigation down', () => {
            const mockEvent = { key: 'ArrowDown' };
            const mockContext = {
                items: [...mockCurrentWindow.querySelectorAll('.list-item')],
                currentTabIndex: 0,
                activeTabContent: mockActiveTabContent
            };

            mockFocusManager.getCurrentItemIndex.mockReturnValue(0);

            stateManager.handleListNavigation(mockEvent, mockContext);

            expect(mockFocusManager.focusAndUpdateIndex).toHaveBeenCalledWith(
                mockContext.items[1], // next item
                1, // next index
                mockContext.items,
                'instant',
                true
            );
        });

        test('should handle list navigation up with wrap-around', () => {
            const mockEvent = { key: 'ArrowUp' };
            const mockContext = {
                items: [...mockCurrentWindow.querySelectorAll('.list-item')],
                currentTabIndex: 0,
                activeTabContent: mockActiveTabContent
            };

            mockFocusManager.getCurrentItemIndex.mockReturnValue(0);

            stateManager.handleListNavigation(mockEvent, mockContext);

            // Should wrap to last item (index 2)
            expect(mockFocusManager.focusAndUpdateIndex).toHaveBeenCalledWith(
                mockContext.items[2], // last item (wrap around)
                2,
                mockContext.items,
                'instant',
                true
            );
        });
    });

    describe('Page Jump Navigation', () => {
        test('should handle page jump forward', () => {
            const mockContext = {
                items: [...mockCurrentWindow.querySelectorAll('.list-item')],
                currentTabIndex: 0,
                activeTabContent: mockActiveTabContent
            };

            const visibleItems = [...mockCurrentWindow.querySelectorAll('.list-item')];
            mockFocusManager.findVisibleItems.mockReturnValue(visibleItems);
            mockFocusManager.getCurrentItemIndex.mockReturnValue(0);

            stateManager.handlePageJump(10, mockContext);

            expect(mockFocusManager.findVisibleItems).toHaveBeenCalledWith(mockContext.items);
            expect(mockFocusManager.focusAndUpdateIndex).toHaveBeenCalled();
        });

        test('should return early if no visible items', () => {
            const mockContext = { items: [] };
            mockFocusManager.findVisibleItems.mockReturnValue([]);

            stateManager.handlePageJump(10, mockContext);

            expect(mockFocusManager.focusAndUpdateIndex).not.toHaveBeenCalled();
        });
    });

    describe('Tab View Switching', () => {
        test('should handle tab view switch to next tab', () => {
            const mockEvent = {
                key: 'ArrowRight',
                preventDefault: jest.fn()
            };
            const mockContext = {
                currentTabIndex: 0,
                items: [...mockCurrentWindow.querySelectorAll('.list-item')]
            };

            // Mock tab click behavior
            mockTabs[1].click = jest.fn();

            stateManager.handleTabViewSwitch(mockEvent, mockContext);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockFocusManager.saveCurrentFocusPosition).toHaveBeenCalledWith(mockContext.items);
            expect(mockTabs[1].click).toHaveBeenCalled();
        });

        test('should handle tab view switch with missing tabs gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            stateManager.tabs = null;

            const mockEvent = {
                key: 'ArrowRight',
                preventDefault: jest.fn()
            };
            const mockContext = { currentTabIndex: 0, items: [] };

            stateManager.handleTabViewSwitch(mockEvent, mockContext);

            expect(consoleSpy).toHaveBeenCalledWith('StateManager.handleTabViewSwitch: No tabs available');
            consoleSpy.mockRestore();
        });
    });

    describe('Selection Management', () => {
        test('should toggle selection on list item', () => {
            const items = [...mockCurrentWindow.querySelectorAll('.list-item')];
            const targetIndex = 1;

            stateManager.toggleSelection(targetIndex, items);

            expect(items[targetIndex].classList.contains('selected')).toBe(true);
            expect(items[targetIndex].classList.contains('bg-blue-100')).toBe(true);
            expect(mockAccessibilityHelpers.updateAriaSelected).toHaveBeenCalled();
        });

        test('should handle invalid item index gracefully', () => {
            const items = [...mockCurrentWindow.querySelectorAll('.list-item')];

            stateManager.toggleSelection(999, items); // Invalid index

            expect(mockAccessibilityHelpers.updateAriaSelected).not.toHaveBeenCalled();
        });

        test('should select all visible items', () => {
            const items = [...mockCurrentWindow.querySelectorAll('.list-item')];
            mockFocusManager.findVisibleItems.mockReturnValue(items);

            stateManager.selectAllVisible(items);

            items.forEach(item => {
                expect(item.classList.contains('selected')).toBe(true);
                expect(item.classList.contains('bg-blue-100')).toBe(true);
            });

            expect(mockAccessibilityHelpers.updateAriaSelected).toHaveBeenCalled();
            expect(mockAccessibilityHelpers.announceToScreenReader).toHaveBeenCalledWith(
                `Selected all ${items.length} visible tabs`
            );
        });
    });

    describe('Bulk Delete Operations', () => {
        test('should handle bulk delete of selected items', async () => {
            // Setup selected items
            const items = [...mockCurrentWindow.querySelectorAll('.list-item')];
            items[0].classList.add('selected');
            items[1].classList.add('selected');
            items[0].tabid = 1;
            items[1].tabid = 2;

            mockSearchInput.value = 'test search';

            const mockContext = { activeTabContent: mockCurrentWindow };

            mockTabManager.closeTabs.mockResolvedValue({ success: [1, 2], failed: [] });

            await stateManager.handleBulkDelete(mockContext);

            expect(mockTabManager.closeTabs).toHaveBeenCalledWith([1, 2]);
            expect(mockSearchEngine.performSearch).toHaveBeenCalledWith('test search');
        });

        test('should return early if no items selected', async () => {
            const mockContext = { activeTabContent: mockCurrentWindow };

            await stateManager.handleBulkDelete(mockContext);

            expect(mockTabManager.closeTabs).not.toHaveBeenCalled();
        });
    });


    describe('Enter Navigation with Multi-Select Logic', () => {
        test('should handle Enter from search input', () => {
            const mockEvent = { key: 'Enter' };
            const firstVisible = { item: mockCurrentWindow.firstElementChild, index: 0 };
            const mockContext = {
                items: [...mockCurrentWindow.querySelectorAll('.list-item')],
                activeTabContent: mockCurrentWindow
            };

            mockFocusManager.findFirstVisibleItem.mockReturnValue(firstVisible);

            // Set search input as active element
            Object.defineProperty(document, 'activeElement', {
                get: () => mockSearchInput,
                configurable: true
            });

            stateManager.handleEnterNavigation(mockEvent, mockContext);

            expect(mockFocusManager.focusAndUpdateIndex).toHaveBeenCalledWith(
                firstVisible.item,
                firstVisible.index,
                mockContext.items,
                'smooth'
            );
        });

        test('should show confirm dialog when multiple items selected', () => {
            const mockEvent = { key: 'Enter' };

            // Add selected items
            const items = [...mockCurrentWindow.querySelectorAll('.list-item')];
            items[0].classList.add('selected');
            items[1].classList.add('selected');

            // Set up focused item with title (matching TabRenderer structure)
            const mockTitleDiv = document.createElement('div');
            mockTitleDiv.className = 'truncated';
            const mockTitleSpan = document.createElement('span');
            mockTitleSpan.textContent = 'GitHub';
            mockTitleDiv.appendChild(mockTitleSpan);
            items[0].appendChild(mockTitleDiv);
            items[0].tabid = 123;
            items[0].windowId = 456;

            const mockContext = {
                items: items,
                activeTabContent: mockCurrentWindow
            };

            // Set focus away from search input
            Object.defineProperty(document, 'activeElement', {
                get: () => document.body,
                configurable: true
            });

            mockFocusManager.getCurrentItemIndex.mockReturnValue(0);

            // Mock confirm() to test both accept and cancel paths
            const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

            stateManager.handleEnterNavigation(mockEvent, mockContext);

            expect(mockConfirm).toHaveBeenCalledWith('⚠️ Unable to open 2 selected tabs at once.\nDo you mean to open focused "GitHub"?');
            expect(mockTabManager.switchToTab).toHaveBeenCalledWith(123, 456);

            // Test cancel path
            mockConfirm.mockReturnValue(false);
            mockTabManager.switchToTab.mockClear();

            stateManager.handleEnterNavigation(mockEvent, mockContext);
            expect(mockTabManager.switchToTab).not.toHaveBeenCalled();

            mockConfirm.mockRestore();
        });

        test('should perform normal navigation when single item focused', () => {
            const mockEvent = { key: 'Enter' };
            const items = [...mockCurrentWindow.querySelectorAll('.list-item')];
            items[0].tabid = 123;
            items[0].windowId = 456;

            const mockContext = {
                items: items,
                activeTabContent: mockCurrentWindow
            };

            mockFocusManager.getCurrentItemIndex.mockReturnValue(0);

            // Set focus away from search input
            Object.defineProperty(document, 'activeElement', {
                get: () => document.body,
                configurable: true
            });

            stateManager.handleEnterNavigation(mockEvent, mockContext);

            expect(mockTabManager.switchToTab).toHaveBeenCalledWith(123, 456);
        });
    });

    describe('Escape Sequence Context-Aware Behavior', () => {
        test('should clear selections when escape pressed in list context', () => {
            const mockEvent = { preventDefault: jest.fn() };

            // Add selected items
            const items = [...mockCurrentWindow.querySelectorAll('.list-item')];
            items[0].classList.add('selected', 'bg-blue-100');
            items[1].classList.add('selected', 'bg-blue-100');

            const mockContext = { activeTabContent: mockCurrentWindow };

            // Set focus away from search input (list context)
            Object.defineProperty(document, 'activeElement', {
                get: () => document.body,
                configurable: true
            });

            stateManager.searchInput.value = '';

            stateManager.handleEscapeSequence(mockEvent, mockContext);

            // Should clear selections
            expect(items[0].classList.contains('selected')).toBe(false);
            expect(items[0].classList.contains('bg-blue-100')).toBe(false);
            expect(items[1].classList.contains('selected')).toBe(false);
            expect(items[1].classList.contains('bg-blue-100')).toBe(false);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        test('should clear search text when focus in search with text', () => {
            const mockEvent = { preventDefault: jest.fn() };
            const mockContext = { activeTabContent: mockCurrentWindow };

            mockSearchInput.value = 'search text';

            // Set search input as active element
            Object.defineProperty(document, 'activeElement', {
                get: () => mockSearchInput,
                configurable: true
            });

            stateManager.handleEscapeSequence(mockEvent, mockContext);

            expect(mockSearchInput.value).toBe('');
            expect(mockSearchEngine.performSearch).toHaveBeenCalledWith('');
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        test('should restore focus position when search empty', () => {
            const mockEvent = { preventDefault: jest.fn() };
            const mockContext = {
                items: [...mockCurrentWindow.querySelectorAll('.list-item')],
                activeTabContent: mockCurrentWindow
            };

            mockSearchInput.value = '';

            // Set search input as active element
            Object.defineProperty(document, 'activeElement', {
                get: () => mockSearchInput,
                configurable: true
            });

            stateManager.handleEscapeSequence(mockEvent, mockContext);

            expect(mockFocusManager.restoreSavedFocusPosition).toHaveBeenCalledWith(mockContext.items);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('Current Item Index Management', () => {
        test('should delegate getCurrentItemIndex to FocusManager', () => {
            mockFocusManager.getCurrentItemIndex.mockReturnValue(42);

            const result = stateManager.getCurrentItemIndex();

            expect(result).toBe(42);
            expect(mockFocusManager.getCurrentItemIndex).toHaveBeenCalled();
        });

        test('should handle deprecated setCurrentItemIndex gracefully', () => {
            // This method should do nothing but not throw errors
            expect(() => {
                stateManager.setCurrentItemIndex(5);
            }).not.toThrow();
        });
    });

    describe('Active Tab Jumping Context-Aware Behavior', () => {
        test('should jump to active tab in current window view', () => {
            // Setup active tab content to simulate Current Window view
            Object.defineProperty(document, 'querySelector', {
                value: jest.fn().mockReturnValue({ id: 'currentWindow' }),
                configurable: true
            });

            jest.spyOn(stateManager, 'jumpToActiveTabInCurrentView');

            stateManager.jumpToCurrentlyActiveTab();

            expect(stateManager.jumpToActiveTabInCurrentView).toHaveBeenCalled();
        });

        test('should cycle to next active tab in all windows view', () => {
            // Setup active tab content to simulate All Windows view
            Object.defineProperty(document, 'querySelector', {
                value: jest.fn().mockReturnValue({ id: 'allWindow' }),
                configurable: true
            });

            jest.spyOn(stateManager, 'cycleToNextActiveTabInAllView');

            stateManager.jumpToCurrentlyActiveTab();

            expect(stateManager.cycleToNextActiveTabInAllView).toHaveBeenCalled();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle invalid parameters appropriately in navigation', () => {
            // StateManager expects valid event objects - test what actually happens
            expect(() => {
                stateManager.handleListNavigation(null, { items: [] });
            }).toThrow('Cannot read properties of null');

            // These methods should handle edge cases gracefully
            expect(() => {
                stateManager.handlePageJump(0, { items: [] });
                stateManager.toggleSelection(-1, []);
                stateManager.selectAllVisible([]);
            }).not.toThrow();
        });

        test('should handle missing DOM elements gracefully', () => {
            // Clear DOM elements safely
            while (document.body.firstChild) {
                document.body.removeChild(document.body.firstChild);
            }

            expect(() => {
                stateManager.handleWindowSectionNavigation(
                    { key: 'ArrowDown', preventDefault: jest.fn() },
                    { currentTabIndex: 1, items: [] }
                );
            }).not.toThrow();
        });

        test('should maintain state consistency during service failures', () => {
            // Mock service failures
            mockFocusManager.getCurrentItemIndex.mockImplementation(() => {
                throw new Error('FocusManager failure');
            });

            expect(() => {
                stateManager.getCurrentItemIndex();
            }).toThrow('FocusManager failure');

            // StateManager state should remain consistent
            expect(stateManager.lastClickedIndex).toBe(-1);
        });
    });
});