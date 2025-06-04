import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize GCP Storage
const storage = new Storage({
  projectId: process.env.VITE_GCP_PROJECT_ID,
  credentials: JSON.parse(process.env.VITE_GCP_CREDENTIALS || '{}'),
});

const BUCKET_NAME = process.env.VITE_GCP_BUCKET_NAME || '';

// Sample resources data
const resources = [
  {
    id: 'resource-1',
    title: 'Understanding Hot Flashes: A Comprehensive Guide',
    description: 'Learn about the causes, triggers, and management strategies for hot flashes during menopause. This guide includes evidence-based techniques and lifestyle changes to help you cope with this common symptom.',
    type: 'article',
    url: 'https://example.com/hot-flashes-guide',
    thumbnail: 'https://example.com/images/hot-flashes.jpg',
    relatedSymptoms: ['Hot Flashes', 'Night Sweats', 'Sleep Disturbances'],
    tags: ['Hot Flashes', 'Symptom Management', 'Lifestyle Changes'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'resource-2',
    title: 'Sleep Better During Menopause',
    description: 'Expert tips and strategies for improving sleep quality during menopause. Includes relaxation techniques, bedroom environment optimization, and natural remedies for better sleep.',
    type: 'guide',
    url: 'https://example.com/menopause-sleep-guide',
    thumbnail: 'https://example.com/images/sleep.jpg',
    relatedSymptoms: ['Sleep Disturbances', 'Night Sweats', 'Anxiety'],
    tags: ['Sleep', 'Wellness', 'Night Sweats'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'resource-3',
    title: 'Managing Mood Changes in Perimenopause',
    description: 'A podcast episode discussing emotional well-being during perimenopause, featuring expert insights on managing mood swings, anxiety, and depression.',
    type: 'podcast',
    url: 'https://example.com/mood-changes-podcast',
    thumbnail: 'https://example.com/images/mood.jpg',
    relatedSymptoms: ['Mood Changes', 'Anxiety', 'Depression'],
    tags: ['Mental Health', 'Emotional Wellness', 'Perimenopause'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'resource-4',
    title: 'Nutrition for Menopause: Essential Guide',
    description: 'Learn about the best foods and nutrients to support your body during menopause. Includes meal plans and recipes designed to help manage symptoms and maintain overall health.',
    type: 'guide',
    url: 'https://example.com/menopause-nutrition',
    thumbnail: 'https://example.com/images/nutrition.jpg',
    relatedSymptoms: ['Weight Gain', 'Fatigue', 'Hot Flashes'],
    tags: ['Nutrition', 'Diet', 'Wellness'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'resource-5',
    title: 'Exercise During Menopause: What You Need to Know',
    description: 'A comprehensive video guide on the best types of exercise during menopause, including strength training, cardio, and flexibility workouts tailored for menopausal women.',
    type: 'video',
    url: 'https://example.com/menopause-exercise-video',
    thumbnail: 'https://example.com/images/exercise.jpg',
    relatedSymptoms: ['Joint Pain', 'Weight Gain', 'Fatigue'],
    tags: ['Exercise', 'Physical Activity', 'Fitness'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function populateResources() {
  try {
    console.log('Starting resource population...');
    
    // Get bucket reference
    const bucket = storage.bucket(BUCKET_NAME);

    // Create the resources directory if it doesn't exist
    const resourcesDir = bucket.file('resources/');
    const [exists] = await resourcesDir.exists();
    if (!exists) {
      await bucket.file('resources/.keep').save('');
    }

    // Upload each resource
    for (const resource of resources) {
      console.log(`Uploading resource: ${resource.title}`);
      
      const file = bucket.file(`resources/${resource.id}.json`);
      await file.save(JSON.stringify(resource, null, 2), {
        contentType: 'application/json',
        metadata: {
          cacheControl: 'public, max-age=3600',
        },
      });
      
      console.log(`Successfully uploaded resource: ${resource.id}`);
    }

    console.log('Resource population completed successfully!');
  } catch (error) {
    console.error('Error populating resources:', error);
    process.exit(1);
  }
}

// Run the population script
populateResources(); 