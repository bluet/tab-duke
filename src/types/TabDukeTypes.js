/**
 * Central type definitions for TabDuke Chrome extension with TypeScript-style JSDoc annotations.
 * Provides consistent typing across all services with Chrome API integration.
 */

/**
 * Chrome Extension API Types
 * Enhanced Chrome API types with extension-specific properties.
 */

/**
 * @typedef {Object} ChromeTabExtended
 * @property {number} id - Unique Chrome tab identifier
 * @property {string} title - Tab title (may be truncated by Chrome)
 * @property {string} url - Full URL of the tab
 * @property {string} favIconUrl - Favicon URL (may be undefined)
 * @property {boolean} active - Whether tab is currently active in its window
 * @property {boolean} highlighted - Whether tab is highlighted (multi-select)
 * @property {boolean} pinned - Whether tab is pinned
 * @property {boolean} audible - Whether tab is playing audio
 * @property {boolean} muted - Whether tab audio is muted
 * @property {number} windowId - ID of the window containing this tab
 * @property {number} index - Position of tab within its window (0-based)
 * @property {string} status - Loading status ('loading' | 'complete')
 * @property {boolean} incognito - Whether tab is in incognito mode
 * @property {number} [openerTabId] - ID of tab that opened this tab
 * @property {string} [sessionId] - Session ID for tab restoration
 */

/**
 * @typedef {Object} ChromeWindowExtended
 * @property {number} id - Unique Chrome window identifier
 * @property {boolean} focused - Whether window currently has focus
 * @property {number} top - Top position of window in pixels
 * @property {number} left - Left position of window in pixels
 * @property {number} width - Width of window in pixels
 * @property {number} height - Height of window in pixels
 * @property {ChromeTabExtended[]} tabs - Array of tabs in this window
 * @property {boolean} incognito - Whether window is incognito
 * @property {'normal'|'popup'|'panel'|'app'|'devtools'} type - Window type
 * @property {'normal'|'minimized'|'maximized'|'fullscreen'} state - Window state
 * @property {boolean} alwaysOnTop - Whether window is always on top
 */

/**
 * Navigation and State Management Types
 * Core data structures for TabDuke's navigation system.
 */

/**
 * @typedef {Object} NavigationContext
 * @property {HTMLElement[]} items - Array of list item elements in current view
 * @property {HTMLElement} activeTabContent - Currently active tab content container
 * @property {number} currentTabIndex - Active tab index (0=Current Window, 1=All Windows)
 * @property {number} currentItemIndex - Index of currently focused item in active view
 * @property {string} viewType - Current view type ('currentWindow' | 'allWindow')
 * @property {number} visibleItemCount - Number of visible items after filtering
 * @property {HTMLElement} searchInput - Reference to search input element
 * @property {boolean} hasSearchFilter - Whether search filter is currently active
 */

/**
 * @typedef {Object} FocusRestoreData
 * @property {TabFocusData} currentTab - Focus data for Current Window view
 * @property {TabFocusData} allTab - Focus data for All Windows view
 * @property {'currentTab'|'allTab'} activeTabName - Currently active tab view
 * @property {number} lastActiveTabId - ID of last active Chrome tab for initialization
 */

/**
 * @typedef {Object} TabFocusData
 * @property {number} lastFocusedIndex - Last focused item index (-1 if none)
 * @property {number} relativePosition - Relative position in list (0-1 decimal)
 * @property {number} currentIndex - Current focused index for this view
 * @property {string} lastFocusedTabId - Chrome tab ID of last focused tab
 * @property {number} timestamp - Timestamp of last focus update
 */

/**
 * @typedef {Object} VisibleItemResult
 * @property {HTMLElement} item - The visible DOM element
 * @property {number} index - Index of the item in the original array
 * @property {number} tabId - Chrome tab ID associated with this item
 * @property {boolean} isActive - Whether this item represents the active Chrome tab
 */

/**
 * Tab Management and Operations Types
 * Types for Chrome tab operations and results.
 */

/**
 * @typedef {Object} TabCloseResults
 * @property {number} totalClosed - Total number of tabs successfully closed
 * @property {number} totalFailed - Number of tabs that failed to close
 * @property {number[]} closedTabIds - Array of successfully closed tab IDs
 * @property {TabCloseError[]} errors - Array of errors encountered during closing
 * @property {number} windowsAffected - Number of windows that had tabs closed
 * @property {boolean} allSuccessful - Whether all requested tabs were closed successfully
 */

/**
 * @typedef {Object} TabCloseError
 * @property {number} tabId - ID of tab that failed to close
 * @property {string} error - Error message from Chrome API
 * @property {'CHROME_ERROR'|'TAB_NOT_FOUND'|'PERMISSION_DENIED'|'UNKNOWN'} errorType - Categorized error type
 * @property {number} windowId - Window ID containing the failed tab
 */

/**
 * @typedef {Object} WindowGroupData
 * @property {number} windowId - Chrome window identifier
 * @property {ChromeTabExtended[]} tabs - Tabs belonging to this window
 * @property {boolean} isCurrentWindow - Whether this is the currently active window
 * @property {number} activeTabIndex - Index of active tab within this window
 * @property {number} visibleTabCount - Number of visible tabs after search filtering
 * @property {HTMLElement} headerElement - DOM element for window header (All Windows view)
 */

