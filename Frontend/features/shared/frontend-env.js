// Static frontend env fallback. This will be used if /env.js isn't available or hasn't been reloaded.
window.APP_CONFIG = window.APP_CONFIG || {};
window.APP_CONFIG.API_BASE_URL = window.APP_CONFIG.API_BASE_URL || 'http://localhost:3001';

// Also expose a small helper for building API URLs
window.apiUrl = function(path) {
  return 'http://localhost:3001' + path;
};
