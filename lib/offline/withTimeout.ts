// Guard for flaky-signal conditions: navigator.onLine can report true while
// requests actually hang (one-bar plantroom signal). Any data load racing this
// falls back to the offline cache instead of leaving the engineer on a spinner.
export function withTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("offline-timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
