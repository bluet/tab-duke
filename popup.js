const tabs = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const searchInput = document.getElementById("searchInput");
let currentItemIndex = 0;
let lastClickedIndex = -1; // For shift+click range selection
let multiSelectWarningActive = false; // For multi-select Enter warning

// Removed overcomplicated virtual scrolling - keeping it simple and global

// Focus restoration system - separate tracking per tab
let focusRestoreData = {
	currentTab: {
		lastFocusedIndex: -1, // -1 means no previous focus data
		relativePosition: 0
	},
	allTab: {
		lastFocusedIndex: -1, // -1 means no previous focus data
		relativePosition: 0
	},
	activeTabName: 'currentTab' // 'currentTab' or 'allTab'
};

// Smart scrolling utility functions - tiered approach
function focusWithSmartScroll(item, transition = 'instant') {
	item.focus();
	item.scrollIntoView({
		block: 'nearest',    // Only scroll if not fully visible
		behavior: transition
	});
}

function focusWithSmoothScroll(item) {
	focusWithSmartScroll(item, 'smooth');
}

function focusWithInstantScroll(item) {
	focusWithSmartScroll(item, 'instant');
}

// Helper function to eliminate repeated focus+update pattern
function focusAndUpdateIndex(item, index, items, scrollMode = 'instant', saveFocus = false) {
	if (scrollMode === 'smooth') {
		focusWithSmoothScroll(item);
	} else {
		focusWithInstantScroll(item);
	}
	currentItemIndex = index;
	updateRovingTabindex(items, index);

	// Update ARIA active descendant - Phase 4 Accessibility
	updateActiveDescendant(item);

	if (saveFocus) {
		saveCurrentFocusPosition(items);
	}
}

// Multi-select warning management
function clearMultiSelectWarning() {
	if (multiSelectWarningActive) {
		multiSelectWarningActive = false;
		searchInput.classList.remove('warning-state');
		// Restore original placeholder
		updateCounterText(); // This will reset the placeholder
	}
}

// Focus restoration functions
function calculateRelativePosition(currentIndex, totalItems) {
	return totalItems > 0 ? currentIndex / totalItems : 0;
}

function getCurrentTabData() {
	return focusRestoreData[focusRestoreData.activeTabName];
}

function saveCurrentFocusPosition(items) {
	const tabData = getCurrentTabData();
	tabData.lastFocusedIndex = currentItemIndex;
	tabData.relativePosition = calculateRelativePosition(currentItemIndex, items.length);
}

function updateActiveTabName() {
	const currentTabIndex = [...tabs].findIndex(tab => tab.classList.contains("active"));
	focusRestoreData.activeTabName = (currentTabIndex === 0) ? 'currentTab' : 'allTab';
}

function setCurrentItemIndexToActiveTab(currentTabId) {
	// Set currentItemIndex to the position of the currently active browser tab
	const activeTabContent = document.querySelector(".tab-content.active");
	const items = activeTabContent.querySelectorAll(".list-item");

	items.forEach((item, index) => {
		if (item.tabid === currentTabId) {
			currentItemIndex = index;
			return;
		}
	});
}

function initializeFocusToCurrentTabData(currentTabId) {
	// Find the currently active tab in both tab views and set initial focus data
	const currentWindowItems = [...document.getElementById("currentWindow").querySelectorAll('.list-item')];
	const allWindowItems = [...document.getElementById("allWindow").querySelectorAll('.list-item')];

	// Set focus data for Current tab view
	const currentTabIndex = currentWindowItems.findIndex(item => item.tabid === currentTabId);
	if (currentTabIndex >= 0) {
		focusRestoreData.currentTab.lastFocusedIndex = currentTabIndex;
		focusRestoreData.currentTab.relativePosition = calculateRelativePosition(currentTabIndex, currentWindowItems.length);
	}

	// Set focus data for All tab view
	const allTabIndex = allWindowItems.findIndex(item => item.tabid === currentTabId);
	if (allTabIndex >= 0) {
		focusRestoreData.allTab.lastFocusedIndex = allTabIndex;
		focusRestoreData.allTab.relativePosition = calculateRelativePosition(allTabIndex, allWindowItems.length);
	}

	// Set currentItemIndex for the currently visible tab view
	updateActiveTabName();
	if (focusRestoreData.activeTabName === 'currentTab' && currentTabIndex >= 0) {
		currentItemIndex = currentTabIndex;
	} else if (focusRestoreData.activeTabName === 'allTab' && allTabIndex >= 0) {
		currentItemIndex = allTabIndex;
	}
}

function restoreFocusAfterTabSwitch(newItems) {
	updateActiveTabName(); // Update which tab is now active
	const tabData = getCurrentTabData();

	// Try to restore to the exact same index first (only if we have valid previous data)
	if (tabData.lastFocusedIndex >= 0 && tabData.lastFocusedIndex < newItems.length && newItems[tabData.lastFocusedIndex]) {
		const targetItem = newItems[tabData.lastFocusedIndex];
		if (targetItem.style.display !== 'none') {
			focusAndUpdateIndex(targetItem, tabData.lastFocusedIndex, newItems);
			return true;
		}
	}

	// Fallback to relative position if exact index doesn't work
	const targetIndex = Math.floor(tabData.relativePosition * newItems.length);
	const clampedIndex = Math.min(targetIndex, newItems.length - 1);
	const targetItem = newItems[clampedIndex];

	if (targetItem.style.display !== 'none') {
		focusAndUpdateIndex(targetItem, clampedIndex, newItems);
		return true;
	}

	// BETTER FALLBACK: Look for current active tab first, then first visible
	const currentActiveItem = newItems.find(item => item.classList.contains('tab-active'));
	if (currentActiveItem) {
		const activeIndex = newItems.indexOf(currentActiveItem);
		focusAndUpdateIndex(currentActiveItem, activeIndex, newItems);
		return true;
	}

	// Final fallback to first visible if no current active tab found
	const firstVisible = findFirstVisibleItem(newItems);
	if (firstVisible) {
		focusAndUpdateIndex(firstVisible.item, firstVisible.index, newItems);
		return true;
	}

	return false;
}

