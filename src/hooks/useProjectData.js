import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { subscribeProject, saveProject } from '../firebase/projectsService.js';
import { normalizeNode } from '../utils/treeOps.js';

// How long after a local edit we ignore incoming remote snapshots.
// This prevents the Firestore echo from overwriting in-flight user input.
const LOCAL_EDIT_GRACE_MS = 2000;

export function useProjectData(pid) {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const saveTimerRef = useRef(null);
  const lastLocalEditRef = useRef(0);

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

      // If the user typed recently, drop this snapshot entirely — it's almost
      // certainly the echo of our own save, and accepting it would blow away
      // whatever new characters have been typed since.
      const sinceEdit = Date.now() - lastLocalEditRef.current;
      if (sinceEdit < LOCAL_EDIT_GRACE_MS) {
        setLoading(false);
        return;
      }

      const normalized = { ...data };
      if (normalized.columns && normalized.structure) {
        for (const c of normalized.columns) {
          normalized.structure[c.key] = (normalized.structure[c.key] || []).map(normalizeNode);
        }
      }
      setProject(normalized);
      setLoading(false);
    });
    return () => {
      unsub();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [user, pid]);

  const updateLocal = useCallback((updater) => {
    lastLocalEditRef.current = Date.now();
    setProject(prev => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (user) {
        setSaveStatus('saving');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          try {
            // Refresh the edit timestamp right before writing so any echo
            // triggered by this save is inside the grace window.
            lastLocalEditRef.current = Date.now();
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
