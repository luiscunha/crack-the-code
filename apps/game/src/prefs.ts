/** Per-device preferences in localStorage. Storage may be missing or throw: never fatal. */

const PREFIX = 'ctc.';

export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Private mode / blocked storage: the preference just isn't remembered.
  }
}
