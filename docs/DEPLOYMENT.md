# 🚀 Deployment Guide

Deploy the AI Interview Assistant to production.

---

## Deployment Options

| Platform | Backend | Frontend | Database | Difficulty |
|----------|---------|----------|----------|------------|
| **Vercel + Railway** | Railway | Vercel | Supabase | ⭐ Easy |
| **Render** | Render | Render | Supabase | ⭐ Easy |
| **Docker** | Any VPS | Any VPS | Supabase | ⭐⭐ Medium |
| **AWS** | EC2/ECS | S3+CloudFront | RDS/Supabase | ⭐⭐⭐ Advanced |

---

## Option 1: Vercel + Railway (Recommended)

### Deploy Frontend to Vercel

1. **Push code to GitHub**

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repo
   - Set root directory to `frontend`

3. **Configure Environment Variables**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_URL=https://your-backend.railway.app
   ```

4. **Deploy**
   - Vercel auto-detects Vite
   - Builds and deploys automatically

### Deploy Backend to Railway

1. **Go to [railway.app](https://railway.app)**

2. **Create new project from GitHub**
   - Select your repo
   - Set root directory to `backend`

3. **Add Environment Variables**
   ```
   LLM_PROVIDER=gemini
   LLM_MODEL=gemini-2.0-flash
   LLM_API_KEY=your_gemini_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_service_role_key
   TRANSCRIPTION_PROVIDER=faster_whisper
   WHISPER_MODEL=base
   ```

4. **Set Start Command**
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

5. **Deploy**
   - Railway handles the rest
   - Note your app URL for frontend config

---

## Option 2: Render

### Backend

1. Create new **Web Service** on [render.com](https://render.com)
2. Connect GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (same as Railway)

### Frontend

1. Create new **Static Site**
2. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Add environment variables

---

## Option 3: Docker

### Dockerfile (Backend)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile (Frontend)

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - LLM_API_KEY=${LLM_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

---

## Production Checklist

### Security
- [ ] Use HTTPS everywhere
- [ ] Set secure CORS origins (not `*`)
- [ ] Never expose service role key to client
- [ ] Enable Supabase RLS policies
- [ ] Use environment variables for all secrets

### Performance
- [ ] Enable gzip compression
- [ ] Use CDN for static assets
- [ ] Consider GPU instance for faster transcription
- [ ] Set up health check endpoints

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging aggregation
- [ ] Monitor API response times
- [ ] Track Gemini API usage

### Scaling Considerations
- [ ] Use multiple Gemini API keys
- [ ] Consider paid Gemini tier for high usage
- [ ] Horizontal scaling for backend
- [ ] Database connection pooling

---

## Environment Variables Reference

### Backend (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `LLM_API_KEY` | Gemini API key(s) | `AIza...` or `key1,key2` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Service role key | `eyJ...` |

### Backend (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_MODEL` | `gemini-2.0-flash` | Gemini model |
| `WHISPER_MODEL` | `base` | Transcription model |
| `DEBUG` | `false` | Enable debug mode |

### Frontend (Required)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key |
| `VITE_API_URL` | Backend API URL |

---

## CORS Configuration

Update `backend/app/main.py` for production:

```python
origins = [
    "https://your-frontend-domain.com",
    "https://www.your-frontend-domain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Not ["*"] in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Troubleshooting

### Backend won't start
- Check Python version (needs 3.10+)
- Verify all env variables are set
- Check logs for import errors

### Frontend can't reach backend
- Verify `VITE_API_URL` is correct
- Check CORS configuration
- Ensure backend is running and accessible

### Transcription failing
- Ensure ffmpeg is installed
- Check audio file format support
- Try smaller Whisper model if OOM

### Gemini API errors
- Verify API key is valid
- Check quota limits
- Use multiple keys for rotation

---

*For local development, see [SETUP.md](./SETUP.md)*
