import { STORAGE_KEY, parseProgress, serializeProgress, type Progress } from './progress';

/** localStorage may be missing, full or blocked (private mode): never fatal. */
export function loadProgress(): Progress {
  try {
    return parseProgress(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return parseProgress(null);
  }
}

export function saveProgress(progress: Progress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeProgress(progress));
  } catch {
    // Progress just isn't remembered on this device.
  }
}
