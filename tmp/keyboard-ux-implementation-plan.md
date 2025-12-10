# TabDuke Keyboard-First UX Implementation Plan

**Date**: 2024-12-10
**Status**: COMPREHENSIVE - Expert Recommendations, Success Criteria, Implementation Details Complete
**Scope**: ~365 lines of code, 6-8 hours estimated

## ⚠️ CRITICAL: Implementation Status Verified (Based on Actual Code Inspection)

**KEYBOARD UX FEATURES STATUS (Code inspection confirms):**
- ❌ Tab key handling - Not implemented
- ❌ Home key - Commented out (lines 444-446)
- ❌ PageUp/PageDown - Not implemented
- ❌ Ctrl+click/Shift+click - Not implemented
- ❌ Smart scrolling - Commented out (lines 324, 338)
- ❌ ARIA structure - Minimal (only 1 aria-label found)
- ❌ Tab navigation zones - No tabindex management

**WORKING KEYBOARD FEATURES:**
- ✅ Arrow navigation within lists
- ✅ Arrow Left/Right tab switching
- ✅ Space multi-select
- ✅ Delete close tabs
- ✅ Auto-focus search on typing
- ✅ Escape clear search
- ✅ Search navigation (ArrowUp/Down from search to list)

## 🎯 Key Design Decisions

### Window Navigation Keybinding
**Decision**: Use **Alt+Up/Down** for window section navigation.
**Reasoning**: Safe in extension popup, intuitive, follows IDE patterns, no critical browser conflicts.

---

## 📐 Application Architecture

```
┌─ TabDuke Extension Popup (4 Focus Zones) ────────────┐
│                                                       │
│ Zone 1: Tab Headers (Current/All)                    │
│  ├─ Make focusable but not in tab order             │
│  └─ ARIA: role="tab" aria-selected                   │
│                                                       │
│ Zone 2: Notification Banner (conditional)            │
│  └─ Skip in tab order (mouse-accessible only)        │
│                                                       │
│ Zone 3: Search Input (entry point)                   │
│  ├─ Always tabindex="0"                              │
│  └─ Auto-focus on any character                      │
│                                                       │
│ Zone 4: List Items (main content)                    │
│  ├─ Roving tabindex (one has "0", rest "-1")        │
│  ├─ Window sections in "All Windows" view            │
│  └─ ARIA: role="listbox" with role="option" items    │
└───────────────────────────────────────────────────────┘
```

**Navigation Flow**: Tab → Zone 3 → Zone 4, Shift+Tab ← Zone 4 ← Zone 3

---

## 🎯 Implementation Phases

### Phase 1: Core Navigation (Priority P0) ✅ **COMPLETED**
| Feature | Keybinding | Status | Lines | Impact |
|---------|------------|--------|-------|--------|
| Tab key navigation | Tab/Shift+Tab | ✅ **DONE** | ~30 | Critical |
| PageUp/PageDown tabs | PageUp/PageDown | ✅ **DONE** | ~25 | High |
| Fast list scrolling | Ctrl+PageUp/PageDown | ✅ **DONE** | ~15 | High |
| Uncomment Home key | Home | ✅ **DONE** | ~10 | High |
| Context-aware Escape | Escape | ✅ **DONE** | ~20 | High |
| Smart scrolling | scrollIntoView | ✅ **DONE** | ~10 | Medium |

**Total Phase 1**: ✅ **~110 lines completed** - Foundation keyboard navigation implemented!

### Phase 2: Standard Interactions (Priority P1)
| Feature | Keybinding | Status | Lines | Impact |
|---------|------------|--------|-------|--------|
| Select all visible | Ctrl+A | 🔶 TODO | ~15 | High |
| Ctrl+click selection | Ctrl+click | 🔶 TODO | ~20 | High |
| Shift+click range | Shift+click | 🔶 TODO | ~25 | High |
| Multi-select Enter warning | Enter | 🔶 TODO | ~10 | Medium |

**Total Phase 2**: ~70 lines, 1-2 hours

