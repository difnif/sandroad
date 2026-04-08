import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  subscribeProjectsList, createProject, deleteProject, renameProject
} from '../firebase/projectsService.js';
import { makeEmptyProject } from '../utils/projectFactory.js';

// Hook for managing the list of projects (subscribes to Firestore)
export function useProjectsList() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = subscribeProjectsList(user.uid, (items) => {
      setProjects(items);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const createNew = async (name) => {
    if (!user) return null;
    const proj = makeEmptyProject(name);
    await createProject(user.uid, proj);
    return proj;
  };

  const remove = async (pid) => {
    if (!user) return;
    await deleteProject(user.uid, pid);
  };

  const rename = async (pid, name) => {
    if (!user) return;
    await renameProject(user.uid, pid, name);
  };

  return { projects, loading, createNew, remove, rename };
}
