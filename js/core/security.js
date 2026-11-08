// foh-opening/js/core/security.js
// Ultra-fast XSS prevention, crash-proof JSON parsing, and input sanitization
(function (FOH) {
  'use strict';

  const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  /**
   * Prevents Cross-Site Scripting (XSS) by escaping HTML control characters.
   * Safe for insertion into element.innerHTML or HTML attributes.
   * @param {any} val - The input value to escape.
   * @returns {string} - Escaped safe string.
   */
  function escapeHtml(val) {
    if (val === null || val === undefined) return '';
    return String(val).replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
  }

  /**
   * Crash-proof JSON parser. Never throws syntax errors on corrupted data.
   * Automatically resolves stringified fallback defaults like '[]' or '{}'.
   * @param {string} raw - The raw JSON string.
   * @param {any} fallback - Default value if parsing fails or input is null.
   * @returns {any}
   */
  function safeJsonParse(raw, fallback = null) {
    const resolveFallback = () => {
      if (typeof fallback === 'string') {
        if (fallback === '[]') return [];
        if (fallback === '{}') return {};
      }
      return fallback;
    };

    if (!raw || typeof raw !== 'string') return resolveFallback();
    try {
      const parsed = JSON.parse(raw);
      return parsed !== undefined && parsed !== null ? parsed : resolveFallback();
    } catch {
      /* Safe JSON parse fallback */
      return resolveFallback();
    }
  }

  /**
   * Sanitizes user input text (names, notes, items).
   * Strips control characters and enforces length boundaries.
   * @param {any} val
   * @param {number} maxLen
   * @returns {string}
   */
  function sanitizeText(val, maxLen = 200) {
    if (!val) return '';
    return String(val)
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '')
      .trim()
      .slice(0, maxLen);
  }

  /**
   * Validates URLs to ensure they cannot execute malicious scripts.
   * Blocks javascript:, data:, vbscript: protocols.
   * @param {string} url
   * @returns {string}
   */
  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const clean = url.trim();
    if (/^(https?:|\/|\.\/|mailto:)/i.test(clean)) {
      return clean;
    }
    return '#';
  }


  /**
   * Debounces a function call by delay ms to eliminate storage churn & layout thrashing.
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  function debounce(fn, delay = 150) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn.apply(this, args);
      }, delay);
    };
  }

  FOH.security = {
    escapeHtml,
    safeJsonParse,
    sanitizeText,
    sanitizeUrl,
    debounce,
  };

  // Expose directly on FOH for fast zero-overhead access
  FOH.escapeHtml = escapeHtml;
  FOH.safeJsonParse = safeJsonParse;
  FOH.debounce = debounce;
})(window.FOH = window.FOH || {});
