import { Resource } from '../types/resources';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Function to fetch all resources from backend API
export const fetchResources = async (): Promise<Resource[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/resources`);
    if (!response.ok) {
      throw new Error('Failed to fetch resources');
    }
    const resources = await response.json();
    return resources;
  } catch (error) {
    console.error('Error fetching resources:', error);
    return [];
  }
};

// Function to upload a new resource
export const uploadResource = async (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Promise<Resource | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload resource');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading resource:', error);
    return null;
  }
};

// Function to update an existing resource
export const updateResource = async (id: string, updates: Partial<Resource>): Promise<Resource | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update resource');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating resource:', error);
    return null;
  }
};

// Function to delete a resource
export const deleteResource = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
      method: 'DELETE',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error deleting resource:', error);
    return false;
  }
}; 