function restoreFocusAfterSearchClear() {
	const items = [...document.querySelector('.tab-content.active').querySelectorAll('.list-item')];
	const targetIndex = Math.min(focusRestoreData.lastSearchFocusedIndex, items.length - 1);

	if (items[targetIndex]) {
		focusAndUpdateIndex(items[targetIndex], targetIndex, items, 'smooth');
	}
}

// Roving tabindex management - only focused item should be tabbable
function updateRovingTabindex(items, focusedIndex) {
	items.forEach((item, index) => {
		item.tabIndex = (index === focusedIndex) ? 0 : -1;
	});
}

// function addItems (tabContent, items, prefix) {
// 	const windowMap = new Map();

// 	items.forEach((item, tabIndex) => {
// 		if (!windowMap.has(item.windowId)) {
// 			windowMap.set(item.windowId, []);
// 		}
// 		windowMap.get(item.windowId).push(item);
// 	});

// 	windowMap.forEach((items, windowId) => {
// 		const windowDiv = document.createElement("div");
// 		windowDiv.classList.add("window");
// 		windowDiv.innerHTML = `<h2>Window ${windowId}</h2>`;

// 		items.forEach((item, tabIndex) => {
// 			const listItem = document.createElement("div");
// 			listItem.classList.add("flex", "items-center", "p-2", "rounded", "list-item");
// 			if (item.active) {
// 				listItem.classList.add("tab-active");
// 			}
// 			listItem.tabIndex = tabIndex;
// 			listItem.tabid = item.id;
// 			listItem.innerHTML = `
// 			<img class="mr-2" width='16' height='16' src="${item.favIconUrl}" alt="favicon">
// 			<div class='truncated'><span style=cursor:pointer tabid=${item.id} title='${prefix}${item.url}'>${item.title}</span></div>
// 			<span class="remove-btn text-red-500">❌</span>
// 			`;

// 			// if click on the item, pass the tabID and windowID to the function goToOpenedTab
// 			// if click on the remove button, pass the tabID to the function closeOpenedTab
// 			listItem.addEventListener(
// 				"click",
// 				(function (item) {
// 					return function (event) {
// 						// console.log("listItem click");
// 						// console.log("listItem event.target: ", event.target);
// 						if (event.target.classList.contains("remove-btn")) {
// 							// console.log("listItem remove-btn click");
// 							// event.target.parentElement.remove();
// 							// need to remove the item from both lists
// 							removeItemFromLists(item.id);
// 							closeOpenedTab(item.id);
// 							updateCounterText();
// 						} else {
// 							// console.log("listItem goToOpenedTab click");
// 							goToOpenedTab(item.id, item.windowId);
// 							updateCounterText();
// 						}
// 					};
// 				})(item)
// 			);

// 			// if this is the current active tab in the current window, focus on it
// 			if (item.active) {
// 				listItem.focus();
// 			}

// 			windowDiv.appendChild(listItem);
// 		});

// 		tabContent.appendChild(windowDiv);
// 	});
// }

function addItemsToBoth (items, currentWindowId) {
	const tabContentCurrent = document.getElementById("currentWindow");
	const tabContentAll = document.getElementById("allWindow");
	const windowMap = new Map();

	// Group items by window (PRESERVE ORIGINAL STRUCTURE)
	items.forEach((item, tabIndex) => {
		if (!windowMap.has(item.windowId)) {
			windowMap.set(item.windowId, []);
		}
		windowMap.get(item.windowId).push(item);
	});

	// Always use optimized approach - better performance at all scales
	addItemsOptimized(windowMap, currentWindowId, tabContentCurrent, tabContentAll);

	// Setup event delegation (always better)
	setupEventDelegation();

	// Find and focus active tab
	const activeTab = items.find(item => item.active);
	if (activeTab) {
		setTimeout(() => {
			const activeItem = tabContentCurrent.querySelector('.tab-active') ||
			                  tabContentAll.querySelector('.tab-active');
			if (activeItem) {
				activeItem.focus();
			}
		}, 0);
	}
}

// FIXED: Proper separation of Current vs All tab content
function addItemsOptimized(windowMap, currentWindowId, tabContentCurrent, tabContentAll) {
	// Clear containers
	tabContentCurrent.textContent = '';
	tabContentAll.textContent = '';

	// Populate Current tab: Only current window items, NO window headers (flat list)
	const currentWindowTabs = windowMap.get(currentWindowId) || [];
	currentWindowTabs.forEach((item, tabIndex) => {
		const listItem = buildListItem(item, tabIndex);
		tabContentCurrent.appendChild(listItem);
	});

	// Populate All tab: ALL windows with window headers and structure
	windowMap.forEach((windowTabs, windowID) => {
		const windowDiv = document.createElement("div");
		windowDiv.windowId = windowID;
		windowDiv.classList.add("window");

		const windowHeader = document.createElement("h2");
		windowHeader.textContent = `Window ${windowID}`;
		windowDiv.appendChild(windowHeader);

		windowTabs.forEach((item, tabIndex) => {
			const listItem = buildListItem(item, tabIndex);
			windowDiv.appendChild(listItem);
		});

		tabContentAll.appendChild(windowDiv);
	});
}

