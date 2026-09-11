/* eslint-disable */
const store = new Map();

export function getItem(key) {
  const storageKey = String(key ?? "");
  if (!storageKey) {
    return null;
  }

  return store.has(storageKey) ? store.get(storageKey) : null;
}

export function setItem(key, value) {
  const storageKey = String(key ?? "");
  if (!storageKey) {
    return;
  }

  store.set(storageKey, String(value ?? ""));
}

export function removeItem(key) {
  const storageKey = String(key ?? "");
  if (!storageKey) {
    return;
  }

  store.delete(storageKey);
}

export function clear() {
  store.clear();
}