### Phase 3: Visual Feedback (Priority P1)
| Feature | Status | Lines | Impact |
|---------|--------|-------|--------|
| Enhanced focus indicators | 🔶 TODO | ~20 CSS | High |
| Selection state polish | 🔶 TODO | ~10 CSS | Medium |

**Total Phase 3**: ~30 lines, 1 hour

### Phase 4: Accessibility (Priority P1)
| Feature | Status | Lines | Impact |
|---------|--------|-------|--------|
| ARIA roles/properties | 🔶 TODO | ~40 | High (A11y) |
| Live region announcements | 🔶 TODO | ~20 | Medium (A11y) |

**Total Phase 4**: ~60 lines, 2 hours

### Phase 5: Power Features (Priority P2-P3)
| Feature | Keybinding | Status | Lines | Impact |
|---------|------------|--------|-------|--------|
| Window section navigation | Alt+Up/Down | 🔶 TODO | ~25 | Medium |
| Keyboard shortcuts help | Shift+? | 🔶 TODO | ~50 | Low |

**Total Phase 5**: ~75 lines, 1-2 hours

---

## 🎨 Key Binding Design

### Context-Aware Behavior Matrix

| Key | In Search | In List (selected) | In List (no selection, searching) | In List (normal) |
|-----|-----------|-------------------|----------------------------------|------------------|
| **Escape** | Clear text | Deselect all | Back to search | (browser closes) |
| **Arrow Up** | Last visible item | Previous item | Previous item | Previous item |
| **Arrow Down** | First visible item | Next item | Next item | Next item |
| **Home** | (cursor start) | First visible item | First visible item | First visible item |
| **Ctrl+A** | Select all text | Select all visible | Select all visible | Select all visible |
| **Enter** | First visible item | Block + warning | Switch to tab | Switch to tab |

### Window Navigation (All Windows Tab Only)
- **Alt+Up**: Previous window section
- **Alt+Down**: Next window section
- Only active when focus in list items

### Tab Switching
- **PageUp**: Switch to "Current Window" tab (priority over list scrolling)
- **PageDown**: Switch to "All Windows" tab (priority over list scrolling)
- **Ctrl+PageUp/PageDown**: Fast scroll within current list (jump 10 items)

---

## 🔧 Technical Implementation Notes

### Focus Management Strategy
**Roving TabIndex Pattern**: Only one element per zone has `tabindex="0"`, others have `tabindex="-1"`. Arrow keys move both focus AND the "0" marker.

### Smart Scrolling Solution - Tiered Approach
```javascript
// Utility functions for context-aware scrolling
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

// Usage patterns:
// - Arrow key navigation: focusWithInstantScroll() - rapid movement
// - Search transitions: focusWithSmoothScroll() - major orientation changes
// - Initial popup focus: focusWithSmoothScroll() - user needs context
```

### ARIA Structure
```html
<!-- Tab navigation -->
<div role="tablist">
  <li role="tab" aria-selected="true" aria-controls="currentWindow">...</li>
</div>

<!-- Content areas -->
<div role="tabpanel" aria-labelledby="tabTitleCurrent">
  <div role="listbox" aria-label="Browser tabs">
    <div role="option" aria-selected="false">...</div>
  </div>
</div>
```

### Helper Functions Added
```javascript
// ✅ Already implemented (popup.js:362-384)
function findVisibleItems(items)      // Filter out hidden items
function findFirstVisibleItem(items)  // Returns {item, index} or null
function findLastVisibleItem(items)   // Returns {item, index} or null
```

### Current Code Locations (for implementation reference)
```javascript
// Main keyboard handler: popup.js:handleKeyDown (line 387)
// Tab switching: popup.js:goToOpenedTab (line 221)
// Search handler: popup.js:handleSearchInput (line 504)
// Focus zones: tabs (.tab-button), search (#searchInput), list (.list-item)
// Content areas: #currentWindow, #allWindow
```

### Key Implementation Context
- **DOM Structure**: 4 focus zones (tab headers, banner, search, list)
- **Current working**: Arrow keys, Space, Delete, Escape, auto-focus search
- **Critical gap**: No Tab key handling means keyboard users trapped in zones
- **User decisions**: Simple approach preferred, no over-engineering
- **Property usage**: Use `.tabid` not `.id` for tab IDs on DOM elements

