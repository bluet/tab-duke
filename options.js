import ChromeAPI from './src/utils/ChromeAPI.js';

// Make ChromeAPI available globally for options-enhancements.js
window.ChromeAPI = ChromeAPI;

// Save options to localstorage
async function save_options (type, value) {
	let data = {};
	data[type] = value;
	await ChromeAPI.setStorage(data);

	// Update selection status
	const status = document.getElementById("status");
	status.textContent = "Selection Saved...";
	setTimeout(() => {
		status.textContent = "";
	}, 750);
	await updateBadgeText();
}

// Restore selection from localstorage
async function restore_options () {
	const data = await ChromeAPI.getStorage(["badgeDisplayOption", "tabDedupe", "tabJanitor", "tabJanitorDays"]);
	const { badgeDisplayOption, tabDedupe, tabJanitor, tabJanitorDays } = data;

	// restore options for popupDisplay
	const radios = document.getElementById("popupOptionsForm").tabCountRadios;
	if (!badgeDisplayOption) {
		document.getElementById("defaultPopupSelection").checked = true;
	}
	// MODERNIZED: Use for...of loop instead of traditional for loop
	for (const radio of radios) {
		if (radio.value === badgeDisplayOption) {
			radio.checked = true;
		}
	}

	// restore options for tabDedupe
	document.getElementById("tabDedupe").checked = Boolean(tabDedupe);

	// Restore tab janitor options.
	document.getElementById("tabJanitor").checked = Boolean(tabJanitor);
	document.getElementById("tabJanitorDays").value = tabJanitorDays || 5;
}

