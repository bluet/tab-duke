/**
 * TabRenderer Unit Tests - Comprehensive DOM Rendering and Event Delegation Testing
 *
 * Tests all critical functionality of TabRenderer.js including:
 * - DOM rendering and manipulation
 * - Event delegation setup
 * - Accessibility attributes
 * - Window grouping logic
 * - Tab item creation and management
 * - Error handling for missing DOM elements
 *
 * @fileoverview Tests for TabRenderer - DOM rendering service
 */

import { jest } from '@jest/globals';
import TabRenderer from '../../src/components/TabRenderer.js';

// Mock FaviconValidator module
jest.mock('../../src/utils/FaviconValidator.js', () => ({
    isSafeFaviconUrl: jest.fn((url) => {
        // Mock safe URLs: chrome-extension, data, https
        return url && (
            url.startsWith('chrome-extension://') ||
            url.startsWith('data:') ||
            url.startsWith('https://')
        );
    }),
    getDefaultFaviconUrl: jest.fn(() => 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23f0f0f0"/></svg>')
}));

describe('TabRenderer Unit Tests - Real Implementation', () => {
    let renderer;
    let mockClickHandler;

    // Sample Chrome tab data for testing
    const mockTabData = [
        {
            id: 1,
            title: 'Google',
            url: 'https://google.com',
            windowId: 100,
            active: true,
            favIconUrl: 'https://google.com/favicon.ico'
        },
        {
            id: 2,
            title: 'GitHub',
            url: 'https://github.com',
            windowId: 100,
            active: false,
            favIconUrl: 'https://github.com/favicon.ico'
        },
        {
            id: 3,
            title: 'Stack Overflow',
            url: 'https://stackoverflow.com',
            windowId: 200,
            active: false,
            favIconUrl: 'https://stackoverflow.com/favicon.ico'
        }
    ];

    // Helper function to safely create DOM structure
    function createDOMStructure() {
        // Clear existing content safely
        document.body.textContent = '';

        // Create required DOM elements safely
        const currentWindow = document.createElement('div');
        currentWindow.id = 'currentWindow';
        currentWindow.className = 'tab-content';

        const allWindow = document.createElement('div');
        allWindow.id = 'allWindow';
        allWindow.className = 'tab-content';

        document.body.appendChild(currentWindow);
        document.body.appendChild(allWindow);
    }

    beforeEach(() => {
        // Reset DOM safely
        createDOMStructure();

        renderer = new TabRenderer();
        mockClickHandler = jest.fn();

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        document.body.textContent = '';
    });

    describe('TabRenderer Initialization', () => {
        test('should initialize with default state', () => {
            expect(renderer.eventDelegationSetup).toBe(false);
            expect(renderer.clickHandler).toBe(null);
        });

        test('should initialize with click handler', () => {
            renderer.initialize(mockClickHandler);
            expect(renderer.clickHandler).toBe(mockClickHandler);
        });

        test('should not setup event delegation without initialization', () => {
            const currentWindow = document.getElementById('currentWindow');
            const allWindow = document.getElementById('allWindow');

            // Spy on addEventListener
            const currentWindowSpy = jest.spyOn(currentWindow, 'addEventListener');
            const allWindowSpy = jest.spyOn(allWindow, 'addEventListener');

            renderer.setupEventDelegation();

            expect(currentWindowSpy).not.toHaveBeenCalled();
            expect(allWindowSpy).not.toHaveBeenCalled();
        });
    });

    describe('Core Rendering Logic', () => {
        beforeEach(() => {
            renderer.initialize(mockClickHandler);
        });

        test('should render tabs in both current and all windows views', () => {
            renderer.renderTabs(mockTabData, 100);

            const currentWindow = document.getElementById('currentWindow');
            const allWindow = document.getElementById('allWindow');

            // Current window should have 2 tabs (windowId 100)
            expect(currentWindow.children.length).toBe(2);

            // All windows should have 2 window containers
            expect(allWindow.children.length).toBe(2);

            // Verify window headers exist
            const windowHeaders = allWindow.querySelectorAll('h2');
            expect(windowHeaders.length).toBe(2);
            expect(windowHeaders[0].textContent).toBe('Window 100');
            expect(windowHeaders[1].textContent).toBe('Window 200');
        });

        test('should handle empty tab list gracefully', () => {
            renderer.renderTabs([], 100);

            const currentWindow = document.getElementById('currentWindow');
            const allWindow = document.getElementById('allWindow');

            expect(currentWindow.children.length).toBe(0);
            expect(allWindow.children.length).toBe(0);
        });

        test('should handle missing DOM elements gracefully', () => {
            // Remove required DOM elements
            document.getElementById('currentWindow').remove();

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            renderer.renderTabs(mockTabData, 100);

            expect(consoleSpy).toHaveBeenCalledWith('TabRenderer: Required DOM elements not found');

            consoleSpy.mockRestore();
        });
    });

    describe('Window Grouping Logic', () => {
        beforeEach(() => {
            renderer.initialize(mockClickHandler);
        });

        test('should group tabs by window ID correctly', () => {
            const windowMap = renderer.groupTabsByWindow(mockTabData);

            expect(windowMap.size).toBe(2);
            expect(windowMap.get(100)).toHaveLength(2);
            expect(windowMap.get(200)).toHaveLength(1);

            // Verify tab order is preserved
            expect(windowMap.get(100)[0].id).toBe(1);
            expect(windowMap.get(100)[1].id).toBe(2);
            expect(windowMap.get(200)[0].id).toBe(3);
        });

        test('should handle single window tabs', () => {
            const singleWindowTabs = [mockTabData[0], mockTabData[1]];
            const windowMap = renderer.groupTabsByWindow(singleWindowTabs);

            expect(windowMap.size).toBe(1);
            expect(windowMap.get(100)).toHaveLength(2);
        });

        test('should handle empty tabs array', () => {
            const windowMap = renderer.groupTabsByWindow([]);

            expect(windowMap.size).toBe(0);
        });
    });

    describe('Individual Tab Item Creation', () => {
        beforeEach(() => {
            renderer.initialize(mockClickHandler);
        });

        test('should build complete list item with all components', () => {
            const listItem = renderer.buildListItem(mockTabData[0], 0);

            // Basic structure
            expect(listItem.tagName).toBe('DIV');
            expect(listItem.classList.contains('list-item')).toBe(true);
            expect(listItem.dataset.tabid).toBe('1');
            expect(listItem.dataset.windowid).toBe('100');

            // Accessibility attributes
            expect(listItem.getAttribute('role')).toBe('option');
            expect(listItem.getAttribute('aria-selected')).toBe('false');
            expect(listItem.getAttribute('id')).toBe('tab-option-1');
            expect(listItem.getAttribute('aria-describedby')).toBe('tab-1-description');

            // Components present
            expect(listItem.querySelector('img')).toBeTruthy(); // Favicon
            expect(listItem.querySelector('.truncated')).toBeTruthy(); // Title
            expect(listItem.querySelector('.remove-btn')).toBeTruthy(); // Remove button
            expect(listItem.querySelector('.sr-only')).toBeTruthy(); // Screen reader description
        });

        test('should mark active tabs correctly', () => {
            const activeItem = renderer.buildListItem(mockTabData[0], 0); // Active tab
            const inactiveItem = renderer.buildListItem(mockTabData[1], 1); // Inactive tab

            expect(activeItem.classList.contains('tab-active')).toBe(true);
            expect(inactiveItem.classList.contains('tab-active')).toBe(false);
        });

        test('should handle tabs without favicons', () => {
            const tabWithoutFavicon = { ...mockTabData[0], favIconUrl: null };
            const listItem = renderer.buildListItem(tabWithoutFavicon, 0);

            const favicon = listItem.querySelector('img');
            expect(favicon.src).toBe('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23f0f0f0"/></svg>');
            expect(favicon.classList.contains('favicon-broken')).toBe(true);
        });

        test('should handle tabs with unsafe favicons', () => {
            const tabWithUnsafeFavicon = { ...mockTabData[0], favIconUrl: 'javascript:alert("xss")' };
            const listItem = renderer.buildListItem(tabWithUnsafeFavicon, 0);

            const favicon = listItem.querySelector('img');
            expect(favicon.classList.contains('favicon-broken')).toBe(true);
        });

        test('should create proper title elements', () => {
            const listItem = renderer.buildListItem(mockTabData[0], 0);

            const titleDiv = listItem.querySelector('.truncated');
            const titleSpan = titleDiv.querySelector('span');

            expect(titleSpan.textContent).toBe('Google');
            expect(titleSpan.getAttribute('title')).toBe('https://google.com');
            // tabid is now stored on the list item as data-tabid, not on the span
            expect(titleSpan.getAttribute('tabid')).toBeNull();
        });

        test('should handle tabs without titles', () => {
            const tabWithoutTitle = { ...mockTabData[0], title: '' };
            const listItem = renderer.buildListItem(tabWithoutTitle, 0);

            const titleSpan = listItem.querySelector('.truncated span');
            expect(titleSpan.textContent).toBe('Untitled');
        });
    });

    describe('Event Delegation Setup', () => {
        beforeEach(() => {
            renderer.initialize(mockClickHandler);
        });

        test('should setup event delegation after rendering', () => {
            const currentWindow = document.getElementById('currentWindow');
            const allWindow = document.getElementById('allWindow');

            const currentWindowSpy = jest.spyOn(currentWindow, 'addEventListener');
            const allWindowSpy = jest.spyOn(allWindow, 'addEventListener');

            renderer.renderTabs(mockTabData, 100);

            expect(currentWindowSpy).toHaveBeenCalledWith('click', mockClickHandler);
            expect(allWindowSpy).toHaveBeenCalledWith('click', mockClickHandler);
            expect(renderer.eventDelegationSetup).toBe(true);
        });

        test('should not setup event delegation multiple times', () => {
            const currentWindow = document.getElementById('currentWindow');
            const currentWindowSpy = jest.spyOn(currentWindow, 'addEventListener');

            renderer.renderTabs(mockTabData, 100);
            renderer.renderTabs(mockTabData, 100); // Second render

            // Should only be called once despite multiple renders
            expect(currentWindowSpy).toHaveBeenCalledTimes(1);
        });

        test('should handle missing containers during event delegation setup', () => {
            document.getElementById('currentWindow').remove();

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            renderer.setupEventDelegation();

            expect(consoleSpy).toHaveBeenCalledWith('TabRenderer: Cannot setup event delegation - containers not found');

            consoleSpy.mockRestore();
        });
    });

    describe('Active Tab Focus Management', () => {
        beforeEach(() => {
            renderer.initialize(mockClickHandler);
        });

        test('should focus active tab after rendering', (done) => {
            renderer.renderTabs(mockTabData, 100);

            // Wait for setTimeout in focusActiveTab
            setTimeout(() => {
                const activeItem = document.querySelector('.tab-active');
                expect(document.activeElement).toBe(activeItem);
                done();
            }, 10);
        });

        test('should handle no active tab gracefully', () => {
            const tabsWithoutActive = mockTabData.map(tab => ({ ...tab, active: false }));

            expect(() => {
                renderer.renderTabs(tabsWithoutActive, 100);
            }).not.toThrow();
        });
    });

    describe('DOM Manipulation Methods', () => {
        beforeEach(() => {
            renderer.initialize(mockClickHandler);
            renderer.renderTabs(mockTabData, 100);
        });

        test('should clear all rendered content', () => {
            renderer.clearAll();

            const currentWindow = document.getElementById('currentWindow');
            const allWindow = document.getElementById('allWindow');

            expect(currentWindow.children.length).toBe(0);
            expect(allWindow.children.length).toBe(0);
        });

        test('should get all tab items', () => {
            const allItems = renderer.getAllTabItems();
            expect(allItems.length).toBe(5); // 2 in current + 3 in all windows view (2 window100 + 1 window200)
        });

        test('should get tab items for specific window', () => {
            const window100Items = renderer.getTabItemsForWindow(100);
            const window200Items = renderer.getTabItemsForWindow(200);

            // The method now correctly uses data-windowid attribute selectors
            expect(window100Items.length).toBe(4); // Both views contain window 100 tabs
            expect(window200Items.length).toBe(1); // Only all view contains window 200 tabs

            // Verify the returned items are correct
            window100Items.forEach(item => {
                expect(Number(item.dataset.windowid)).toBe(100);
            });
            window200Items.forEach(item => {
                expect(Number(item.dataset.windowid)).toBe(200);
            });
        });

        test('should update tab item visual state', () => {
            renderer.updateTabItem(1, { active: false, selected: true });

            // The selector now correctly looks for .list-item[data-tabid="1"]
            const tabItems = document.querySelectorAll('.list-item[data-tabid="1"]');
            expect(tabItems.length).toBe(2); // Tab with ID 1 exists in both views

            // Verify visual changes occurred
            tabItems.forEach(item => {
                expect(item.classList.contains('tab-active')).toBe(false); // active: false applied
                expect(item.classList.contains('selected')).toBe(true); // selected: true applied
                expect(item.classList.contains('bg-blue-100')).toBe(true); // selected styling applied
            });
        });

        test('should remove tab items from DOM', () => {
            // Verify tab 1 exists in both views initially
            const tab1ItemsBefore = document.querySelectorAll('.list-item[data-tabid="1"]');
            expect(tab1ItemsBefore.length).toBe(2);

            renderer.removeTabItem(1);

            // The selector now correctly finds and removes items with data-tabid="1"
            const tab1ItemsAfter = document.querySelectorAll('.list-item[data-tabid="1"]');
            expect(tab1ItemsAfter.length).toBe(0); // Items successfully removed

            // Verify total item count decreased
            const allItemsAfter = renderer.getAllTabItems();
            expect(allItemsAfter.length).toBe(3); // Started with 5, removed 2 (tab ID 1 in both views)
        });

        test('should handle updating non-existent tab items', () => {
            expect(() => {
                renderer.updateTabItem(999, { active: true });
            }).not.toThrow();
        });
    });

    describe('Accessibility Features', () => {
        beforeEach(() => {
            renderer.initialize(mockClickHandler);
        });

        test('should add proper ARIA attributes', () => {
            const listItem = renderer.buildListItem(mockTabData[0], 0);

            expect(listItem.getAttribute('role')).toBe('option');
            expect(listItem.getAttribute('aria-selected')).toBe('false');
            expect(listItem.hasAttribute('id')).toBe(true);
            expect(listItem.hasAttribute('aria-describedby')).toBe(true);
        });

        test('should create screen reader descriptions', () => {
            const listItem = renderer.buildListItem(mockTabData[0], 0);

            const description = listItem.querySelector('.sr-only');
            expect(description).toBeTruthy();
            expect(description.textContent).toContain('Tab in window 100');
            expect(description.textContent).toContain('https://google.com');
        });

        test('should set proper tabindex for keyboard navigation', () => {
            const listItem = renderer.buildListItem(mockTabData[0], 0);

            expect(listItem.tabIndex).toBe(-1); // Roving tabindex pattern
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle malformed tab data', () => {
            renderer.initialize(mockClickHandler);

            const malformedTab = {
                id: null,
                title: null,
                url: null,
                windowId: null,
                active: null,
                favIconUrl: null
            };

            expect(() => {
                const listItem = renderer.buildListItem(malformedTab, 0);
                expect(listItem).toBeTruthy();
            }).not.toThrow();
        });

        test('should handle favicon error events', () => {
            renderer.initialize(mockClickHandler);
            const listItem = renderer.buildListItem(mockTabData[0], 0);

            const favicon = listItem.querySelector('img');

            // Simulate favicon load error
            const errorEvent = new Event('error');
            favicon.dispatchEvent(errorEvent);

            expect(favicon.classList.contains('favicon-broken')).toBe(true);
        });

        test('should handle missing DOM elements in clearAll', () => {
            document.body.textContent = ''; // Remove all elements safely

            expect(() => {
                renderer.clearAll();
            }).not.toThrow();
        });

        test('should handle empty window map in rendering', () => {
            renderer.initialize(mockClickHandler);

            const emptyWindowMap = new Map();

            expect(() => {
                renderer.renderOptimized(emptyWindowMap, 100,
                    document.getElementById('currentWindow'),
                    document.getElementById('allWindow')
                );
            }).not.toThrow();
        });
    });

    describe('Performance Optimizations', () => {
        beforeEach(() => {
            renderer.initialize(mockClickHandler);
        });

        test('should use event delegation instead of individual listeners', () => {
            // Create many tabs to test delegation
            const manyTabs = Array.from({ length: 100 }, (_, i) => ({
                id: i + 1,
                title: `Tab ${i + 1}`,
                url: `https://example${i + 1}.com`,
                windowId: 100,
                active: i === 0,
                favIconUrl: `https://example${i + 1}.com/favicon.ico`
            }));

            renderer.renderTabs(manyTabs, 100);

            // Verify only 2 event listeners are set up (delegation pattern)
            expect(renderer.eventDelegationSetup).toBe(true);

            // All tab items should be rendered without individual listeners
            const tabItems = renderer.getAllTabItems();
            expect(tabItems.length).toBe(200); // 100 in each view
        });

        test('should batch DOM operations efficiently', () => {
            const startTime = performance.now();

            renderer.renderTabs(mockTabData, 100);

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // Rendering should be very fast (under 50ms for small dataset)
            expect(renderTime).toBeLessThan(50);
        });
    });
});