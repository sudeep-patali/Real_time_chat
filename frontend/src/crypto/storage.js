/**
 * IndexedDB wrapper for storing RSA private keys client-side.
 * Database: "e2e-keys", Object store: "privateKeys"
 *
 * Private keys are NEVER sent to the server.
 */

const DB_NAME    = 'e2e-keys';
const STORE_NAME = 'privateKeys';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

/**
 * Persist a CryptoKey (RSA private key) associated with a userId.
 * @param {string}    userId
 * @param {CryptoKey} cryptoKey
 */
export async function savePrivateKey(userId, cryptoKey) {
  const db  = await openDB();
  const tx  = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.put({ userId, key: cryptoKey });
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

/**
 * Load the stored CryptoKey for a userId.
 * Returns null if no key is found.
 * @param {string} userId
 * @returns {Promise<CryptoKey|null>}
 */
export async function loadPrivateKey(userId) {
  const db    = await openDB();
  const tx    = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.get(userId);
    req.onsuccess = (e) => resolve(e.target.result?.key ?? null);
    req.onerror   = (e) => reject(e.target.error);
  });
}