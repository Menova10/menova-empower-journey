export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'podcast' | 'guide';
  url: string;
  thumbnail?: string;
  relatedSymptoms: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
} 