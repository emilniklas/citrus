import Fibers from 'fibers';
const Future = require('fibers/future');

export function wait<T>(promise: Promise<T>): T {
  return Future.fromPromise(promise).wait();
}

export function fiber<T>(cb: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    Fibers(() => {
      try {
        resolve(cb());
      } catch (e) {
        reject(e);
      }
    }).run();
  });
}
