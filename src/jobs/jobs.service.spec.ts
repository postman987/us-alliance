import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { JobsRepository } from './jobs.repository';
import { LoggerService } from '../logger/logger.service';
import { JobRecord } from './interfaces/job.interface';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JsonDB, Config } from 'node-json-db';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseMutex } from '../database/database-mutex';

describe('JobsService (Integration with real repository)', () => {
  let service: JobsService;
  let db: JsonDB;
  const dbPath = path.resolve(process.cwd(), 'test');

  const mockLoggerService = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeAll(() => {
    const dbFile = `${dbPath}.json`;
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
    fs.writeFileSync(dbFile, JSON.stringify({ jobs: {} }));
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        JobsRepository,
        {
          provide: 'JSON_DB',
          useFactory: async () => {
            db = new JsonDB(new Config(dbPath, true, true, '/'));
            if (!(await db.exists('/jobs'))) {
              await db.push('/jobs', {});
            }
            return db;
          },
        },
        { provide: LoggerService, useValue: mockLoggerService },
        DatabaseMutex,
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  afterEach(async () => {
    if (db && (await db.exists('/jobs'))) {
      await db.push('/jobs', {}, true);
    }
  });

  afterAll(() => {
    const dbFile = `${dbPath}.json`;
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
  });

  describe('createJob', () => {
    it('should create a job and persist it in the database', async () => {
      const dto: CreateJobDto = { title: 'Test Job', description: 'Test Desc' };

      const result = await service.createJob(dto);

      expect(result.id).toBeDefined();
      expect(result.title).toBe(dto.title);
      expect(result.description).toBe(dto.description);
      expect(result.status).toBe('created');

      const dbJob = await service.getJobById(result.id);
      expect(dbJob).toEqual(result);
    });
  });

  describe('listJobs', () => {
    it('should return all jobs persisted in the database', async () => {
      const job1 = await service.createJob({
        title: 'Job 1',
        description: 'Desc 1',
      });
      const job2 = await service.createJob({
        title: 'Job 2',
        description: 'Desc 2',
      });

      const result = await service.listJobs();

      expect(result.length).toBe(2);
      expect(result.find((j) => j.id === job1.id)).toBeDefined();
      expect(result.find((j) => j.id === job2.id)).toBeDefined();
    });

    it('should return the requested page of jobs', async () => {
      const jobs = await Promise.all(
        [1, 2, 3].map((index) =>
          service.createJob({
            title: `Job ${index}`,
            description: `Desc ${index}`,
          }),
        ),
      );

      const result = await service.listJobs(2, 1);

      expect(result).toEqual([jobs[1]]);
    });
  });

  describe('getJobById', () => {
    it('should return the job if found', async () => {
      const job = await service.createJob({
        title: 'Job 1',
        description: 'Desc 1',
      });

      const result = await service.getJobById(job.id);

      expect(result).toEqual(job);
    });

    it('should throw NotFoundException if job not found', async () => {
      await expect(service.getJobById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCreatedJobs', () => {
    it('should return at most 100 jobs for scheduler processing', async () => {
      const jobs: JobRecord = {};
      for (let index = 0; index < 101; index += 1) {
        const id = `created-job-${index}`;
        jobs[id] = {
          id,
          title: `Job ${index}`,
          description: 'Created job',
          status: 'created',
        };
      }
      await db.push('/jobs', jobs, true);

      await expect(service.getCreatedJobs()).resolves.toHaveLength(100);
    });
  });

  describe('editJob', () => {
    it('should update job details if found and not completed', async () => {
      const job = await service.createJob({
        title: 'Old Title',
        description: 'Old Desc',
      });
      const dto: UpdateJobDto = { title: 'New Title', description: 'New Desc' };

      const result = await service.editJob(job.id, dto);

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New Desc');
      expect(result.status).toBe('created');

      // Verify database has updated records
      const dbJob = await service.getJobById(job.id);
      expect(dbJob.title).toBe('New Title');
      expect(dbJob.description).toBe('New Desc');
    });

    it('should throw BadRequestException if job status is completed', async () => {
      const job = await service.createJob({
        title: 'Old Title',
        description: 'Old Desc',
      });

      // Manually set status to completed in database to simulate completed state
      const record = await db.getObject<JobRecord>('/jobs');
      record[job.id].status = 'completed';
      await db.push('/jobs', record, true);

      const dto: UpdateJobDto = { title: 'New Title' };

      await expect(service.editJob(job.id, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if job does not exist', async () => {
      const dto: UpdateJobDto = { title: 'New Title' };
      await expect(service.editJob('non-existent-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteJob', () => {
    it('should delete job and return success', async () => {
      const job = await service.createJob({
        title: 'Title',
        description: 'Desc',
      });

      const result = await service.deleteJob(job.id);

      expect(result).toEqual({ success: true });

      // Verify it is gone from the database
      await expect(service.getJobById(job.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if job not found for deletion', async () => {
      await expect(service.deleteJob('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
