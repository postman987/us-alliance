import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

type QueuedOperation<T> = {
  operation: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

/**
 * Serializes complete application operations, not just individual DB calls.
 * The AsyncLocalStorage check makes repository calls made by a service
 * operation re-entrant without allowing another request into the queue.
 */
@Injectable()
export class DatabaseMutex {
  private readonly context = new AsyncLocalStorage<symbol>();
  private readonly queue: QueuedOperation<unknown>[] = [];
  private owner?: symbol;

  async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.owner && this.context.getStore() === this.owner) {
      return operation();
    }

    if (this.owner) {
      return new Promise<T>((resolve, reject) => {
        this.queue.push({
          operation,
          resolve: resolve as (value: unknown | PromiseLike<unknown>) => void,
          reject,
        });
      });
    }

    return this.execute(operation);
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    const token = Symbol('database-operation');
    this.owner = token;

    try {
      return await this.context.run(token, operation);
    } finally {
      this.owner = undefined;
      this.startNext();
    }
  }

  private startNext(): void {
    const next = this.queue.shift();
    if (!next) return;

    void this.execute(next.operation).then(next.resolve, next.reject);
  }
}
