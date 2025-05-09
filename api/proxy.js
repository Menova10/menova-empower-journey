// api/proxy.js - Proxy for external API requests to avoid CORS issues
export default async function handler(req, res) {
  try {
    const { targetUrl, method, data, headers } = req.body;
    
    const response = await fetch(targetUrl, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    const responseData = await response.json();
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Proxy request failed:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
} 