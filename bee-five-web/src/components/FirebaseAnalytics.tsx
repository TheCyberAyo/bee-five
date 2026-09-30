'use client';

import { useEffect } from 'react';
import { firebaseAnalytics } from '../utils/firebaseAnalytics';
import { gameAnalytics } from '../utils/gameAnalytics';

export default function FirebaseAnalytics() {
  useEffect(() => {
    void firebaseAnalytics.initialize();
    void gameAnalytics.initialize();
  }, []);
  return null;
}
