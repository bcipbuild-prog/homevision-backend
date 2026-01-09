const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

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

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    let images = [];
    
    if (url.includes('zillow.com')) {
      images = await page.evaluate(() => {
        const imgs = [];
        document.querySelectorAll('picture img[alt*="photo"], img[alt*="view"]').forEach(img => {
          const src = img.src || img.dataset.src;
          if (src && src.startsWith('http') && !imgs.includes(src)) {
            imgs.push(src);
          }
        });
        return imgs;
      });
    } else if (url.includes('redfin.com')) {
      images = await page.evaluate(() => {
        const imgs = [];
        document.querySelectorAll('img[class*="photo"], img[class*="Photo"]').forEach(img => {
          const src = img.src || img.dataset.src;
          if (src && src.startsWith('http') && !imgs.includes(src)) {
            imgs.push(src);
          }
        });
        return imgs;
      });
    } else if (url.includes('realtor.com')) {
      images = await page.evaluate(() => {
        const imgs = [];
        document.querySelectorAll('img[data-testid*="photo"], picture img').forEach(img => {
          const src = img.src || img.dataset.src;
          if (src && src.startsWith('http') && !imgs.includes(src)) {
            imgs.push(src);
          }
        });
        return imgs;
      });
    } else {
      images = await page.evaluate(() => {
        const imgs = [];
        document.querySelectorAll('img').forEach(img => {
          const src = img.src;
          if (src && src.startsWith('http') && img.width > 300 && img.height > 200) {
            imgs.push(src);
          }
        });
        return imgs;
      });
    }

    images = images.filter((img, index, self) => 
      self.indexOf(img) === index && 
      !img.includes('logo') && 
      !img.includes('icon')
    );

    cache.set(url, { images, timestamp: Date.now() });
    res.json({ images });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch listing images',
      details: error.message 
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
