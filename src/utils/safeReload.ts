export function safeReload(): void {
  if (process.env.REACT_APP_DISABLE_AUTO_RELOAD === 'true') {
    console.warn('[SafeReload] Auto reload disabled by REACT_APP_DISABLE_AUTO_RELOAD');
    return;
  }
  try {
    window.location.reload();
  } catch (e) {
    console.error('[SafeReload] Reload failed:', e);
  }
}



