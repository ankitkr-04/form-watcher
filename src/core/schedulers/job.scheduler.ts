import cron from 'node-cron';

import { WatcherRegistry } from '@src/infrastructure/watchers';
import { Form } from '@src/shared/types/types';
import { log } from '@src/shared/utils/logger.util';

// This is mock data. In a real application, you would fetch this from a database.
const forms: Form[] = [
  {
    id: '1',
    name: 'Test Google Form',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSc_12345_67890',
    watcherType: 'google-form',
    watcherConfig: { closedText: 'This form is currently not accepting responses' },
    intervalSeconds: 60,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    activeFrom: '09:00',
    activeTo: '17:00',
    enabled: true,
    priority: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Test HTML Snippet',
    url: 'https://example.com',
    watcherType: 'html-snippet',
    watcherConfig: { selector: 'h1' },
    intervalSeconds: 60,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    activeFrom: '00:00',
    activeTo: '23:59',
    enabled: true,
    priority: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function runWatcherJob() {
  log.info('Starting watcher job...');
  const watchers = WatcherRegistry.getAll();

  for (const [watcherType, watcher] of watchers) {
    const relevantForms = forms.filter((form) => form.watcherType === watcherType && form.enabled);

    for (const form of relevantForms) {
      try {
        const result = await watcher.check(form);
        log.info(
          `Watcher '${watcherType}' for form '${form.name}' finished with status: ${result.status}`
        );
      } catch (error) {
        log.error(`Watcher '${watcherType}' for form '${form.name}' failed`, error as Error);
      }
    }
  }
  log.info('Watcher job finished.');
}

export const JobScheduler = {
  start: (): void => {
    cron.schedule('* * * * *', runWatcherJob);
    log.info('Job scheduler started. Watcher job will run every minute.');
  },
};
