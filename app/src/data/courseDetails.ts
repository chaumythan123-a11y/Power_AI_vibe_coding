import details from './courseDetails.json';

export interface CourseDetailContent {
  overview: string;
  prerequisites: string;
  outcomes: string[];
  modules: { title: string; sessions: number; topics: string[] }[];
  project: { title: string; description: string; deliverables: string[] };
  assessments: { title: string; description: string }[];
}

// The JSON file is shared by the browser and the server Function.
export const courseDetails = details as Record<string, CourseDetailContent>;
