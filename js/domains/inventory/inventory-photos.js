// foh-opening/js/domains/inventory/inventory-photos.js
// Compressed photo storage in IndexedDB (< 350 lines)

(function (FOH) {
  'use strict';

  const DB = 'foh-opening-photos';
  const STORE = 'photos';
  const MAX_SIDE = 900;
  let dbPromise = null;

  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  function tx(mode, fn) {
    return db().then(
      (d) =>
        new Promise((resolve, reject) => {
          const t = d.transaction(STORE, mode);
          const req = fn(t.objectStore(STORE));
          t.oncomplete = () => resolve(req && req.result);
          t.onerror = () => reject(t.error);
        })
    );
  }

  // Shrink a picked image to at most MAX_SIDE px and JPEG-compress it.
  function compress(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Not an image'));
      };
      img.src = url;
    });
  }

  // File -> photo id (or null if it could not be read).
  async function add(file) {
    if (!file || !/^image\//.test(file.type)) return null;
    try {
      const data = await compress(file);
      const id = 'p' + (FOH.store && FOH.store.uid ? FOH.store.uid() : Math.random().toString(36).slice(2, 9));
      await tx('readwrite', (s) => s.put(data, id));
      return id;
    } catch (err) {
      /* Photo compression or storage failure fallback */
      return null;
    }
  }

  const get = (id) => (id ? tx('readonly', (s) => s.get(id)).catch(() => null) : Promise.resolve(null));
  const remove = (id) => (id ? tx('readwrite', (s) => s.delete(id)).catch(() => null) : Promise.resolve());

  // Fill an <img> (or hide it) once the photo is loaded.
  function show(img, id) {
    img.hidden = true;
    get(id).then((data) => {
      if (!data) return;
      img.src = data;
      img.hidden = false;
    });
  }

  FOH.photos = { add, get, remove, show };
})(window.FOH = window.FOH || {});

