/**
 * API helper functions for Skillfield Field App
 */
const api = {
  /**
   * GET request to the API
   * @param {string} path - API path (e.g., '/leads' or '/leads/123')
   * @returns {Promise<object>} Response data
   */
  async get(path) {
    const response = await fetch('/api' + path, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Request failed');
    }

    return result.data;
  },

  /**
   * POST request to the API
   * @param {string} path - API path (e.g., '/leads')
   * @param {object} body - Request body
   * @returns {Promise<object>} Response data
   */
  async post(path, body) {
    const response = await fetch('/api' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Request failed');
    }

    return result.data;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { api };
}
