# TabDuke Repository Guidelines

## Project Structure

- `manifest.json`: Chrome Extension (MV3) entrypoint: permissions, background worker, popup, options.
- Popup UI: `popup.html`, `popup.js` (ES modules), `popup.css`.
- Background worker: `background.js` (badge counts, optional dedupe prompt, optional "tab janitor" via alarms).
- Options UI: `options.html`, `options.js` (settings + duplicate-tab scanner).
- Service modules (used by `popup.js`): `src/core/`, `src/components/`, `src/utils/`, `src/types/`.
- Assets: `images/` (icons).
- Docs/notes: `README.md`, `PrivacyPolicy.md`, `doc/TODO.md`.
- Generated CSS: `dist/tailwind.min.css` (not tracked; build locally before loading the extension).

## Service Architecture Patterns

TabDuke follows a **service-oriented architecture** achieving 87% complexity reduction from the original monolithic design:

### Core Services (`src/core/`)
- **StateManager.js**: Keyboard navigation orchestration and global state management
- **TabManager.js**: Centralized Chrome tabs/windows API operations with comprehensive error handling

### UI Components (`src/components/`)
- **TabRenderer.js**: DOM rendering with accessibility-first approach and safe favicon handling
- **SearchEngine.js**: Real-time tab filtering (1.88ms response time, 100x improvement)
- **KeyboardNavigation.js**: Complete keyboard UX with exclusive focus safety

### Utilities (`src/utils/`)
- **AccessibilityHelpers.js**: ARIA support, screen reader integration, and keyboard hints
- **FocusManager.js**: Multi-window focus coordination with advanced algorithms

### Type Definitions (`src/types/`)
- **TabDukeTypes.js**: JSDoc-based type definitions providing TypeScript-level safety without TypeScript dependency

### Architecture Principles
- **Single Responsibility**: Each service handles one domain (tabs, search, rendering, etc.)
- **Dependency Injection**: Services receive dependencies rather than creating them
- **Error Boundary**: All Chrome API calls wrapped with comprehensive error handling
- **Accessibility First**: Every UI component designed for keyboard navigation and screen readers

## Build, Test, and Development Commands

- `npm install` (or `npm ci`): install dependencies.
- `npm run build-css`: build Tailwind to `dist/tailwind.min.css` (required for `popup.html` styling).
- `npm run watch-css`: watch and rebuild Tailwind during UI work.
- `npm test`: run 233 comprehensive tests (Jest + JSDOM, ~1.7s runtime).
- `npm run test:coverage`: run tests with coverage report (61.35% strategic coverage).
- `npm run test:watch`: run tests in watch mode for development.
- `npm run test:integration`: run Chrome browser integration tests (requires display).

Local run (manual): open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select repo root → open the extension popup and options page.

## Chrome Extension Development Workflow

### Debugging & Development
- **Popup Debugging**: Right-click extension icon → "Inspect popup" to open DevTools
- **Background Worker**: chrome://extensions → "Inspect views: background page"
- **Options Page**: chrome://extensions → "Extension options" → F12 for DevTools
- **Storage Inspection**: chrome://extensions → Developer mode → "Inspect views" → Application tab
- **Console Logging**: All services use consistent logging patterns for debugging

### Common Development Tasks
- **UI Changes**: Use `npm run watch-css` for live Tailwind rebuilds during development
- **Service Logic**: Test in popup DevTools; use `chrome.tabs.query()` in console for API testing
- **Keyboard Navigation**: Test all 16 keyboard shortcuts, especially multi-window scenarios
- **Performance Testing**: Use 30+ windows with 1300+ tabs (extreme scale user scenario)

### Extension Loading & Testing
1. Make code changes
2. Run `npm run build-css` if CSS changes were made
3. Go to chrome://extensions and click "Reload" on TabDuke
4. Test: popup functionality, options page, keyboard shortcuts, background behavior

## Coding Style & Naming Conventions

