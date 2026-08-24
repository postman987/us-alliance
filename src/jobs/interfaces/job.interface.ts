export type JobStatus = 'created' | 'completed';

export interface Job {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
}

export interface JobRecord {
  [id: string]: Job;
}

export interface DatabaseSchema {
  jobs: JobRecord;
}
