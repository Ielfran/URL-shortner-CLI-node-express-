const db = require('../config/db');
const generateShortCode = require('../utils/shortCodeGenerator');
const logger = require("../utils/logger");
const QRCode = require('qrcode');

const URL_REGEX = /^(https?:\/\/)([\w.-]+)\.([a-z]{2,})(\/[\w\/.-]*)*\/?(\?[\w=&-]*)?(#[\w-]*)?$/i;

const formatUrlResponse = (dbRow, baseUrl) => ({
    id: dbRow.id,
    url: dbRow.original_url,
    shortCode: dbRow.short_code,
    shortUrl: `${baseUrl}/${dbRow.short_code}`,
    accessCount: dbRow.access_count,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
    expiresAt: dbRow.expires_at
});


exports.createShortUrl = async (req, res) => {
  const { url, customCode, expiresInDays } = req.body;

  if (!url || !URL_REGEX.test(url)) {
    return res.status(400).json({ error: 'A valid URL is required (e.g., https://example.com)' });
  }

  try {
    // Check for duplicate URL
    const [existingUrl] = await db.query('SELECT * FROM urls WHERE original_url = ?', [url]);
    if (existingUrl.length > 0) {
      return res.status(200).json(formatUrlResponse(existingUrl[0], process.env.BASE_URL));
    }

    let shortCode = customCode || await generateShortCode(db);
    if (customCode) {
      if (!/^[a-zA-Z0-9]{4,10}$/.test(customCode)) {
        return res.status(400).json({ error: 'Custom code must be 4-10 alphanumeric characters' });
      }
      const [existing] = await db.query('SELECT id FROM urls WHERE short_code = ?', [customCode]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Custom code already in use' });
      }
    }

    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

    const [result] = await db.query(
      'INSERT INTO urls (original_url, short_code, expires_at) VALUES (?, ?, ?)',
      [url, shortCode, expiresAt]
    );

    const [rows] = await db.query('SELECT * FROM urls WHERE id = ?', [result.insertId]);
    const response = formatUrlResponse(rows[0], process.env.BASE_URL);

    // Generate QR code
    response.qrCode = await QRCode.toDataURL(response.shortUrl);

    logger.info(`Created short URL: ${response.shortUrl}`);
    res.status(201).json(response);
  } catch (error) {
    logger.error(`Create short URL failed: ${error.message}`);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};


exports.redirectToOriginalUrl = async (req, res) => {
    const { shortCode } = req.params;
    if (!/^[a-zA-Z0-9]{4,10}$/.test(shortCode)) {
       return res.status(400).json({ error: 'Invalid short code' });
     }

     try {
       const [rows] = await db.query('SELECT original_url, expires_at FROM urls WHERE short_code = ?', [shortCode]);
       if (rows.length === 0) {
         logger.warn(`Short URL not found: ${shortCode}`);
         return res.status(404).json({ error: 'Short URL not found' });
       }

       if (rows[0].expires_at && new Date(rows[0].expires_at) < new Date()) {
         logger.warn(`Short URL expired: ${shortCode}`);
         return res.status(410).json({ error: 'Short URL has expired' });
       }

       // Log access
       await db.query(
         'INSERT INTO access_logs (url_id, ip_address) VALUES ((SELECT id FROM urls WHERE short_code = ?), ?)',
         [shortCode, req.ip]
       );
       await db.query('UPDATE urls SET access_count = access_count + 1 WHERE short_code = ?', [shortCode]);

       logger.info(`Redirecting ${shortCode} to ${rows[0].original_url}`);
       res.redirect(301, rows[0].original_url);
     } catch (error) {
       logger.error(`Redirect failed: ${error.message}`);
       res.status(500).json({ error: `Server error: ${error.message}` });
     }
};

exports.getUrlDetails = async (req, res) => {
     const { shortCode } = req.params;
     if (!/^[a-zA-Z0-9]{4,10}$/.test(shortCode)) {
       return res.status(400).json({ error: 'Invalid short code' });
     }

     try {
       const [rows] = await db.query('SELECT * FROM urls WHERE short_code = ?', [shortCode]);
       if (rows.length === 0) {
         logger.warn(`Short URL not found: ${shortCode}`);
         return res.status(404).json({ error: 'Short URL not found' });
       }
       const response = formatUrlResponse(rows[0], process.env.BASE_URL);
       delete response.accessCount;
       response.qrCode = await QRCode.toDataURL(response.shortUrl);
       res.status(200).json(response);
     } catch (error) {
       logger.error(`Get URL details failed: ${error.message}`);
       res.status(500).json({ error: `Server error: ${error.message}` });
     }
};

exports.getUrlStats = async (req, res) => {
     const { shortCode } = req.params;
     if (!/^[a-zA-Z0-9]{4,10}$/.test(shortCode)) {
       return res.status(400).json({ error: 'Invalid short code' });
     }

     try {
       const [rows] = await db.query('SELECT * FROM urls WHERE short_code = ?', [shortCode]);
       if (rows.length === 0) {
         logger.warn(`Short URL not found: ${shortCode}`);
         return res.status(404).json({ error: 'Short URL not found' });
       }

       const [logs] = await db.query(
         'SELECT accessed_at, ip_address FROM access_logs WHERE url_id = (SELECT id FROM urls WHERE short_code = ?)',
         [shortCode]
       );

       const response = formatUrlResponse(rows[0], process.env.BASE_URL);
       response.accessLogs = logs;
       res.status(200).json(response);
     } catch (error) {
       logger.error(`Get URL stats failed: ${error.message}`);
       res.status(500).json({ error: `Server error: ${error.message}` });
     }
};

exports.updateUrl = async (req, res) => {
     const { shortCode } = req.params;
     const { url, apiKey } = req.body;

     if (!url || !URL_REGEX.test(url)) {
       return res.status(400).json({ error: 'A valid URL is required' });
     }
     if (apiKey !== process.env.API_KEY) {
       return res.status(401).json({ error: 'Invalid API key' });
     }

     try {
       const [result] = await db.query(
         'UPDATE urls SET original_url = ? WHERE short_code = ?',
         [url, shortCode]
       );

       if (result.affectedRows === 0) {
         logger.warn(`Short URL not found for update: ${shortCode}`);
         return res.status(404).json({ error: 'Short URL not found' });
       }

       const [rows] = await db.query('SELECT * FROM urls WHERE short_code = ?', [shortCode]);
       logger.info(`Updated short URL: ${shortCode}`);
       res.status(200).json(formatUrlResponse(rows[0], process.env.BASE_URL));
     } catch (error) {
       logger.error(`Update URL failed: ${error.message}`);
       res.status(500).json({ error: `Server error: ${error.message}` });
     }
};

exports.deleteUrl = async (req, res) => {
     const { shortCode } = req.params;
     const { apiKey } = req.body;

     if (apiKey !== process.env.API_KEY) {
       return res.status(401).json({ error: 'Invalid API key' });
     }

     try {
       const [result] = await db.query('DELETE FROM urls WHERE short_code = ?', [shortCode]);
       if (result.affectedRows === 0) {
         logger.warn(`Short URL not found for deletion: ${shortCode}`);
         return res.status(404).json({ error: 'Short URL not found' });
       }
       logger.info(`Deleted short URL: ${shortCode}`);
       res.status(204).send();
     } catch (error) {
       logger.error(`Delete URL failed: ${error.message}`);
       res.status(500).json({ error: `Server error: ${error.message}` });
     }
};
