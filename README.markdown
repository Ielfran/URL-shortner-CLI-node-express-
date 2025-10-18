# URL Shortener

A super simple URL shortener API built with Node.js, Express, and MySQL. It supports creating short URLs, custom short codes, URL expiration, QR codes(text-based), access tracking, and rate limiting.

## Features
- Shorten URLs with optional custom codes and expiration dates.
- Redirect to original URLs with access count tracking.
- View URL details and access stats.
- Update/delete URLs with API key authentication.
- Generate QR codes for short URLs.
- Rate limiting to prevent abuse.
- Logging for monitoring and debugging.

## Prerequisites
- Node.js >= 18
- MySQL >= 8

## Installation
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd url-shortener-mysql
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up MySQL:
   ```bash
   mysql -u root -p < schema.sql
   ```
4. Create `.env` file:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=url_shortener_db
   API_KEY=your-secret-api-key
   BASE_URL=http://localhost:3000
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints
- **POST /shorten**: Create a short URL.
  ```json
  {"url": "https://example.com", "customCode": "mycode", "expiresInDays": 7}
  ```
- **GET /:shortCode**: Redirect to original URL.
- **GET /shorten/:shortCode**: Get URL details.
- **GET /shorten/:shortCode/stats**: Get access stats.
- **PUT /shorten/:shortCode**: Update URL (requires API key).
- **DELETE /shorten/:shortCode**: Delete URL (requires API key).

## How to Use
- **Create a Short URL**:
  ```bash
  curl -X POST -H "Content-Type: application/json" -d '{"url":"https://example.com","customCode":"mycode","expiresInDays":7}' http://localhost:3000/shorten
  ```
- **Redirect to Original URL**:
  Open `http://localhost:3000/mycode` in a browser to redirect to `https://example.com`.
- **Get URL Details**:
  ```bash
  curl http://localhost:3000/shorten/mycode
  ```
- **Get URL Stats**:
  ```bash
  curl http://localhost:3000/shorten/mycode/stats
  ```
- **Update a Short URL**:
  ```bash
  curl -X PUT -H "Content-Type: application/json" -d '{"url":"https://new-example.com","apiKey":"your-secret-api-key"}' http://localhost:3000/shorten/mycode
  ```
  Response: Updated URL details.
- **Delete a Short URL**:
  ```bash
  curl -X DELETE -H "Content-Type: application/json" -d '{"apiKey":"your-secret-api-key"}' http://localhost:3000/shorten/mycode
  ```