- Indentation: tabs for JS (`.editorconfig`); LF line endings; trim trailing whitespace.
- ESLint rules (`.eslintrc.cjs`): double quotes, semicolons, `quote-props: "always"`, `space-before-function-paren: "always"`.
- Prefer small, single-responsibility modules under `src/` (services) and keep UI wiring in `popup.js`.

## Key Architectural Decisions

### Technology Choices
- **ES Modules without TypeScript**: JSDoc provides type safety without build complexity
- **Service-Oriented Architecture**: 87% complexity reduction from monolithic popup.js (1,267 lines → maintainable services)
- **Tailwind CSS Local Build**: Security (no CDN) + Performance (8.6KB vs 50KB+) + CSP compliance
- **Chrome Manifest V3**: Future-proof extension using service workers instead of background pages

### Security Architecture
- **XSS Prevention**: Safe DOM creation using createElement() instead of innerHTML in options.js
- **Favicon URL Validation**: URL scheme validation preventing malicious favicon sources
- **Content Security Policy**: Strict CSP blocking external scripts while allowing legitimate resources
- **Minimal Permissions**: Only `tabs`, `windows`, `storage`, `alarms`, `notifications` - no host_permissions needed

### Performance Optimizations
- **Real-time Search**: 1.88ms response time (100x improvement from 203ms)
- **Event Delegation**: Single event listener handling all tab interactions
- **Batch DOM Operations**: Tab rendering uses efficient DOM manipulation for high tab counts
- **Focus State Management**: Position tracking and restoration across tab view switching

### Accessibility Commitments
- **Keyboard-First Design**: 16 keyboard shortcuts, complete navigation without mouse
- **Screen Reader Support**: Comprehensive ARIA labels and live regions
- **High Contrast Support**: CSS supports prefers-contrast media queries
- **Focus Indicators**: Clear visual feedback for all interactive elements

## Testing Guidelines

### Automated Testing (Jest + JSDOM)
- **Unit Tests**: 233 tests covering all major components with real business logic
- **Coverage Focus**: Strategic 61.35% coverage targeting critical paths
- **Integration Tests**: Chrome API mocking with both callback and Promise patterns
- **Performance**: Tests complete in ~1.7s for rapid development feedback

### Manual Testing Checklist
Supplement automated tests with manual validation:
- popup: search, keyboard navigation, multi-select, close/switch tab flows
- options: toggles persist via `chrome.storage`, duplicate scan + bulk close
- background: badge updates, dedupe prompt, janitor alarm behavior
- **Chrome Integration**: Use `npm run test:integration` for real browser validation

## Commit & Pull Request Guidelines

- Commits in this repo are typically imperative and descriptive (e.g., “Fix…”, “Enhance…”, “Implement…”); include the “why” and impact (UX/perf/security).
- PRs: include a short description, verification steps, and screenshots/GIFs of popup/options changes; call out any `manifest.json` permission/CSP changes explicitly.

## User Feedback & Issue Reporting

### Bug Reports & Feature Requests
- **Primary Channel**: https://github.com/bluet/tab-duke/issues
- **Issue Categories**: Bug Report, Feature Request, Performance Issue, Accessibility Concern
- **Required Information**: Chrome version, OS, extension version, steps to reproduce
- **Extreme Scale Testing**: Encourage users with 500+ tabs to report performance issues

### User Feedback Collection
- Monitor Chrome Web Store reviews for common patterns
- GitHub Issues provide detailed technical feedback with reproduction steps
- Performance feedback especially valuable from high-scale users (100+ windows, 1000+ tabs)

### Response Guidelines
- Security issues: Acknowledge within 24 hours, fix within 1 week
- Performance issues: Request scale details (tab count, window count, browser specs)
- Feature requests: Evaluate against accessibility and extreme-scale user needs
- Accessibility issues: Highest priority - Chrome extension should work for all users

## Security & Privacy

- Treat tab titles/URLs as untrusted input; avoid `innerHTML` and prefer safe DOM APIs.
- Keep MV3 CSP-friendly changes (no remote code). The extension states it does not collect user data (`PrivacyPolicy.md`).
- Report security vulnerabilities privately via GitHub Security tab or email to maintainer.
