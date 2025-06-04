import express from 'express';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize GCP Storage
const storage = new Storage({
  projectId: process.env.VITE_GCP_PROJECT_ID,
  credentials: JSON.parse(process.env.VITE_GCP_CREDENTIALS || '{}'),
});

const BUCKET_NAME = process.env.VITE_GCP_BUCKET_NAME || '';

// Get all resources
router.get('/resources', async (req, res) => {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const [files] = await bucket.getFiles({ prefix: 'resources/' });
    const resources = [];

    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const [content] = await file.download();
        const resource = JSON.parse(content.toString());
        resources.push(resource);
      }
    }

    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// Create a new resource
router.post('/resources', async (req, res) => {
  try {
    const resource = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newResource = {
      ...resource,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(`resources/${id}.json`);
    await file.save(JSON.stringify(newResource, null, 2));

    res.status(201).json(newResource);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// Update a resource
router.put('/resources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(`resources/${id}.json`);
    const [exists] = await file.exists();

    if (!exists) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const [content] = await file.download();
    const existingResource = JSON.parse(content.toString());

    const updatedResource = {
      ...existingResource,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await file.save(JSON.stringify(updatedResource, null, 2));
    res.json(updatedResource);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// Delete a resource
router.delete('/resources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(`resources/${id}.json`);
    const [exists] = await file.exists();

    if (!exists) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    await file.delete();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router; 