import React, { createContext, useContext, useEffect, useState } from 'react';
import { THEMES } from '../constants/themes.js';
import { STRINGS } from '../constants/i18n.js';
import { useAuth } from './AuthContext.jsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';

const ThemeContext = createContext(null);

const DEFAULT_THEME_ID = 'sand';

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [loaded, setLoaded] = useState(false);

  // Load saved theme from Firestore on login
  useEffect(() => {
    if (!user) {
      setThemeId(DEFAULT_THEME_ID);
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const ref = doc(db, 'users', user.uid, 'settings', 'appearance');
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().themeId) {
          setThemeId(snap.data().themeId);
        }
      } catch (e) {
        console.error('load theme failed', e);
      }
      setLoaded(true);
    })();
  }, [user]);

  // Save theme to Firestore on change
  const changeTheme = async (newId) => {
    if (!THEMES[newId]) return;
    setThemeId(newId);
    if (user) {
      try {
        const ref = doc(db, 'users', user.uid, 'settings', 'appearance');
        await setDoc(ref, { themeId: newId }, { merge: true });
      } catch (e) {
        console.error('save theme failed', e);
      }
    }
  };

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
  const t = STRINGS[themeId] || STRINGS[DEFAULT_THEME_ID];

  return (
    <ThemeContext.Provider value={{ themeId, theme, t, changeTheme, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
