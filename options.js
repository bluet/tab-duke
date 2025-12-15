// Save options to localstorage
async function save_options (type, value) {
	console.log(`type: ${type}, value: ${value}`);
	let data = {};
	data[type] = value;
	await chrome.storage.local.set(data);

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
	const data = await chrome.storage.local.get(["badgeDisplayOption", "tabDedupe", "tabJanitor", "tabJanitorDays"]);
	const { badgeDisplayOption, tabDedupe, tabJanitor, tabJanitorDays } = data;

	// restore options for popupDisplay
	const radios = document.getElementById("popupOptionsForm").tabCountRadios;
	if (!badgeDisplayOption) {
		document.getElementById("defaultPopupSelection").checked = true;
	}
	for (let i = 0; i < radios.length; i++) {
		if (radios[i].value === badgeDisplayOption) {
			radios[i].checked = true;
		}
	}

	// restore options for tabDedupe
	document.getElementById("tabDedupe").checked = Boolean(tabDedupe);

	// Restore tab janitor options.
	document.getElementById("tabJanitor").checked = Boolean(tabJanitor);
	document.getElementById("tabJanitorDays").value = tabJanitorDays || 5;
}

document.addEventListener("DOMContentLoaded", restore_options);

// Add event listeners to the radio buttons
const radios = document.getElementById("popupOptionsForm").tabCountRadios;
for (let i = 0; i < radios.length; i++) {
	radios[i].addEventListener("click", async () => { return await save_options("badgeDisplayOption", radios[i].value); });
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

document.getElementById("refreshButton").addEventListener("click", () => {
	location.reload();
});

async function updateCounts () {
	const data = await chrome.storage.local.get(["windowsCount", "allWindowsTabsCount"]);
	const { windowsCount, allWindowsTabsCount } = data;

	document.getElementById("windowsCount").textContent = windowsCount;
	document.getElementById("tabsCount").textContent = allWindowsTabsCount;
}

updateCounts();

// set icon text on badge
async function updateBadgeText () {
	const { badgeDisplayOption } = await chrome.storage.local.get(["badgeDisplayOption"]);
	const data = await chrome.storage.local.get(["windowsCount", "allWindowsTabsCount"]);
	const { windowsCount, allWindowsTabsCount } = data;
	if (!badgeDisplayOption || badgeDisplayOption === "allWindows") {
		// show the tabs count in all windows
		await chrome.action.setBadgeText({ "text": String(allWindowsTabsCount) });
		await updateBadgeTitle(allWindowsTabsCount);
	} else if (badgeDisplayOption === "currentWindow") {
		// show the tabs count in current window
		let currentWindowTabs = await chrome.tabs.query({ "currentWindow": true });
		await chrome.action.setBadgeText({ "text": String(currentWindowTabs.length) });
		await updateBadgeTitle(currentWindowTabs.length);
	} else if (badgeDisplayOption === "windowsCount") {
		// show the windows count
		await chrome.action.setBadgeText({ "text": String(windowsCount) });
		await updateBadgeTitle(windowsCount);
	}
}

// set icon's tooltip
async function updateBadgeTitle (count) {
	const iconTitle = `You have ${count} open tab(s)/window(s).`;
	await chrome.action.setTitle({ "title": iconTitle });
}


// find duplicate tabs
document.getElementById("scanDuplicateTabsButton").addEventListener("click", async () => {
	const tabs = await chrome.tabs.query({});
	const windows = await chrome.windows.getAll({});
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
				// SECURITY: Use centralized favicon validator for consistency with TabRenderer
				if (window.isSafeFaviconUrlGlobal && window.isSafeFaviconUrlGlobal(tab.favIconUrl)) {
					favicon.src = tab.favIconUrl;
				} else {
					// Use default icon for invalid or missing favicons
					favicon.src = window.getDefaultFaviconUrlGlobal ? window.getDefaultFaviconUrlGlobal() : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjRkZGIi8+Cjx0ZXh0IHg9IjgiIHk9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSI+8J+MkDwvdGV4dD4KPHN2Zz4K';
				}
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
				closeButton.addEventListener("click", () => {
					chrome.tabs.remove(tab.id);
					row.remove(); // Remove the row from the table
				});
				actionCell.appendChild(closeButton);
				row.appendChild(actionCell);

				// Set the title attribute to the tab's URL
				row.title = tab.url;

				// Add a click event listener to switch to the tab
				row.addEventListener("dblclick", () => {
					chrome.tabs.update(tab.id, { "active": true });
					chrome.windows.update(tab.windowId, { "focused": true });
				});

				table.appendChild(row);
			}
		}
	}

	// Append the table to the body of the options page
	document.body.appendChild(table);
});

// "auto-select" button - Fixed: Moved outside scan handler to prevent duplicate listeners
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

// "bulk close" button - Fixed: Moved outside scan handler to prevent duplicate listeners
document.getElementById("bulkCloseButton").addEventListener("click", () => {
	const table = document.getElementById("duplicateTabsTable");
	if (!table) return; // No table exists yet

	const checkboxes = table.querySelectorAll("input[type='checkbox']");
	for (let checkbox of checkboxes) {
		if (checkbox.checked) {
			chrome.tabs.remove(parseInt(checkbox.value));
			checkbox.parentElement.parentElement.remove(); // Remove the row from the table
		}
	}

	const existingTable = document.getElementById("duplicateTabsTable");
	if (existingTable) {
		existingTable.remove();
	}
});

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
			const manifest = chrome.runtime.getManifest();
			extensionVersionElement.textContent = manifest.version;
		} catch (error) {
			console.error("Failed to get extension version:", error);
			extensionVersionElement.textContent = "Unknown";
		}
	}

	// Get current tab and window counts from storage (reuse existing data)
	const data = await chrome.storage.local.get(["windowsCount", "allWindowsTabsCount"]);
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

// Initialize feedback template when page loads
document.addEventListener("DOMContentLoaded", () => {
	setTimeout(populateFeedbackTemplate, 100); // Small delay to ensure storage data is loaded
});

// Feedback template is automatically populated on page load via DOMContentLoaded event
// No need for additional refresh button handling since page reloads