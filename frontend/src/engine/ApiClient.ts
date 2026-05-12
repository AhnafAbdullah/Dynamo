/**
 * API Client — resolves endpoint bindings from config and calls the mock API.
 */
import axios from 'axios';
import type { AppConfig } from './ConfigLoader';

export function buildApiClient(config: AppConfig) {
  const { base_url, endpoints } = config.api_bindings;

  function resolve(bindingId: string, params?: Record<string, string>) {
    const ep = endpoints.find(e => e.id === bindingId);
    if (!ep) throw new Error(`Unknown API binding: ${bindingId}`);
    let path = ep.path;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        path = path.replace(`:${k}`, encodeURIComponent(v));
      });
    }
    return { url: `${base_url}${path}`, method: ep.method };
  }

  async function call(bindingId: string, opts?: {
    params?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  }) {
    const { url, method } = resolve(bindingId, opts?.params);
    const fullUrl = opts?.query
      ? `${url}?${new URLSearchParams(opts.query).toString()}`
      : url;

    const response = await axios({ url: fullUrl, method, data: opts?.body });
    return response.data;
  }

  return { call, resolve };
}
