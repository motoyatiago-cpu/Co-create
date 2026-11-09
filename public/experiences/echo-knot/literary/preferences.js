// The legacy decode settings still work, but API keys no longer survive refresh.
// Imported explicitly by the compiled HTML; no Vue internals or storage monkeypatch.
export function readPreferences(key, defaults) {
  const base = structuredClone(defaults);
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const clean = { ...base, ...stored, external: { ...base.external, ...stored.external, key: '' } };
    localStorage.setItem(key, JSON.stringify(clean)); // Remove any previously persisted key.
    return clean;
  } catch { return base; }
}
export function writePreferences(key, preferences) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...preferences, external: { ...preferences.external, key: '' } }));
  } catch { /* Existing local mode remains available with storage disabled. */ }
}
