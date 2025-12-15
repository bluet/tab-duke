/**
 * Real Chrome Extension Loading Integration Test
 *
 * Tests that TabDuke extension loads successfully in actual Chrome browser.
 * Part of "Option C: Keep Current + Minimal Real Chrome Tests" strategy.
 *
 * This test validates real Chrome extension failure modes:
 * - Extension manifest parsing and validation
 * - Chrome permissions and security policies
 * - Extension service worker initialization
 * - Popup HTML and JavaScript loading
 * - Chrome API availability in extension context
 */

const { createExtensionLoader } = require('../utils/chrome-extension-loader');

describe('Real Chrome Extension Loading', () => {
  let loader;

  beforeAll(() => {
    // Set longer timeout for real Chrome operations
    jest.setTimeout(60000); // 60 seconds
  });

  beforeEach(() => {
    loader = createExtensionLoader();
  });

  afterEach(async () => {
    await loader.cleanup();
  });

  describe('Extension Initialization', () => {
    test('should launch Chrome browser with TabDuke extension loaded', async () => {
      // Launch Chrome with extension
      const { browser, extensionId } = await loader.launch({
        headless: false, // Extensions require non-headless mode
      });

      // Verify browser launched successfully
      expect(browser).toBeDefined();
      expect(browser.isConnected()).toBe(true);

      // Verify extension ID was discovered
      expect(extensionId).toBeDefined();
      expect(extensionId).toMatch(/^[a-z]+$/); // Extension IDs are lowercase letters
      expect(extensionId.length).toBeGreaterThan(10); // Reasonable ID length

      console.log(`✅ TabDuke extension loaded with ID: ${extensionId}`);
    });

    test('should find TabDuke extension in chrome://extensions page', async () => {
      await loader.launch();
      const page = await loader.newPage();

      try {
        // Navigate to extensions management page
        await page.goto('chrome://extensions/');

        // Enable developer mode to see extension details
        const devModeToggle = await page.$('#developer-mode-toggle');
        if (devModeToggle) {
          await devModeToggle.click();
          await page.waitForTimeout(1000);
        }

        // Check if TabDuke extension is visible and enabled
        const extensionInfo = await page.evaluate(() => {
          const extensionCards = document.querySelectorAll('extensions-item');
          for (const card of extensionCards) {
            const nameElement = card.querySelector('#name');
            const toggleElement = card.querySelector('#enableToggle');

            if (nameElement && nameElement.textContent.includes('TabDuke')) {
              return {
                name: nameElement.textContent.trim(),
                enabled: toggleElement ? !toggleElement.hasAttribute('disabled') : false,
                id: card.id,
              };
            }
          }
          return null;
        });

        // Verify extension information
        expect(extensionInfo).toBeDefined();
        expect(extensionInfo.name).toContain('TabDuke');
        expect(extensionInfo.enabled).toBe(true);
        expect(extensionInfo.id).toBeDefined();

        console.log(`✅ Found TabDuke extension: ${extensionInfo.name} (ID: ${extensionInfo.id})`);
      } finally {
        await page.close();
      }
    });
  });

  describe('Extension Popup Loading', () => {
    test('should open extension popup successfully', async () => {
      await loader.launch();
      const popupPage = await loader.openExtensionPopup();

      try {
        // Verify popup page loaded
        expect(popupPage.url()).toMatch(/chrome-extension:\/\/[a-z]+\/popup\.html/);

        // Wait for extension to be ready - FIXED selectors
        const isReady = await loader.waitForExtensionReady(popupPage);
        expect(isReady).toBe(true);

        console.log('✅ TabDuke popup opened and ready');
      } finally {
        await popupPage.close();
      }
    });

    test('should load essential popup elements', async () => {
      await loader.launch();
      const popupPage = await loader.openExtensionPopup();

      try {
        await loader.waitForExtensionReady(popupPage);

        // Check for critical UI elements - FIXED selectors to match actual popup.html
        const elements = await popupPage.evaluate(() => {
          return {
            searchInput: !!document.querySelector('#searchInput'),
            currentWindow: !!document.querySelector('#currentWindow'),
            allWindow: !!document.querySelector('#allWindow'),
            tabMenu: !!document.querySelector('#tabMenu'),
          };
        });

        // Verify essential elements are present
        expect(elements.searchInput).toBe(true);
        expect(elements.currentWindow).toBe(true);
        expect(elements.allWindow).toBe(true);
        expect(elements.tabMenu).toBe(true);

        console.log('✅ All essential popup elements loaded');
      } finally {
        await popupPage.close();
      }
    });
  });

  describe('Chrome API Accessibility', () => {
    test('should have Chrome APIs available in extension context', async () => {
      await loader.launch();
      const popupPage = await loader.openExtensionPopup();

      try {
        await loader.waitForExtensionReady(popupPage);

        // Test Chrome API availability in real extension context
        const apiAvailability = await popupPage.evaluate(() => {
          return {
            chrome: typeof chrome !== 'undefined',
            tabs: typeof chrome?.tabs !== 'undefined',
            windows: typeof chrome?.windows !== 'undefined',
            action: typeof chrome?.action !== 'undefined',
            runtime: typeof chrome?.runtime !== 'undefined',
            storage: typeof chrome?.storage !== 'undefined',
          };
        });

        // Verify all required Chrome APIs are available
        expect(apiAvailability.chrome).toBe(true);
        expect(apiAvailability.tabs).toBe(true);
        expect(apiAvailability.windows).toBe(true);
        expect(apiAvailability.action).toBe(true);
        expect(apiAvailability.runtime).toBe(true);
        expect(apiAvailability.storage).toBe(true);

        console.log('✅ All Chrome APIs accessible in extension context');
      } finally {
        await popupPage.close();
      }
    });

    test('should successfully call basic Chrome API operations', async () => {
      await loader.launch();
      const popupPage = await loader.openExtensionPopup();

      try {
        await loader.waitForExtensionReady(popupPage);

        // Test actual Chrome API calls in real extension context
        const apiResults = await popupPage.evaluate(async () => {
          const results = {};

          try {
            // Test tabs.query - should work without errors
            results.tabsQuery = await new Promise((resolve) => {
              chrome.tabs.query({ currentWindow: true }, (tabs) => {
                resolve({
                  success: !chrome.runtime.lastError,
                  tabCount: tabs ? tabs.length : 0,
                  error: chrome.runtime.lastError?.message
                });
              });
            });

            // Test windows.getCurrent - should work without errors
            results.windowsGetCurrent = await new Promise((resolve) => {
              chrome.windows.getCurrent((window) => {
                resolve({
                  success: !chrome.runtime.lastError,
                  hasWindow: !!window,
                  error: chrome.runtime.lastError?.message
                });
              });
            });

            // Test storage.local.get - should work without errors
            results.storageGet = await new Promise((resolve) => {
              chrome.storage.local.get(['testKey'], (result) => {
                resolve({
                  success: !chrome.runtime.lastError,
                  error: chrome.runtime.lastError?.message
                });
              });
            });

          } catch (error) {
            results.error = error.message;
          }

          return results;
        });

        // Verify Chrome API calls executed successfully
        expect(apiResults.error).toBeUndefined();

        expect(apiResults.tabsQuery.success).toBe(true);
        expect(apiResults.tabsQuery.tabCount).toBeGreaterThanOrEqual(1);

        expect(apiResults.windowsGetCurrent.success).toBe(true);
        expect(apiResults.windowsGetCurrent.hasWindow).toBe(true);

        expect(apiResults.storageGet.success).toBe(true);

        console.log(`✅ Chrome API operations successful (Found ${apiResults.tabsQuery.tabCount} tabs)`);
      } finally {
        await popupPage.close();
      }
    });
  });

  describe('Extension Error Handling', () => {
    test('should handle Chrome browser launch failures gracefully', async () => {
      // Test with invalid Chrome arguments that should cause launch failure
      const invalidLoader = createExtensionLoader();

      // Override chrome args to cause failure
      const originalArgs = require('../utils/chrome-extension-loader').EXTENSION_CONFIG.chromeArgs;
      require('../utils/chrome-extension-loader').EXTENSION_CONFIG.chromeArgs = ['--invalid-arg-that-should-fail'];

      try {
        await expect(invalidLoader.launch()).rejects.toThrow();
      } finally {
        // Restore original args for other tests
        require('../utils/chrome-extension-loader').EXTENSION_CONFIG.chromeArgs = originalArgs;
        await invalidLoader.cleanup();
      }
    });

    test('should timeout gracefully when extension takes too long to load', async () => {
      await loader.launch();
      const popupPage = await loader.openExtensionPopup();

      try {
        // Test timeout behavior with a very short timeout
        const originalTimeout = popupPage._timeoutSettings.timeout;
        popupPage.setDefaultTimeout(100); // 100ms - too short for real extension

        // This should timeout but handle gracefully
        await expect(
          popupPage.waitForSelector('#non-existent-element', { timeout: 100 })
        ).rejects.toThrow(/Waiting for selector/);

        // Restore normal timeout
        popupPage.setDefaultTimeout(originalTimeout);
      } finally {
        await popupPage.close();
      }
    });
  });
});