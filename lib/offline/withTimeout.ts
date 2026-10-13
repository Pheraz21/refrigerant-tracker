// Guard for flaky-signal / lie-fi conditions: navigator.onLine can report true while
// network requests hang indefinitely (e.g. 1-bar plant room cell signal).
// Any data load racing this falls back to the local offline cache instead of freezing.
export function withTimeout<T>(promise: PromiseLike<T>, ms = 3500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("offline-timeout")), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
