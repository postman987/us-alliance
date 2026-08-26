import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JobsRepository } from './jobs.repository';
import { LoggerService } from '../logger/logger.service';
import { Job } from './interfaces/job.interface';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { randomUUID } from 'crypto';
import { DatabaseMutex } from '../database/database-mutex';

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepository: JobsRepository,
    private readonly logger: LoggerService,
    private readonly mutex: DatabaseMutex,
  ) {}

  async createJob(createJobDto: CreateJobDto): Promise<Job> {
    return this.mutex.runExclusive(async () => {
      const job: Job = {
        id: randomUUID(),
        title: createJobDto.title,
        description: createJobDto.description,
        status: 'created',
      };
      await this.jobsRepository.create(job);
      this.logger.log(`Created job: ${JSON.stringify(job)}`, 'JobsService');
      return job;
    });
  }

  async listJobs(page = 1, count = 100): Promise<Job[]> {
    this.logger.log(
      `Listing jobs: page=${page}, count=${count}`,
      'JobsService',
    );
    return this.mutex.runExclusive(async () => {
      const jobs = await this.jobsRepository.findAll();
      const start = (page - 1) * count;
      return jobs.slice(start, start + count);
    });
  }

  async getJobById(id: string): Promise<Job> {
    this.logger.log(`Retrieving job with ID: ${id}`, 'JobsService');
    const job = await this.mutex.runExclusive(() =>
      this.jobsRepository.findById(id),
    );
    if (!job) {
      this.logger.warn(`Job with ID ${id} not found`, 'JobsService');
      throw new NotFoundException(`Job with ID "${id}" not found`);
    }
    return job;
  }

  async editJob(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    return this.mutex.runExclusive(async () => {
      this.logger.log(`Attempting to edit job with ID: ${id}`, 'JobsService');
      const job = await this.jobsRepository.findById(id);

      if (!job) {
        this.logger.warn(
          `Job with ID ${id} not found for editing`,
          'JobsService',
        );
        throw new NotFoundException(`Job with ID "${id}" not found`);
      }

      if (job.status === 'completed') {
        this.logger.warn(
          `Failed to edit job with ID ${id}: completed jobs cannot be edited`,
          'JobsService',
        );
        throw new BadRequestException('Completed jobs cannot be edited');
      }

      const updated = await this.jobsRepository.update(id, updateJobDto);
      this.logger.log(
        `Edited job with ID: ${id}. Updates: ${JSON.stringify(updateJobDto)}`,
        'JobsService',
      );
      return updated!;
    });
  }

  async deleteJob(id: string): Promise<{ success: boolean }> {
    this.logger.log(`Attempting to delete job with ID: ${id}`, 'JobsService');
    const deleted = await this.mutex.runExclusive(() =>
      this.jobsRepository.delete(id),
    );
    if (!deleted) {
      this.logger.warn(
        `Failed to delete job: ID ${id} not found`,
        'JobsService',
      );
      throw new NotFoundException(`Job with ID "${id}" not found`);
    }
    this.logger.log(`Successfully deleted job with ID: ${id}`, 'JobsService');
    return { success: true };
  }

  async getCreatedJobs(limit = 100): Promise<Job[]> {
    this.logger.log('Retrieving jobs with status "created"', 'JobsService');
    return this.mutex.runExclusive(() =>
      this.jobsRepository.filter((job) => job.status === 'created', limit),
    );
  }

  async searchJobs(
    q: string,
    type: 'title' | 'status',
    page = 1,
    count = 100,
  ): Promise<Job[]> {
    this.logger.log(
      `Searching jobs by ${type} with query: "${q}"`,
      'JobsService',
    );
    const query = q.toLowerCase();

    return this.mutex.runExclusive(async () => {
      const jobs =
        type === 'title'
          ? await this.jobsRepository.filter((job) =>
              job.title.toLowerCase().includes(query),
            )
          : type === 'status'
            ? await this.jobsRepository.filter(
                (job) => job.status.toLowerCase() === query,
              )
            : [];
      const start = (page - 1) * count;
      return jobs.slice(start, start + count);
    });
  }
}
