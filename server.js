const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const cache = new Map();
const CACHE_DURATION = 1000 * 60 * 60;

app.post('/api/scrape-listing', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (cache.has(url)) {
    const cached = cache.get(url);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json({ images: cached.images });
    }
  }

  try {
    // Use a simple fetch to get the page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    // Extract image URLs using regex (simple but effective)
    const imageRegex = /(https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?)/gi;
    let images = [...new Set(html.match(imageRegex) || [])];
    
    // Filter for larger images (likely property photos)
    images = images.filter(img => 
      !img.includes('logo') && 
      !img.includes('icon') &&
      !img.includes('avatar') &&
      img.length > 50
    ).slice(0, 20); // Limit to 20 images

    cache.set(url, { images, timestamp: Date.now() });
    res.json({ images });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch listing images',
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
