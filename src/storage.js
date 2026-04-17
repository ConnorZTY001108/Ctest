const DEFAULT_KEYS = {
  progress: 'question-app.progress',
  mistakes: 'question-app.mistakes',
  examHistory: 'question-app.exam-history',
  preferences: 'question-app.preferences',
  currentPractice: 'question-app.current-practice',
  currentExam: 'question-app.current-exam',
};

const memoryStorage = (() => {
  const bucket = new Map();
  return {
    getItem(key) {
      return bucket.get(key) ?? null;
    },
    setItem(key, value) {
      bucket.set(key, value);
    },
    removeItem(key) {
      bucket.delete(key);
    },
  };
})();

function getDefaultStorage() {
  try {
    return globalThis.window?.localStorage ?? memoryStorage;
  } catch {
    return memoryStorage;
  }
}

function createSafeBackend(storage) {
  return {
    getItem(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        storage.setItem(key, value);
      } catch {
        // Fail open.
      }
    },
    removeItem(key) {
      try {
        storage.removeItem(key);
      } catch {
        // Fail open.
      }
    },
  };
}

export function createStorageApi(storage = getDefaultStorage()) {
  const safeStorage = createSafeBackend(storage);

  return {
    get(key, fallback) {
      const raw = safeStorage.getItem(key);
      if (!raw) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      safeStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
      safeStorage.removeItem(key);
    },
  };
}

export { DEFAULT_KEYS };
