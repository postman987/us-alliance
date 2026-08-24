import { Injectable, Inject } from '@nestjs/common';
import { JsonDB } from 'node-json-db';
import { Job, JobRecord } from './interfaces/job.interface';

@Injectable()
export class JobsRepository {
  constructor(@Inject('JSON_DB') private readonly db: JsonDB) {}

  async findAll(): Promise<Job[]> {
    const jobs = await this.db.getObject<JobRecord>('/jobs');
    return Object.values(jobs);
  }

  async findById(id: string): Promise<Job | null> {
    if (!(await this.db.exists(`/jobs/${id}`))) return null;
    return this.db.getObject<Job>(`/jobs/${id}`);
  }

  async create(job: Job): Promise<void> {
    await this.db.push(`/jobs/${job.id}`, job, true);
  }

  async update(id: string, updatedFields: Partial<Job>): Promise<Job | null> {
    await this.db.push(`/jobs/${id}`, updatedFields, false);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    if (!(await this.db.exists(`/jobs/${id}`))) return false;
    await this.db.delete(`/jobs/${id}`);
    return true;
  }

  async filter(predicate: (job: Job) => boolean): Promise<Job[]> {
    const jobs = await this.findAll();
    return jobs.filter(predicate);
  }
}
