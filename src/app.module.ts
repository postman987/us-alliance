import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppService } from './app.service';
import { LoggerModule } from './logger/logger.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [ScheduleModule.forRoot(), LoggerModule, JobsModule],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
