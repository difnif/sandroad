import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { subscribeProject, saveProject } from '../firebase/projectsService.js';
import { normalizeNode } from '../utils/treeOps.js';

// Subscribe to a single project's full data with debounced auto-save
export function useProjectData(pid) {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const saveTimerRef = useRef(null);
  const localEditRef = useRef(false); // suppress remote echo

  useEffect(() => {
    if (!user || !pid) {
      setProject(null);
      return;
    }
    setLoading(true);
    const unsub = subscribeProject(user.uid, pid, (data) => {
      if (!data) {
        setProject(null);
        setLoading(false);
        return;
      }
      // Normalize structure (in case of schema changes)
      const normalized = { ...data };
      if (normalized.columns && normalized.structure) {
        for (const c of normalized.columns) {
          normalized.structure[c.key] = (normalized.structure[c.key] || []).map(normalizeNode);
        }
      }
      // If we just made a local edit, ignore the echo from Firestore
      if (localEditRef.current) {
        localEditRef.current = false;
      } else {
        setProject(normalized);
      }
      setLoading(false);
    });
    return () => {
      unsub();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [user, pid]);

  // Local update with debounced save to Firestore
  const updateLocal = useCallback((updater) => {
    setProject(prev => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Schedule save
      if (user) {
        setSaveStatus('saving');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          try {
            localEditRef.current = true;
            await saveProject(user.uid, next);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1200);
          } catch (e) {
            console.error('save failed', e);
            setSaveStatus('idle');
          }
        }, 600);
      }
      return next;
    });
  }, [user]);

  return { project, loading, saveStatus, updateLocal };
}
