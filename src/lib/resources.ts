import { Resource } from '../types/resources';

// Mock resources for when backend is not available
const MOCK_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Understanding Menopause: A Complete Guide',
    description: 'Comprehensive guide covering all aspects of menopause, from symptoms to treatment options.',
    type: 'article',
    url: 'https://www.menopause.org/for-women/menopause-faqs-understanding-the-symptoms',
    tags: ['menopause', 'health', 'guide'],
    relatedSymptoms: ['hot flashes', 'mood changes', 'sleep problems'],
    thumbnail: 'https://via.placeholder.com/400x200/92D9A9/FFFFFF?text=Menopause+Guide',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Managing Hot Flashes Naturally',
    description: 'Evidence-based natural approaches to managing hot flashes during menopause.',
    type: 'article',
    url: 'https://www.mayoclinic.org/diseases-conditions/hot-flashes/diagnosis-treatment/drc-20352790',
    tags: ['hot flashes', 'natural remedies', 'wellness'],
    relatedSymptoms: ['hot flashes', 'night sweats'],
    thumbnail: 'https://via.placeholder.com/400x200/7bc492/FFFFFF?text=Hot+Flashes',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Nutrition During Menopause',
    description: 'Essential nutrition tips and dietary recommendations for menopausal women.',
    type: 'guide',
    url: 'https://www.healthline.com/health/menopause/diet',
    tags: ['nutrition', 'diet', 'health'],
    relatedSymptoms: ['weight gain', 'energy levels'],
    thumbnail: 'https://via.placeholder.com/400x200/6ab583/FFFFFF?text=Nutrition+Guide',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Exercise for Menopausal Women',
    description: 'Safe and effective exercise routines tailored for women going through menopause.',
    type: 'guide',
    url: 'https://www.womenshealth.gov/menopause/menopause-and-your-health/staying-healthy-after-menopause',
    tags: ['exercise', 'fitness', 'wellness'],
    relatedSymptoms: ['joint pain', 'mood changes', 'weight gain'],
    thumbnail: 'https://via.placeholder.com/400x200/5a9f72/FFFFFF?text=Exercise+Guide',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Sleep Solutions for Menopause',
    description: 'Practical tips for improving sleep quality during menopause transition.',
    type: 'article',
    url: 'https://www.sleepfoundation.org/women-sleep/menopause-and-sleep',
    tags: ['sleep', 'insomnia', 'wellness'],
    relatedSymptoms: ['sleep problems', 'night sweats', 'anxiety'],
    thumbnail: 'https://via.placeholder.com/400x200/4a8f61/FFFFFF?text=Sleep+Solutions',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Function to fetch all resources (articles)
export const fetchResources = async (): Promise<Resource[]> => {
  // For now, return the curated articles which are working well
  // In the future, this could fetch from a real backend API or CMS
  return MOCK_RESOURCES;
};

// Note: Upload, update, and delete functions are not supported with YouTube API
// These would require a backend API for managing user-uploaded resources 