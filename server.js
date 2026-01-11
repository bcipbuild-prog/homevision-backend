const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/scrape-listing', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // For now, return mock data
  // This lets us test the frontend while we fix the scraping
  const mockImages = [
    'https://photos.zillowstatic.com/fp/example1.jpg',
    'https://photos.zillowstatic.com/fp/example2.jpg',
    'https://photos.zillowstatic.com/fp/example3.jpg'
  ];

  res.json({ images: mockImages });
});

module.exports = app;
