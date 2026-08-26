import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { Job } from './interfaces/job.interface';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JobResponseDto } from './dto/job-response.dto';
import { ListJobsDto } from './dto/list-jobs.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a job' })
  @ApiCreatedResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid job payload' })
  async create(@Body() createJobDto: CreateJobDto): Promise<Job> {
    return this.jobsService.createJob(createJobDto);
  }

  @Get()
  @ApiOperation({ summary: 'List jobs with pagination' })
  @ApiOkResponse({ type: JobResponseDto, isArray: true })
  async findAll(@Query() listJobsDto: ListJobsDto): Promise<Job[]> {
    return this.jobsService.listJobs(listJobsDto.page, listJobsDto.count);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search jobs by title or status' })
  @ApiOkResponse({ type: JobResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Invalid search parameters' })
  async search(@Query() searchJobsDto: SearchJobsDto): Promise<Job[]> {
    return this.jobsService.searchJobs(searchJobsDto.q, searchJobsDto.type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by ID' })
  @ApiOkResponse({ type: JobResponseDto })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async findOne(@Param('id') id: string): Promise<Job> {
    return this.jobsService.getJobById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job' })
  @ApiOkResponse({ type: JobResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload or completed job' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<Job> {
    return this.jobsService.editJob(id, updateJobDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.jobsService.deleteJob(id);
  }
}
