/**
 * Global favicon validation utilities for non-module environments
 * Makes favicon validation functions available on window object
 */

/**
 * Validates if a favicon URL is safe for use in the extension
 * @param {string} url - Favicon URL to validate
 * @returns {boolean} - True if URL is safe for favicon use
 */
window.isSafeFaviconUrlGlobal = function(url) {
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
};

/**
 * Returns the default fallback favicon as a data URL
 * @returns {string} - Base64 encoded SVG favicon data URL
 */
window.getDefaultFaviconUrlGlobal = function() {
	// SVG document icon: 16x16px, light gray background with document emoji
	return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjRkZGIi8+Cjx0ZXh0IHg9IjgiIHk9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSI+8J+MkDwvdGV4dD4KPHN2Zz4K';
};