### Implementation Design Decisions

**Enter Key Multi-Select Warning:**
```javascript
// Inline warning approach - minimal disruption
if (selectedItems.length > 1) {
  // Temporarily show warning in search placeholder
  const originalPlaceholder = searchInput.placeholder;
  searchInput.placeholder = `⚠️ ${selectedItems.length} tabs selected - Press Enter again to open all, Escape to cancel`;
  searchInput.classList.add('warning-state');

  // Set flag for next Enter press
  multiSelectWarningActive = true;
  return; // Block navigation
}
```

**Focus Restoration Strategy:**
```javascript
// Global variables for focus restoration
let focusRestoreData = {
  lastFocusedTabIndex: 0,
  lastSearchFocusedIndex: 0,
  relativePosition: 0  // percentage through list
};

// Tab switching: Maintain relative position
function calculateRelativePosition(currentIndex, totalItems) {
  return totalItems > 0 ? currentIndex / totalItems : 0;
}

function restoreFocusAfterTabSwitch(newItems) {
  const targetIndex = Math.floor(focusRestoreData.relativePosition * newItems.length);
  const clampedIndex = Math.min(targetIndex, newItems.length - 1);
  const targetItem = newItems[clampedIndex];

  if (targetItem && targetItem.style.display !== 'none') {
    focusWithInstantScroll(targetItem);
    currentItemIndex = clampedIndex;
    return true;
  }

  // Fallback to first visible if calculated position is hidden
  const firstVisible = findFirstVisibleItem(newItems);
  if (firstVisible) {
    focusWithInstantScroll(firstVisible.item);
    currentItemIndex = firstVisible.index;
    return true;
  }

  return false;
}

// Search clearing: Return to previously focused list item
function restoreFocusAfterSearchClear() {
  const items = [...document.querySelector('.tab-content.active').querySelectorAll('.list-item')];
  const targetIndex = Math.min(focusRestoreData.lastSearchFocusedIndex, items.length - 1);

  if (items[targetIndex]) {
    focusWithSmoothScroll(items[targetIndex]);
    currentItemIndex = targetIndex;
  }
}

// Implementation points:
// - Save focusRestoreData.relativePosition before tab switches
// - Save focusRestoreData.lastSearchFocusedIndex when focus moves from list to search
// - Call restoration functions in tab click handlers and search clear handlers
```

**ARIA Integration Points:**
```html
<!-- Zone 1: Tab headers - Update existing HTML -->
<div class="border-b" id="tabMenu">
  <ul class="flex" role="tablist" aria-label="Tab view selector">
    <li class="tab-button active px-6 py-3..."
        role="tab"
        aria-selected="true"
        aria-controls="currentWindow"
        tabindex="0"
        id="tabTitleCurrent">Current (15)</li>
    <li class="tab-button px-6 py-3..."
        role="tab"
        aria-selected="false"
        aria-controls="allWindow"
        tabindex="-1"
        id="tabTitleAll">All (64)</li>
  </ul>
</div>

<!-- Zone 3: Search - Update existing input -->
<input type="text"
       class="search-bar pl-12 p-2 w-full rounded border border-gray-300"
       id="searchInput"
       aria-label="Search browser tabs"
       role="searchbox"
       aria-expanded="false"
       aria-describedby="searchInstructions"
       autofocus>

<!-- Zone 4: List content - Wrap existing content -->
<div id="currentWindow"
     class="tab-content active"
     role="tabpanel"
     aria-labelledby="tabTitleCurrent">
  <div role="listbox"
       aria-label="Browser tabs in current window"
       aria-multiselectable="true"
       aria-activedescendant="">
    <!-- Dynamic list items here -->
  </div>
</div>

<div id="allWindow"
     class="tab-content"
     role="tabpanel"
     aria-labelledby="tabTitleAll">
  <div role="listbox"
       aria-label="Browser tabs in all windows"
       aria-multiselectable="true"
       aria-activedescendant="">
    <!-- Dynamic list items here -->
  </div>
</div>

<!-- Hidden instructions for screen readers -->
<div id="searchInstructions" class="sr-only">
  Type to filter tabs. Use arrow keys to navigate results. Press Enter to open focused tab.
</div>

<!-- Live region for announcements -->
<div id="sr-announcements"
     aria-live="polite"
     aria-atomic="true"
     class="sr-only">
</div>
```

