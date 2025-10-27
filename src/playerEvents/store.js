const events = [];
const seenBuckets = new Set();

export function saveEvent(event) {
  events.push(event);
}

export function alreadySaw(key) {
  return seenBuckets.has(key);
}

export function markSeen(key) {
  seenBuckets.add(key);
}

export function resetAll() {
  events.length = 0;
  seenBuckets.clear();
}

export function getAll() {
  return [...events];
}
