# Deployment Guide

## Quick Start (Vercel - Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/rewordly-web.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login with GitHub
   - Click "New Project"
   - Import your repository
   - Add environment variable: `OPENAI_API_KEY`
   - Deploy!

## Environment Variables

Make sure to set these environment variables on your hosting platform:

### Required
- `OPENAI_API_KEY`: Your OpenAI API key

### Optional
- `NODE_ENV`: Set to `production` for production builds

## Platform-Specific Instructions

### Vercel
1. Connect your GitHub repository
2. Add environment variables in the Vercel dashboard
3. Deploy automatically on push

### Netlify
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables in Netlify dashboard

### Railway
1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy automatically

### Heroku
1. Create a new Heroku app
2. Connect your GitHub repository
3. Add environment variables:
   ```bash
   heroku config:set OPENAI_API_KEY=your-key-here
   ```
4. Deploy

### Docker
1. Create a `Dockerfile`:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. Build and run:
   ```bash
   docker build -t rewordly-web .
   docker run -p 3000:3000 -e OPENAI_API_KEY=your-key rewordly-web
   ```

## Testing Your Deployment

After deployment, test your API:

```bash
curl -X POST https://your-domain.com/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This text needs to be rewrite for better grammar and clarity."
  }'
```

## Chrome Extension Configuration

Update your Chrome Extension's manifest.json to include your API domain:

```json
{
  "permissions": [
    "https://your-domain.com/*"
  ]
}
```

And update your extension code to use the deployed URL:

```javascript
const API_URL = 'https://your-domain.com/api/rewrite';
```

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   - Error: "OPENAI_API_KEY is not configured"
   - Solution: Set the environment variable on your hosting platform

2. **CORS Errors**
   - Error: "Access to fetch at... has been blocked by CORS policy"
   - Solution: The API is already configured for CORS, make sure you're using the correct URL

3. **Build Failures**
   - Error: TypeScript compilation errors
   - Solution: Run `npm run build` locally to check for errors before deploying

4. **Rate Limiting**
   - Error: OpenAI API rate limit exceeded
   - Solution: Consider upgrading your OpenAI plan or implementing rate limiting

### Health Check

Test your deployment with this simple health check:

```bash
curl https://your-domain.com/api/rewrite \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"text":"test"}' \
  -w "\nStatus: %{http_code}\n"
```

Expected response:
```json
{
  "rewritten": "test"
}
``` 