/**
 * Search and Filtering Types
 * Types for search functionality and filtering operations.
 */

/**
 * @typedef {Object} SearchState
 * @property {string} currentTerm - Current search term
 * @property {string} lastTerm - Previous search term for comparison
 * @property {number} resultCount - Number of matching results
 * @property {boolean} isActive - Whether search is currently active
 * @property {number} timestamp - Timestamp of last search update
 * @property {SearchFilter[]} activeFilters - Currently applied search filters
 */

/**
 * @typedef {Object} SearchFilter
 * @property {'title'|'url'|'domain'} type - Type of content to search
 * @property {string} value - Search term to match
 * @property {boolean} caseSensitive - Whether search is case sensitive
 * @property {boolean} exactMatch - Whether to use exact matching
 * @property {RegExp} [regex] - Compiled regex for complex searches
 */

/**
 * @typedef {Object} CounterState
 * @property {number} currentWindowTotal - Total tabs in current window
 * @property {number} currentWindowVisible - Visible tabs in current window after filtering
 * @property {number} allWindowsTotal - Total tabs across all windows
 * @property {number} allWindowsVisible - Visible tabs across all windows after filtering
 * @property {number} selectedCount - Number of currently selected tabs
 * @property {Map<number, number>} windowCounts - Tab counts per window ID
 */

/**
 * Event Handling and Delegation Types
 * Types for event management and user interactions.
 */

/**
 * @typedef {Object} KeyboardEventContext
 * @property {KeyboardEvent} originalEvent - Original browser keyboard event
 * @property {NavigationContext} navigationContext - Current navigation state
 * @property {'search'|'list'|'tab'} focusContext - Where keyboard focus currently resides
 * @property {string[]} modifierKeys - Active modifier keys (ctrl, shift, alt, meta)
 * @property {boolean} isRepeating - Whether key is being held down (repeat event)
 * @property {HTMLElement} target - Element that received the keyboard event
 */

/**
 * @typedef {Object} TabClickEventData
 * @property {number} tabId - Chrome tab ID that was clicked
 * @property {number} windowId - Chrome window ID containing the clicked tab
 * @property {HTMLElement} element - DOM element that was clicked
 * @property {MouseEvent} originalEvent - Original browser mouse event
 * @property {'single'|'double'|'middle'|'right'} clickType - Type of click performed
 * @property {boolean} hasModifiers - Whether modifier keys were pressed
 * @property {string[]} modifierKeys - Active modifier keys during click
 */

/**
 * Accessibility and ARIA Types
 * Types for accessibility features and screen reader support.
 */

/**
 * @typedef {Object} AccessibilityState
 * @property {HTMLElement} activeDescendant - Currently active ARIA descendant
 * @property {HTMLElement[]} selectedElements - Currently selected elements for ARIA
 * @property {string} lastAnnouncement - Last message announced to screen readers
 * @property {'off'|'polite'|'assertive'} liveRegionMode - Current live region politeness
 * @property {boolean} screenReaderActive - Whether screen reader is detected
 * @property {number} selectionCount - Number of selected items for announcements
 */

/**
 * @typedef {Object} ARIAAttributes
 * @property {string} role - ARIA role for the element
 * @property {string} [label] - ARIA label text
 * @property {string} [describedBy] - ID of describing element
 * @property {string} [labelledBy] - ID of labeling element
 * @property {boolean} [selected] - ARIA selected state
 * @property {boolean} [expanded] - ARIA expanded state for collapsible content
 * @property {number} [posInSet] - Position in set for lists
 * @property {number} [setSize] - Total size of set for lists
 * @property {'grid'|'listbox'|'tree'|'tablist'} [owns] - ARIA ownership relationships
 */

/**
 * Performance and Optimization Types
 * Types for performance monitoring and optimization.
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} renderTime - Time taken for last render operation (ms)
 * @property {number} searchTime - Time taken for last search operation (ms)
 * @property {number} tabCount - Current number of tabs being managed
 * @property {number} windowCount - Current number of windows being managed
 * @property {number} memoryUsage - Estimated memory usage (bytes)
 * @property {number} eventListenerCount - Number of active event listeners
 * @property {Map<string, number>} operationTimes - Timing data for various operations
 */

/**
 * Chrome Extension Error Types
 * Standardized error types for Chrome extension operations.
 */

/**
 * @typedef {Object} ChromeExtensionError
 * @property {string} message - Human-readable error message
 * @property {'CHROME_API'|'PERMISSION'|'NETWORK'|'STORAGE'|'UNKNOWN'} category - Error category
 * @property {string} operation - Operation that caused the error
 * @property {*} originalError - Original error object from Chrome API
 * @property {number} timestamp - When the error occurred
 * @property {Object} context - Additional context about the error
 * @property {boolean} recoverable - Whether the error can be recovered from
 */

/**
 * JSDoc Type Definitions for TabDuke
 *
 * These type definitions are available globally within the project for IDE IntelliSense,
 * type checking, and documentation generation. Reference them in JSDoc comments throughout the codebase.
 */

// No exports needed - JSDoc types are globally available in the project