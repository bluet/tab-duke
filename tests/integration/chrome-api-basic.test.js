/**
 * Basic Chrome API Integration Tests (CommonJS)
 *
 * Simple tests to validate Chrome API mocking setup is working.
 * Using CommonJS syntax for initial validation.
 */

describe('Chrome API Basic Integration Tests', () => {
	beforeEach(() => {
		// Reset all Chrome API mocks before each test
		if (global.resetChromeMocks) {
			global.resetChromeMocks();
		}
	});

	describe('Chrome API Availability', () => {
		test('should have chrome object available globally', () => {
			expect(chrome).toBeDefined();
			expect(typeof chrome).toBe('object');
		});

		test('should have tabs API available', () => {
			expect(chrome.tabs).toBeDefined();
			expect(chrome.tabs.query).toBeDefined();
			expect(chrome.tabs.remove).toBeDefined();
			expect(chrome.tabs.update).toBeDefined();
		});

		test('should have windows API available', () => {
			expect(chrome.windows).toBeDefined();
			expect(chrome.windows.getCurrent).toBeDefined();
			expect(chrome.windows.getAll).toBeDefined();
		});

		test('should have action API available', () => {
			expect(chrome.action).toBeDefined();
			expect(chrome.action.setBadgeText).toBeDefined();
			expect(chrome.action.setTitle).toBeDefined();
		});

		test('should have runtime API available', () => {
			expect(chrome.runtime).toBeDefined();
			expect(chrome.runtime.getManifest).toBeDefined();
			expect(chrome.runtime.lastError).toBeDefined();
		});

		test('should have storage API available', () => {
			expect(chrome.storage).toBeDefined();
			expect(chrome.storage.local).toBeDefined();
			expect(chrome.storage.local.get).toBeDefined();
			expect(chrome.storage.local.set).toBeDefined();
		});
	});

	describe('Basic Chrome API Operations', () => {
		test('should successfully call tabs.query', (done) => {
			const mockTabs = [
				{ id: 1, title: 'Test Tab', active: true, windowId: 1 }
			];

			chrome.tabs.query.mockImplementation((query, callback) => {
				chrome.runtime.lastError = null;
				setTimeout(() => callback(mockTabs), 0);
			});

			chrome.tabs.query({}, (tabs) => {
				expect(chrome.runtime.lastError).toBeNull();
				expect(tabs).toEqual(mockTabs);
				expect(chrome.tabs.query).toHaveBeenCalled();
				done();
			});
		});

		test('should successfully call tabs.remove', (done) => {
			chrome.tabs.remove.mockImplementation((tabId, callback) => {
				chrome.runtime.lastError = null;
				setTimeout(() => callback(), 0);
			});

			chrome.tabs.remove(123, () => {
				expect(chrome.runtime.lastError).toBeNull();
				expect(chrome.tabs.remove).toHaveBeenCalledWith(123, expect.any(Function));
				done();
			});
		});

		test('should handle chrome.runtime.lastError', (done) => {
			chrome.tabs.remove.mockImplementation((tabId, callback) => {
				chrome.runtime.lastError = { message: 'Tab not found' };
				setTimeout(() => callback(), 0);
			});

			chrome.tabs.remove(999, () => {
				expect(chrome.runtime.lastError).toEqual({ message: 'Tab not found' });
				done();
			});
		});

		test('should successfully call storage operations', (done) => {
			const testData = { setting1: 'value1', setting2: 'value2' };

			chrome.storage.local.set.mockImplementation((data, callback) => {
				chrome.runtime.lastError = null;
				setTimeout(() => callback(), 0);
			});

			chrome.storage.local.get.mockImplementation((keys, callback) => {
				chrome.runtime.lastError = null;
				setTimeout(() => callback(testData), 0);
			});

			chrome.storage.local.set(testData, () => {
				expect(chrome.runtime.lastError).toBeNull();

				chrome.storage.local.get(['setting1'], (result) => {
					expect(chrome.runtime.lastError).toBeNull();
					expect(result).toEqual(testData);
					done();
				});
			});
		});

		test('should successfully call badge operations', () => {
			chrome.action.setBadgeText.mockImplementation((options) => {
				chrome.runtime.lastError = null;
			});

			chrome.action.setTitle.mockImplementation((options) => {
				chrome.runtime.lastError = null;
			});

			chrome.action.setBadgeText({ text: '42' });
			chrome.action.setTitle({ title: 'Test Title' });

			expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '42' });
			expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Test Title' });
		});

		test('should return manifest information', () => {
			const manifest = chrome.runtime.getManifest();

			expect(manifest).toBeDefined();
			expect(manifest.version).toBe('1.2.0');
			expect(manifest.name).toBe('TabDuke Tabs management Chrome extension');
		});
	});

	describe('Mock Reset Functionality', () => {
		test('should reset mocks between tests', () => {
			chrome.tabs.query('first call');
			expect(chrome.tabs.query).toHaveBeenCalledTimes(1);

			if (global.resetChromeMocks) {
				global.resetChromeMocks();
			}

			expect(chrome.tabs.query).toHaveBeenCalledTimes(0);
		});
	});
});