**ARIA JavaScript Integration:**
```javascript
// Update ARIA states in buildListItem function
listItem.setAttribute('role', 'option');
listItem.setAttribute('aria-selected', 'false');
listItem.setAttribute('tabindex', '-1');
listItem.setAttribute('aria-describedby', `tab-${data.id}-description`);

// Create hidden description for each tab
const description = document.createElement('div');
description.id = `tab-${data.id}-description`;
description.className = 'sr-only';
description.textContent = `Tab in window ${data.windowId}. ${data.url}`;
listItem.appendChild(description);

// Update aria-activedescendant when focus changes
function updateActiveDescendant(focusedItem) {
  const listbox = focusedItem.closest('[role="listbox"]');
  listbox.setAttribute('aria-activedescendant', focusedItem.id || '');
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
  tabs.forEach((tab, index) => {
    tab.setAttribute('aria-selected', index === activeTabIndex ? 'true' : 'false');
    tab.setAttribute('tabindex', index === activeTabIndex ? '0' : '-1');
  });
}
```

---

## 🚫 Over-Engineering Removed

**Rejected Features** (to keep scope focused):
- ❌ Auto-select on Delete - Safety over speed
- ❌ Ctrl+D deselect - Use Escape instead
- ❌ Type-ahead navigation - Conflicts with auto-focus search
- ❌ Ctrl+Shift+A current window - Niche use case
- ❌ Alt+1-9 quick jump - Low value, adds complexity
- ❌ Visual selection counter - Nice-to-have, not essential
- ❌ State stack architecture - DOM state is sufficient

---

## ✅ Test Success Criteria

### Phase 1: Core Navigation - Success Criteria

**1.1 Tab Key Navigation**
- ✅ **PASS**: Tab from search input focuses first visible list item with smooth scroll
- ✅ **PASS**: Tab from list item exits popup (browser default behavior)
- ✅ **PASS**: Shift+Tab from list item returns to search input
- ✅ **PASS**: Shift+Tab from search input exits popup (browser default)
- ❌ **FAIL**: Tab/Shift+Tab cycles within popup infinitely
- ❌ **FAIL**: Focus gets trapped in any zone

**1.2 PageUp/PageDown Tab Switching**
- ✅ **PASS**: PageUp always switches to "Current Window" tab, regardless of current focus
- ✅ **PASS**: PageDown always switches to "All Windows" tab, regardless of current focus
- ✅ **PASS**: Focus is restored to equivalent relative position in new tab view
- ❌ **FAIL**: PageUp/PageDown scrolls list instead of switching tabs

**1.3 Fast List Scrolling (Ctrl+PageUp/PageDown)**
- ✅ **PASS**: Ctrl+PageUp jumps ~10 items up in current list
- ✅ **PASS**: Ctrl+PageDown jumps ~10 items down in current list
- ✅ **PASS**: Jumps skip hidden/filtered items
- ✅ **PASS**: Focus uses instant scroll (no animation)
- ❌ **FAIL**: Plain PageUp/PageDown triggers list scrolling instead of tab switching

**1.4 Home Key**
- ✅ **PASS**: Home in search input moves cursor to start (browser default)
- ✅ **PASS**: Home in list focuses first visible item with smooth scroll
- ✅ **PASS**: Home works during filtered search (first visible result)
- ❌ **FAIL**: Home key doesn't work or behaves inconsistently

**1.5 Context-Aware Escape**
- ✅ **PASS**: Escape in search with text clears search, stays in search
- ✅ **PASS**: Escape in empty search moves focus to first visible list item
- ✅ **PASS**: Escape in list with selections clears all selections, stays focused on current item
- ✅ **PASS**: Escape in list with no selections moves focus to search input
- ✅ **PASS**: Final Escape (no text, no selections) allows popup to close
- ❌ **FAIL**: Popup closes immediately on first Escape press when actions are available