document.addEventListener("DOMContentLoaded", () => {
	// Restore options first
	restore_options();

	// Add event listeners to the radio buttons
	const radios = document.getElementById("popupOptionsForm").tabCountRadios;
	// MODERNIZED: Use for...of loop instead of traditional for loop
	for (const radio of radios) {
		radio.addEventListener("click", async () => { return await save_options("badgeDisplayOption", radio.value); });
	}

	// Add event listener for tabDedupe checkbox.
	const checkbox = document.getElementById("tabDedupe");
	checkbox.addEventListener("click", async () => { return await save_options("tabDedupe", checkbox.checked); });

	// Add event listener for tabJanitor checkbox.
	const janitorCheckbox = document.getElementById("tabJanitor");
	janitorCheckbox.addEventListener("click", async () => { return await save_options("tabJanitor", janitorCheckbox.checked); });

	// Add event listener for tabJanitorDays input.
	document.getElementById("tabJanitorDays").addEventListener("input", () => {
		const input = document.getElementById("tabJanitorDays");
		let value = input.valueAsNumber;

		// Validate and clamp the value (1-30 days)
		if (isNaN(value) || value < 1) {
			value = 1;
		} else if (value > 30) {
			value = 30;
		}

		// Update the input field if we had to clamp
		if (input.valueAsNumber !== value) {
			input.value = value;
		}

		save_options("tabJanitorDays", value);
	});

	document.getElementById("refreshButton").addEventListener("click", async () => {
		await updateCounts();
		await populateFeedbackTemplate(); // Also refresh the feedback template data
	});

	// Initialize counts and feedback template
	updateCounts();
	setTimeout(populateFeedbackTemplate, 100); // Small delay to ensure storage data is loaded

	// ===== INITIALIZE CLASSIC UI ENHANCEMENTS =====
	initializeClassicInteractions();
	synchronizeStats();
	initializeStatusMonitoring();

	// Trigger initial badge preview update
	setTimeout(async () => {
		await updateBadgePreviews();
	}, 1000);

	// FIXED: Move duplicate scan event listeners inside DOMContentLoaded
	// "auto-select" button
	document.getElementById("autoSelectButton").addEventListener("click", () => {
		const table = document.getElementById("duplicateTabsTable");
		if (!table) return; // No table exists yet

		const checkboxes = Array.from(table.querySelectorAll("input[type='checkbox']"));
		const urlCheckboxMap = new Map();

		for (let checkbox of checkboxes) {
			const url = checkbox.parentElement.parentElement.title;
			if (!urlCheckboxMap.has(url)) {
				urlCheckboxMap.set(url, []);
			}
			urlCheckboxMap.get(url).push(checkbox);
		}

		for (let [url, urlCheckboxes] of urlCheckboxMap) {
			if (urlCheckboxes.length > 1) {
				for (let i = 1; i < urlCheckboxes.length; i++) {
					urlCheckboxes[i].checked = true;
				}
			}
		}
	});

	// "bulk close" button
	document.getElementById("bulkCloseButton").addEventListener("click", async () => {
		const table = document.getElementById("duplicateTabsTable");
		if (!table) return; // No table exists yet

		const checkboxes = table.querySelectorAll("input[type='checkbox']");
		for (let checkbox of checkboxes) {
			if (checkbox.checked) {
				await ChromeAPI.removeTabs(parseInt(checkbox.value));
				checkbox.parentElement.parentElement.remove(); // Remove the row from the table
			}
		}

		const existingTable = document.getElementById("duplicateTabsTable");
		if (existingTable) {
			existingTable.remove();
		}
	});

	// find duplicate tabs
	document.getElementById("scanDuplicateTabsButton").addEventListener("click", async () => {
		const tabs = await ChromeAPI.queryTabs({});
		const windows = await ChromeAPI.getAllWindows();
		const urlTabMap = new Map();

		for (let tab of tabs) {
			if (!urlTabMap.has(tab.url)) {
				urlTabMap.set(tab.url, []);
			}
			urlTabMap.get(tab.url).push(tab);
		}

		// Remove the table if it already exists
		const existingTable = document.getElementById("duplicateTabsTable");
		if (existingTable) {
			existingTable.remove();
		}

		// Create a table to display the duplicate tabs
		const table = document.createElement("table");
		table.id = "duplicateTabsTable";
		// SECURITY: Use safe DOM creation instead of innerHTML to prevent XSS
		const headerRow = document.createElement("tr");

		const headers = ["", "Favicon", "Title", "Window Index", "Action"];
		headers.forEach(headerText => {
			const th = document.createElement("th");
			th.textContent = headerText;
			headerRow.appendChild(th);
		});

		table.appendChild(headerRow);

		for (let [url, tabs] of urlTabMap) {
			if (tabs.length > 1) {
				for (let tab of tabs) {
					const row = document.createElement("tr");

					// Add checkbox
					const checkboxCell = document.createElement("td");
					const checkbox = document.createElement("input");
					checkbox.type = "checkbox";
					checkbox.value = tab.id;
					checkboxCell.appendChild(checkbox);
					row.appendChild(checkboxCell);

					// Add favicon
					const faviconCell = document.createElement("td");
					const favicon = document.createElement("img");
					// Set consistent sizing like TabRenderer
					favicon.setAttribute("width", "16");
					favicon.setAttribute("height", "16");
					favicon.setAttribute("alt", "favicon");
					favicon.style.minWidth = "16px";
					favicon.style.minHeight = "16px";
					favicon.style.maxWidth = "16px";
					favicon.style.maxHeight = "16px";
					favicon.style.objectFit = "contain";

					// SECURITY: Use centralized favicon validator for consistency with TabRenderer
					if (window.isSafeFaviconUrlGlobal && window.isSafeFaviconUrlGlobal(tab.favIconUrl)) {
						favicon.src = tab.favIconUrl;
					} else {
						// Use default icon for invalid or missing favicons
						favicon.src = window.getDefaultFaviconUrlGlobal ? window.getDefaultFaviconUrlGlobal() : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjRkZGIi8+Cjx0ZXh0IHg9IjgiIHk9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSI+8J+MkDwvdGV4dD4KPHN2Zz4K';
					}

					// Handle broken favicon images gracefully
					favicon.addEventListener('error', function() {
						this.style.visibility = 'hidden';
					});

					faviconCell.appendChild(favicon);
					row.appendChild(faviconCell);

					// Add title
					const titleCell = document.createElement("td");
					titleCell.textContent = tab.title;
					row.appendChild(titleCell);

					// Add window index
					const windowIndexCell = document.createElement("td");
					const windowIndex = windows.findIndex((window) => { return window.id === tab.windowId; });
					windowIndexCell.textContent = windowIndex;
					row.appendChild(windowIndexCell);

					// Add close button
					const actionCell = document.createElement("td");
					const closeButton = document.createElement("button");
					closeButton.textContent = "Close Tab";
					closeButton.addEventListener("click", async () => {
						await ChromeAPI.removeTabs(tab.id);
						row.remove(); // Remove the row from the table
					});
					actionCell.appendChild(closeButton);
					row.appendChild(actionCell);

					// Set the title attribute to the tab's URL
					row.title = tab.url;

					// Add a click event listener to switch to the tab
					row.addEventListener("dblclick", async () => {
						await ChromeAPI.updateTab(tab.id, { "active": true });
						await ChromeAPI.focusWindow(tab.windowId);
					});

					table.appendChild(row);
				}
			}
		}

		// Append the table to the dedicated duplicate results container
		const duplicateContainer = document.getElementById("duplicateResultsContainer");
		duplicateContainer.classList.remove("hidden");

		// Clear any existing results first
		const existingResults = duplicateContainer.querySelector("table");
		if (existingResults) {
			existingResults.remove();
		}

		// Table styling handled by CSS #duplicateTabsTable selector

		duplicateContainer.appendChild(table);
	});
});

