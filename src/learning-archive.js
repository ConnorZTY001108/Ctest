const ARCHIVE_VERSION = 1;
const DEFAULT_FILE_NAME = 'question-archive.json';
const DATABASE_NAME = 'question-app-archive';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'learning-archive-file';

function cloneJson(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function createStatus(overrides = {}) {
  return {
    supported: false,
    bound: false,
    fileName: '',
    syncState: 'unsupported',
    lastSyncedAt: null,
    message: '当前浏览器不支持本地文件自动同步。',
    ...overrides,
  };
}

function copyStatus(status) {
  return { ...status };
}

function createRequestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function createTransactionPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

export function createArchiveHandlePersistence({ indexedDBFactory = globalThis.indexedDB } = {}) {
  if (!indexedDBFactory?.open) {
    return {
      async load() {
        return null;
      },
      async save() {},
      async clear() {},
    };
  }

  let dbPromise = null;

  function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDBFactory.open(DATABASE_NAME, 1);

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open archive database.'));
    });

    return dbPromise;
  }

  return {
    async load() {
      try {
        const database = await openDatabase();
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(HANDLE_KEY);
        return await createRequestPromise(request);
      } catch {
        return null;
      }
    },
    async save(handle) {
      try {
        const database = await openDatabase();
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
        await createTransactionPromise(transaction);
      } catch {
        // Fail open.
      }
    },
    async clear() {
      try {
        const database = await openDatabase();
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(HANDLE_KEY);
        await createTransactionPromise(transaction);
      } catch {
        // Fail open.
      }
    },
  };
}

function getSupportedStatus() {
  return createStatus({
    supported: true,
    syncState: 'idle',
    message: '未创建学习存档 JSON。',
  });
}

function shouldResetHandle(error) {
  return ['NotAllowedError', 'NotFoundError', 'InvalidStateError', 'SecurityError'].includes(error?.name);
}

export function createArchivePayload(state, banks) {
  return {
    version: ARCHIVE_VERSION,
    updatedAt: new Date().toISOString(),
    activeBankId: state.bankId,
    preferences: cloneJson(state.preferences),
    banks: Object.fromEntries(
      banks.map((bank) => [
        bank.id,
        {
          progress: cloneJson(state.progressByBank?.[bank.id] ?? {}),
          mistakes: cloneJson(state.mistakesByBank?.[bank.id] ?? []),
          examHistory: cloneJson(state.examHistoryByBank?.[bank.id] ?? []),
          currentPractice: cloneJson(state.currentPracticeByBank?.[bank.id] ?? null),
          currentExam: cloneJson(state.currentExamByBank?.[bank.id] ?? null),
        },
      ]),
    ),
  };
}

export function createLearningArchiveService({
  windowObject = globalThis.window,
  handlePersistence = createArchiveHandlePersistence(),
} = {}) {
  const supported = typeof windowObject?.showSaveFilePicker === 'function';
  let fileHandle = null;
  let status = supported ? getSupportedStatus() : createStatus();

  return {
    isSupported() {
      return supported;
    },
    getStatus() {
      return copyStatus(status);
    },
    async initialize() {
      if (!supported) {
        status = createStatus();
        return copyStatus(status);
      }

      const storedHandle = await handlePersistence.load();
      if (!storedHandle) {
        status = getSupportedStatus();
        return copyStatus(status);
      }

      fileHandle = storedHandle;
      status = createStatus({
        supported: true,
        bound: true,
        fileName: storedHandle.name ?? DEFAULT_FILE_NAME,
        syncState: 'idle',
        message: '已绑定学习存档。',
      });
      return copyStatus(status);
    },
    async bindFile() {
      if (!supported) {
        status = createStatus();
        return copyStatus(status);
      }

      try {
        fileHandle = await windowObject.showSaveFilePicker({
          suggestedName: DEFAULT_FILE_NAME,
          types: [
            {
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
      } catch (error) {
        if (error?.name === 'AbortError') {
          return copyStatus(status);
        }

        status = createStatus({
          supported: true,
          syncState: 'error',
          message: '创建学习存档失败，请重试。',
        });
        return copyStatus(status);
      }

      await handlePersistence.save(fileHandle);
      status = createStatus({
        supported: true,
        bound: true,
        fileName: fileHandle.name ?? DEFAULT_FILE_NAME,
        syncState: 'idle',
        message: '已绑定学习存档。',
      });
      return copyStatus(status);
    },
    async sync(payload) {
      if (!supported || !fileHandle) {
        return copyStatus(status);
      }

      try {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(payload, null, 2));
        await writable.close();
        status = createStatus({
          supported: true,
          bound: true,
          fileName: fileHandle.name ?? DEFAULT_FILE_NAME,
          syncState: 'success',
          lastSyncedAt: payload.updatedAt ?? new Date().toISOString(),
          message: '最近同步成功。',
        });
      } catch (error) {
        const shouldClear = shouldResetHandle(error);
        if (shouldClear) {
          fileHandle = null;
          await handlePersistence.clear();
        }

        status = createStatus({
          supported: true,
          bound: !shouldClear,
          fileName: shouldClear ? '' : (fileHandle?.name ?? status.fileName),
          syncState: 'error',
          lastSyncedAt: status.lastSyncedAt,
          message: '同步失败，请重新绑定学习存档。',
        });
      }

      return copyStatus(status);
    },
  };
}

export { DEFAULT_FILE_NAME };
