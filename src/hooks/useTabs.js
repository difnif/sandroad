import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getUIState, saveUIState } from '../firebase/uiStateService.js';

// Manage open tabs (multi-project) and active tab
export function useTabs(projectsList) {
  const { user } = useAuth();
  const [openIds, setOpenIds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef(null);

  // Load saved tab state
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const ui = await getUIState(user.uid);
        if (ui) {
          setOpenIds(ui.openIds || []);
          setActiveId(ui.activeId || null);
        }
      } catch (e) {
        console.error('load ui state failed', e);
      }
      setLoaded(true);
    })();
  }, [user]);

  // Sanitize when projectsList changes (drop tabs for deleted projects)
  useEffect(() => {
    if (!loaded || !projectsList) return;
    const validIds = new Set(projectsList.map(p => p.id));
    setOpenIds(prev => {
      const sanitized = prev.filter(id => validIds.has(id));
      return sanitized.length === prev.length ? prev : sanitized;
    });
    setActiveId(prev => {
      if (prev && !validIds.has(prev)) {
        const remaining = openIds.filter(id => validIds.has(id));
        return remaining[0] || projectsList[0]?.id || null;
      }
      return prev;
    });
    // eslint-disable-next-line
  }, [projectsList, loaded]);

  // Persist tab state with debounce
  useEffect(() => {
    if (!loaded || !user) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveUIState(user.uid, { openIds, activeId }).catch(e => console.error('save ui failed', e));
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [openIds, activeId, loaded, user]);

  const openTab = useCallback((pid) => {
    setOpenIds(prev => prev.includes(pid) ? prev : [...prev, pid]);
    setActiveId(pid);
  }, []);

  const closeTab = useCallback((pid) => {
    setOpenIds(prev => {
      const next = prev.filter(id => id !== pid);
      setActiveId(curr => curr === pid ? (next[next.length - 1] || null) : curr);
      return next;
    });
  }, []);

  const switchTab = useCallback((pid) => {
    setActiveId(pid);
  }, []);

  return { openIds, activeId, loaded, openTab, closeTab, switchTab };
}
