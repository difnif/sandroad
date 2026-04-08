import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getDashboardSettings, saveDashboardSettings } from '../firebase/uiStateService.js';

export const DEFAULT_DASH = {
  position: 'top', // 'top' | 'bottom' | 'floating'
  style: 'digital', // 'digital' | 'analog'
  analogMode: 'precise', // 'precise' | 'rounded'
  widgets: {
    d1count: { enabled: true, color: 'stone' },
    avg12:   { enabled: true, color: 'stone' },
    avg23:   { enabled: true, color: 'stone' },
    missing: { enabled: true, color: 'red' },
    pending: { enabled: true, color: 'amber' },
    review:  { enabled: true, color: 'rose' },
    balance: { enabled: true, color: 'stone' }
  },
  floatX: 20,
  floatY: 80
};

export function useDashboardSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_DASH);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const remote = await getDashboardSettings(user.uid);
        if (remote) {
          setSettings({ ...DEFAULT_DASH, ...remote, widgets: { ...DEFAULT_DASH.widgets, ...(remote.widgets || {}) } });
        }
      } catch (e) {
        console.error('load dash failed', e);
      }
      setLoaded(true);
    })();
  }, [user]);

  useEffect(() => {
    if (!loaded || !user) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDashboardSettings(user.uid, settings).catch(e => console.error('save dash failed', e));
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [settings, loaded, user]);

  return { settings, setSettings, loaded };
}
