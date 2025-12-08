# Developer Handoff: Video Upload Implementation

**From**: Winston (Architect) 🏗️
**To**: Developer
**Date**: 2025-11-15
**Priority**: High
**Estimated Time**: 4-6 hours

---

## What Was Built (Architecture Phase)

### Files Created

✅ **Storage Abstraction Layer**:
- `services/api/src/services/storage/types.ts` - Interface definitions
- `services/api/src/services/storage/local-storage.ts` - Local filesystem implementation
- `services/api/src/services/storage/index.ts` - Factory and singleton

✅ **Documentation**:
- `docs/architecture/video-upload-flow.md` - Complete architecture specification
- `docs/HANDOFF-video-upload-implementation.md` - This file

✅ **Configuration**:
- `.env.example` - Updated with storage configuration

### Current Status

⚠️ **TypeScript Compilation Errors** - Need fixing before implementation:
- Missing `@types/node` package
- Buffer, process, NodeJS namespace not found
- Minor type issues in local-storage.ts

---

## What Needs to Be Built (Implementation Phase)

### Phase 1: Fix TypeScript Errors (15 min)

**Task**: Install dependencies and resolve compilation errors

```bash
cd services/api
npm install --save-dev @types/node
npm run build  # Should succeed
```

**Files to Fix**:
- `src/services/storage/local-storage.ts` - Add proper typing
- `src/services/storage/index.ts` - Fix process.env types

**Success Criteria**: `npm run build` completes without errors

---

### Phase 2: Implement Storage API Endpoints (1-2 hours)

#### 2.1: Create Storage Routes

**File**: `services/api/src/routes/storage.routes.ts`

```typescript
import { Router } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new StorageController();

// Request upload URL (authenticated)
router.post('/request-upload', authenticate, controller.requestUploadUrl);

// Upload file with token (no auth - token-based)
router.put('/upload/:token', controller.uploadFile);

// Download/access file (authenticated)
router.get('/files/:fileName', authenticate, controller.getFile);

export default router;
```

**Register routes** in `src/index.ts`:
```typescript
import storageRoutes from './routes/storage.routes';
app.use('/api/storage', storageRoutes);
```

#### 2.2: Create Storage Controller

**File**: `services/api/src/controllers/storage.controller.ts`

**Methods to implement**:

1. **requestUploadUrl** - Generate presigned upload URL
   - Validate request body (fileName, contentType)
   - Call `storage.generateUploadUrl()`
   - Return { uploadUrl, fileName, expiresAt }

2. **uploadFile** - Handle file upload
   - Extract token from params
   - Parse multipart file upload
   - Validate file size (< 500MB)
   - Call `storage.saveUpload(token, fileBuffer)`
   - Return { fileName, size, uploadedAt }

3. **getFile** - Download file
   - Extract fileName from params
   - Verify user owns file (check database)
   - Call `storage.download(fileName)`
   - Stream file back to client

**Dependencies needed**:
```bash
npm install multer @types/multer
```

**Example Implementation Starter**:
```typescript
export class StorageController {
  private storage = getStorage();

  requestUploadUrl = async (req: Request, res: Response) => {
    try {
      const { fileName, contentType, metadata } = req.body;

      // Validate
      if (!fileName || !contentType) {
        return res.status(400).json({ error: 'fileName and contentType required' });
      }

      // Generate URL
      const result = await this.storage.generateUploadUrl(fileName, {
        contentType,
        metadata,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  uploadFile = async (req: Request, res: Response) => {
    // TODO: Implement using multer middleware
  };

  getFile = async (req: Request, res: Response) => {
    // TODO: Implement file streaming
  };
}
```

#### 2.3: Create Upload Middleware

**File**: `services/api/src/middleware/upload.middleware.ts`

**Purpose**: Handle multipart file uploads

```typescript
import multer from 'multer';

// Store in memory (we'll handle file saving via storage service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_VIDEO_SIZE_MB || '500') * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Validate video mime types
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files allowed'));
    }
    cb(null, true);
  },
});

export const uploadSingle = upload.single('file');
```

**Usage in controller**:
```typescript
router.put('/upload/:token', uploadSingle, controller.uploadFile);
```

---

### Phase 3: Implement Video Analysis Endpoints (1-2 hours)

#### 3.1: Create Video Routes

**File**: `services/api/src/routes/video.routes.ts`

```typescript
import { Router } from 'express';
import { VideoController } from '../controllers/video.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new VideoController();

// Create analysis job
router.post('/analyze', authenticate, controller.createAnalysisJob);

// Get video status
router.get('/:videoId/status', authenticate, controller.getStatus);

// Get analysis results
router.get('/:videoId/analysis', authenticate, controller.getAnalysis);

export default router;
```

#### 3.2: Create Video Controller

**File**: `services/api/src/controllers/video.controller.ts`

