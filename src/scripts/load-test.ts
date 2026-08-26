type Operation = 'list' | 'post';

const requestCount = 100;
const baseUrl = (process.env.LOAD_TEST_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const maxRandomPage = 10;
const operations: Operation[] = ['list', 'post'];

function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function takeRandomOperation(): Operation {
  return operations[randomInteger(0, operations.length - 1)];
}

function assertSuccessful(
  response: Response,
  requestNumber: number,
  operation: Operation,
): void {
  if (!response.ok) {
    throw new Error(
      `${operation.toUpperCase()} request ${requestNumber} failed with HTTP ${response.status}`,
    );
  }
}

async function createJob(requestNumber: number): Promise<void> {
  const response = await fetch(`${baseUrl}/jobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: `Load test job ${requestNumber}`,
      description: 'Created by the concurrent load test',
    }),
  });
  assertSuccessful(response, requestNumber, 'post');
}

async function sendRequest(requestNumber: number): Promise<void> {
  const operation = takeRandomOperation();

  if (operation === 'post') {
    return createJob(requestNumber);
  }

  if (operation === 'list') {
    const page = randomInteger(1, maxRandomPage);
    const count = randomInteger(1, 100);
    const response = await fetch(`${baseUrl}/jobs?page=${page}&count=${count}`);
    return assertSuccessful(response, requestNumber, operation);
  }

  return createJob(requestNumber);
}

async function loadTest(): Promise<void> {
  const startedAt = Date.now();
  await Promise.all(
    Array.from({ length: requestCount }, (_, index) => sendRequest(index + 1)),
  );
  const elapsedMs = Date.now() - startedAt;

  console.log(
    `Completed ${requestCount} concurrent random job requests in ${elapsedMs}ms`,
  );
}

void loadTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