// Event Delegation System - replaces individual listeners with 2 delegated listeners
function setupEventDelegation() {
	const currentWindow = document.getElementById('currentWindow');
	const allWindow = document.getElementById('allWindow');

	// Remove existing listeners if any (simple approach)
	currentWindow.removeEventListener('click', handleTabClick);
	allWindow.removeEventListener('click', handleTabClick);

	// Add single delegated listeners
	currentWindow.addEventListener('click', handleTabClick);
	allWindow.addEventListener('click', handleTabClick);
}

function handleTabClick(event) {
	const listItem = event.target.closest('.list-item');
	if (!listItem) return;

	const tabId = listItem.tabid;  // Property, not attribute
	const windowId = listItem.windowId;

	if (event.target.classList.contains('remove-btn')) {
		// Remove button clicked
		event.stopPropagation();
		removeItemFromLists(tabId);
		closeOpenedTab(tabId);
		updateCounterText();
	} else if (event.ctrlKey || event.metaKey) {
		// Ctrl+click: Toggle individual selection
		event.preventDefault();
		const activeTabContent = document.querySelector(".tab-content.active");
		const items = [...activeTabContent.querySelectorAll(".list-item")];
		const clickedIndex = items.indexOf(listItem);

		// Toggle selection on clicked item
		listItem.classList.toggle("selected");
		listItem.classList.toggle("bg-blue-100");

		// Update ARIA selection state - Phase 4 Accessibility
		updateAriaSelected();

		// Announce selection change - Phase 4 Accessibility
		const selectedCount = document.querySelectorAll('.tab-content.active .list-item.selected').length;
		announceToScreenReader(`${selectedCount} tab${selectedCount !== 1 ? 's' : ''} selected`);

		// Update focus and index for continued keyboard navigation
		focusAndUpdateIndex(listItem, clickedIndex, items);
		lastClickedIndex = clickedIndex;
	} else if (event.shiftKey && lastClickedIndex >= 0) {
		// Shift+click: Range selection from last clicked to current
		event.preventDefault();
		const activeTabContent = document.querySelector(".tab-content.active");
		const items = [...activeTabContent.querySelectorAll(".list-item")];
		const clickedIndex = items.indexOf(listItem);

		// Clear existing selections
		items.forEach(item => {
			item.classList.remove("selected", "bg-blue-100");
		});

		// Select range (include both endpoints)
		const startIndex = Math.min(lastClickedIndex, clickedIndex);
		const endIndex = Math.max(lastClickedIndex, clickedIndex);

		for (let i = startIndex; i <= endIndex; i++) {
			// Only select visible items (skip filtered/hidden)
			if (items[i] && items[i].style.display !== 'none') {
				items[i].classList.add("selected", "bg-blue-100");
			}
		}

		// Update ARIA selection state - Phase 4 Accessibility
		updateAriaSelected();

		// Update focus and index for continued keyboard navigation
		focusAndUpdateIndex(listItem, clickedIndex, items);
		lastClickedIndex = clickedIndex;
	} else {
		// Regular click: Navigate to tab
		goToOpenedTab(tabId, windowId);
		updateCounterText();
	}
}

function buildListItem (data, tabIndex) {
	const listItem = document.createElement("div");
	const tabID = data.id;
	listItem.classList.add("flex", "items-center", "p-2", "rounded", "list-item");
	if (data.active) {
		listItem.classList.add("tab-active");
	}
	listItem.tabIndex = -1; // Roving tabindex: only focused item has tabIndex="0"
	listItem.tabid = tabID;
	listItem.windowId = data.windowId;

	// ARIA attributes - Phase 4 Accessibility
	listItem.setAttribute('role', 'option');
	listItem.setAttribute('aria-selected', 'false');
	listItem.setAttribute('id', `tab-option-${tabID}`);
	listItem.setAttribute('aria-describedby', `tab-${tabID}-description`);

	// Create favicon image safely
	const favicon = document.createElement("img");
	favicon.classList.add("mr-2");
	favicon.setAttribute("width", "16");
	favicon.setAttribute("height", "16");
	favicon.setAttribute("alt", "favicon");
	if (data.favIconUrl) {
		favicon.src = data.favIconUrl;
	}
	// Handle broken favicon images gracefully
	favicon.addEventListener('error', function() {
		this.classList.add('favicon-broken');
	});
	listItem.appendChild(favicon);

	// Create title container safely
	const titleDiv = document.createElement("div");
	titleDiv.classList.add("truncated");
	const titleSpan = document.createElement("span");
	titleSpan.style.cursor = "pointer";
	titleSpan.setAttribute("tabid", tabID);
	titleSpan.setAttribute("title", data.url || "");
	titleSpan.textContent = data.title || "Untitled";
	titleDiv.appendChild(titleSpan);
	listItem.appendChild(titleDiv);

	// Create remove button safely
	const removeBtn = document.createElement("span");
	removeBtn.classList.add("remove-btn", "text-red-500");
	removeBtn.textContent = "❌";
	listItem.appendChild(removeBtn);

	// Event handling now done via delegation - see setupEventDelegation()

	// Create hidden description for screen readers - Phase 4 Accessibility
	const description = document.createElement('div');
	description.id = `tab-${tabID}-description`;
	description.className = 'sr-only';
	description.textContent = `Tab in window ${data.windowId}. ${data.url || ''}`;
	listItem.appendChild(description);

	return listItem;
}

// ARIA helper functions - Phase 4 Accessibility

// Update aria-activedescendant when focus changes
function updateActiveDescendant(focusedItem) {
	if (!focusedItem) return;
	const listbox = focusedItem.closest('[role="listbox"]');
	if (listbox) {
		listbox.setAttribute('aria-activedescendant', focusedItem.id || '');
	}
}

