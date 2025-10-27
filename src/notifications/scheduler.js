const scheduled = new Map();
let idCounter = 0;

export function scheduleReminder(userId, atISO, now = Date.now) {
  const ts = Date.parse(atISO);
  if (Number.isNaN(ts)) {
    throw new Error("bad_date");
  }

  const delay = ts - now();
  if (delay < 0) {
    throw new Error("in_past");
  }

  const key = `${userId}:${ts}`;
  if (scheduled.has(key)) {
    throw new Error("duplicate");
  }

  const id = `n-${++idCounter}`;
  const timeout = setTimeout(() => {
    console.log(
      `NOTIFY userId=${userId} message="Your 15-min pack is ready" at=${new Date(ts).toISOString()}`
    );
    scheduled.delete(key);
  }, delay);

  scheduled.set(key, timeout);
  return { id, at: new Date(ts).toISOString(), userId };
}

export function clearAll() {
  for (const [, timeout] of scheduled) {
    clearTimeout(timeout);
  }
  scheduled.clear();
}
