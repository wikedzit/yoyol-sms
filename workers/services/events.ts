import { and, eq, lte } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { domainEvents } from '../database/domain-events';
import { eventSubscriptions } from '../database/extension-registry';
import { bundledExtensionHost } from '../kernel/bundled-host';
import { deliveryAfterFailure, parseCoreEvent, retryDelayMs, type CoreEventName } from '../kernel/event-catalogue';
import { createExtensionLog } from '../kernel/log';
import type { LifecycleContext } from '../kernel/sdk';

const eventBudgetMs = 30_000;

function withBudget<T>(work: Promise<T>, budgetMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timedOut')), budgetMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export default class EventService {
  constructor(
    private db: AppDatabase,
    private contextFor: (schoolId: number, extensionKey: string) => Promise<LifecycleContext> = async (schoolId) => ({
      schoolId,
      settings: { get: async () => null },
      core: {},
      log: { info() {}, error() {} },
    }),
    private requestId = 'none',
  ) {}

  async publish(schoolId: number, name: CoreEventName, payload: unknown): Promise<void> {
    const event = parseCoreEvent(name, payload);
    await this.db.insert(domainEvents).values({
      schoolId,
      eventName: event.name,
      payloadVersion: event.payloadVersion,
      payloadJson: JSON.stringify(event.payload),
      status: 'pending',
      attempts: 0,
      availableAt: Date.now(),
      lastError: null,
    });
    await this.dispatchDue();
  }

  async listDead(schoolId: number): Promise<{ id: number; eventName: string; attempts: number; lastError: string | null }[]> {
    return this.db
      .select({
        id: domainEvents.id,
        eventName: domainEvents.eventName,
        attempts: domainEvents.attempts,
        lastError: domainEvents.lastError,
      })
      .from(domainEvents)
      .where(and(eq(domainEvents.schoolId, schoolId), eq(domainEvents.status, 'dead')));
  }

  async retry(schoolId: number, eventId: number): Promise<void> {
    await this.db
      .update(domainEvents)
      .set({ status: 'pending', attempts: 0, availableAt: Date.now(), lastError: null })
      .where(and(eq(domainEvents.id, eventId), eq(domainEvents.schoolId, schoolId), eq(domainEvents.status, 'dead')));
    await this.dispatchDue();
  }

  async dispatchDue(now = Date.now()): Promise<number> {
    const due = await this.db
      .select()
      .from(domainEvents)
      .where(and(eq(domainEvents.status, 'pending'), lte(domainEvents.availableAt, now)))
      .limit(20);

    for (const row of due) {
      await this.deliver(row, now);
    }
    return due.length;
  }

  private async openEntrypoint(key: string) {
    try {
      return await bundledExtensionHost.getEntrypoint({ key, version: 'bundled' }, []);
    } catch (error) {
      if (error instanceof Error && error.message === `${key} is not bundled.`) {
        return null;
      }
      throw error;
    }
  }

  private async deliver(row: typeof domainEvents.$inferSelect, now: number): Promise<void> {
    const subscribers = await this.db
      .select()
      .from(eventSubscriptions)
      .where(and(eq(eventSubscriptions.schoolId, row.schoolId), eq(eventSubscriptions.eventName, row.eventName)));

    try {
      const payload = JSON.parse(row.payloadJson) as unknown;
      for (const subscriber of subscribers) {
        const entrypoint = await this.openEntrypoint(subscriber.extensionKey);
        if (!entrypoint) {
          continue;
        }
        await withBudget(
          entrypoint.handleEvent(
            { id: row.id, name: row.eventName, payload, schoolId: row.schoolId },
            await this.contextFor(row.schoolId, subscriber.extensionKey),
          ),
          eventBudgetMs,
        );
      }
      await this.db
        .update(domainEvents)
        .set({ status: 'delivered', lastError: null })
        .where(eq(domainEvents.id, row.id));
    } catch (error) {
      const attempts = row.attempts + 1;
      const outcome = deliveryAfterFailure(attempts);
      const message = error instanceof Error ? error.message : 'Delivery failed.';
      await this.db
        .update(domainEvents)
        .set({
          attempts,
          status: outcome === 'dead' ? 'dead' : 'pending',
          availableAt: now + retryDelayMs(attempts),
          lastError: message.slice(0, 500),
        })
        .where(eq(domainEvents.id, row.id));
      createExtensionLog('kernel', { requestId: this.requestId }).error('Event delivery failed.', {
        eventName: row.eventName,
        eventId: row.id,
      });
    }
  }
}
