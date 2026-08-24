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

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepository: JobsRepository,
    private readonly logger: LoggerService,
  ) {}

  async createJob(createJobDto: CreateJobDto): Promise<Job> {
    const job: Job = {
      id: randomUUID(),
      title: createJobDto.title,
      description: createJobDto.description,
      status: 'created',
    };

    await this.jobsRepository.create(job);
    this.logger.log(`Created job: ${JSON.stringify(job)}`, 'JobsService');
    return job;
  }

  async listJobs(): Promise<Job[]> {
    this.logger.log('Listing all jobs', 'JobsService');
    return this.jobsRepository.findAll();
  }

  async getJobById(id: string): Promise<Job> {
    this.logger.log(`Retrieving job with ID: ${id}`, 'JobsService');
    const job = await this.jobsRepository.findById(id);
    if (!job) {
      this.logger.warn(`Job with ID ${id} not found`, 'JobsService');
      throw new NotFoundException(`Job with ID "${id}" not found`);
    }
    return job;
  }

  async editJob(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
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
  }

  async deleteJob(id: string): Promise<{ success: boolean }> {
    this.logger.log(`Attempting to delete job with ID: ${id}`, 'JobsService');
    const deleted = await this.jobsRepository.delete(id);
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

  async getCreatedJobs(): Promise<Job[]> {
    this.logger.log('Retrieving jobs with status "created"', 'JobsService');
    return this.jobsRepository.filter((job) => job.status === 'created');
  }

  async searchJobs(q: string, type: 'title' | 'status'): Promise<Job[]> {
    this.logger.log(
      `Searching jobs by ${type} with query: "${q}"`,
      'JobsService',
    );
    const query = q.toLowerCase();

    if (type === 'title') {
      return this.jobsRepository.filter((job) =>
        job.title.toLowerCase().includes(query),
      );
    } else if (type === 'status') {
      return this.jobsRepository.filter(
        (job) => job.status.toLowerCase() === query,
      );
    }

    return [];
  }
}