// REUSE: Use the same proven logic as background.js for consistent tab counting
async function updateCounts () {
	try {
		// CRITICAL: Use { "populate": true } to get tab data for each window (same as background.js)
		const windows = await ChromeAPI.getAllWindows({ "populate": true });

		// Use the exact same counting logic as background.js displayResults()
		const totalWindows = windows.length;
		const totalTabs = windows.reduce((count, win) => count + win.tabs.length, 0);

		// Update the display
		document.getElementById("windowsCount").textContent = totalWindows;
		document.getElementById("tabsCount").textContent = totalTabs;

		// Update storage to keep everything in sync (same as background.js)
		await ChromeAPI.setStorage({
			"windowsCount": totalWindows,
			"allWindowsTabsCount": totalTabs
		});

		console.log(`Options: Updated counts - ${totalWindows} windows, ${totalTabs} tabs`);
	} catch (error) {
		console.error("Failed to update counts:", error);
		// Fall back to stored values if Chrome API fails
		const data = await ChromeAPI.getStorage(["windowsCount", "allWindowsTabsCount"]);
		const { windowsCount, allWindowsTabsCount } = data;

		document.getElementById("windowsCount").textContent = windowsCount || "-";
		document.getElementById("tabsCount").textContent = allWindowsTabsCount || "-";
	}
}

// set icon text on badge
async function updateBadgeText () {
	// PERFORMANCE: Single storage call instead of two separate calls
	const data = await ChromeAPI.getStorage(["badgeDisplayOption", "windowsCount", "allWindowsTabsCount"]);
	const { badgeDisplayOption, windowsCount, allWindowsTabsCount } = data;
	if (!badgeDisplayOption || badgeDisplayOption === "allWindows") {
		// show the tabs count in all windows
		await ChromeAPI.setBadgeText(String(allWindowsTabsCount));
		await updateBadgeTitle(allWindowsTabsCount);
	} else if (badgeDisplayOption === "currentWindow") {
		// show the tabs count in current window
		let currentWindowTabs = await ChromeAPI.queryTabs({ "currentWindow": true });
		await ChromeAPI.setBadgeText(String(currentWindowTabs.length));
		await updateBadgeTitle(currentWindowTabs.length);
	} else if (badgeDisplayOption === "windowsCount") {
		// show the windows count
		await ChromeAPI.setBadgeText(String(windowsCount));
		await updateBadgeTitle(windowsCount);
	}
}

// set icon's tooltip
async function updateBadgeTitle (count) {
	const iconTitle = `You have ${count} open tab(s)/window(s).`;
	await ChromeAPI.setBadgeTitle(iconTitle);
}


// Populate feedback template with system information
async function populateFeedbackTemplate() {
	// Get Chrome version
	const chromeVersionElement = document.getElementById("chromeVersion");
	if (chromeVersionElement) {
		const userAgent = navigator.userAgent;
		const chromeVersionMatch = userAgent.match(/Chrome\/([0-9.]+)/);
		const chromeVersion = chromeVersionMatch ? chromeVersionMatch[1] : "Unknown";
		chromeVersionElement.textContent = chromeVersion;
	}

	// Get extension version from manifest
	const extensionVersionElement = document.getElementById("extensionVersion");
	if (extensionVersionElement) {
		try {
			const manifest = ChromeAPI.getManifest();
			extensionVersionElement.textContent = manifest.version;
		} catch (error) {
			console.error("Failed to get extension version:", error);
			extensionVersionElement.textContent = "Unknown";
		}
	}

	// Get current tab and window counts from storage (reuse existing data)
	const data = await ChromeAPI.getStorage(["windowsCount", "allWindowsTabsCount"]);
	const { windowsCount, allWindowsTabsCount } = data;

	const feedbackTabsElement = document.getElementById("feedbackTabsCount");
	const feedbackWindowsElement = document.getElementById("feedbackWindowsCount");

	if (feedbackTabsElement) {
		feedbackTabsElement.textContent = allWindowsTabsCount ?? "Unknown";
	}
	if (feedbackWindowsElement) {
		feedbackWindowsElement.textContent = windowsCount ?? "Unknown";
	}
}

