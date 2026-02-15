// API client for backend communication

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? `${window.location.protocol}//${window.location.host}/api`
  : 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  // Helper method for making authenticated requests
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
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
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
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
  // USER MANAGEMENT METHODS (Admin only)
  // ══════════════════════════════════════════════════════════════════════════

  async getUsers() {
    return await this.request('/users');
  }

  async approveUser(userId) {
    return await this.request(`/users/${userId}/approve`, { method: 'PUT' });
  }

  async updateUserRole(userId, role) {
    return await this.request(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async removeUser(userId) {
    return await this.request(`/users/${userId}`, { method: 'DELETE' });
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

  async removeName(category, name) {
    return await this.request(`/names/${category}/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOM HYMNS METHODS
  // ══════════════════════════════════════════════════════════════════════════

  async getCustomHymns() {
    return await this.request('/hymns');
  }

  async addCustomHymn(number, title) {
    return await this.request('/hymns', {
      method: 'POST',
      body: JSON.stringify({ number, title }),
    });
  }

  async removeCustomHymn(number) {
    return await this.request(`/hymns/${number}`, { method: 'DELETE' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SMART TEXT METHODS
  // ══════════════════════════════════════════════════════════════════════════

  async getSmartText() {
    return await this.request('/smart-text');
  }

  async updateSmartText(smartText) {
    return await this.request('/smart-text', {
      method: 'PUT',
      body: JSON.stringify(smartText),
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AGENDA METHODS
  // ══════════════════════════════════════════════════════════════════════════

  async getSavedAgendas() {
    return await this.request('/agendas');
  }

  async getAgenda(date) {
    return await this.request(`/agendas/${date}`);
  }

  async saveAgenda(date, data) {
    return await this.request('/agendas', {
      method: 'POST',
      body: JSON.stringify({ date, data }),
    });
  }
}

// Create and export a single instance
const api = new ApiClient();

// WebSocket for real-time updates
let ws = null;
let wsListeners = [];

export function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return ws;
  }

  try {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = process.env.NODE_ENV === 'production'
      ? `${wsProtocol}//${window.location.host}`
      : 'ws://localhost:3001';

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🔌 WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        wsListeners.forEach(listener => listener(message));
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return null;
  }
}

export function addWebSocketListener(listener) {
  wsListeners.push(listener);

  // Return cleanup function
  return () => {
    const index = wsListeners.indexOf(listener);
    if (index > -1) {
      wsListeners.splice(index, 1);
    }
  };
}

export default api;