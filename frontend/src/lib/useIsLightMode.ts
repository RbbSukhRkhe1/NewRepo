import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void) {
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}

function getServerSnapshot() {
  return false;
}

/** Tracks Layout `data-theme` without setState inside useEffect. */
export function useIsLightMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