**Methods to implement**:

1. **createAnalysisJob**
   - Validate fileName exists in storage
   - Create database record (videos table)
   - Add job to Redis queue
   - Return videoId and jobId

2. **getStatus**
   - Query database for video status
   - Check job queue for progress
   - Return { status, progress, estimatedTime }

3. **getAnalysis**
   - Verify video processing complete
   - Fetch analysis results from database
   - Return full analysis data

**Database Schema** (Prisma):
```prisma
model Video {
  id          String   @id @default(cuid())
  userId      String
  fileName    String
  fileSize    Int
  duration    Int?     // seconds
  contentType String
  status      VideoStatus @default(QUEUED)
  metadata    Json?
  uploadedAt  DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
  analysis    Analysis?
}

enum VideoStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}
```

---

### Phase 4: Build Frontend Upload UI (2-3 hours)

#### 4.1: Create Upload Page

**File**: `services/web/src/app/upload/page.tsx`

**Features**:
- File selection
- Client-side validation (format, size, duration)
- Upload progress bar
- Metadata form (sport, fighters)
- Success redirect

**Example Structure**:
```typescript
'use client';

import { useState } from 'react';
import { VideoUploader } from '@/components/video/VideoUploader';
import { MetadataForm } from '@/components/video/MetadataForm';

export default function UploadPage() {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [videoId, setVideoId] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Upload Sparring Video</h1>

      {uploadState === 'idle' && (
        <>
          <VideoUploader onUploadComplete={(id) => {
            setVideoId(id);
            setUploadState('processing');
          }} />
        </>
      )}

      {uploadState === 'processing' && (
        <ProcessingStatus videoId={videoId} />
      )}
    </div>
  );
}
```

#### 4.2: Create Video Uploader Component

**File**: `services/web/src/components/video/VideoUploader.tsx`

**Features**:
- Drag-and-drop file input
- File validation
- Upload progress
- Error handling

**Dependencies**:
```bash
cd services/web
npm install axios
```

**Example Implementation**:
```typescript
'use client';

import { useState } from 'react';
import axios from 'axios';

interface VideoUploaderProps {
  onUploadComplete: (videoId: string) => void;
}

export function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    try {
      // Step 1: Request upload URL
      const { data } = await axios.post('/api/storage/request-upload', {
        fileName: file.name,
        contentType: file.type,
      });

      // Step 2: Upload to storage
      await axios.put(data.data.uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total!) * 100));
        },
      });

      // Step 3: Create analysis job
      const { data: jobData } = await axios.post('/api/videos/analyze', {
        fileName: data.data.fileName,
      });

      onUploadComplete(jobData.data.videoId);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="video/mp4,video/mov,video/webm"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      {file && (
        <div>
          <p>Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
          <button onClick={handleUpload}>Upload</button>
        </div>
      )}

      {progress > 0 && <ProgressBar progress={progress} />}
      {error && <ErrorMessage error={error} />}
    </div>
  );
}
```

#### 4.3: Create API Client

**File**: `services/web/src/lib/upload-client.ts`

**Purpose**: Centralized API calls

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export async function requestUploadUrl(fileName: string, contentType: string) {
  const { data } = await api.post('/api/storage/request-upload', {
    fileName,
    contentType,
  });
  return data.data;
}

export async function uploadVideo(uploadUrl: string, file: File, onProgress?: (progress: number) => void) {
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress((e.loaded / e.total) * 100);
      }
    },
  });
}

export async function createAnalysisJob(fileName: string, metadata?: any) {
  const { data } = await api.post('/api/videos/analyze', {
    fileName,
    metadata,
  });
  return data.data;
}
```

---

### Phase 5: Testing (1 hour)

#### 5.1: Manual Testing Checklist

- [ ] **Upload valid MP4**
  - File uploads successfully
  - Progress bar updates
  - Analysis job created
  - Redirect to processing page

- [ ] **Upload large file (> 500MB)**
  - Gets rejected with error message
  - Error is user-friendly

- [ ] **Upload invalid format (.txt)**
  - Gets rejected client-side
  - Error message displayed

- [ ] **Upload with expired token**
  - Simulate by waiting 16 minutes
  - Should return 400 error
  - User can retry

- [ ] **Check file saved correctly**
  - File exists in `./uploads` directory
  - Filename is sanitized
  - File is accessible via API

#### 5.2: API Testing with cURL

```bash
# 1. Request upload URL
curl -X POST http://localhost:3000/api/storage/request-upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"fileName":"test.mp4","contentType":"video/mp4"}'

# Response: { "uploadUrl": "...", "fileName": "...", "expiresAt": "..." }

# 2. Upload file
curl -X PUT http://localhost:3000/api/storage/upload/TOKEN_FROM_STEP_1 \
  -H "Content-Type: video/mp4" \
  --data-binary @test.mp4

