import { Injectable, Inject } from '@nestjs/common';
import { JsonDB } from 'node-json-db';
import { Job, JobRecord } from './interfaces/job.interface';
import { DatabaseMutex } from '../database/database-mutex';

@Injectable()
export class JobsRepository {
  constructor(
    @Inject('JSON_DB') private readonly db: JsonDB,
    private readonly mutex: DatabaseMutex,
  ) {}

  async findAll(): Promise<Job[]> {
    const jobs = await this.db.getObject<JobRecord>('/jobs');
    return Object.values(jobs);
  }

  async findById(id: string): Promise<Job | null> {
    return this.mutex.runExclusive(async () => {
      if (!(await this.db.exists(`/jobs/${id}`))) return null;
      return this.db.getObject<Job>(`/jobs/${id}`);
    });
  }

  async create(job: Job): Promise<void> {
    await this.db.push(`/jobs/${job.id}`, job, true);
  }

  async update(id: string, updatedFields: Partial<Job>): Promise<Job | null> {
    if (!(await this.db.exists(`/jobs/${id}`))) return null;
    await this.db.push(`/jobs/${id}`, updatedFields, false);
    return this.db.getObject<Job>(`/jobs/${id}`);
  }

  async delete(id: string): Promise<boolean> {
    if (!(await this.db.exists(`/jobs/${id}`))) return false;
    await this.db.delete(`/jobs/${id}`);
    return true;
  }

  async filter(
    predicate: (job: Job) => boolean,
    limit = Number.POSITIVE_INFINITY,
  ): Promise<Job[]> {
    const jobs = await this.db.getObject<JobRecord>('/jobs');
    const matchingJobs: Job[] = [];
    for (const job of Object.values(jobs)) {
      if (predicate(job)) matchingJobs.push(job);
      if (matchingJobs.length >= limit) break;
    }
    return matchingJobs;
  }
}
