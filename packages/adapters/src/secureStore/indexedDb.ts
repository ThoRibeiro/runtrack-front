/**
 * The three IndexedDB calls this package needs, promise-shaped.
 *
 * A whole wrapper library would be several kilobytes of bundle for `get`, `put`
 * and `delete` — and §14 counts every one of them.
 */
const DATABASE = 'runtrack';
const STORE = 'secrets';
const VERSION = 1;

function toPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB a échoué sans dire pourquoi'));
    };
  });
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB inaccessible'));
    };
  });
}

/**
 * Returns `unknown`, deliberately. What comes back was written by some earlier
 * build; the caller is the one that knows how to check it, and pretending here
 * would move a real risk out of sight.
 */
export async function read(key: string): Promise<unknown> {
  const database = await open();
  try {
    return await toPromise<unknown>(
      database.transaction(STORE, 'readonly').objectStore(STORE).get(key),
    );
  } finally {
    database.close();
  }
}

export async function write(key: string, value: unknown): Promise<void> {
  const database = await open();
  try {
    await toPromise(database.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key));
  } finally {
    database.close();
  }
}

export async function remove(key: string): Promise<void> {
  const database = await open();
  try {
    await toPromise(database.transaction(STORE, 'readwrite').objectStore(STORE).delete(key));
  } finally {
    database.close();
  }
}
