export function creatTask(threshold: number = 10) {
  let pushHold = Promise.resolve();
  const tasks: Promise<any>[] = [];
  let _r: (() => void) | undefined = undefined;

  async function push(task: () => Promise<any>) {
    await pushHold;
    const p = task();
    tasks.push(p);
    p.then(() => {
      tasks.splice(tasks.indexOf(p), 1);
      if (tasks.length < threshold && _r !== undefined) {
        _r();
        _r = undefined;
      }
    });

    if (tasks.length >= threshold && _r === undefined) {
      pushHold = new Promise((r) => {
        _r = r;
      });
    }
  }

  async function wait() {
    return Promise.all(tasks).then(() => {});
  }

  return {
    push,
    wait,
  };
}

export function once<T>(fn: (...args: any[]) => T) {
  let ret: T | null = null;
  return function (...args: any[]) {
    if (!ret) {
      ret = fn(...args);
    }
    return ret;
  };
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const mm = month < 10 ? "0" + month : month.toString();
  const dd = day < 10 ? "0" + day : day.toString();

  return year + "-" + mm + "-" + dd;
}

export const today = new Date();
export const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
export const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
export const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

export function sleep(ms: number) {
  if (ms <= 0) return;
  return new Promise((r) => setTimeout(r, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  times: number = 5,
  interval: number = 0
) {
  let lastPromise: Promise<T> | null = null;
  for (let i = 0; i < times; i++) {
    try {
      lastPromise = fn();
      await lastPromise;
      break;
    } catch (e) {
      await sleep(interval);
    }
  }
  return await lastPromise!;
}
