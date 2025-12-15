/**
 * Chrome Extension Loader Utility for Puppeteer Integration Tests
 *
 * Handles launching Chrome browser with TabDuke extension loaded for real integration testing.
 * Part of "Option C: Keep Current + Minimal Real Chrome Tests" strategy.
 */

const puppeteer = require('puppeteer');
const path = require('path');

/**
 * Configuration for Chrome extension testing
 */
const EXTENSION_CONFIG = {
  // TabDuke extension is loaded from project root directory
  extensionPath: path.resolve(__dirname, '../..'),

  // Chrome launch arguments for extension testing
  chromeArgs: [
    '--load-extension=.',              // Load TabDuke from current directory
    '--disable-extensions-except=.',   // Only load TabDuke, disable others
    '--disable-web-security',          // Allow extension testing flexibility
    '--no-first-run',                  // Skip Chrome first-run screens
    '--disable-default-apps',          // Clean test environment
    '--disable-sync',                  // Avoid sync conflicts during testing
    '--disable-background-timer-throttling', // Consistent timing for tests
    '--disable-renderer-backgrounding', // Prevent background tab throttling
    '--disable-backgrounding-occluded-windows', // Keep windows active
  ],

  // Test timeouts
  defaultTimeout: 30000, // 30 seconds for extension loading
  navigationTimeout: 15000, // 15 seconds for page navigation
};

/**
 * Chrome Extension Test Browser Manager
 *
 * Handles lifecycle of Chrome browser instances with TabDuke extension loaded
 */
class ChromeExtensionLoader {
  constructor() {
    this.browser = null;
    this.extensionId = null;
  }

  /**
   * Launch Chrome browser with TabDuke extension loaded
   *
   * @param {Object} options - Launch options
   * @param {boolean} options.headless - Run in headless mode (default: false)
   * @param {boolean} options.devtools - Open devtools (default: false)
   * @returns {Promise<Object>} Browser instance and extension ID
   */
  async launch(options = {}) {
    const { headless = false, devtools = false } = options;

    console.log('🚀 Launching Chrome with TabDuke extension...');

    try {
      // Launch Chrome with extension loading arguments
      this.browser = await puppeteer.launch({
        headless, // Extensions require non-headless mode typically
        devtools,
        args: EXTENSION_CONFIG.chromeArgs,
        defaultViewport: null, // Use full browser window
        timeout: EXTENSION_CONFIG.defaultTimeout,
      });

      // Get extension ID by checking loaded extensions
      const extensionId = await this.getExtensionId();
      this.extensionId = extensionId;

      console.log(`✅ TabDuke extension loaded with ID: ${extensionId}`);

      return {
        browser: this.browser,
        extensionId: this.extensionId,
      };
    } catch (error) {
      console.error('❌ Failed to launch Chrome with extension:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Get the extension ID of loaded TabDuke extension
   *
   * @returns {Promise<string>} Extension ID
   */
  async getExtensionId() {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    // Navigate to chrome://extensions to find our extension
    const page = await this.browser.newPage();

    try {
      await page.goto('chrome://extensions/', {
        waitUntil: 'networkidle2',
        timeout: EXTENSION_CONFIG.navigationTimeout,
      });

      // Enable developer mode to see extension IDs
      const devModeToggle = await page.$('#developer-mode-toggle');
      if (devModeToggle) {
        await devModeToggle.click();
        await page.waitForTimeout(1000); // Wait for UI update
      }

      // Find TabDuke extension by name
      const extensionId = await page.evaluate(() => {
        const extensionCards = document.querySelectorAll('extensions-item');
        for (const card of extensionCards) {
          const nameElement = card.querySelector('#name');
          if (nameElement && nameElement.textContent.includes('TabDuke')) {
            // Extract ID from the element's ID attribute
            return card.id;
          }
        }
        return null;
      });

      await page.close();

      if (!extensionId) {
        throw new Error('TabDuke extension not found in chrome://extensions');
      }

      return extensionId;
    } catch (error) {
      await page.close();
      throw new Error(`Failed to get extension ID: ${error.message}`);
    }
  }

  /**
   * Create a new page with extension context
   *
   * @returns {Promise<Object>} Page instance
   */
  async newPage() {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const page = await this.browser.newPage();

    // Set reasonable timeout for extension operations
    page.setDefaultTimeout(EXTENSION_CONFIG.defaultTimeout);

    return page;
  }

  /**
   * Open extension popup in a new page
   *
   * @returns {Promise<Object>} Page instance with popup loaded
   */
  async openExtensionPopup() {
    if (!this.extensionId) {
      throw new Error('Extension ID not available. Ensure browser is launched properly.');
    }

    const page = await this.newPage();
    const popupUrl = `chrome-extension://${this.extensionId}/popup.html`;

    try {
      await page.goto(popupUrl, {
        waitUntil: 'networkidle2',
        timeout: EXTENSION_CONFIG.navigationTimeout,
      });

      console.log(`📋 Opened TabDuke popup: ${popupUrl}`);
      return page;
    } catch (error) {
      await page.close();
      throw new Error(`Failed to open extension popup: ${error.message}`);
    }
  }

  /**
   * Wait for extension to be ready and functional
   *
   * @param {Object} page - Page instance
   * @returns {Promise<boolean>} True if extension is ready
   */
  async waitForExtensionReady(page) {
    try {
      // Wait for key extension elements - FIXED to match actual popup.html selectors
      await page.waitForSelector('#searchInput', {
        timeout: EXTENSION_CONFIG.defaultTimeout,
        visible: true,
      });

      await page.waitForSelector('#currentWindow', {
        timeout: EXTENSION_CONFIG.defaultTimeout,
        visible: true,
      });

      // Verify Chrome APIs are accessible
      const isReady = await page.evaluate(() => {
        return typeof chrome !== 'undefined' &&
               chrome.tabs &&
               chrome.windows &&
               chrome.action;
      });

      if (!isReady) {
        throw new Error('Chrome APIs not accessible in extension context');
      }

      console.log('✅ TabDuke extension is ready and functional');
      return true;
    } catch (error) {
      console.error('❌ Extension not ready:', error.message);
      return false;
    }
  }

  /**
   * Clean up browser instance and resources
   */
  async cleanup() {
    if (this.browser) {
      console.log('🧹 Cleaning up browser instance...');
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Warning: Error during browser cleanup:', error);
      }
      this.browser = null;
      this.extensionId = null;
    }
  }
}

/**
 * Utility function to create and configure a Chrome extension loader
 *
 * @param {Object} options - Configuration options
 * @returns {ChromeExtensionLoader} Configured loader instance
 */
function createExtensionLoader(options = {}) {
  return new ChromeExtensionLoader(options);
}

module.exports = {
  ChromeExtensionLoader,
  createExtensionLoader,
  EXTENSION_CONFIG,
};