import { Module } from '@nestjs/common';
import { JsonDB, Config } from 'node-json-db';
import * as path from 'path';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsRepository } from './jobs.repository';
import { JobsScheduler } from './jobs.scheduler';

@Module({
  controllers: [JobsController],
  providers: [
    {
      provide: 'JSON_DB',
      useFactory: async () => {
        const dbPath = path.resolve(process.cwd(), 'jobs');
        const db = new JsonDB(new Config(dbPath, true, true, '/'));

        if (!(await db.exists('/jobs'))) {
          await db.push('/jobs', {});
        }
        return db;
      },
    },
    JobsService,
    JobsRepository,
    JobsScheduler,
  ],
  exports: [JobsService, JobsRepository, 'JSON_DB'],
})
export class JobsModule {}
