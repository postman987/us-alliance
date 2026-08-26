import { DatabaseMutex } from './database-mutex';

describe('DatabaseMutex', () => {
  it('runs contending operations in FIFO order and exclusively', async () => {
    const mutex = new DatabaseMutex();
    const events: string[] = [];
    let active = 0;

    const operation = (name: string, delay: number) =>
      mutex.runExclusive(async () => {
        events.push(`${name}:start`);
        active += 1;
        expect(active).toBe(1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        active -= 1;
        events.push(`${name}:end`);
      });

    await Promise.all([
      operation('first', 10),
      operation('second', 1),
      operation('third', 1),
    ]);

    expect(events).toEqual([
      'first:start',
      'first:end',
      'second:start',
      'second:end',
      'third:start',
      'third:end',
    ]);
  });

  it('allows nested operations without deadlocking', async () => {
    const mutex = new DatabaseMutex();
    const result = await mutex.runExclusive(async () =>
      mutex.runExclusive(async () => 'completed'),
    );

    expect(result).toBe('completed');
  });
});
