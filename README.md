# Rewordly Web API

A Next.js backend API for the Rewordly Chrome Extension that uses OpenAI GPT to rewrite text for improved grammar, clarity, and fluency.

## Features

- **Text Rewriting**: Uses OpenAI GPT-3.5-turbo to improve text quality
- **CORS Support**: Configured for Chrome Extension compatibility
- **TypeScript**: Fully typed for better development experience
- **Error Handling**: Graceful error handling with meaningful messages
- **Vercel Ready**: Optimized for deployment on Vercel

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy the example environment file and add your OpenAI API key:
   ```bash
   cp env.local.example .env.local
   ```
   
   Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your-actual-openai-api-key-here
   ```

   **Supabase Auth (email OTP):** Login uses email + 6-digit code (or Google). New users are created automatically when they use the magic link flow. In Supabase Dashboard go to **Authentication → Email Templates**, edit the **Magic Link** template and use `{{ .Token }}` in the body (e.g. "Your code: {{ .Token }}") so users receive a code instead of a link.

3. **Development Server**
   ```bash
   npm run dev
   ```
   
   The API will be available at `https://rewordly-web.vercel.app/api/grammar`

## API Documentation

### POST /api/rewrite

Rewrites text using OpenAI GPT to improve grammar, clarity, and fluency.

**Request Body:**
```json
{
  "text": "Your text to rewrite here"
}
```

**Response:**
```json
{
  "rewritten": "Your improved text here"
}
```

**Error Response:**
```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

## Usage Examples

### cURL Request
```bash
curl -X POST http://localhost:3000/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This text needs to be rewrite for better grammar and clarity."
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/rewrite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'This text needs to be rewrite for better grammar and clarity.'
  })
});

const result = await response.json();
console.log(result.rewritten);
```

### Chrome Extension Usage
```javascript
// In your Chrome Extension
fetch('https://your-api-domain.com/api/rewrite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: selectedText
  })
})
.then(response => response.json())
.then(data => {
  console.log('Rewritten text:', data.rewritten);
})
.catch(error => {
  console.error('Error:', error);
});
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing or empty text)
- `405`: Method Not Allowed (non-POST requests)
- `500`: Internal Server Error (OpenAI API errors, missing API key)

## CORS Configuration

The API is configured with CORS headers for Chrome Extension compatibility:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your `OPENAI_API_KEY` to Vercel environment variables
4. Deploy

### Other Platforms

The API is compatible with any Node.js hosting platform. Make sure to:

1. Set the `OPENAI_API_KEY` environment variable
2. Configure your platform to handle Next.js API routes

## Development

- **TypeScript**: All code is written in TypeScript for type safety
- **OpenAI Integration**: Uses the official OpenAI Node.js SDK
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **CORS**: Configured for cross-origin requests from Chrome Extensions

## Project Structure

```
rewordly-web/
├── pages/
│   ├── api/
│   │   └── rewrite.ts          # Main API endpoint
│   └── index.tsx               # Landing page
├── lib/
│   └── openai.ts              # OpenAI helper functions
├── package.json
├── tsconfig.json
├── next.config.js
├── env.local.example
└── README.md
```

## License

This project is part of the Rewordly Chrome Extension. 