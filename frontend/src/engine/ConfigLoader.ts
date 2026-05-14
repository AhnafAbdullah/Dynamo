/**
 * Config Loader — fetches and caches the app configuration from the Control Plane.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';

const CONTROL_PLANE = import.meta.env.VITE_CONTROL_PLANE_URL || 'http://localhost:3001';
const APP_ID = import.meta.env.VITE_APP_ID || 'app-demo-001';

export interface AppConfig {
  app_id: string;
  name: string;
  version: number;
  api_bindings: {
    base_url: string;
    endpoints: Array<{ id: string; path: string; method: string }>;
  };
  ui: {
    sidebar: Array<{ label: string; icon: string; view_id: string }>;
    views: ViewConfig[];
  };
  workflows: {
    routing: Array<{ from: string; to: string; trigger: string }>;
  };
}

export interface ViewConfig {
  id: string;
  type: 'dashboard' | 'list' | 'detail' | 'form';
  title: string;
  api_binding?: string;
  on_success?: { navigate_to: string };
  components: ComponentConfig[];
}

export interface ComponentConfig {
  type: string;
  id: string;
  [key: string]: unknown;
}

// Simple in-memory cache
let cache: { config: AppConfig; at: number } | null = null;
const TTL = 5000; // 5 seconds

import { applyPatch } from 'fast-json-patch';

export function getSessionId() {
  let sid = localStorage.getItem('dynamo_session_id');
  if (!sid) {
    sid = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('dynamo_session_id', sid);
  }
  return sid;
}

export async function fetchConfig(): Promise<AppConfig> {
  if (cache && Date.now() - cache.at < TTL) return cache.config;
  const { data } = await axios.get(`${CONTROL_PLANE}/api/apps/${APP_ID}`);
  let config = data.config;

  // Apply Active Experiments (A/B testing via deterministic bucketing)
  if (data.experiments && data.experiments.length > 0) {
    const sid = getSessionId();
    // Simple string hash
    const hash = sid.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    const inExperimentGroup = Math.abs(hash) % 2 === 0; // 50% rollout

    if (inExperimentGroup) {
      console.log('🧪 Applying active experiments:', data.experiments.map((e: any) => e.title));
      data.experiments.forEach((exp: any) => {
        try {
          if (Array.isArray(exp.patch)) {
            config = applyPatch(config, exp.patch).newDocument;
          } else if (exp.patch.css || exp.patch.js) {
            console.log(`✨ Injecting Dazzling UI Aesthetic: ${exp.title}`);
            if (exp.patch.css) {
              const style = document.createElement('style');
              style.innerHTML = exp.patch.css;
              document.head.appendChild(style);
            }
            if (exp.patch.js) {
              const script = document.createElement('script');
              script.innerHTML = exp.patch.js;
              document.body.appendChild(script);
            }
          }
        } catch (e) {
          console.error(`Failed to apply experiment patch ${exp.mutation_id}:`, e);
        }
      });
    } else {
      console.log('🧪 User is in control group. Not applying experiments.');
    }
  }

  cache = { config, at: Date.now() };
  return config;
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    cache = null;
    setLoading(true);
    fetchConfig()
      .then(setConfig)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  return { config, loading, error, refresh };
}

export { CONTROL_PLANE, APP_ID };