# 3. Create analysis job
curl -X POST http://localhost:3000/api/videos/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"fileName":"test-TIMESTAMP.mp4"}'
```

#### 5.3: Unit Tests (Optional for MVP)

**File**: `services/api/src/services/storage/__tests__/local-storage.test.ts`

```typescript
import { LocalStorage } from '../local-storage';

describe('LocalStorage', () => {
  let storage: LocalStorage;

  beforeEach(() => {
    storage = new LocalStorage({
      uploadsDir: './test-uploads',
      baseUrl: 'http://localhost:3000',
    });
  });

  test('generateUploadUrl creates valid token', async () => {
    const result = await storage.generateUploadUrl('test.mp4', {
      contentType: 'video/mp4',
    });

    expect(result.uploadUrl).toContain('/upload/');
    expect(result.fileName).toContain('test');
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  test('sanitizeFileName prevents path traversal', () => {
    // Test implementation
  });
});
```

---

## Implementation Priority

### Must Have (MVP)

1. ✅ Fix TypeScript errors
2. ✅ Implement storage endpoints (request URL, upload, download)
3. ✅ Implement video analysis job creation
4. ✅ Build basic upload UI (file selection + upload)
5. ✅ Manual testing (upload one video successfully)

### Should Have (Post-MVP)

6. ⏳ Client-side video duration validation
7. ⏳ Better error handling and user messages
8. ⏳ Upload progress improvements
9. ⏳ Video metadata form (sport, fighters)

### Nice to Have (Future)

10. ⏳ Client-side video clipping (FFmpeg.wasm)
11. ⏳ Drag-and-drop file upload
12. ⏳ Multiple file upload
13. ⏳ Resume interrupted uploads
14. ⏳ Video preview before upload

---

## Common Issues & Solutions

### Issue 1: "Cannot find module '@/services/storage'"

**Solution**: Check `tsconfig.json` has path alias configured:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Issue 2: "ENOENT: no such file or directory, open './uploads/...'"

**Solution**: Ensure uploads directory exists. LocalStorage creates it automatically, but check permissions.

### Issue 3: "Payload Too Large" error

**Solution**: Increase Express body limit:
```typescript
app.use(express.json({ limit: '500mb' }));
app.use(express.raw({ type: 'video/*', limit: '500mb' }));
```

### Issue 4: CORS errors from frontend

**Solution**: Configure CORS in API:
```typescript
import cors from 'cors';
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001'
}));
```

---

## Testing Workflow

### Step-by-Step Test Plan

```bash
# 1. Start services
docker-compose up -d

# 2. Check API is running
curl http://localhost:3000/health

# 3. Test upload URL generation
curl -X POST http://localhost:3000/api/storage/request-upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","contentType":"video/mp4"}'

# 4. Open frontend
open http://localhost:3001/upload

# 5. Upload test video (use sample MP4)

# 6. Verify file exists
ls -lh services/api/uploads/

# 7. Check database
# Verify videos table has new record
```

---

## Success Criteria

### Definition of Done

✅ User can upload a video through the web UI
✅ File is saved to `./uploads` directory
✅ Database record created for video
✅ Analysis job added to Redis queue
✅ User redirected to processing/status page
✅ No TypeScript compilation errors
✅ No runtime errors in browser console
✅ API endpoints return proper HTTP status codes

---

## Architecture Reference

**Full specification**: `docs/architecture/video-upload-flow.md`

**Key sections**:
- Data flow diagrams
- API endpoint specs
- Storage abstraction design
- Frontend component architecture
- Error handling patterns
- Security considerations

---

## Questions? Issues?

If you encounter issues during implementation:

1. **Check architecture doc** - Most questions answered there
2. **Review existing code** - Storage abstraction already built
3. **Test incrementally** - Don't build everything at once
4. **Ask for clarification** - Better to ask than assume

---

## Time Estimate Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1 | Fix TypeScript errors | 15 min |
| 2 | Implement storage endpoints | 1-2 hours |
| 3 | Implement video endpoints | 1-2 hours |
| 4 | Build frontend upload UI | 2-3 hours |
| 5 | Testing & debugging | 1 hour |
| **Total** | **MVP Upload Flow** | **4-6 hours** |

---

## Next Steps After Upload Implementation

Once upload is working:

1. **Implement analysis pipeline** (Worker service)
2. **Build results display UI** (Analysis page)
3. **Add WebSocket notifications** (Real-time status updates)
4. **Implement user authentication** (If not done)
5. **Add video playback** (Review uploaded videos)

---

**Handoff Complete!** 🚀

You now have everything needed to implement the video upload flow. The architecture is solid, the abstraction layer is built, and the path is clear.

**Good luck, Developer!** 💻

— Winston (Architect) 🏗️
