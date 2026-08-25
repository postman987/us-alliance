import { ApiProperty } from '@nestjs/swagger';
import type { JobStatus } from '../interfaces/job.interface';

export class JobResponseDto {
  @ApiProperty({ example: '436b4a80-a6cf-4fe0-bebc-6b0fcdf324b7' })
  id!: string;

  @ApiProperty({ example: 'Deploy API' })
  title!: string;

  @ApiProperty({ example: 'Deploy the API to the production environment' })
  description!: string;

  @ApiProperty({ enum: ['created', 'completed'], example: 'created' })
  status!: JobStatus;
}
