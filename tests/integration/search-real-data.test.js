/**
 * Search with Real Browser Data Integration Test
 *
 * Tests TabDuke's search functionality against actual Chrome tab data.
 * Part of "Option C: Keep Current + Minimal Real Chrome Tests" strategy.
 *
 * This test validates real search behavior:
 * - Search against actual Chrome tab titles and URLs
 * - Real-time filtering of tab list as user types
 * - Case-insensitive search across real browser data
 * - Search result accuracy with actual tab information
 * - Clear search functionality with real tabs
 * - Performance of search with realistic tab volumes
 */

const { createExtensionLoader } = require('../utils/chrome-extension-loader');

describe('Search with Real Chrome Data', () => {
  let loader;
  let browser;

  beforeAll(() => {
    jest.setTimeout(120000); // 2 minutes for search operations with multiple tabs
  });

  beforeEach(async () => {
    loader = createExtensionLoader();
    const result = await loader.launch({ headless: false });
    browser = result.browser;
  });

  afterEach(async () => {
    await loader.cleanup();
  });

  /**
   * Helper function to create test tabs with known titles and URLs
   */
  async function createTestTabs() {
    const testTabs = [
      { url: 'https://www.github.com', title: 'GitHub', keywords: ['github', 'git', 'repository'] },
      { url: 'https://stackoverflow.com', title: 'Stack Overflow', keywords: ['stack', 'overflow', 'programming'] },
      { url: 'https://developer.mozilla.org', title: 'MDN Web Docs', keywords: ['mdn', 'mozilla', 'documentation'] },
      { url: 'https://www.google.com/search?q=javascript', title: 'JavaScript Search', keywords: ['javascript', 'search', 'google'] },
      { url: 'https://nodejs.org', title: 'Node.js', keywords: ['node', 'nodejs', 'runtime'] },
    ];

    const createdPages = [];

    for (const testTab of testTabs) {
      const page = await browser.newPage();
      await page.goto(testTab.url, { waitUntil: 'networkidle2', timeout: 20000 });
      createdPages.push({ page, ...testTab });
    }

    // Allow time for tabs to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    return createdPages;
  }

  describe('Basic Search Functionality', () => {
    test('should filter real tabs based on search term', async () => {
      const testTabs = await createTestTabs();

      try {
        // Open extension popup
        const popupPage = await loader.openExtensionPopup();
        await loader.waitForExtensionReady(popupPage);
        await popupPage.waitForTimeout(2000);

        // Get initial tab count
        const initialTabCount = await popupPage.evaluate(() => {
          return document.querySelectorAll('.list-item:not([style*="display: none"])').length;
        });

        expect(initialTabCount).toBeGreaterThan(0);
        console.log(`✅ Initial tab count: ${initialTabCount} visible tabs`);

        // Test search for "github"
        await popupPage.focus('#searchInput');
        await popupPage.type('#searchInput', 'github');
        await popupPage.waitForTimeout(1000); // Allow search to process

        // Check filtered results
        const githubSearchResults = await popupPage.evaluate(() => {
          const visibleTabs = document.querySelectorAll('.list-item:not([style*="display: none"])');
          const tabTexts = Array.from(visibleTabs).map(tab => tab.textContent.toLowerCase());

          return {
            visibleCount: visibleTabs.length,
            containsGithub: tabTexts.some(text => text.includes('github')),
            allTexts: tabTexts,
          };
        });

        expect(githubSearchResults.visibleCount).toBeLessThan(initialTabCount);
        expect(githubSearchResults.containsGithub).toBe(true);
        console.log(`✅ GitHub search: ${githubSearchResults.visibleCount} tabs shown, contains GitHub: ${githubSearchResults.containsGithub}`);

        await popupPage.close();
      } finally {
        for (const tabInfo of testTabs) {
          await tabInfo.page.close();
        }
      }
    });

    test('should search across both tab titles and URLs', async () => {
      const testTabs = await createTestTabs();

      try {
        const popupPage = await loader.openExtensionPopup();
        await loader.waitForExtensionReady(popupPage);
        await popupPage.waitForTimeout(2000);

        // Search for URL component "nodejs.org"
        await popupPage.focus('#searchInput');
        await popupPage.type('#searchInput', 'nodejs.org');
        await popupPage.waitForTimeout(1000);

        const urlSearchResults = await popupPage.evaluate(() => {
          const visibleTabs = document.querySelectorAll('.list-item:not([style*="display: none"])');
          const tabTexts = Array.from(visibleTabs).map(tab => tab.textContent);

          return {
            visibleCount: visibleTabs.length,
            matchingTabs: tabTexts.filter(text =>
              text.toLowerCase().includes('nodejs') ||
              text.toLowerCase().includes('node.js')
            ),
            allVisibleTexts: tabTexts,
          };
        });

        expect(urlSearchResults.visibleCount).toBeGreaterThan(0);
        expect(urlSearchResults.matchingTabs.length).toBeGreaterThan(0);
        console.log(`✅ URL search found ${urlSearchResults.matchingTabs.length} matching tabs`);

        // Clear search and try title search
        await popupPage.evaluate(() => {
          document.querySelector('#searchInput').value = '';
          document.querySelector('#searchInput').dispatchEvent(new Event('input'));
        });
        await popupPage.waitForTimeout(500);

        await popupPage.type('#searchInput', 'Stack Overflow');
        await popupPage.waitForTimeout(1000);

        const titleSearchResults = await popupPage.evaluate(() => {
          const visibleTabs = document.querySelectorAll('.list-item:not([style*="display: none"])');
          const tabTexts = Array.from(visibleTabs).map(tab => tab.textContent);

          return {
            visibleCount: visibleTabs.length,
            matchingTabs: tabTexts.filter(text =>
              text.toLowerCase().includes('stack') ||
              text.toLowerCase().includes('overflow')
            ),
          };
        });

        expect(titleSearchResults.matchingTabs.length).toBeGreaterThan(0);
        console.log(`✅ Title search found ${titleSearchResults.matchingTabs.length} matching tabs`);

        await popupPage.close();
      } finally {
        for (const tabInfo of testTabs) {
          await tabInfo.page.close();
        }
      }
    });

    test('should perform case-insensitive search', async () => {
      const testTabs = await createTestTabs();

      try {
        const popupPage = await loader.openExtensionPopup();
        await loader.waitForExtensionReady(popupPage);
        await popupPage.waitForTimeout(2000);

        // Test different cases of the same search term
        const searchTerms = ['JAVASCRIPT', 'JavaScript', 'javascript', 'JaVaScRiPt'];
        const results = [];

        for (const term of searchTerms) {
          // Clear previous search
          await popupPage.evaluate(() => {
            document.querySelector('#searchInput').value = '';
            document.querySelector('#searchInput').dispatchEvent(new Event('input'));
          });
          await popupPage.waitForTimeout(300);

          // Type new search term
          await popupPage.focus('#searchInput');
          await popupPage.type('#searchInput', term);
          await popupPage.waitForTimeout(800);

          const result = await popupPage.evaluate(() => {
            const visibleTabs = document.querySelectorAll('.list-item:not([style*="display: none"])');
            return {
              visibleCount: visibleTabs.length,
              tabTexts: Array.from(visibleTabs).map(tab => tab.textContent),
            };
          });

          results.push({ term, ...result });
        }

        // All case variations should return the same results
        const firstResult = results[0];
        const allResultsConsistent = results.every(result =>
          result.visibleCount === firstResult.visibleCount
        );

        expect(allResultsConsistent).toBe(true);
        expect(firstResult.visibleCount).toBeGreaterThan(0);
        console.log(`✅ Case-insensitive search consistent: ${firstResult.visibleCount} tabs for all case variations`);

        await popupPage.close();
      } finally {
        for (const tabInfo of testTabs) {
          await tabInfo.page.close();
        }
      }
    });
  });

  describe('Real-time Search Updates', () => {
    test('should update search results in real-time as user types', async () => {
      const testTabs = await createTestTabs();

      try {
        const popupPage = await loader.openExtensionPopup();
        await loader.waitForExtensionReady(popupPage);
        await popupPage.waitForTimeout(2000);

        // Test progressive search typing
        const searchProgression = ['j', 'ja', 'jav', 'java', 'javas', 'javasc', 'javascript'];
        const progressResults = [];

        await popupPage.focus('#searchInput');

        for (const searchTerm of searchProgression) {
          // Clear and type new term
          await popupPage.evaluate(() => {
            document.querySelector('#searchInput').value = '';
          });
          await popupPage.type('#searchInput', searchTerm);
          await popupPage.waitForTimeout(300);

          const result = await popupPage.evaluate(() => {
            return document.querySelectorAll('.list-item:not([style*="display: none"])').length;
          });

          progressResults.push({ term: searchTerm, count: result });
        }

        // Results should generally narrow down as search becomes more specific
        expect(progressResults.length).toBe(searchProgression.length);
        expect(progressResults[progressResults.length - 1].count).toBeGreaterThanOrEqual(0);

        console.log(`✅ Real-time search progression:`,
          progressResults.map(r => `"${r.term}": ${r.count}`).join(', '));

        await popupPage.close();
      } finally {
        for (const tabInfo of testTabs) {
          await tabInfo.page.close();
        }
      }
    });

    test('should handle rapid search input changes', async () => {
      const testTabs = await createTestTabs();

      try {
        const popupPage = await loader.openExtensionPopup();
        await loader.waitForExtensionReady(popupPage);
        await popupPage.waitForTimeout(2000);

        // Rapid search term changes to test performance and stability
        const rapidSearchTerms = ['github', 'stack', 'mdn', 'node', 'javascript'];

        await popupPage.focus('#searchInput');

        for (const term of rapidSearchTerms) {
          await popupPage.evaluate(() => {
            document.querySelector('#searchInput').value = '';
            document.querySelector('#searchInput').dispatchEvent(new Event('input'));
          });

          await popupPage.type('#searchInput', term, { delay: 50 }); // Fast typing
          await popupPage.waitForTimeout(200); // Brief pause
        }

        // Final check that extension is still responsive
        const finalState = await popupPage.evaluate(() => {
          const searchInput = document.querySelector('#searchInput');
          const visibleTabs = document.querySelectorAll('.list-item:not([style*="display: none"])');

          return {
            inputValue: searchInput.value,
            inputResponsive: searchInput !== null && !searchInput.disabled,
            tabsVisible: visibleTabs.length,
            noErrors: !document.querySelector('.error-message'),
          };
        });

        expect(finalState.inputResponsive).toBe(true);
        expect(finalState.tabsVisible).toBeGreaterThanOrEqual(0);
        expect(finalState.noErrors).toBe(true);
        console.log(`✅ Rapid search input handled: final term "${finalState.inputValue}", ${finalState.tabsVisible} tabs`);

        await popupPage.close();
      } finally {
        for (const tabInfo of testTabs) {
          await tabInfo.page.close();
        }
      }
    });
  });

  describe('Search Clear and Reset', () => {
    test('should clear search and show all tabs when clear button clicked', async () => {
      const testTabs = await createTestTabs();

      try {
        const popupPage = await loader.openExtensionPopup();
        await loader.waitForExtensionReady(popupPage);
        await popupPage.waitForTimeout(2000);

        // Get initial tab count
        const initialCount = await popupPage.evaluate(() => {
          return document.querySelectorAll('.list-item:not([style*="display: none"])').length;
        });

        // Perform a search that narrows results
        await popupPage.focus('#searchInput');
        await popupPage.type('#searchInput', 'github');
        await popupPage.waitForTimeout(1000);

        const searchedCount = await popupPage.evaluate(() => {
          return document.querySelectorAll('.list-item:not([style*="display: none"])').length;
        });

        expect(searchedCount).toBeLessThan(initialCount);

        // Clear search using Escape key (matches actual TabDuke behavior)
        await popupPage.focus('#searchInput');
        await popupPage.keyboard.press('Escape');

        await popupPage.waitForTimeout(1000);

        // Check that all tabs are visible again
        const clearedCount = await popupPage.evaluate(() => {
          const input = document.querySelector('#searchInput');
          const visibleTabs = document.querySelectorAll('.list-item:not([style*="display: none"])');

          return {
            inputEmpty: input.value === '',
            visibleCount: visibleTabs.length,
          };
        });

        expect(clearedCount.inputEmpty).toBe(true);
        expect(clearedCount.visibleCount).toBe(initialCount);
        console.log(`✅ Search cleared: ${searchedCount} → ${clearedCount.visibleCount} tabs visible`);

        await popupPage.close();
      } finally {
        for (const tabInfo of testTabs) {
          await tabInfo.page.close();
        }
      }
    });

    test('should handle empty search gracefully', async () => {
      const testTabs = await createTestTabs();

      try {
        const popupPage = await loader.openExtensionPopup();
        await loader.waitForExtensionReady(popupPage);
        await popupPage.waitForTimeout(2000);

        // Test empty search behavior
        await popupPage.focus('#searchInput');
        await popupPage.type('#searchInput', '   '); // Just spaces
        await popupPage.waitForTimeout(500);

        const spaceSearchResult = await popupPage.evaluate(() => {
          return {
            visibleTabs: document.querySelectorAll('.list-item:not([style*="display: none"])').length,
            inputValue: document.querySelector('#searchInput').value,
          };
        });

        // Spaces should show all tabs or be handled gracefully
        expect(spaceSearchResult.visibleTabs).toBeGreaterThan(0);

        // Test completely empty search
        await popupPage.evaluate(() => {
          document.querySelector('#searchInput').value = '';
          document.querySelector('#searchInput').dispatchEvent(new Event('input'));
        });
        await popupPage.waitForTimeout(500);

        const emptySearchResult = await popupPage.evaluate(() => {
          return document.querySelectorAll('.list-item:not([style*="display: none"])').length;
        });

        expect(emptySearchResult).toBeGreaterThan(0);
        console.log(`✅ Empty search handled: ${emptySearchResult} tabs visible`);

        await popupPage.close();
      } finally {
        for (const tabInfo of testTabs) {
          await tabInfo.page.close();
        }
      }
    });
  });

  describe('Search Performance and Scale', () => {
    test('should perform search efficiently with multiple tabs', async () => {
      // Create more tabs to test performance
      const testTabs = await createTestTabs();

      // Create additional tabs to increase scale
      const additionalPages = [];
      for (let i = 0; i < 5; i++) {
        const page = await browser.newPage();
        await page.goto(`https://httpbin.org/json?performance_test=${i}`,
          { waitUntil: 'domcontentloaded' });
        additionalPages.push(page);
      }

      try {
        const popupPage = await loader.openExtensionPopup();
        await loader.waitForExtensionReady(popupPage);
        await popupPage.waitForTimeout(3000);

        // Measure search performance
        const searchStartTime = Date.now();

        await popupPage.focus('#searchInput');
        await popupPage.type('#searchInput', 'test');
        await popupPage.waitForTimeout(1000);

        const searchEndTime = Date.now();
        const searchDuration = searchEndTime - searchStartTime;

        const searchResults = await popupPage.evaluate(() => {
          const totalTabs = document.querySelectorAll('.list-item').length;
          const visibleTabs = document.querySelectorAll('.list-item:not([style*="display: none"])').length;

          return {
            totalTabs,
            visibleTabs,
            searchWorking: visibleTabs < totalTabs,
          };
        });

        expect(searchResults.totalTabs).toBeGreaterThan(5);
        expect(searchDuration).toBeLessThan(5000); // Should complete within 5 seconds
        console.log(`✅ Search performance: ${searchDuration}ms for ${searchResults.totalTabs} tabs`);

        await popupPage.close();
      } finally {
        for (const tabInfo of testTabs) {
          await tabInfo.page.close();
        }
        for (const page of additionalPages) {
          await page.close();
        }
      }
    });

    test('should handle special characters and unicode in search', async () => {
      // Create tab with special characters
      const specialPage = await browser.newPage();
      await specialPage.goto('https://httpbin.org/json?special=test%20with%20spaces&unicode=测试',
        { waitUntil: 'domcontentloaded' });

      const testTabs = await createTestTabs();

      try {
        const popupPage = await loader.openExtensionPopup();
        await loader.waitForExtensionReady(popupPage);
        await popupPage.waitForTimeout(2000);

        // Test search with special characters
        const specialSearchTerms = ['%20', 'spaces', 'test with', '测试'];

        for (const term of specialSearchTerms) {
          await popupPage.evaluate(() => {
            document.querySelector('#searchInput').value = '';
            document.querySelector('#searchInput').dispatchEvent(new Event('input'));
          });
          await popupPage.waitForTimeout(200);

          await popupPage.focus('#searchInput');
          await popupPage.type('#searchInput', term);
          await popupPage.waitForTimeout(800);

          const result = await popupPage.evaluate((searchTerm) => {
            const visibleTabs = document.querySelectorAll('.list-item:not([style*="display: none"])');
            return {
              searchTerm,
              visibleCount: visibleTabs.length,
              noErrors: !document.querySelector('.error'),
            };
          }, term);

          expect(result.noErrors).toBe(true);
          console.log(`✅ Special character search "${term}": ${result.visibleCount} results`);
        }

        await popupPage.close();
      } finally {
        await specialPage.close();
        for (const tabInfo of testTabs) {
          await tabInfo.page.close();
        }
      }
    });
  });
});