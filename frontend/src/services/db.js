/**
 * IndexedDB Service for Odin AI Email Assistant
 * Provides high-volume caching (GBs) for SaaS scalability,
 * overcoming the 5MB limit of sessionStorage/localStorage.
 */

const DB_NAME = 'odin_email_db';
const DB_VERSION = 1;
const STORE_NAME = 'emails';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create indexes for fast retrieval
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('folder', 'folder', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

export const saveEmailsToDB = async (emails, userId, folder) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    emails.forEach(email => {
      // Add user/folder tags for scoping
      store.put({ ...email, user_id: userId, folder: folder });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
};

export const getEmailsFromDB = async (userId, folder) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('user_id');
    const request = index.getAll(IDBKeyRange.only(userId));

    request.onsuccess = (event) => {
      // Filter by folder if necessary (or use a compound index)
      const results = event.target.result.filter(e => e.folder === folder);
      resolve(results);
    };
    request.onerror = (event) => reject(event.target.error);
  });
};

export const clearEmailsForUser = async (userId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('user_id');
    const request = index.openKeyCursor(IDBKeyRange.only(userId));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = (event) => reject(event.target.error);
  });
};
