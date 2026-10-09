import axios from 'axios';
import { adminRequestQueue, adminReferenceTTL, adminRequestPriority, isAdminApiRequest } from './adminRequestQueue';

// Installed before service instances are created. Public requests retain the
// original adapter, headers, URL serialization and authorization handling.
const adapter = axios.getAdapter(axios.defaults.adapter);
let route = typeof window === 'undefined' ? '' : window.location.pathname;
let routeController = new AbortController();

export function setAdminRequestRoute(pathname) {
  if (route === pathname) return;
  routeController.abort();
  routeController = new AbortController();
  route = pathname;
}

function readSignal(url, signal) {
  // Shell data persists between Admin pages; page reads belong to the route.
  if (adminRequestPriority(url) === 10) return signal;
  return signal ? AbortSignal.any([signal, routeController.signal]) : routeController.signal;
}

axios.defaults.adapter = config => {
  const url = axios.getUri(config);
  if (!isAdminApiRequest(url)) return adapter(config);
  const read = (config.method || 'get').toLowerCase() === 'get';
  const headers = JSON.stringify(config.headers?.toJSON?.() || config.headers || {});
  return adminRequestQueue.request({
    key: `axios:${url}:${headers}`,
    read,
    priority: read ? adminRequestPriority(url) : -1,
    signal: read ? readSignal(url, config.signal) : config.signal,
    ttl: read ? adminReferenceTTL(url) : 0,
    cacheable: response => response.status >= 200 && response.status < 300,
    run: signal => adapter({ ...config, signal }),
    copy: response => ({ ...response, config, data: structuredClone(response.data) }),
  }).catch(error => {
    if (error.name === 'AbortError') throw new axios.CanceledError('Request cancelled', config);
    throw error;
  });
};

export function adminFetch(fetchTransport, input, options) {
  const url = typeof input === 'string' ? input : input.url;
  if (!isAdminApiRequest(url)) return fetchTransport(input, options);
  const read = (options.method || input?.method || 'GET').toUpperCase() === 'GET';
  const headers = JSON.stringify([...new Headers(options.headers || input?.headers).entries()].sort());
  return adminRequestQueue.request({
    key: `fetch:${url}:${headers}:${options.credentials || input?.credentials || ''}`,
    read,
    priority: read ? adminRequestPriority(url) : -1,
    signal: read ? readSignal(url, options.signal || input?.signal) : options.signal || input?.signal,
    ttl: read ? adminReferenceTTL(url) : 0,
    cacheable: response => response.ok,
    run: async signal => {
      const response = await fetchTransport(input, { ...options, signal });
      // Wait for the body too, so another API doesn't overlap a streaming body.
      await response.clone().arrayBuffer();
      return response;
    },
    copy: response => response.clone(),
  });
}
