export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export function roundPoints(foundCount, misses, wallyCount, config) {
  return (
    foundCount * config.pointsPerFind -
    misses * config.wrongGuessPenalty -
    wallyCount * config.wallyPenalty
  );
}
export function safeRead(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function safeWrite(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Game still works without storage. */
  }
}
export function downloadFile(name, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