// Update aria-selected for multi-selection
function updateAriaSelected() {
	const activeTabContent = document.querySelector('.tab-content.active');
	const items = activeTabContent.querySelectorAll('.list-item');

	items.forEach(item => {
		const isSelected = item.classList.contains('selected');
		item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
	});
}

// Update tab states
function updateTabAriaStates(activeTabIndex) {
	const tabs = document.querySelectorAll('[role="tab"]');
	tabs.forEach((tab, index) => {
		tab.setAttribute('aria-selected', index === activeTabIndex ? 'true' : 'false');
		tab.setAttribute('tabindex', index === activeTabIndex ? '0' : '-1');
	});
}

// Live region announcements
function announceToScreenReader(message) {
	const announceElement = document.getElementById('sr-announcements');
	if (announceElement) {
		announceElement.textContent = message;
		// Clear after 1 second to avoid clutter
		setTimeout(() => {
			announceElement.textContent = '';
		}, 1000);
	}
}

function removeItemFromLists (tabID) {
	const currentWindowContent = document.getElementById("currentWindow");
	const currentWindowItems = currentWindowContent.querySelectorAll(".list-item");
	const allWindowContent = document.getElementById("allWindow");
	const allWindowItems = allWindowContent.querySelectorAll(".list-item");

	currentWindowItems.forEach((item) => {
		if (item.tabid === tabID) {
			item.remove();
		}
	});

	allWindowItems.forEach((item) => {
		if (item.tabid === tabID) {
			item.remove();
		}
	});
}

// Function to add sample items to the tabs
// function addSampleItems (tabContent, itemCount, prefix) {
// 	for (let i = 1; i <= itemCount; i++) {
// 		const item = document.createElement("div");
// 		item.classList.add("flex", "items-center", "p-2", "bg-blue-100", "rounded", "list-item");
// 		item.innerHTML = `
// 	    <img class="mr-2" src="https://via.placeholder.com/16" alt="favicon">
// 	    ${prefix} Item ${i}
// 	  `;
// 		tabContent.appendChild(item);
// 	}
// }
// addSampleItems(document.getElementById('currentWindow'), 15, 'Sample');


// function to display the selected tab
function goToOpenedTab (tabID, windowID) {
	if (!tabID || !windowID) {
		return;
	}

	// Check if target window is current window
	chrome.windows.getCurrent((currentWindow) => {
		const isCurrentWindow = windowID === currentWindow.id;

		if (isCurrentWindow) {
			// Current window - skip window focus, go directly to tab switch
			// (avoids popup closing before tab switch completes)
			chrome.tabs.update(tabID, { "active": true });
		} else {
			// Other window - need to focus window first, then switch tab
			chrome.windows.update(windowID, { "focused": true }, () => {
				chrome.tabs.update(tabID, { "active": true });
			});
		}
	});
}

// function to close the selected tab
function closeOpenedTab (tabID) {
	chrome.tabs.remove(tabID);
	// updateCounterText();
}

function updateCounterText () {
	const currentWindowContent = document.getElementById("currentWindow");
	const allWindowContent = document.getElementById("allWindow");
	const isSearching = searchInput.value.trim() !== "";
	const searchIcon = isSearching ? "🔎 " : "";

	// RESTORED: Original counting logic that works with window structure
	let currentVisibleCount, allVisibleCount;

	if (isSearching) {
		// Count only visible items when searching
		const currentVisible = currentWindowContent.querySelectorAll(".list-item");
		currentVisibleCount = Array.from(currentVisible).filter(item => item.style.display !== "none").length;

		const allVisible = allWindowContent.querySelectorAll(".list-item");
		allVisibleCount = Array.from(allVisible).filter(item => item.style.display !== "none").length;
	} else {
		// Count all items when not searching
		currentVisibleCount = currentWindowContent.querySelectorAll(".list-item").length;
		allVisibleCount = allWindowContent.querySelectorAll(".list-item").length;
	}

	// Update search placeholder
	const activeTabContent = document.querySelector(".tab-content.active");
	const activeCount = activeTabContent === currentWindowContent ? currentVisibleCount : allVisibleCount;
	searchInput.placeholder = `Search... (${activeCount} items)`;

	// Update both tab titles
	const tabTitleCurrent = document.getElementById("tabTitleCurrent");
	const tabTitleAll = document.getElementById("tabTitleAll");

	tabTitleCurrent.textContent = `${searchIcon}Current (${currentVisibleCount})`;

	// Count windows and update "All" tab title (OPTIMIZED - removed populate: true)
	chrome.windows.getAll({}, (window_list) => {
		// Count visible windows when searching
		let visibleWindowCount = window_list.length;
		if (isSearching) {
			const windows = allWindowContent.querySelectorAll(".window");
			visibleWindowCount = Array.from(windows).filter(w => w.style.display !== "none").length;
		}
		tabTitleAll.textContent = `${searchIcon}All (${allVisibleCount} in ${visibleWindowCount})`;
	});
}

//get tabs in current window
function getCurrentWindowTabs (callback) {
	chrome.tabs.query({ "currentWindow": true }, (tabs) => {
		callback(tabs);
	});
}

//get all tabs
function getAllTabs (callback) {
	chrome.tabs.query({}, (tabs) => {
		callback(tabs);
	});
}

