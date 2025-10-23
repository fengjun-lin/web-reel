import { IDBPDatabase, openDB } from 'idb';

export interface ObjectStore {
  name: string;
  indexKeys?: string[];
  keyPath?: string | string[];
  autoIncrement?: boolean;
}

const DEFAULT_DB_OBJECT = {
  name: 'table', // Default table name
};

/**
 * IndexedDB wrapper class using idb library
 */
export class IDB {
  name: string;
  version: number;
  objectStores: ObjectStore[];
  db!: IDBPDatabase<any>;

  constructor(name: string, version: number, objectStores?: ObjectStore[]) {
    this.name = name;
    this.version = version;
    this.objectStores = objectStores || [];
  }

  /**
   * Open and create IndexedDB
   */
  async open() {
    this.db = await openDB(this.name, this.version, {
      upgrade: (db) => {
        this.objectStores.forEach((item) => {
          if (!db.objectStoreNames.contains(item.name)) {
            const config = {
              autoIncrement: item.autoIncrement ?? true,
              keyPath: item.keyPath,
            };
            const objectStore = db.createObjectStore(item.name, config);

            if (item.indexKeys) {
              item.indexKeys.forEach((k) => objectStore.createIndex(k, k, { unique: false }));
            }
          }
        });
      },
      terminated: async () => {
        await this.reconnect();
      },
    });
  }

  /**
   * Reconnect to database
   */
  async reconnect() {
    this.db?.close();
    await this.open();
  }

  /**
   * Get count of items in store
   */
  async count(tableName = DEFAULT_DB_OBJECT.name): Promise<number> {
    return await this.db?.count(tableName);
  }

  /**
   * Add data to store
   */
  async add(data: { [key: string]: any }, tableName = DEFAULT_DB_OBJECT.name) {
    return await this.db?.add(tableName, data);
  }

  /**
   * Get data by key
   */
  async get(key: number | string, tableName = DEFAULT_DB_OBJECT.name) {
    return await this.db?.get(tableName, key);
  }

  /**
   * Get all data by index (starting from a value)
   */
  async getDataByIndex(tableName = DEFAULT_DB_OBJECT.name, indexKey: string, start?: number) {
    const tx = this.db.transaction(tableName, 'readonly');
    const index = tx.store.index(indexKey);
    const range = IDBKeyRange.lowerBound(start);
    return await index.getAll(range);
  }

  /**
   * Get all data where index equals a specific value
   */
  async getDataByIndexValue(tableName = DEFAULT_DB_OBJECT.name, indexKey: string, indexKeyValue: any) {
    const tx = this.db.transaction(tableName, 'readonly');
    const index = tx.store.index(indexKey);
    const range = IDBKeyRange.only(indexKeyValue);
    return index.getAll(range);
  }

  /**
   * Group all data by index key
   * Returns a map of { [indexValue]: [data...] }
   */
  async getByIndexKey(tableName = DEFAULT_DB_OBJECT.name, indexKey: string): Promise<Record<string, any>> {
    const tx = this.db.transaction(tableName, 'readonly');
    const result: Record<string, any> = {};
    let cursor = await tx.store.openCursor();

    while (cursor) {
      const cursorValue = cursor.value;
      const indexValue = cursorValue[indexKey];
      const list = result[indexValue] || [];

      list.push(cursorValue);
      result[indexValue] = list;
      cursor = await cursor.continue();
    }

    return result;
  }

  /**
   * Get all unique index key values
   */
  async getAllIndexKeys(tableName: string, indexKey: string): Promise<any[]> {
    const keyMap: Map<any, boolean> = new Map();
    const tx = this.db.transaction(tableName, 'readonly');

    let cursor = await tx.store.index(indexKey).openKeyCursor();

    while (cursor) {
      if (!keyMap.has(cursor.key)) {
        keyMap.set(cursor.key, true);
      }
      cursor = await cursor.continue();
    }

    return Array.from(keyMap.keys());
  }

  /**
   * Update data
   */
  async set(key: number | string, value: { [key: string]: any }, tableName = DEFAULT_DB_OBJECT.name) {
    return await this.db.put(tableName, value, key);
  }

  /**
   * Delete data by key
   */
  async delete(key: number | string, tableName = DEFAULT_DB_OBJECT.name) {
    return await this.db?.delete(tableName, key);
  }

  /**
   * Delete all data in index where value is less than or equal to start
   * Returns the number of deleted records
   */
  async deleteDataByIndex(tableName = DEFAULT_DB_OBJECT.name, indexKey: string, start?: number): Promise<number> {
    const store = this.db.transaction(tableName, 'readwrite').store;
    const index = store.index(indexKey);
    const range = IDBKeyRange.upperBound(start);
    let cursor = await index.openCursor(range);
    let count = 0;

    while (cursor) {
      store.delete(cursor.primaryKey);
      count++;
      cursor = await cursor.continue();
    }

    return count;
  }

  /**
   * Delete all data where index equals a specific value
   * Returns the number of deleted records
   */
  async deleteDataByIndexValue(
    tableName = DEFAULT_DB_OBJECT.name,
    indexKey: string,
    indexKeyValue: any,
  ): Promise<number> {
    const store = this.db.transaction(tableName, 'readwrite').store;
    const index = store.index(indexKey);
    const range = IDBKeyRange.only(indexKeyValue);

    let cursor = await index.openCursor(range);
    let count = 0;

    while (cursor) {
      store.delete(cursor.primaryKey);
      count++;
      cursor = await cursor.continue();
    }

    return count;
  }

  /**
   * Delete object store (table)
   */
  async deleteTable(tableName = DEFAULT_DB_OBJECT.name) {
    await this.db?.deleteObjectStore(tableName);
  }

  /**
   * Clear all data from a table
   */
  async clearTable(tableName = DEFAULT_DB_OBJECT.name): Promise<void> {
    const tx = this.db.transaction(tableName, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }

  /**
   * Close database connection
   */
  closeDB = () => {
    this.db?.close();
  };
}
