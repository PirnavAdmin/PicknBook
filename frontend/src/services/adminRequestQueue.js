// One transport at a time, with independent cancellation for each GET consumer.
// No polling, persistent storage, retries, or changes to API contracts.
export function createAdminRequestQueue() {
  const pending = new Map();
  const cache = new Map();
  const jobs = [];
  let running = false;
  let scheduled = false;
  let generation = 0;
  const aborted = () => new DOMException('Request cancelled', 'AbortError');

  async function drain() {
    if (running) return;
    running = true;
    while (jobs.length) {
      jobs.sort((a, b) => a.priority - b.priority);
      const job = jobs.shift();
      if (!job.consumers.size) {
        if (pending.get(job.key) === job) pending.delete(job.key);
        continue;
      }
      try {
        const value = await job.run(job.controller.signal);
        if (job.ttl && job.cacheable(value) && job.generation === generation && job.consumers.size) {
          cache.set(job.key, { value, expires: Date.now() + job.ttl });
          if (cache.size > 40) cache.delete(cache.keys().next().value);
        }
        for (const consumer of job.consumers) consumer.resolve(job.copy(value));
      } catch (error) {
        for (const consumer of job.consumers) consumer.reject(error);
      } finally {
        for (const consumer of job.consumers) consumer.cleanup();
        if (pending.get(job.key) === job) pending.delete(job.key);
      }
    }
    running = false;
  }

  function invalidate() {
    generation += 1;
    cache.clear();
    // Reads started before a mutation must not satisfy reads made after it.
    pending.clear();
  }

  function request({ key, run, signal, copy = value => value, cacheable = () => true, ttl = 0, read = true, priority = 0 }) {
    if (signal?.aborted) return Promise.reject(aborted());
    if (!read) invalidate();
    const stored = read && cache.get(key);
    if (stored && stored.expires > Date.now()) return Promise.resolve(copy(stored.value));
    if (stored) cache.delete(key);
    let job = read && pending.get(key);
    if (!job || job.controller.signal.aborted) {
      job = { key, run, copy, cacheable, ttl, generation, priority, controller: new AbortController(), consumers: new Set() };
      if (read) pending.set(key, job);
      jobs.push(job);
    }
    return new Promise((resolve, reject) => {
      const consumer = { resolve, reject, cleanup: () => signal?.removeEventListener('abort', cancel) };
      const cancel = () => {
        job.consumers.delete(consumer);
        consumer.cleanup();
        reject(aborted());
        if (!job.consumers.size) job.controller.abort();
      };
      job.consumers.add(consumer);
      signal?.addEventListener('abort', cancel, { once: true });
      // Admit requests from the same React commit (including Axios interceptors)
      // before selecting primary page data ahead of shell/background reads.
      if (!running && !scheduled) {
        scheduled = true;
        setTimeout(() => { scheduled = false; void drain(); }, 0);
      }
    });
  }
  return { request, invalidate };
}

export const adminRequestQueue = createAdminRequestQueue();

export function isAdminApiRequest(url) {
  return typeof window !== 'undefined' && /^\/admin(?:\/|$)/i.test(window.location.pathname)
    && /\/api\//i.test(String(url));
}

export function adminReferenceTTL(url) {
  // A brief count cache also covers a fast count response arriving before the
  // shell finishes parsing its summary. Read mutations invalidate it too.
  const path = new URL(String(url), window.location.origin).pathname;
  if (/\/admin\/notifications\/unread-count$/i.test(path)) return 2500;
  // Transactions, bookings, balances and searches remain live.
  return /\/(?:categories|subcategories|sub-categories|BlogCategories|BlogSubCategories|airline-brands)$/i.test(path) ? 60000 : 0;
}

export function adminRequestPriority(url) {
  const path = new URL(String(url), window.location.origin).pathname;
  const screen = window.location.pathname.toLowerCase();
  if (/\/notifications\/unread-count$/i.test(path)) return 10;
  if (/\/(?:Dashboard\/overview|BDashboard\/summary)$/i.test(path)
    && !['/admin', '/admin/', '/admin/dashboard'].includes(screen)) return 10;
  return 0;
}