**1.6 Smart Scrolling**
- ✅ **PASS**: Arrow key navigation uses instant scrollIntoView (block: 'nearest')
- ✅ **PASS**: Search-to-list transitions use smooth scrollIntoView
- ✅ **PASS**: Initial popup focus uses smooth scrollIntoView for orientation
- ✅ **PASS**: scrollIntoView only triggers when item is not fully visible
- ❌ **FAIL**: Aggressive scrolling causes page jumps or animation conflicts

---

### Phase 2: Standard Interactions - Success Criteria

**2.1 Select All Visible (Ctrl+A)**
- ✅ **PASS**: Ctrl+A in search selects all text (browser default)
- ✅ **PASS**: Ctrl+A in list selects all visible items (respects search filter)
- ✅ **PASS**: Selected items show visual feedback (.selected class + background)
- ✅ **PASS**: Selection count is communicated to screen readers
- ❌ **FAIL**: Hidden/filtered items get selected

**2.2 Ctrl+Click Selection**
- ✅ **PASS**: Ctrl+click toggles individual item selection
- ✅ **PASS**: Ctrl+click maintains focus on clicked item for continued keyboard use
- ✅ **PASS**: Works with both Ctrl and Cmd (Meta) keys for Mac compatibility
- ✅ **PASS**: Visual feedback immediately shows selection state
- ❌ **FAIL**: Ctrl+click navigates to tab instead of selecting

**2.3 Shift+Click Range Selection**
- ✅ **PASS**: Shift+click creates selection range from last clicked item to current
- ✅ **PASS**: Range selection only includes visible items (skips hidden)
- ✅ **PASS**: Previous selections are cleared before range selection
- ✅ **PASS**: Works across search filtering (remembers last selection position)
- ❌ **FAIL**: Range includes hidden items or breaks with filtered lists

**2.4 Multi-Select Enter Warning**
- ✅ **PASS**: Enter with 2+ selected items shows warning in search placeholder
- ✅ **PASS**: Warning shows exact count: "⚠️ X tabs selected - Press Enter again..."
- ✅ **PASS**: Second Enter press opens all selected tabs
- ✅ **PASS**: Escape during warning cancels and clears warning
- ✅ **PASS**: Warning auto-clears after 5 seconds
- ✅ **PASS**: Single selection bypasses warning
- ❌ **FAIL**: Enter immediately opens multiple tabs without warning

---

### Phase 3: Visual Feedback - Success Criteria

**3.1 Enhanced Focus Indicators**
- ✅ **PASS**: Focused items have visible 2px blue outline + subtle background
- ✅ **PASS**: Focus indicators work in high contrast mode
- ✅ **PASS**: Search input focus has matching visual treatment
- ✅ **PASS**: Tab headers show focus indicators when focused
- ❌ **FAIL**: Focus is invisible or hard to distinguish from selection

**3.2 Selection State Polish**
- ✅ **PASS**: Selected items have distinct background color and left border
- ✅ **PASS**: Selected items show checkmark (✓) on right side
- ✅ **PASS**: Selection visual feedback is different from focus indicators
- ✅ **PASS**: Warning state (multi-select) changes search input appearance
- ❌ **FAIL**: Selection and focus states are visually confusing or identical

---

### Phase 4: Accessibility - Success Criteria

**4.1 ARIA Roles and Properties**
- ✅ **PASS**: Tab headers have role="tab" with correct aria-selected states
- ✅ **PASS**: Search input has role="searchbox" and aria-label
- ✅ **PASS**: List containers have role="listbox" with aria-multiselectable="true"
- ✅ **PASS**: List items have role="option" with dynamic aria-selected
- ✅ **PASS**: Tab panels have role="tabpanel" with aria-labelledby
- ✅ **PASS**: Screen reader announces current selection state
- ❌ **FAIL**: Screen reader cannot determine interface structure or state

