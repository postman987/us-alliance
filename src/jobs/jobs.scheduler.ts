import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from './jobs.service';
import { JobsRepository } from './jobs.repository';
import { LoggerService } from '../logger/logger.service';
import { DatabaseMutex } from '../database/database-mutex';

@Injectable()
export class JobsScheduler {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobsRepository: JobsRepository,
    private readonly logger: LoggerService,
    private readonly mutex: DatabaseMutex,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    return this.mutex.runExclusive(async () => {
      this.logger.log(
        'Running scheduled task worker to process created jobs...',
        'JobsScheduler',
      );
      try {
        const createdJobs = await this.jobsService.getCreatedJobs();
        if (createdJobs.length === 0) {
          this.logger.log('No created jobs found to process.', 'JobsScheduler');
          return;
        }

        this.logger.log(
          `Found ${createdJobs.length} created jobs to complete.`,
          'JobsScheduler',
        );

        for (const job of createdJobs) {
          await this.jobsRepository.update(job.id, { status: 'completed' });
          this.logger.log(
            `Completed job: ID=${job.id}, Title="${job.title}"`,
            'JobsScheduler',
          );
        }

        this.logger.log(
          'Scheduled task worker finished processing.',
          'JobsScheduler',
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.stack : String(error);
        this.logger.error(
          'Error occurred during scheduled task worker execution',
          errMsg,
          'JobsScheduler',
        );
      }
    });
  }
}
