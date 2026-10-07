/** Opens the single waitlist dialog (mounted once in App) from anywhere on the page. */
type Listener = (source: string) => void;
const listeners = new Set<Listener>();

export function openWaitlist(source: string) {
  listeners.forEach((fn) => fn(source));
}

export function onOpenWaitlist(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
