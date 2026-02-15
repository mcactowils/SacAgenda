// API client for Next.js app

class ApiClient {
  constructor() {
    this.token = null;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // Helper method for making authenticated requests
  async request(endpoint, options = {}) {
    const url = `/api${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Set auth token
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION METHODS
  // ══════════════════════════════════════════════════════════════════════════

  async register(userData) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  async login(username, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NAME GROUPS METHODS
  // ══════════════════════════════════════════════════════════════════════════

  async getNameGroups() {
    return await this.request('/names');
  }

  async addName(category, name) {
    return await this.request('/names', {
      method: 'POST',
      body: JSON.stringify({ category, name }),
    });
  }

  // Add other methods as needed...
}

// Create and export a single instance
const api = new ApiClient();

export default api;