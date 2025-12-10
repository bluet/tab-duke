# TabDuke tabs manager for Chrome (extension)

## Intro

It is a Chrome extension that `counts` and `lists` opened tabs in the `current` window and `all` windows (configurable).

You can search, select, jump (goto) or close them really quickly and conveniently.

Chrome Web Store - https://chromewebstore.google.com/detail/tab-duke/idkheoklicopfcfchakfdpbdijbmafmj

TabDuke was inspired by Tab Count (staled) and Tabman Tabs Manager (discontinued) and added more functionalities.

## Keyboard Shortcut

TabDuke comes with a pre-configured keyboard shortcut `Alt+Z` (or `Command+Z` on Mac) that is automatically set when you **first install** the extension.

### If the shortcut doesn't work:

1. Navigate to `chrome://extensions/shortcuts`
2. Find "TabDuke Tabs management Chrome extension"
3. Verify or set your preferred shortcut to `Alt+Z`
4. The shortcut will immediately work to open the extension popup

**Note for developers/testers:** Chrome only applies `suggested_key` during the initial installation. If you modify the shortcut in manifest.json, you must completely uninstall and reinstall the extension for the change to take effect. Simply reloading, updating, or toggling the extension won't apply the new shortcut.

**For users updating from older versions:** If you upgraded from a version without keyboard shortcuts, you may need to manually set the shortcut or reinstall the extension. TabDuke will show a friendly reminder banner if no shortcut is configured.

## Special Keyboard Features

### Tab View Switching
- **Ctrl+ArrowLeft / Ctrl+ArrowRight** (Mac: **Cmd+ArrowLeft / Cmd+ArrowRight**) - Switch between "Current Window" and "All Windows" tabs
- **Tab / Shift+Tab** - Navigate between search input and list content (required for accessibility)

### Advanced Navigation
- **Ctrl+G** (Mac: **Cmd+G**) - Jump to currently active browser tab (works across all views)
- **Alt+Up / Alt+Down** - Navigate between window sections (All Windows tab only)

### Search & Filtering
- **Type any character** - Auto-focus search input and filter tabs
- **Escape** - Context-aware: clear search text → clear selections → move focus → allow popup close

### Tab Actions
- **Delete** - Close selected tabs (supports bulk operations)
- **Space** - Toggle individual tab selection

### Multi-Selection Features
- **Ctrl+A** (Mac: **Cmd+A**) - Context-aware: select search text (in search) or select all visible tabs (in list)
- **Ctrl+Click** (Mac: **Cmd+Click**) - Toggle individual tab selection
- **Shift+Click** - Select range of tabs
- **Delete** (with multiple selections) - Bulk close multiple tabs at once

### Visual Indicators
- **Green border + "● CURRENT"** - Shows your currently active browser tab
- **Blue border + ✓** - Shows selected tabs
- **Focus outline** - Highlights keyboard-focused item

### Pro Tips
- Search filtering works across all views instantly - search in Current view finds tabs, switch to All view and same search is already applied
- Multi-selection is designed for bulk operations like closing many tabs quickly

## Permissions

- tabs
  - to query and close tabs
- storage
  - to store settings
- alarms
  - set timer to wake up
- host_permissions
  - Read and query the sensitive tab properties (URL, title, and favIconUrl) using `chrome.tabs` API.

## Refs

- Tab Count
  - There has been no activity since 2016
  - https://github.com/developerish/tab-count
  - Chrome store link: https://chrome.google.com/webstore/detail/cfokcacdaonnckdmopmcgeanhkebeaio
- Tabman Tabs Manager
  - Long gone from Chrome extension Web Store
