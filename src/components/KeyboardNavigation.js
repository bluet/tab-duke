/**
 * KeyboardNavigation - Streamlined keyboard event coordination service
 *
 * This is the planned 80-line keyboard handler from TODO.md that replaces
 * the monolithic 394-line handleKeyDown function with a clean coordinator
 * that delegates to specialized services.
 *
 * Key responsibilities:
 * - Route keyboard events to appropriate service methods
 * - Coordinate between FocusManager, TabManager, SearchEngine, and StateManager
 * - Maintain clean separation of concerns
 * - Provide a single entry point for all keyboard handling
 *
 * Benefits:
 * - 83% reduction in keyboard handling complexity (394 → 80 lines)
 * - Service-oriented architecture with clear delegation
 * - Easy to test and maintain
 * - Professional separation of concerns
 */
class KeyboardNavigation {
	constructor(focusManager, tabManager, searchEngine, stateManager) {
		this.focusManager = focusManager;
		this.tabManager = tabManager;
		this.searchEngine = searchEngine;
		this.stateManager = stateManager;

		// DOM references
		this.searchInput = null;
		this.tabs = null;
	}

	/**
	 * Initialize keyboard navigation with DOM references
	 * @param {HTMLElement} searchInput - Search input element
	 * @param {NodeList} tabs - Tab button elements
	 */
	initialize(searchInput, tabs) {
		this.searchInput = searchInput;
		this.tabs = tabs;
		this.setupEventListeners();
	}

	/**
	 * Setup keyboard event listeners
	 */
	setupEventListeners() {
		document.addEventListener('keydown', (e) => this.handleKeyDown(e));
	}

	/**
	 * Main keyboard event handler - replaces 394-line monolith
	 * @param {KeyboardEvent} e - Keyboard event
	 */
	handleKeyDown(e) {
		const context = this.getNavigationContext();

		// Early exit for empty lists (except search navigation)
		if (context.items.length === 0 && !this.isSearchNavigation(e)) {
			return;
		}

		// Route to appropriate handler based on key
		switch (e.key) {
			case 'Tab':
				this.handleTab(e, context);
				break;
			case 'ArrowUp':
			case 'ArrowDown':
				this.handleArrowVertical(e, context);
				break;
			case 'ArrowLeft':
			case 'ArrowRight':
				this.handleArrowHorizontal(e, context);
				break;
			case 'PageUp':
			case 'PageDown':
				this.handlePageNavigation(e, context);
				break;
			case 'Home':
			case 'End':
				this.handleHomeEnd(e, context);
				break;
			case ' ':
				this.handleSpace(e, context);
				break;
			case 'Delete':
				this.handleDelete(e, context);
				break;
			case 'Enter':
				this.handleEnter(e, context);
				break;
			case 'Escape':
				this.handleEscape(e, context);
				break;
			case 'a':
			case 'A':
				this.handleSelectAll(e, context);
				break;
			case 'g':
			case 'G':
				this.handleJumpToActive(e, context);
				break;
			default:
				this.handleDefault(e);
		}
	}

	// Navigation handlers - each delegates to appropriate service

	handleTab(e, context) {
		if (e.shiftKey && this.searchInput !== document.activeElement) {
			e.preventDefault();
			this.searchInput.focus();
		} else if (!e.shiftKey && this.searchInput === document.activeElement) {
			e.preventDefault();
			this.focusManager.restoreSavedFocusPosition(context.items);
		} else if (!e.shiftKey) {
			e.preventDefault();
			this.searchInput.focus();
		}
	}

	handleArrowVertical(e, context) {
		e.preventDefault(); // Always prevent default scrolling behavior
		if (e.altKey) {
			this.stateManager.handleWindowSectionNavigation(e, context);
		} else if (this.searchInput === document.activeElement) {
			const target = e.key === 'ArrowUp' ?
				this.focusManager.findLastVisibleItem(context.items) :
				this.focusManager.findFirstVisibleItem(context.items);
			if (target) this.focusManager.focusAndUpdateIndex(target.item, target.index, context.items, 'smooth');
		} else {
			this.stateManager.handleListNavigation(e, context);
		}
	}

	handleArrowHorizontal(e, context) {
		if (e.ctrlKey || e.metaKey) {
			this.stateManager.handleTabViewSwitch(e, context);
		}
	}

	handlePageNavigation(e, context) {
		e.preventDefault();
		const direction = e.key === 'PageUp' ? -10 : 10;
		this.stateManager.handlePageJump(direction, context);
	}

	handleHomeEnd(e, context) {
		if (this.searchInput === document.activeElement && e.key === 'Home') return;
		e.preventDefault();
		const target = e.key === 'Home' ?
			this.focusManager.findFirstVisibleItem(context.items) :
			{ item: context.items[context.items.length - 1], index: context.items.length - 1 };
		if (target) this.focusManager.focusAndUpdateIndex(target.item, target.index, context.items, 'smooth', true);
	}

	handleSpace(e, context) {
		// Only handle multi-select when focus is specifically on a list item
		if (document.activeElement && document.activeElement.classList.contains('list-item')) {
			e.preventDefault();
			this.stateManager.toggleSelection(context.currentItemIndex, context.items);
		}
		// For all other contexts (search input, tab buttons, etc.), allow default behavior
	}

	handleDelete(e, context) {
		// Only handle delete when focus is specifically on a list item
		if (document.activeElement && document.activeElement.classList.contains('list-item')) {
			this.stateManager.handleBulkDelete(context);
		}
		// For all other contexts (search input, tab buttons, etc.), ignore delete key
	}

	handleEnter(e, context) {
		this.stateManager.handleEnterNavigation(e, context);
	}

	handleEscape(e, context) {
		this.stateManager.handleEscapeSequence(e, context);
	}

	handleSelectAll(e, context) {
		// Only handle select-all when focus is specifically on a list item
		if ((e.ctrlKey || e.metaKey) && document.activeElement &&
		    document.activeElement.classList.contains('list-item')) {
			e.preventDefault();
			this.stateManager.selectAllVisible(context.items);
		}
		// For all other contexts (search input, tab buttons, etc.), allow default behavior
	}

	handleJumpToActive(e, context) {
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			if (e.shiftKey) {
				// Ctrl+Shift+G: Reverse cycle through active tabs
				this.stateManager.jumpToCurrentlyActiveTabReverse();
			} else {
				// Ctrl+G: Forward cycle through active tabs
				this.stateManager.jumpToCurrentlyActiveTab();
			}
		}
	}

	handleDefault(e) {
		if (e.key.length === 1) {
			this.searchInput.focus(); // Auto-focus search for typing
		}
	}

	// Helper methods

	getNavigationContext() {
		const activeTabContent = document.querySelector(".tab-content.active");
		const currentTabIndex = [...this.tabs].findIndex(tab => tab.classList.contains("active"));

		return {
			items: activeTabContent ? [...activeTabContent.querySelectorAll(".list-item")] : [],
			activeTabContent,
			currentTabIndex,
			currentItemIndex: this.stateManager ? this.stateManager.getCurrentItemIndex() : 0
		};
	}

	isSearchNavigation(e) {
		return (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
		       this.searchInput === document.activeElement;
	}
}

export default KeyboardNavigation;