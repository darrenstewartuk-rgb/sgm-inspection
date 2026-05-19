'use strict';

const DB = (() => {
  const DB_NAME = 'sgm_inspection_v1';
  const DB_VERSION = 1;
  const STORE = 'inspections';
  let _db = null;

  function init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('conductedOn', 'conductedOn');
        }
      };
      req.onsuccess = e => { _db = e.target.result; resolve(); };
      req.onerror = e => reject(e.target.error);
    });
  }

  function save(inspection) {
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(inspection);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }

  function load(id) {
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  function list() {
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = e => resolve(e.target.result.sort((a, b) => b.id - a.id));
      req.onerror = e => reject(e.target.error);
    });
  }

  function remove(id) {
    return new Promise((resolve, reject) => {
      const tx = _db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }

  return { init, save, load, list, remove };
})();
