// Simple localStorage wrapper matching the window.storage API shape
const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) throw new Error('Key not found');
      return { key, value };
    } catch (e) {
      throw e;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch (e) {
      return null;
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(key);
      return { key, deleted: true };
    } catch (e) {
      return null;
    }
  },
  async list(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!prefix || k.startsWith(prefix)) keys.push(k);
    }
    return { keys, prefix };
  }
};

export default storage;
