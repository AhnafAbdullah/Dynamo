(function() {
  const CONTROL_PLANE = 'http://localhost:3001';
  const EVENT_GATEWAY = 'http://localhost:3002';

  // Find the script tag to extract app-id
  const scriptTag = document.currentScript || document.querySelector('script[src*="dynamo.js"]');
  const APP_ID = scriptTag ? scriptTag.getAttribute('data-app-id') : null;

  if (!APP_ID) {
    console.error('Dynamo Optimizer: No data-app-id provided in the script tag.');
    return;
  }

  console.log(`🚀 Dynamo Optimizer initializing for App: ${APP_ID}...`);

  // 1. Session Management
  function getSessionId() {
    let sid = localStorage.getItem('dynamo_session_id');
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('dynamo_session_id', sid);
    }
    return sid;
  }

  const SESSION_ID = getSessionId();

  // 2. Fetch Config & Apply DOM Injections
  async function loadConfig() {
    try {
      const response = await fetch(`${CONTROL_PLANE}/api/apps/${APP_ID}`);
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();

      applyInjections(data.injections || []);
      applyExperiments(data.experiments || []);

    } catch (err) {
      console.error('Dynamo Optimizer: Failed to initialize.', err);
    }
  }

  function applyDOMInjection(patchObj) {
    if (patchObj.css) {
      const style = document.createElement('style');
      style.innerHTML = patchObj.css;
      document.head.appendChild(style);
      console.log('Dynamo Optimizer: Applied CSS injection.');
    }
    if (patchObj.js) {
      const script = document.createElement('script');
      script.innerHTML = patchObj.js;
      document.body.appendChild(script);
      console.log('Dynamo Optimizer: Applied JS injection.');
    }
  }

  function applyInjections(injections) {
    if (injections.length === 0) return;
    console.log('✨ Dynamo Optimizer: Applying full-rollout DOM Injections', injections.map(e => e.title));
    injections.forEach(inj => {
      try {
        const patchObj = typeof inj.patch === 'string' ? JSON.parse(inj.patch) : inj.patch;
        applyDOMInjection(patchObj);
      } catch (err) {
        console.error('Failed to apply DOM injection:', inj.title, err);
      }
    });
  }

  function applyExperiments(experiments) {
    if (experiments.length === 0) return;
    
    // Hash session to 0 or 1
    const hash = SESSION_ID.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const inExperimentGroup = Math.abs(hash) % 2 === 1;

    if (inExperimentGroup) {
      console.log('🧪 Dynamo Optimizer: Applying active experiments:', experiments.map(e => e.title));
      experiments.forEach(exp => {
        try {
          const patchObj = typeof exp.patch === 'string' ? JSON.parse(exp.patch) : exp.patch;
          applyDOMInjection(patchObj);
        } catch (err) {
          console.error('Failed to apply experiment:', exp.title, err);
        }
      });
    } else {
      console.log('⚖️ Dynamo Optimizer: User is in the Control group. Standard UI rendered.');
    }
  }

  // 3. Telemetry Tracking
  function trackEvent(type, details) {
    fetch(`${EVENT_GATEWAY}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: APP_ID,
        session_id: SESSION_ID,
        event_type: type,
        url_path: window.location.pathname,
        timestamp: new Date().toISOString(),
        details: details
      })
    }).catch(() => {}); // silently fail for telemetry
  }

  // Track initial page view
  trackEvent('page_view', {});

  // Overriding pushState/replaceState to catch SPA navigation
  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    trackEvent('page_view', {});
  };
  const originalReplaceState = history.replaceState;
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    trackEvent('page_view', {});
  };
  window.addEventListener('popstate', () => trackEvent('page_view', {}));

  // Track clicks globally
  document.addEventListener('click', (e) => {
    // Only track clicks on buttons, links, or things with text
    const target = e.target.closest('button, a, [role="button"]') || e.target;
    let label = target.innerText || target.value || target.getAttribute('aria-label') || target.tagName;
    if (label && typeof label === 'string') label = label.substring(0, 30).trim();
    
    trackEvent('click', {
      element_tag: target.tagName,
      element_id: target.id,
      element_class: target.className,
      label: label
    });
  });

  // Track form submissions
  document.addEventListener('submit', (e) => {
    const target = e.target;
    trackEvent('form_submit', {
      form_id: target.id,
      form_class: target.className,
      action: target.action
    });
  });

  // Start the initialization
  loadConfig();

})();
