/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export default function promiseTimeout<T>(
  ms: number,
  promise: Promise<T>,
  timeoutMessage?: string,
): Promise<T> {
  // Create a promise that rejects in <ms> milliseconds
  const timeout: Promise<T> = new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(timeoutMessage || `Timed out in ${ms} ms.`));
    }, ms);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]);
}