function scrollToItem (tabID, windowID) {
	const currentWindowContent = document.getElementById("currentWindow");
	const currentWindowItems = currentWindowContent.querySelectorAll(".list-item");
	const allWindowContent = document.getElementById("allWindow");
	const allWindowItems = allWindowContent.querySelectorAll(".list-item");

	// console.log("target tabID: ", tabID);

	// if showing allWindows tabs, scroll to the item of the current active tab in the current active window
	if (allWindowContent.classList.contains("active")) {
		// console.log("allWindowContent.classList.contains('active'): ", allWindowContent.classList.contains("active"));
		// console.log("allWindowContent: ", allWindowContent);
		// console.log("allWindowItems: ", allWindowItems);
		allWindowItems.forEach((item, index) => {
			if (item.tabid === tabID) {
				// console.log("scrollToItem item: ", item);
				// item.scrollIntoView();
				item.focus();
				currentItemIndex = index;
			}
		});
	} else if (currentWindowContent.classList.contains("active")) {
		// console.log("currentWindowContent.classList.contains('active'): ", currentWindowContent.classList.contains("active"));
		// console.log("currentWindowContent: ", currentWindowContent);
		// console.log("currentWindowItems: ", currentWindowItems);
		// if showing currentWindow tabs, scroll to the item of the current active tab in the current active window
		currentWindowItems.forEach((item, index) => {
			// console.log("item.tabid: ", item.tabid);
			if (item.tabid === tabID) {
				// console.log("scrollToItem item: ", item);
				// item.scrollIntoView();
				item.focus();
				currentItemIndex = index;
			}
		});
	}
}

function scrollToCurrentItem () {
	// scroll to the item of the current active tab in the current active window
	// const activeTabContent = document.querySelector(".tab-content.active");
	// scroll to the item of the current active tab in the current active window
	// get current window id and current tab id
	chrome.windows.getCurrent((window) => {
		const currentWindowId = window.id;
		chrome.tabs.query({ "active": true, "windowId": currentWindowId }, (tabs) => {
			const currentTabId = tabs[0].id;
			// const currentItem = activeTabContent.querySelector(`.list-item[tabid="${currentTabId}"]`);
			// scrollToItem(currentItem);
			scrollToItem(currentTabId, currentWindowId);
		});
	});
}

// Helper function to find visible (non-filtered) items
function findVisibleItems(items) {
	return items.filter(item => item.style.display !== 'none');
}

// Helper function to find first visible item during search navigation
function findFirstVisibleItem(items) {
	for (let i = 0; i < items.length; i++) {
		if (items[i].style.display !== 'none') {
			return { item: items[i], index: i };
		}
	}
	return null;
}

// Helper function to find last visible item during search navigation
function findLastVisibleItem(items) {
	for (let i = items.length - 1; i >= 0; i--) {
		if (items[i].style.display !== 'none') {
			return { item: items[i], index: i };
		}
	}
	return null;
}

