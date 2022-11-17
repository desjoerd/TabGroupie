export function debounce(
  func: () => void,
  defaultDelayMs: number = 2000
): (delayOverrideMs?: number) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined = undefined;

  return function (delayMs = defaultDelayMs) {
    clearTimeout(timeout);

    if (delayMs === 0) {
      func();
    } else {
      timeout = setTimeout(func, delayMs);
    }
  };
}

export function throttle<TFunc extends (...args: any[]) => void>(
  func: TFunc,
  throttleMs: number
): TFunc {
  let throttleTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  let lastRunDateMs: number = 0;

  return ((...args) => {
    if (throttleTimeout !== undefined) {
      clearTimeout(throttleTimeout);
    }

    const nowMs = Date.now();

    if (lastRunDateMs + throttleMs > nowMs) {
      console.log("throttling");

      throttleTimeout = setTimeout(() => func(...args), throttleMs);
      return Promise.resolve();
    } else {
      lastRunDateMs = nowMs;

      return func(...args);
    }
  }) as TFunc;
}

export function singleExecutionAsync<
  TFunc extends (...args: any[]) => PromiseLike<any>
>(func: TFunc, logger?: (skipping: boolean) => void): TFunc {
  let currentRunPromise: PromiseLike<any> | undefined;

  return ((...args) => {
    if (!currentRunPromise) {
      currentRunPromise = func(...args);

      currentRunPromise.then(
        () => (currentRunPromise = undefined),
        () => (currentRunPromise = undefined)
      );

      logger?.(false);
    } else {
      logger?.(true);
    }

    return currentRunPromise;
  }) as TFunc;
}

export async function retryAsync<
  TFunc extends (...args: any[]) => PromiseLike<any>
>(
  func: TFunc,
  times: number,
  logger?: (tryNumber: number, error: any) => void
): Promise<Awaited<ReturnType<TFunc>>> {
  if (times < 0) {
    throw new Error("retry times should be 0 or greater");
  }

  let tryNumber = 1;
  while (tryNumber <= times) {
    try {
      return await func();
    } catch (error) {
      logger?.(tryNumber, error);
      tryNumber++;
    }
  }
  return await func();
}