// Feedback template is now initialized in the main DOMContentLoaded handler above

// Feedback template is automatically populated on page load via DOMContentLoaded event
// No need for additional refresh button handling since page reloads


/* ===================================================================
   TAB DUKE CLASSIC OPTIONS INTERFACE - JAVASCRIPT ENHANCEMENTS

   Enhanced functionality for the classic options interface
   CSP-compliant external JavaScript
   =================================================================== */

// ===== UI ENHANCEMENTS =====

// Classic Toast System
function showToast(message, type = 'success') {
  const toast = document.getElementById('statusToast');
  const statusText = document.getElementById('statusText');

  statusText.textContent = message;

  // Update toast styling based on type
  if (type === 'success') {
    toast.style.borderLeftColor = 'var(--emerald)';
  } else if (type === 'error') {
    toast.style.borderLeftColor = 'var(--crimson)';
  } else if (type === 'info') {
    toast.style.borderLeftColor = 'var(--azure)';
  }

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Enhanced Badge Preview Updates - FIXED: Use real current window count instead of bogus estimation
async function updateBadgePreviews() {
  const currentWindow = document.getElementById('currentWindowBadgePreview');
  const allWindows = document.getElementById('allWindowsBadgePreview');
  const windowsCount = document.getElementById('windowsCountBadgePreview');

  try {
    // Get data from header counters for total counts
    const headerTabsCount = document.getElementById('headerTabsCount').textContent;
    const headerWindowsCount = document.getElementById('headerWindowsCount').textContent;

    if (headerTabsCount !== '-') {
      allWindows.textContent = headerTabsCount;
    }

    if (headerWindowsCount !== '-') {
      windowsCount.textContent = headerWindowsCount;
    }

    // FIXED: Get real current window tab count (same logic as background.js badge)
    if (window.ChromeAPI) {
      const currentWindowTabs = await window.ChromeAPI.queryTabs({ "currentWindow": true });
      currentWindow.textContent = currentWindowTabs.length;
    } else {
      // Fallback to header data if ChromeAPI not available
      currentWindow.textContent = headerTabsCount !== '-' ? headerTabsCount : '-';
    }
  } catch (error) {
    console.error('Failed to update badge previews:', error);
    // Fallback values on error
    currentWindow.textContent = '-';
  }
}

// Classic interaction enhancements
function initializeClassicInteractions() {
  // Enhanced option row click handlers
  document.querySelectorAll('.option-row-classic').forEach(row => {
    row.addEventListener('click', function(e) {
      if (e.target.type === 'radio' || e.target.type === 'checkbox') return;

      const input = this.querySelector('input[type="radio"], input[type="checkbox"]');
      if (input) {
        input.click();
      }
    });

    // Keyboard navigation
    row.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const input = this.querySelector('input[type="radio"], input[type="checkbox"]');
        if (input) {
          input.click();
        }
      }
    });
  });
}

// Stats synchronization
function synchronizeStats() {
  const mainTabsCount = document.getElementById('tabsCount');
  const mainWindowsCount = document.getElementById('windowsCount');
  const headerTabs = document.getElementById('headerTabsCount');
  const headerWindows = document.getElementById('headerWindowsCount');
  const feedbackTabs = document.getElementById('feedbackTabsCount');
  const feedbackWindows = document.getElementById('feedbackWindowsCount');

  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(async function(mutation) {
      if (mutation.type === 'childList') {
        // Sync header stats
        if (mainTabsCount.textContent !== '-') {
          headerTabs.textContent = mainTabsCount.textContent;
          feedbackTabs.textContent = mainTabsCount.textContent;
        }
        if (mainWindowsCount.textContent !== '-') {
          headerWindows.textContent = mainWindowsCount.textContent;
          feedbackWindows.textContent = mainWindowsCount.textContent;
        }

        await updateBadgePreviews();
      }
    });
  });

  if (mainTabsCount) observer.observe(mainTabsCount, { childList: true, subtree: true });
  if (mainWindowsCount) observer.observe(mainWindowsCount, { childList: true, subtree: true });
}

// Status monitoring for toast integration
function initializeStatusMonitoring() {
  const originalStatus = document.getElementById('status');
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && originalStatus.textContent.trim()) {
        showToast(originalStatus.textContent.trim());
        originalStatus.textContent = '';
      }
    });
  });
  observer.observe(originalStatus, { childList: true, subtree: true });
}

// Classic UI features are now initialized in the main DOMContentLoaded handler above