function handleKeyDown (e) {

	const currentTabIndex = [...tabs].findIndex((tab) => {
		return tab.classList.contains("active");
	});
	const activeTabContent = document.querySelector(".tab-content.active");
	const items = [...activeTabContent.querySelectorAll(".list-item")];

	let newIndex;
	let newTabIndex;
	let selectedItems;

	// Allow search navigation even when no visible items
	const isNavigatingFromSearch = (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
	                               searchInput === document.activeElement;

	if (items.length === 0 && !isNavigatingFromSearch) {
		return;
	}

	switch (e.key) {
	case "Tab":
		if (e.shiftKey) {
			// Shift+Tab: List → Search
			if (searchInput !== document.activeElement) {
				e.preventDefault();
				searchInput.focus();
			}
			// From search: allow browser default (exit popup) - no preventDefault
		} else {
			// Tab: Search → List, restore previous focus position
			if (searchInput === document.activeElement) {
				e.preventDefault();
				updateActiveTabName();
				const tabData = getCurrentTabData();

				// Use previous position if available, otherwise use currentItemIndex (active browser tab)
				const targetIndex = (tabData.lastFocusedIndex >= 0) ? tabData.lastFocusedIndex : currentItemIndex;

				if (targetIndex >= 0 && targetIndex < items.length && items[targetIndex]?.style.display !== 'none') {
					focusAndUpdateIndex(items[targetIndex], targetIndex, items, 'smooth');
				} else {
					// Fallback if target is filtered out
					const firstVisible = findFirstVisibleItem(items);
					if (firstVisible) {
						focusAndUpdateIndex(firstVisible.item, firstVisible.index, items, 'smooth');
					}
				}
			}
			// From list items: Tab should stay in popup, cycle back to search
			else {
				e.preventDefault();
				searchInput.focus();
			}
		}
		break;
	case "PageUp":
		// PageUp: Fast scroll up ~10 items in current list
		e.preventDefault();
		const visibleItemsUp = findVisibleItems(items);
		if (visibleItemsUp.length > 0) {
			const currentVisibleIndex = visibleItemsUp.findIndex(item => item === items[currentItemIndex]);
			const targetIndex = Math.max(0, currentVisibleIndex - 10);
			const targetItem = visibleItemsUp[targetIndex];
			const actualIndex = items.indexOf(targetItem);
			focusAndUpdateIndex(targetItem, actualIndex, items);
		}
		break;
	case "PageDown":
		// PageDown: Fast scroll down ~10 items in current list
		e.preventDefault();
		const visibleItemsDown = findVisibleItems(items);
		if (visibleItemsDown.length > 0) {
			const currentVisibleIndex = visibleItemsDown.findIndex(item => item === items[currentItemIndex]);
			const targetIndex = Math.min(visibleItemsDown.length - 1, currentVisibleIndex + 10);
			const targetItem = visibleItemsDown[targetIndex];
			const actualIndex = items.indexOf(targetItem);
			focusAndUpdateIndex(targetItem, actualIndex, items);
		}
		break;
	case "ArrowLeft":
		if (e.ctrlKey || e.metaKey) {
			// Ctrl+ArrowLeft: Switch to previous tab
			e.preventDefault();
			newTabIndex = (currentTabIndex - 1 + tabs.length) % tabs.length;
			saveCurrentFocusPosition(items);
			tabs[newTabIndex].click();

			// Restore focus for keyboard-initiated tab switch
			const leftTarget = document.querySelector(tabs[newTabIndex].dataset.tabTarget);
			const leftNewItems = [...leftTarget.querySelectorAll('.list-item')];
			if (leftNewItems.length > 0) {
				restoreFocusAfterTabSwitch(leftNewItems);
			}
		}
		// In search input: allow browser default (cursor movement)
		// In list: no plain arrow action (only Ctrl+Arrow for tab switching)
		break;
	case "ArrowRight":
		if (e.ctrlKey || e.metaKey) {
			// Ctrl+ArrowRight: Switch to next tab
			e.preventDefault();
			newTabIndex = (currentTabIndex + 1) % tabs.length;
			saveCurrentFocusPosition(items);
			tabs[newTabIndex].click();

			// Restore focus for keyboard-initiated tab switch
			const rightTarget = document.querySelector(tabs[newTabIndex].dataset.tabTarget);
			const rightNewItems = [...rightTarget.querySelectorAll('.list-item')];
			if (rightNewItems.length > 0) {
				restoreFocusAfterTabSwitch(rightNewItems);
			}
		}
		// In search input: allow browser default (cursor movement)
		// In list: no plain arrow action (only Ctrl+Arrow for tab switching)
		break;
	case "ArrowUp":
		if (e.altKey && currentTabIndex === 1 && searchInput !== document.activeElement) {
			// Alt+ArrowUp: Navigate to previous window section (All Windows tab only)
			e.preventDefault();
			const allWindowContent = document.getElementById("allWindow");
			const windowDivs = [...allWindowContent.querySelectorAll(".window")].filter(w => w.style.display !== "none");

			if (windowDivs.length > 1) {
				// Find current window section
				const currentItem = items[currentItemIndex];
				const currentWindowDiv = currentItem.closest('.window');
				const currentWindowIndex = windowDivs.indexOf(currentWindowDiv);

				if (currentWindowIndex > 0) {
					// Go to previous window section
					const targetWindowDiv = windowDivs[currentWindowIndex - 1];
					const targetItems = [...targetWindowDiv.querySelectorAll('.list-item')].filter(item => item.style.display !== 'none');

					if (targetItems.length > 0) {
						const targetIndex = items.indexOf(targetItems[0]);
						focusAndUpdateIndex(targetItems[0], targetIndex, items, 'smooth');
					}
				} else {
					// Wrap to last window section
					const targetWindowDiv = windowDivs[windowDivs.length - 1];
					const targetItems = [...targetWindowDiv.querySelectorAll('.list-item')].filter(item => item.style.display !== 'none');

					if (targetItems.length > 0) {
						const targetIndex = items.indexOf(targetItems[0]);
						focusAndUpdateIndex(targetItems[0], targetIndex, items, 'smooth');
					}
				}
			}
		} else if (searchInput === document.activeElement) {
			// Go to last visible item with smooth scroll for major orientation change
			const lastVisible = findLastVisibleItem(items);
			if (lastVisible) {
				focusAndUpdateIndex(lastVisible.item, lastVisible.index, items, 'smooth');
			}
		} else {
			// Rapid navigation within list - use instant scroll
			newIndex = (currentItemIndex - 1 + items.length) % items.length;
			focusAndUpdateIndex(items[newIndex], newIndex, items, 'instant', true);
		}
		break;
	case "ArrowDown":
		if (e.altKey && currentTabIndex === 1 && searchInput !== document.activeElement) {
			// Alt+ArrowDown: Navigate to next window section (All Windows tab only)
			e.preventDefault();
			const allWindowContent = document.getElementById("allWindow");
			const windowDivs = [...allWindowContent.querySelectorAll(".window")].filter(w => w.style.display !== "none");

			if (windowDivs.length > 1) {
				// Find current window section
				const currentItem = items[currentItemIndex];
				const currentWindowDiv = currentItem.closest('.window');
				const currentWindowIndex = windowDivs.indexOf(currentWindowDiv);

				if (currentWindowIndex < windowDivs.length - 1) {
					// Go to next window section
					const targetWindowDiv = windowDivs[currentWindowIndex + 1];
					const targetItems = [...targetWindowDiv.querySelectorAll('.list-item')].filter(item => item.style.display !== 'none');

					if (targetItems.length > 0) {
						const targetIndex = items.indexOf(targetItems[0]);
						focusAndUpdateIndex(targetItems[0], targetIndex, items, 'smooth');
					}
				} else {
					// Wrap to first window section
					const targetWindowDiv = windowDivs[0];
					const targetItems = [...targetWindowDiv.querySelectorAll('.list-item')].filter(item => item.style.display !== 'none');

					if (targetItems.length > 0) {
						const targetIndex = items.indexOf(targetItems[0]);
						focusAndUpdateIndex(targetItems[0], targetIndex, items, 'smooth');
					}
				}
			}
		} else if (searchInput === document.activeElement) {
			// Go to first visible item with smooth scroll for major orientation change
			const firstVisible = findFirstVisibleItem(items);
			if (firstVisible) {
				focusAndUpdateIndex(firstVisible.item, firstVisible.index, items, 'smooth');
			}
		} else {
			// Rapid navigation within list - use instant scroll
			newIndex = (currentItemIndex + 1) % items.length;
			focusAndUpdateIndex(items[newIndex], newIndex, items, 'instant', true);
		}
		break;
	case 'Home':
		// Context-aware Home key behavior
		if (searchInput === document.activeElement) {
			// In search: allow browser default (cursor to start)
			return;
		} else {
			// In list: focus first visible item with smooth scroll
			e.preventDefault();
			const firstVisible = findFirstVisibleItem(items);
			if (firstVisible) {
				focusAndUpdateIndex(firstVisible.item, firstVisible.index, items, 'smooth', true);
			}
		}
		break;
	case "End":
		focusAndUpdateIndex(items[items.length - 1], items.length - 1, items, 'instant', true);
		break;
	case " ":
		e.preventDefault();
		items[currentItemIndex].classList.toggle("selected");
		items[currentItemIndex].classList.contains("bg-blue-100")
			? items[currentItemIndex].classList.remove("bg-blue-100")
			: items[currentItemIndex].classList.add("bg-blue-100");

		// Update ARIA selection state - Phase 4 Accessibility
		updateAriaSelected();
		break;
	case "Delete":
		selectedItems = activeTabContent.querySelectorAll(".list-item.selected");
		selectedItems.forEach((item) => {
			closeOpenedTab(item.tabid);
			item.remove();
		});
		updateCounterText();
		break;
	case "Enter":
		// If the search input is focused, go to the first visible item
		if (searchInput === document.activeElement) {
			const firstVisible = findFirstVisibleItem(items);
			if (firstVisible) {
				focusAndUpdateIndex(firstVisible.item, firstVisible.index, items, 'smooth');
			}
		} else {
			// Check for multi-select warning
			selectedItems = activeTabContent.querySelectorAll(".list-item.selected");

			if (selectedItems.length > 1 && !multiSelectWarningActive) {
				// First Enter: Show warning
				const originalPlaceholder = searchInput.placeholder;
				searchInput.placeholder = `⚠️ ${selectedItems.length} tabs selected - Use Delete to close all, Escape to cancel`;
				searchInput.classList.add('warning-state');
				multiSelectWarningActive = true;

				// Auto-clear warning after 5 seconds
				setTimeout(() => {
					clearMultiSelectWarning();
				}, 5000);
			} else if (multiSelectWarningActive) {
				// Second Enter: Clear warning, no action (multi-selection is for bulk operations like Delete)
				clearMultiSelectWarning();
			} else {
				// Single selection or no warning: Normal navigation
				goToOpenedTab(items[currentItemIndex].tabid, items[currentItemIndex].windowId);
			}
		}
		break;
	case "Escape":
		// Clear multi-select warning if active
		clearMultiSelectWarning();

		// Context-aware Escape behavior
		if (searchInput === document.activeElement && searchInput.value !== "") {
			// Escape in search with text: Clear text, stay in search
			searchInput.value = "";
			handleSearchInput();
			e.preventDefault();
		} else if (searchInput === document.activeElement) {
			// Escape in empty search: Allow popup to close (browser default)
			// Don't preventDefault - let browser handle popup close
			return;
		} else {
			// In list: check for selections
			selectedItems = activeTabContent.querySelectorAll(".list-item.selected");
			if (selectedItems.length > 0) {
				// Escape in list with selections: Clear all selections, stay focused on current item
				selectedItems.forEach(item => {
					item.classList.remove("selected", "bg-blue-100");
				});

				// Update ARIA selection state - Phase 4 Accessibility
				updateAriaSelected();

				e.preventDefault();
			} else {
				// Escape in list with no selections: Move focus to search input
				// Save current list position for potential restoration
				saveCurrentFocusPosition(items);
				searchInput.focus();
				e.preventDefault();
			}
		}
		// Final Escape (no text, no selections) allows popup to close naturally
		break;
	case 'a':
	case 'A':
		if (e.ctrlKey || e.metaKey) {
			// Ctrl+A: Context-aware select all
			if (searchInput === document.activeElement) {
				// In search: allow browser default (select all text)
				return;
			} else {
				// In list: select all visible items
				e.preventDefault();
				const visibleItems = findVisibleItems(items);
				visibleItems.forEach(item => {
					item.classList.add("selected", "bg-blue-100");
				});

				// Update ARIA selection state - Phase 4 Accessibility
				updateAriaSelected();

				// Announce selection change - Phase 4 Accessibility
				const selectedCount = document.querySelectorAll('.tab-content.active .list-item.selected').length;
				announceToScreenReader(`Selected all ${selectedCount} visible tabs`);
			}
		}
		break;
	case 'g':
	case 'G':
		if (e.ctrlKey || e.metaKey) {
			// Ctrl+G: Jump to currently active tab/page (search across all tab views)
			e.preventDefault();

			// Look for current active tab across all tab contents
			const allTabContents = document.querySelectorAll('.tab-content');
			let targetTabContent = null;
			let currentActiveItem = null;

			for (const tabContent of allTabContents) {
				const activeItem = tabContent.querySelector('.list-item.tab-active');
				if (activeItem) {
					targetTabContent = tabContent;
					currentActiveItem = activeItem;
					break;
				}
			}

			if (currentActiveItem && targetTabContent) {
				// If current active tab is in a different view, switch to that view first
				const currentlyActiveTabContent = document.querySelector('.tab-content.active');
				if (targetTabContent !== currentlyActiveTabContent) {
					// Find and click the corresponding tab header
					const targetTabId = targetTabContent.id;
					const targetTab = document.querySelector(`[data-tab-target="#${targetTabId}"]`);
					if (targetTab) {
						targetTab.click();
						// Wait briefly for tab switch to complete, then focus
						setTimeout(() => {
							const items = [...targetTabContent.querySelectorAll('.list-item')];
							const activeIndex = items.indexOf(currentActiveItem);
							focusAndUpdateIndex(currentActiveItem, activeIndex, items, 'smooth');
						}, 50);
					}
				} else {
					// Already in correct view, focus directly
					const items = [...targetTabContent.querySelectorAll('.list-item')];
					const activeIndex = items.indexOf(currentActiveItem);
					focusAndUpdateIndex(currentActiveItem, activeIndex, items, 'smooth');
				}

				// Announce to screen reader
				announceToScreenReader('Jumped to currently active tab');
			}
		}
		break;
	default:
		// if it's a special character, do nothing
		if (e.key.length > 1) {
			return;
		}
		// if anything else, assume it's a search term and focus the search input
		searchInput.focus();
		// searchInput.value += e.key;
		break;
	}

	// e.preventDefault();
}

function handleSearchInput (e) {
	const searchTerm = searchInput.value.toLowerCase();

	// RESTORED: Original search logic that works with window structure
	const allTabContents = document.querySelectorAll(".tab-content");

	allTabContents.forEach((tabContent) => {
		const items = tabContent.querySelectorAll(".list-item");

		// Filter individual tabs
		items.forEach((item) => {
			const text = item.textContent.toLowerCase();
			const isVisible = text.includes(searchTerm);
			item.style.display = isVisible ? "flex" : "none";
		});

		// Hide windows that have no visible tabs (CRITICAL for "All" tab functionality)
		const windows = tabContent.querySelectorAll(".window");
		windows.forEach((windowDiv) => {
			const hasVisibleTabs = Array.from(windowDiv.querySelectorAll(".list-item")).some(item => {
				return item.style.display !== "none";
			});
			windowDiv.style.display = hasVisibleTabs ? "block" : "none";
		});
	});

	// Update counters for both tabs
	updateCounterText();
}

// Check if keyboard shortcut is set and show banner if not
async function checkKeyboardShortcut() {
	// Check if user has dismissed the banner before
	const { shortcutBannerDismissed } = await chrome.storage.local.get(['shortcutBannerDismissed']);
	if (shortcutBannerDismissed) {
		return;
	}

	// Check if the shortcut is configured
	chrome.commands.getAll((commands) => {
		const actionCommand = commands.find(cmd => cmd.name === '_execute_action');

		// If shortcut is not set or empty, show the banner
		if (!actionCommand || !actionCommand.shortcut) {
			const banner = document.getElementById('shortcutBanner');
			if (banner) {
				banner.classList.remove('hidden');
			}
		}
	});
}

// Setup keyboard shortcut banner buttons
function setupShortcutBanner() {
	const openBtn = document.getElementById('openShortcutsBtn');
	const dismissBtn = document.getElementById('dismissBannerBtn');

	if (openBtn) {
		openBtn.addEventListener('click', () => {
			// Open Chrome's keyboard shortcuts page
			chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
		});
	}

	if (dismissBtn) {
		dismissBtn.addEventListener('click', async () => {
			// Hide the banner
			const banner = document.getElementById('shortcutBanner');
			if (banner) {
				banner.classList.add('hidden');
			}
			// Remember user's choice
			await chrome.storage.local.set({ shortcutBannerDismissed: true });
		});
	}
}

function init () {
	// Initialize the search placeholder with the count of items in the active tab
	// updateCounterText();

	// getCurrentWindowTabs((tabs) => {
	// 	addItems(document.getElementById("currentWindow"), tabs, "");
	// 	updateCounterText();
	// });

	// getAllTabs((tabs) => {
	// 	addItems(document.getElementById("allWindow"), tabs, "");
	// 	updateCounterText();
	// });

	// Check keyboard shortcut status
	checkKeyboardShortcut();
	setupShortcutBanner();

	getAllTabs((tabs) => {
		// get active window id
		chrome.windows.getCurrent((window) => {
			const currentWindowId = window.id;
			addItemsToBoth(tabs, currentWindowId);
			updateCounterText();

			// Initialize focus restoration system AFTER items are in DOM
			setTimeout(() => {
				updateActiveTabName(); // Set initial active tab
				// Find currently active tab from the data we already have
				const activeTab = tabs.find(tab => tab.active);
				if (activeTab) {
					// CRITICAL: Set currentItemIndex to active tab position
					setCurrentItemIndexToActiveTab(activeTab.id);
					initializeFocusToCurrentTabData(activeTab.id);
				}
			}, 0); // Run on next tick to ensure DOM is updated
		});
	});

	// render contents in tabs (this function is a refactored addItems)
	// renderTabs(["currentWindow", "allWindow"], () => { updateCounterText(); });

	// Initialize event listeners on the labels of tabs
	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			// console.debug("click", tab);
			const target = document.querySelector(tab.dataset.tabTarget);
			tabContents.forEach((tabContent) => {
				tabContent.classList.remove("active");
			});
			tabs.forEach((tab) => {
				tab.classList.remove("active");
			});
			tab.classList.add("active");
			target.classList.add("active");

			// find div id="currentWindow" and add 'active' class
			// document.getElementById("currentWindow").classList.add('active');

			// Update counter based on search filter state
			if (searchInput.value) {
				handleSearchInput();
			} else {
				updateCounterText();
			}

			// Update ARIA tab states - Phase 4 Accessibility
			const currentTabIndex = [...tabs].indexOf(tab);
			updateTabAriaStates(currentTabIndex);

			// Announce tab switch to screen readers - Phase 4 Accessibility
			const tabName = tab.textContent.includes('Current') ? 'Current Window' : 'All Windows';
			announceToScreenReader(`Switched to ${tabName} view`);

			// Do NOT restore focus for mouse clicks - user clicked intentionally
			// Focus restoration only happens for keyboard-initiated tab switches
			// (PageUp/PageDown, Arrow keys call tabs[x].click() and need focus restoration)
		});
	});

	searchInput.addEventListener("input", handleSearchInput);

	// Keyboard navigation and selection for list items
	document.addEventListener("keydown", handleKeyDown);

	scrollToCurrentItem();
}

// Ensure event listeners are added after DOM content is loaded
document.addEventListener("DOMContentLoaded", (event) => {
	init();
});
