import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { JobsScheduler } from '../src/jobs/jobs.scheduler';
import { Job } from '../src/jobs/interfaces/job.interface';
import { LoggerService } from '../src/logger/logger.service';
import { JsonDB, Config } from 'node-json-db';
import * as fs from 'fs';
import * as path from 'path';

describe('JobsController (e2e)', () => {
  let app: INestApplication<App>;
  let scheduler: JobsScheduler;
  const dbPath = path.resolve(process.cwd(), 'test');
  const mockLoggerService = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  // Clean up database files before tests
  beforeAll(() => {
    const dbFile = `${dbPath}.json`;
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
    fs.writeFileSync(dbFile, JSON.stringify({ jobs: {} }));
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('JSON_DB')
      .useFactory({
        factory: async () => {
          const db = new JsonDB(new Config(dbPath, true, true, '/'));
          if (!(await db.exists('/jobs'))) {
            await db.push('/jobs', {});
          }
          return db;
        },
      })
      .overrideProvider(LoggerService)
      .useValue(mockLoggerService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    scheduler = moduleFixture.get<JobsScheduler>(JobsScheduler);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    const dbFile = `${dbPath}.json`;
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
    const logPath = path.resolve(process.cwd(), 'logs.txt');
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  });

  describe('Core API flow', () => {
    let createdJobId: string;

    it('POST /jobs should create a new job and return it', async () => {
      const response = await request(app.getHttpServer())
        .post('/jobs')
        .send({
          title: 'Learn NestJS',
          description: 'Build a project with NestJS framework',
        })
        .expect(201);

      const body = response.body as Job;
      expect(body).toHaveProperty('id');
      expect(body.title).toBe('Learn NestJS');
      expect(body.description).toBe('Build a project with NestJS framework');
      expect(body.status).toBe('created');
      createdJobId = body.id;
    });

    it('POST /jobs validation should fail for empty body or missing fields', async () => {
      await request(app.getHttpServer()).post('/jobs').send({}).expect(400);

      await request(app.getHttpServer())
        .post('/jobs')
        .send({ title: 'Missing description' })
        .expect(400);
    });

    it('GET /jobs should return list containing the created job', async () => {
      const response = await request(app.getHttpServer())
        .get('/jobs')
        .query({ page: 1, count: 100 })
        .expect(200);

      const jobs = response.body as Job[];
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThanOrEqual(1);
      const found = jobs.find((j) => j.id === createdJobId);
      expect(found).toBeDefined();
      expect(found!.title).toBe('Learn NestJS');
    });

    it('GET /jobs should paginate jobs from page 1 with a default count of 100', async () => {
      for (let i = 0; i < 2; i += 1) {
        await request(app.getHttpServer())
          .post('/jobs')
          .send({
            title: `Pagination Job ${i}`,
            description: 'Pagination test job',
          });
      }

      const firstPage = await request(app.getHttpServer())
        .get('/jobs')
        .query({ page: 1, count: 1 })
        .expect(200);
      const secondPage = await request(app.getHttpServer())
        .get('/jobs')
        .query({ page: 2, count: 1 })
        .expect(200);

      const firstPageJobs = firstPage.body as Job[];
      const secondPageJobs = secondPage.body as Job[];
      expect(firstPageJobs).toHaveLength(1);
      expect(secondPageJobs).toHaveLength(1);
      expect(secondPageJobs[0].id).not.toBe(firstPageJobs[0].id);
    });

    it('GET /jobs should reject invalid pagination parameters', async () => {
      await request(app.getHttpServer())
        .get('/jobs')
        .query({ page: 0, count: 100 })
        .expect(400);

      await request(app.getHttpServer())
        .get('/jobs')
        .query({ page: 1, count: 101 })
        .expect(400);
    });

    it('GET /jobs/:id should return the correct job', async () => {
      const response = await request(app.getHttpServer())
        .get(`/jobs/${createdJobId}`)
        .expect(200);

      const body = response.body as Job;
      expect(body.id).toBe(createdJobId);
      expect(body.title).toBe('Learn NestJS');
    });

    it('GET /jobs/:id with invalid id should return 404', async () => {
      await request(app.getHttpServer())
        .get('/jobs/non-existent-uuid')
        .expect(404);
    });

    it('PATCH /jobs/:id should edit title and description', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/jobs/${createdJobId}`)
        .send({
          title: 'Master NestJS',
          description: 'Updated description',
        })
        .expect(200);

      const body = response.body as Job;
      expect(body.id).toBe(createdJobId);
      expect(body.title).toBe('Master NestJS');
      expect(body.description).toBe('Updated description');
      expect(body.status).toBe('created');
    });

    it('PATCH /jobs/:id validation should fail if forbidden properties (id, status) are passed', async () => {
      await request(app.getHttpServer())
        .patch(`/jobs/${createdJobId}`)
        .send({
          status: 'completed',
        })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/jobs/${createdJobId}`)
        .send({
          id: 'new-id',
        })
        .expect(400);
    });

    it('GET /jobs/search should search jobs by title or status', async () => {
      // Search by title (should find matching)
      const resTitle = await request(app.getHttpServer())
        .get('/jobs/search')
        .query({ q: 'Master', type: 'title' })
        .expect(200);

      const titleJobs = resTitle.body as Job[];
      expect(titleJobs.length).toBeGreaterThanOrEqual(1);
      expect(titleJobs[0].title).toBe('Master NestJS');

      // Search by status
      const resStatus = await request(app.getHttpServer())
        .get('/jobs/search')
        .query({ q: 'created', type: 'status' })
        .expect(200);

      const statusJobs = resStatus.body as Job[];
      expect(statusJobs.length).toBeGreaterThanOrEqual(1);
      expect(statusJobs.find((j) => j.id === createdJobId)).toBeDefined();

      // Search with invalid query/type validation
      await request(app.getHttpServer())
        .get('/jobs/search')
        .query({ q: 'created', type: 'invalid-type' })
        .expect(400);
    });
  });

  describe('Scheduling and completed job editing rules', () => {
    let jobId: string;

    beforeEach(async () => {
      // Create a clean job to use
      const res = await request(app.getHttpServer()).post('/jobs').send({
        title: 'Scheduled Job',
        description: 'Testing completion schedule',
      });
      const body = res.body as Job;
      jobId = body.id;
    });

    it('scheduler should complete jobs and prevent edits', async () => {
      // Manually trigger the cron task
      await scheduler.handleCron();

      // Fetch the job, status should be 'completed'
      const getRes = await request(app.getHttpServer())
        .get(`/jobs/${jobId}`)
        .expect(200);

      const body = getRes.body as Job;
      expect(body.status).toBe('completed');

      // Attempt to edit a completed job, should return 400
      await request(app.getHttpServer())
        .patch(`/jobs/${jobId}`)
        .send({ title: 'Try to edit completed job' })
        .expect(400);

      // Delete the completed job should work
      await request(app.getHttpServer()).delete(`/jobs/${jobId}`).expect(200);

      // Verify it is deleted
      await request(app.getHttpServer()).get(`/jobs/${jobId}`).expect(404);
    });
  });
});
