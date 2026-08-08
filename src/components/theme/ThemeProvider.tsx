'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/lib/store';

/** Applies persisted theme to <html data-theme="...">. */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useDashboardStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <>{children}</>;
}
