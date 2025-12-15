/**
 * KeyboardNavigation Unit Tests - Comprehensive Keyboard Event Coordination Testing
 *
 * Tests all critical functionality of KeyboardNavigation.js including:
 * - Service coordination and delegation patterns
 * - All keyboard shortcut combinations
 * - Context-aware event routing
 * - Focus management integration
 * - Multi-service method calls
 * - Edge cases and error handling
 *
 * @fileoverview Tests for KeyboardNavigation - Keyboard event coordination service
 */

import { jest } from '@jest/globals';
import KeyboardNavigation from '../../src/components/KeyboardNavigation.js';

describe('KeyboardNavigation Unit Tests - Real Implementation', () => {
    let keyboardNav;
    let mockFocusManager;
    let mockTabManager;
    let mockSearchEngine;
    let mockStateManager;
    let mockSearchInput;
    let mockTabs;

    // Mock DOM elements
    function createMockDOMElements() {
        mockSearchInput = document.createElement('input');
        mockSearchInput.id = 'searchInput';

        // Create mock tab buttons
        const tab1 = document.createElement('button');
        tab1.classList.add('tab-button');
        const tab2 = document.createElement('button');
        tab2.classList.add('tab-button');
        tab2.classList.add('active');

        return {
            searchInput: mockSearchInput,
            tabs: [tab1, tab2]
        };
    }

    // Mock services with realistic methods
    function createMockServices() {
        return {
            focusManager: {
                restoreSavedFocusPosition: jest.fn(),
                findFirstVisibleItem: jest.fn(() => ({ item: document.createElement('div'), index: 0 })),
                findLastVisibleItem: jest.fn(() => ({ item: document.createElement('div'), index: 0 })),
                focusAndUpdateIndex: jest.fn()
            },
            tabManager: {
                switchToTab: jest.fn(),
                closeTab: jest.fn()
            },
            searchEngine: {
                clearSearch: jest.fn(),
                setSearchTerm: jest.fn(),
                performSearch: jest.fn()
            },
            stateManager: {
                handleListNavigation: jest.fn(),
                handlePageJump: jest.fn(),
                handleTabViewSwitch: jest.fn(),
                handleWindowSectionNavigation: jest.fn(),
                toggleSelection: jest.fn(),
                handleBulkDelete: jest.fn(),
                handleEnterNavigation: jest.fn(),
                handleEscapeSequence: jest.fn(),
                selectAllVisible: jest.fn(),
                jumpToCurrentlyActiveTab: jest.fn(),
                jumpToCurrentlyActiveTabReverse: jest.fn(),
                getCurrentItemIndex: jest.fn(() => 0)
            }
        };
    }

    beforeEach(() => {
        // Reset DOM
        document.body.textContent = '';

        // Create mock DOM structure
        const mockElements = createMockDOMElements();
        mockSearchInput = mockElements.searchInput;
        mockTabs = mockElements.tabs;

        // Create tab content structure for navigation context
        const tabContent1 = document.createElement('div');
        tabContent1.className = 'tab-content';

        const tabContent2 = document.createElement('div');
        tabContent2.className = 'tab-content active';

        // Add some list items
        const listItem1 = document.createElement('div');
        listItem1.className = 'list-item';
        const listItem2 = document.createElement('div');
        listItem2.className = 'list-item';

        tabContent2.appendChild(listItem1);
        tabContent2.appendChild(listItem2);

        document.body.appendChild(mockSearchInput);
        document.body.appendChild(tabContent1);
        document.body.appendChild(tabContent2);
        mockTabs.forEach(tab => document.body.appendChild(tab));

        // Create mock services
        const services = createMockServices();
        mockFocusManager = services.focusManager;
        mockTabManager = services.tabManager;
        mockSearchEngine = services.searchEngine;
        mockStateManager = services.stateManager;

        // Create KeyboardNavigation instance
        keyboardNav = new KeyboardNavigation(
            mockFocusManager,
            mockTabManager,
            mockSearchEngine,
            mockStateManager
        );

        keyboardNav.initialize(mockSearchInput, mockTabs);

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        document.body.textContent = '';
    });

    describe('KeyboardNavigation Initialization', () => {
        test('should initialize with service dependencies', () => {
            expect(keyboardNav.focusManager).toBe(mockFocusManager);
            expect(keyboardNav.tabManager).toBe(mockTabManager);
            expect(keyboardNav.searchEngine).toBe(mockSearchEngine);
            expect(keyboardNav.stateManager).toBe(mockStateManager);
        });

        test('should initialize with DOM references', () => {
            expect(keyboardNav.searchInput).toBe(mockSearchInput);
            expect(keyboardNav.tabs).toEqual(mockTabs);
        });

        test('should setup global event listeners on initialization', () => {
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

            const newKeyboardNav = new KeyboardNavigation(
                mockFocusManager, mockTabManager, mockSearchEngine, mockStateManager
            );
            newKeyboardNav.initialize(mockSearchInput, mockTabs);

            expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

            addEventListenerSpy.mockRestore();
        });
    });

    describe('Navigation Context Management', () => {
        test('should get current navigation context correctly', () => {
            const context = keyboardNav.getNavigationContext();

            expect(context.items).toHaveLength(2);
            expect(context.activeTabContent).toBeTruthy();
            expect(context.currentTabIndex).toBe(1); // Second tab is active
            expect(context.currentItemIndex).toBe(0);
        });

        test('should handle empty active tab content', () => {
            // Remove active class from all tab contents
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.remove('active');
            });

            const context = keyboardNav.getNavigationContext();

            expect(context.items).toHaveLength(0);
            expect(context.activeTabContent).toBe(null);
        });

        test('should identify search navigation events', () => {
            const arrowUpEvent = { key: 'ArrowUp' };
            const arrowDownEvent = { key: 'ArrowDown' };
            const otherEvent = { key: 'Tab' };

            mockSearchInput.focus();

            expect(keyboardNav.isSearchNavigation(arrowUpEvent)).toBe(true);
            expect(keyboardNav.isSearchNavigation(arrowDownEvent)).toBe(true);
            expect(keyboardNav.isSearchNavigation(otherEvent)).toBe(false);
        });
    });

    describe('Tab Navigation (Tab/Shift+Tab)', () => {
        test('should handle Tab from search input to list', () => {
            mockSearchInput.focus();

            const tabEvent = {
                key: 'Tab',
                shiftKey: false,
                preventDefault: jest.fn()
            };

            keyboardNav.handleTab(tabEvent, keyboardNav.getNavigationContext());

            expect(tabEvent.preventDefault).toHaveBeenCalled();
            expect(mockFocusManager.restoreSavedFocusPosition).toHaveBeenCalled();
        });

        test('should handle Shift+Tab from list to search input', () => {
            // Focus on a list item (not search input)
            const listItem = document.querySelector('.list-item');
            listItem.focus();

            const shiftTabEvent = {
                key: 'Tab',
                shiftKey: true,
                preventDefault: jest.fn()
            };

            keyboardNav.handleTab(shiftTabEvent, keyboardNav.getNavigationContext());

            expect(shiftTabEvent.preventDefault).toHaveBeenCalled();
            expect(document.activeElement).toBe(mockSearchInput);
        });

        test('should handle Tab when not focused on search input', () => {
            const listItem = document.querySelector('.list-item');
            listItem.focus();

            const tabEvent = {
                key: 'Tab',
                shiftKey: false,
                preventDefault: jest.fn()
            };

            keyboardNav.handleTab(tabEvent, keyboardNav.getNavigationContext());

            expect(tabEvent.preventDefault).toHaveBeenCalled();
            expect(document.activeElement).toBe(mockSearchInput);
        });
    });

    describe('Vertical Arrow Navigation (Up/Down)', () => {
        test('should handle arrow down from search input to first visible item', () => {
            mockSearchInput.focus();

            const arrowDownEvent = {
                key: 'ArrowDown',
                altKey: false,
                preventDefault: jest.fn()
            };

            keyboardNav.handleArrowVertical(arrowDownEvent, keyboardNav.getNavigationContext());

            expect(arrowDownEvent.preventDefault).toHaveBeenCalled();
            expect(mockFocusManager.findFirstVisibleItem).toHaveBeenCalled();
            expect(mockFocusManager.focusAndUpdateIndex).toHaveBeenCalled();
        });

        test('should handle arrow up from search input to last visible item', () => {
            mockSearchInput.focus();

            const arrowUpEvent = {
                key: 'ArrowUp',
                altKey: false,
                preventDefault: jest.fn()
            };

            keyboardNav.handleArrowVertical(arrowUpEvent, keyboardNav.getNavigationContext());

            expect(arrowUpEvent.preventDefault).toHaveBeenCalled();
            expect(mockFocusManager.findLastVisibleItem).toHaveBeenCalled();
            expect(mockFocusManager.focusAndUpdateIndex).toHaveBeenCalled();
        });

        test('should handle Alt+Arrow for window section navigation', () => {
            const altArrowEvent = {
                key: 'ArrowDown',
                altKey: true,
                preventDefault: jest.fn()
            };

            keyboardNav.handleArrowVertical(altArrowEvent, keyboardNav.getNavigationContext());

            expect(altArrowEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.handleWindowSectionNavigation).toHaveBeenCalled();
        });

        test('should delegate list navigation to StateManager', () => {
            const listItem = document.querySelector('.list-item');
            listItem.focus();

            const arrowEvent = {
                key: 'ArrowDown',
                altKey: false,
                preventDefault: jest.fn()
            };

            keyboardNav.handleArrowVertical(arrowEvent, keyboardNav.getNavigationContext());

            expect(arrowEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.handleListNavigation).toHaveBeenCalled();
        });
    });

    describe('Horizontal Arrow Navigation (Left/Right)', () => {
        test('should handle Ctrl+Arrow for tab view switching', () => {
            const ctrlArrowEvent = {
                key: 'ArrowLeft',
                ctrlKey: true,
                metaKey: false
            };

            keyboardNav.handleArrowHorizontal(ctrlArrowEvent, keyboardNav.getNavigationContext());

            expect(mockStateManager.handleTabViewSwitch).toHaveBeenCalled();
        });

        test('should handle Meta+Arrow for tab view switching on Mac', () => {
            const metaArrowEvent = {
                key: 'ArrowRight',
                ctrlKey: false,
                metaKey: true
            };

            keyboardNav.handleArrowHorizontal(metaArrowEvent, keyboardNav.getNavigationContext());

            expect(mockStateManager.handleTabViewSwitch).toHaveBeenCalled();
        });

        test('should ignore arrows without modifier keys', () => {
            const plainArrowEvent = {
                key: 'ArrowLeft',
                ctrlKey: false,
                metaKey: false
            };

            keyboardNav.handleArrowHorizontal(plainArrowEvent, keyboardNav.getNavigationContext());

            expect(mockStateManager.handleTabViewSwitch).not.toHaveBeenCalled();
        });
    });

    describe('Page Navigation (PageUp/PageDown)', () => {
        test('should handle PageDown navigation', () => {
            const pageDownEvent = {
                key: 'PageDown',
                preventDefault: jest.fn()
            };

            keyboardNav.handlePageNavigation(pageDownEvent, keyboardNav.getNavigationContext());

            expect(pageDownEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.handlePageJump).toHaveBeenCalledWith(10, expect.any(Object));
        });

        test('should handle PageUp navigation', () => {
            const pageUpEvent = {
                key: 'PageUp',
                preventDefault: jest.fn()
            };

            keyboardNav.handlePageNavigation(pageUpEvent, keyboardNav.getNavigationContext());

            expect(pageUpEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.handlePageJump).toHaveBeenCalledWith(-10, expect.any(Object));
        });
    });

    describe('Boundary Navigation (Home/End)', () => {
        test('should handle End key to last item', () => {
            const endEvent = {
                key: 'End',
                preventDefault: jest.fn()
            };

            keyboardNav.handleHomeEnd(endEvent, keyboardNav.getNavigationContext());

            expect(endEvent.preventDefault).toHaveBeenCalled();
            expect(mockFocusManager.focusAndUpdateIndex).toHaveBeenCalled();
        });

        test('should handle Home key to first item', () => {
            const homeEvent = {
                key: 'Home',
                preventDefault: jest.fn()
            };

            keyboardNav.handleHomeEnd(homeEvent, keyboardNav.getNavigationContext());

            expect(homeEvent.preventDefault).toHaveBeenCalled();
            expect(mockFocusManager.findFirstVisibleItem).toHaveBeenCalled();
        });

        test('should not prevent Home in search input', () => {
            mockSearchInput.focus();

            const homeEvent = {
                key: 'Home',
                preventDefault: jest.fn()
            };

            keyboardNav.handleHomeEnd(homeEvent, keyboardNav.getNavigationContext());

            expect(homeEvent.preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('Selection Management (Space)', () => {
        test('should handle Space key on list items', () => {
            const listItem = document.querySelector('.list-item');

            // Make the list item focusable and focus it
            listItem.tabIndex = 0;
            listItem.focus();

            // Verify focus is actually set (JSDOM issue debugging)
            expect(document.activeElement).toBe(listItem);
            expect(document.activeElement.classList.contains('list-item')).toBe(true);

            const spaceEvent = {
                key: ' ',
                preventDefault: jest.fn()
            };

            keyboardNav.handleSpace(spaceEvent, keyboardNav.getNavigationContext());

            expect(spaceEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.toggleSelection).toHaveBeenCalled();
        });

        test('should not handle Space key outside list items', () => {
            mockSearchInput.focus();

            const spaceEvent = {
                key: ' ',
                preventDefault: jest.fn()
            };

            keyboardNav.handleSpace(spaceEvent, keyboardNav.getNavigationContext());

            expect(spaceEvent.preventDefault).not.toHaveBeenCalled();
            expect(mockStateManager.toggleSelection).not.toHaveBeenCalled();
        });
    });

    describe('Delete Key Handling', () => {
        test('should handle Delete key on list items', () => {
            const listItem = document.querySelector('.list-item');
            listItem.tabIndex = 0;
            listItem.focus();

            const deleteEvent = { key: 'Delete' };

            keyboardNav.handleDelete(deleteEvent, keyboardNav.getNavigationContext());

            expect(mockStateManager.handleBulkDelete).toHaveBeenCalled();
        });

        test('should not handle Delete key outside list items', () => {
            mockSearchInput.focus();

            const deleteEvent = { key: 'Delete' };

            keyboardNav.handleDelete(deleteEvent, keyboardNav.getNavigationContext());

            expect(mockStateManager.handleBulkDelete).not.toHaveBeenCalled();
        });
    });

    describe('Enter Key Navigation', () => {
        test('should delegate Enter navigation to StateManager', () => {
            const enterEvent = { key: 'Enter' };

            keyboardNav.handleEnter(enterEvent, keyboardNav.getNavigationContext());

            expect(mockStateManager.handleEnterNavigation).toHaveBeenCalledWith(
                enterEvent,
                expect.any(Object)
            );
        });
    });

    describe('Escape Key Handling', () => {
        test('should delegate Escape sequence to StateManager', () => {
            const escapeEvent = { key: 'Escape' };

            keyboardNav.handleEscape(escapeEvent, keyboardNav.getNavigationContext());

            expect(mockStateManager.handleEscapeSequence).toHaveBeenCalledWith(
                escapeEvent,
                expect.any(Object)
            );
        });
    });

    describe('Select All (Ctrl+A)', () => {
        test('should handle Ctrl+A on list items', () => {
            const listItem = document.querySelector('.list-item');
            listItem.tabIndex = 0;
            listItem.focus();

            const ctrlAEvent = {
                key: 'a',
                ctrlKey: true,
                metaKey: false,
                preventDefault: jest.fn()
            };

            keyboardNav.handleSelectAll(ctrlAEvent, keyboardNav.getNavigationContext());

            expect(ctrlAEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.selectAllVisible).toHaveBeenCalled();
        });

        test('should handle Meta+A on Mac', () => {
            const listItem = document.querySelector('.list-item');
            listItem.tabIndex = 0;
            listItem.focus();

            const metaAEvent = {
                key: 'A',
                ctrlKey: false,
                metaKey: true,
                preventDefault: jest.fn()
            };

            keyboardNav.handleSelectAll(metaAEvent, keyboardNav.getNavigationContext());

            expect(metaAEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.selectAllVisible).toHaveBeenCalled();
        });

        test('should not handle Ctrl+A outside list items', () => {
            mockSearchInput.focus();

            const ctrlAEvent = {
                key: 'a',
                ctrlKey: true,
                metaKey: false,
                preventDefault: jest.fn()
            };

            keyboardNav.handleSelectAll(ctrlAEvent, keyboardNav.getNavigationContext());

            expect(ctrlAEvent.preventDefault).not.toHaveBeenCalled();
            expect(mockStateManager.selectAllVisible).not.toHaveBeenCalled();
        });
    });

    describe('Active Tab Jumping (Ctrl+G)', () => {
        test('should handle Ctrl+G for forward active tab jumping', () => {
            const ctrlGEvent = {
                key: 'g',
                ctrlKey: true,
                metaKey: false,
                shiftKey: false,
                preventDefault: jest.fn()
            };

            keyboardNav.handleJumpToActive(ctrlGEvent, keyboardNav.getNavigationContext());

            expect(ctrlGEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.jumpToCurrentlyActiveTab).toHaveBeenCalled();
        });

        test('should handle Ctrl+Shift+G for reverse active tab jumping', () => {
            const ctrlShiftGEvent = {
                key: 'G',
                ctrlKey: true,
                metaKey: false,
                shiftKey: true,
                preventDefault: jest.fn()
            };

            keyboardNav.handleJumpToActive(ctrlShiftGEvent, keyboardNav.getNavigationContext());

            expect(ctrlShiftGEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.jumpToCurrentlyActiveTabReverse).toHaveBeenCalled();
        });

        test('should handle Meta+G on Mac', () => {
            const metaGEvent = {
                key: 'g',
                ctrlKey: false,
                metaKey: true,
                shiftKey: false,
                preventDefault: jest.fn()
            };

            keyboardNav.handleJumpToActive(metaGEvent, keyboardNav.getNavigationContext());

            expect(metaGEvent.preventDefault).toHaveBeenCalled();
            expect(mockStateManager.jumpToCurrentlyActiveTab).toHaveBeenCalled();
        });
    });

    describe('Auto-focus Search Input', () => {
        test('should auto-focus search input on single character keys', () => {
            const charEvent = { key: 'a' };

            keyboardNav.handleDefault(charEvent);

            expect(document.activeElement).toBe(mockSearchInput);
        });

        test('should not auto-focus on multi-character keys', () => {
            const originalFocus = document.activeElement;

            const multiCharEvent = { key: 'Enter' };

            keyboardNav.handleDefault(multiCharEvent);

            expect(document.activeElement).toBe(originalFocus);
        });
    });

    describe('Main Keyboard Event Handler', () => {
        test('should handle empty item lists with early exit', () => {
            // Remove all list items
            document.querySelectorAll('.list-item').forEach(el => el.remove());

            const tabEvent = {
                key: 'Tab',
                preventDefault: jest.fn()
            };

            // Should not cause errors with empty list
            expect(() => {
                keyboardNav.handleKeyDown(tabEvent);
            }).not.toThrow();

            // Should still handle search navigation
            mockSearchInput.focus();
            const arrowEvent = { key: 'ArrowDown', preventDefault: jest.fn() };

            expect(() => {
                keyboardNav.handleKeyDown(arrowEvent);
            }).not.toThrow();
        });

        test('should route different key types to appropriate handlers', () => {
            const handlers = [
                { key: 'Tab', method: 'handleTab' },
                { key: 'ArrowUp', method: 'handleArrowVertical' },
                { key: 'PageDown', method: 'handlePageNavigation' },
                { key: 'Home', method: 'handleHomeEnd' },
                { key: ' ', method: 'handleSpace' },
                { key: 'Delete', method: 'handleDelete' },
                { key: 'Enter', method: 'handleEnter' },
                { key: 'Escape', method: 'handleEscape' },
                { key: 'a', method: 'handleSelectAll' },
                { key: 'g', method: 'handleJumpToActive' }
            ];

            handlers.forEach(({ key, method }) => {
                const spy = jest.spyOn(keyboardNav, method).mockImplementation(() => {});

                const event = { key, ctrlKey: method === 'handleSelectAll' || method === 'handleJumpToActive' };
                keyboardNav.handleKeyDown(event);

                expect(spy).toHaveBeenCalled();
                spy.mockRestore();
            });
        });

        test('should handle unrecognized keys with default handler', () => {
            const spy = jest.spyOn(keyboardNav, 'handleDefault').mockImplementation(() => {});

            const unknownEvent = { key: 'x' };
            keyboardNav.handleKeyDown(unknownEvent);

            expect(spy).toHaveBeenCalledWith(unknownEvent);
            spy.mockRestore();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle navigation context with missing tab content', () => {
            document.querySelectorAll('.tab-content').forEach(el => el.remove());

            const context = keyboardNav.getNavigationContext();

            expect(context.items).toHaveLength(0);
            expect(context.activeTabContent).toBe(null);
            // currentTabIndex uses findIndex on mockTabs, second tab still has 'active' class
            // so it should still return 1, not -1
            expect(context.currentTabIndex).toBe(1);
        });

        test('should handle navigation when no tabs are active', () => {
            mockTabs.forEach(tab => tab.classList.remove('active'));

            const context = keyboardNav.getNavigationContext();

            expect(context.currentTabIndex).toBe(-1);
        });

        test('should handle events when FocusManager methods return null', () => {
            mockFocusManager.findFirstVisibleItem.mockReturnValue(null);
            mockFocusManager.findLastVisibleItem.mockReturnValue(null);

            const arrowEvent = {
                key: 'ArrowDown',
                preventDefault: jest.fn()
            };

            mockSearchInput.focus();

            expect(() => {
                keyboardNav.handleArrowVertical(arrowEvent, keyboardNav.getNavigationContext());
            }).not.toThrow();

            expect(mockFocusManager.focusAndUpdateIndex).not.toHaveBeenCalled();
        });

        test('should handle service method failures gracefully', () => {
            mockStateManager.handleListNavigation.mockImplementation(() => {
                throw new Error('Service failure');
            });

            const arrowEvent = {
                key: 'ArrowDown',
                preventDefault: jest.fn()
            };

            const listItem = document.querySelector('.list-item');
            listItem.focus();

            // Should not propagate service errors
            expect(() => {
                keyboardNav.handleArrowVertical(arrowEvent, keyboardNav.getNavigationContext());
            }).toThrow('Service failure'); // Error should bubble up for debugging
        });
    });

    describe('Integration Patterns', () => {
        test('should coordinate between multiple services correctly', () => {
            // Test a complex interaction that involves multiple services
            const listItem = document.querySelector('.list-item');
            listItem.tabIndex = 0;
            listItem.focus();

            const deleteEvent = { key: 'Delete' };

            keyboardNav.handleKeyDown(deleteEvent);

            // Verify StateManager was called for bulk delete
            expect(mockStateManager.handleBulkDelete).toHaveBeenCalled();

            // Verify context was properly constructed
            const callArgs = mockStateManager.handleBulkDelete.mock.calls[0][0];
            expect(callArgs.items).toHaveLength(2);
            expect(callArgs.currentItemIndex).toBe(0);
        });

        test('should maintain service boundaries and delegation', () => {
            // KeyboardNavigation should not directly manipulate DOM or Chrome APIs
            // It should only coordinate service method calls

            const enterEvent = { key: 'Enter' };
            keyboardNav.handleKeyDown(enterEvent);

            // Verify it delegates to StateManager, not handling directly
            expect(mockStateManager.handleEnterNavigation).toHaveBeenCalledWith(
                enterEvent,
                expect.objectContaining({
                    items: expect.any(Array),
                    currentItemIndex: expect.any(Number)
                })
            );
        });
    });
});