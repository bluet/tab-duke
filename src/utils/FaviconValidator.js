/**
 * Centralized favicon URL validation for consistent security policy across TabDuke
 *
 * Ensures uniform security validation between TabRenderer and options page,
 * preventing XSS via malicious favicon URLs while maintaining functionality.
 *
 * @fileoverview Shared favicon validation utilities
 * @version 1.2.0
 * @since 1.2.0
 */

/**
 * Validates if a favicon URL is safe for use in the extension
 *
 * Applies consistent security policy across all components:
 * - Allows http:, https:, chrome: protocols
 * - Allows data: URLs only for image/ MIME types (INTENTIONAL POLICY)
 * - Rejects all other protocols and malformed URLs
 *
 * DATA URL SECURITY POLICY:
 * data:image/* URLs are explicitly allowed for two reasons:
 * 1. Default fallback favicon is a safe SVG data URL (getDefaultFaviconUrl)
 * 2. Chrome extension context provides additional security against XSS
 * 3. Strict MIME type validation ensures only image data is allowed
 * 4. data:text/*, data:application/*, etc. are explicitly rejected
 *
 * @param {string} url - Favicon URL to validate
 * @returns {boolean} - True if URL is safe for favicon use
 *
 * @example
 * // Valid URLs
 * isSafeFaviconUrl('https://example.com/favicon.ico') // true
 * isSafeFaviconUrl('chrome://favicon/') // true
 * isSafeFaviconUrl('data:image/png;base64,iVBOR...') // true
 *
 * // Invalid URLs
 * isSafeFaviconUrl('javascript:alert(1)') // false
 * isSafeFaviconUrl('data:text/html,<script>') // false
 * isSafeFaviconUrl('ftp://example.com/favicon.ico') // false
 */
export function isSafeFaviconUrl(url) {
	if (!url || typeof url !== 'string') {
		return false;
	}

	try {
		const parsed = new URL(url);
		const allowedProtocols = ["http:", "https:", "chrome:", "data:"];

		// Check protocol whitelist
		if (!allowedProtocols.includes(parsed.protocol)) {
			return false;
		}

		// Strict data: URL validation - only allow image MIME types
		if (parsed.protocol === "data:") {
			return url.startsWith("data:image/");
		}

		return true;
	} catch (error) {
		console.error("FaviconValidator: Invalid favicon URL:", error.message);
		return false;
	}
}

/**
 * Returns the default fallback favicon as a data URL
 *
 * Provides a consistent default icon when favicon validation fails
 * or when no favicon is available. Uses a simple document icon in SVG format.
 *
 * @returns {string} - Base64 encoded SVG favicon data URL
 *
 * @example
 * const fallback = getDefaultFaviconUrl();
 * faviconElement.src = fallback;
 */
export function getDefaultFaviconUrl() {
	// SVG document icon: 16x16px, light gray background with document emoji
	return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjRkZGIi8+Cjx0ZXh0IHg9IjgiIHk9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSI+8J+MkDwvdGV4dD4KPHN2Zz4K';
}

/**
 * Safely sets favicon source with automatic fallback
 *
 * Convenience function that validates a favicon URL and sets either
 * the provided URL (if safe) or the default fallback favicon.
 *
 * @param {HTMLImageElement} imgElement - Image element to set favicon on
 * @param {string} faviconUrl - Favicon URL to validate and use
 *
 * @example
 * const faviconImg = document.createElement('img');
 * setSafeFaviconSrc(faviconImg, tab.favIconUrl);
 */
export function setSafeFaviconSrc(imgElement, faviconUrl) {
	if (!imgElement || typeof imgElement.src === 'undefined') {
		console.error("FaviconValidator: Invalid image element provided");
		return;
	}

	if (isSafeFaviconUrl(faviconUrl)) {
		imgElement.src = faviconUrl;
	} else {
		imgElement.src = getDefaultFaviconUrl();
	}
}