**4.2 Live Region Announcements**
- ✅ **PASS**: Tab switching triggers "Switched to [Current/All] view" announcement
- ✅ **PASS**: Selection changes announce "X tabs selected"
- ✅ **PASS**: Announcements are polite (don't interrupt other speech)
- ✅ **PASS**: Announcements auto-clear after 1 second to avoid clutter
- ❌ **FAIL**: Screen reader users miss important state changes

---

### Phase 5: Power Features - Success Criteria

**5.1 Window Section Navigation (Alt+Up/Down)**
- ✅ **PASS**: Alt+Up/Down only works in "All Windows" tab
- ✅ **PASS**: Navigation jumps between different window sections
- ✅ **PASS**: Navigation wraps around (last window → first window)
- ✅ **PASS**: Focus lands on first visible item in target window section
- ✅ **PASS**: Uses smooth scroll for major orientation changes
- ❌ **FAIL**: Works in "Current Window" tab or interferes with normal Alt+Arrow behavior

**5.2 Keyboard Shortcuts Help (Shift+?)**
- ✅ **PASS**: Shift+? opens modal overlay with keyboard shortcuts
- ✅ **PASS**: Help modal is keyboard accessible (Tab navigation, Esc to close)
- ✅ **PASS**: Help modal focus traps and returns focus to previous element
- ✅ **PASS**: Help content is comprehensive but concise
- ✅ **PASS**: Modal works on top of existing popup without breaking navigation
- ❌ **FAIL**: Help is inaccessible, incomplete, or breaks popup functionality

---

### Overall Integration Success Criteria

**Cross-Phase Integration**
- ✅ **PASS**: All keyboard shortcuts work together without conflicts
- ✅ **PASS**: Focus restoration works across all navigation methods
- ✅ **PASS**: Selection state persists during view changes and search operations
- ✅ **PASS**: Screen reader can navigate and use all features
- ✅ **PASS**: Visual focus and selection feedback is consistent across all features
- ✅ **PASS**: No keyboard traps - users can always exit via Tab or Escape sequences

**Performance & Stability**
- ✅ **PASS**: No noticeable lag during rapid keyboard navigation
- ✅ **PASS**: Smooth/instant scroll animations don't conflict or queue
- ✅ **PASS**: Memory usage stable during extended keyboard use
- ❌ **FAIL**: Performance degrades with large tab counts (>100 tabs)

---

## 🎯 EXECUTION PLAN

### **Phase Priority & Reasoning**

**Why this order:**
1. **Foundation First**: Phase 1 fixes fundamental navigation model - without Tab key, extension fails basic keyboard accessibility
2. **Standard Expectations**: Phase 2 implements patterns users expect (Ctrl+A, mouse modifiers)
3. **Visual Polish**: Phase 3 enhances what users can see while navigating
4. **Compliance**: Phase 4 ensures screen reader compatibility
5. **Power Features**: Phase 5 adds advanced functionality for power users

**Risk Mitigation:**
- Each phase is independently testable
- Phase 1 failure blocks everything else (highest risk, addressed first)
- Phases 2-4 can run in parallel if needed
- Phase 5 is optional (can be skipped if time-constrained)

**Dependency Chain:**
```
Phase 1 (Core) → Required for all others
├─ Phase 2 (Interactions) → Independent
├─ Phase 3 (Visual) → Independent
├─ Phase 4 (ARIA) → Depends on Phase 1 focus zones
└─ Phase 5 (Power) → Independent
```

---

## 🔄 Status Log

- **2024-12-10**: Keyboard UX analysis complete
- **SCOPE**: 7 keyboard features missing, 7 working
- **PRIORITY**: Tab key navigation is critical blocker for accessibility
- **DECISIONS**: Alt+Up/Down for window navigation, context-aware behavior design
- **READY**: Implementation plan finalized, ~365 lines, 6-8 hours, 5 phases
- **✅ PHASE 1 COMPLETE**: Core navigation foundation implemented (~110 lines)
  - Tab key navigation with zone traversal ✅
  - PageUp/PageDown tab switching with focus restoration ✅
  - Ctrl+PageUp/PageDown fast scrolling ✅
  - Context-aware Home key ✅
  - Enhanced Escape behavior with state management ✅
  - Smart scrolling with tiered approach (instant/smooth) ✅
  - Focus restoration system integrated ✅
