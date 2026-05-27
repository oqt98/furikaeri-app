import { useEffect, type ReactNode } from 'react';
import { hydrateAppPreferencesFromRemote } from '../appPreferencesRepository';
import { hydrateReminderSettingsFromRemote } from '../reminderSettings';
import { hydrateReviewsFromRemoteToLocal } from '../reviewRepository';
import { hydrateTagCatalogFromRemoteToLocal } from '../tagRepository';
import { ensureAnonymousSession } from './auth';
import { isSupabaseEnabled } from './env';

export function SupabaseBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isSupabaseEnabled()) {
      return;
    }

    void (async () => {
      try {
        const session = await ensureAnonymousSession();
        if (session.status !== 'ready') {
          return;
        }

        await Promise.all([
          hydrateReviewsFromRemoteToLocal(),
          hydrateTagCatalogFromRemoteToLocal(),
          hydrateAppPreferencesFromRemote(),
          hydrateReminderSettingsFromRemote(),
        ]);
      } catch (error) {
        console.error('ensureAnonymousSession error:', error);
      }
    })();
  }, []);

  return <>{children}</>;
}
