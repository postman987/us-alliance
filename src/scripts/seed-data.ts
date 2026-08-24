import { JsonDB, Config } from 'node-json-db';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { Job, JobRecord } from '../jobs/interfaces/job.interface';

async function seed() {
  console.log('Seeding 1000 randomized jobs...');
  const dbPath = path.resolve(process.cwd(), 'jobs');
  const db = new JsonDB(new Config(dbPath, true, true, '/'));

  // Ensure that the jobs object is initialized
  if (!(await db.exists('/jobs'))) {
    await db.push('/jobs', {});
  }

  const verbs = [
    'Build',
    'Test',
    'Deploy',
    'Review',
    'Refactor',
    'Debug',
    'Document',
    'Design',
    'Optimize',
    'Configure',
  ];
  const nouns = [
    'Database',
    'API',
    'Frontend',
    'Auth Service',
    'Logger',
    'Queue',
    'Docker Container',
    'CI/CD Pipeline',
    'Scheduler',
    'Security Module',
  ];

  const jobs: JobRecord = {};
  for (let i = 1; i <= 1000; i++) {
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const id = randomUUID();
    const job: Job = {
      id,
      title: `${verb} ${noun} ${i}`,
      description: `Randomly generated task description for index ${i}`,
      status: Math.random() > 0.5 ? 'created' : 'completed',
    };
    jobs[id] = job;
  }

  await db.push('/jobs', jobs, true);
  console.log('Successfully seeded 1000 randomized jobs.');
}

void seed();
