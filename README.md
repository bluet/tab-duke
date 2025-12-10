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

## Keyboard Navigation

TabDuke features comprehensive keyboard-first navigation for efficient tab management. All keyboard shortcuts work within the extension popup.

### Tab View Switching
- **Ctrl+ArrowLeft / Ctrl+ArrowRight** (Mac: **Cmd+ArrowLeft / Cmd+ArrowRight**) - Switch between "Current Window" and "All Windows" tabs
- **Tab / Shift+Tab** - Navigate between search input and list content

### List Navigation
- **ArrowUp / ArrowDown** - Navigate through tab items vertically
- **ArrowLeft / ArrowRight** - Navigate through tab items horizontally
- **PageUp / PageDown** - Fast scroll through list (~10 items at a time)
- **Home** - Jump to first visible item
- **End** - Jump to last item

### Search & Filtering
- **Type any character** - Auto-focus search input and filter tabs
- **Escape** - Clear search text (if searching) or move focus to search input
- **ArrowUp / ArrowDown** (from search) - Jump to first/last visible item

### Tab Actions
- **Enter** - Switch to focused tab
- **Delete** - Close selected tabs
- **Space** - Toggle individual tab selection
- **Ctrl+A** (Mac: **Cmd+A**) - Select all visible tabs (context-aware: search text vs list)

### Multi-Selection
- **Ctrl+Click** (Mac: **Cmd+Click**) - Toggle individual tab selection
- **Shift+Click** - Select range of tabs
- **Enter** (with multiple selections) - Shows warning, press Enter again to open all selected tabs

### Advanced Navigation
- **Ctrl+G** (Mac: **Cmd+G**) - Jump to currently active browser tab (works across all views)
- **Alt+Up / Alt+Down** - Navigate between window sections (All Windows tab only)

### Context-Aware Behavior
Most keys behave differently based on current focus:
- **Escape**: Clear search → Clear selections → Move to search → Allow popup close
- **Tab**: Search → List (restore position) → Search (cycle within popup)
- **Ctrl+A**: Select search text (in search) → Select visible tabs (in list)

### Visual Indicators
- **Green left border + "● CURRENT"** - Identifies your currently active browser tab
- **Blue left border + ✓** - Shows selected tabs
- **Focus outline** - Highlights keyboard-focused item

### Pro Tips
- All navigation preserves your position when switching between Current/All views
- Search filtering works across all views instantly
- Multiple tabs can be opened simultaneously with warning confirmation
- Window section navigation helps quickly jump between different browser windows

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
