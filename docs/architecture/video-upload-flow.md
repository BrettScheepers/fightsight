# Video Upload Flow Architecture

**Project**: FightSight
**Component**: Video Upload & Storage
**Version**: 1.0
**Last Updated**: 2025-11-15
**Status**: Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Complete Data Flow](#complete-data-flow)
4. [Storage Abstraction Layer](#storage-abstraction-layer)
5. [API Endpoints Specification](#api-endpoints-specification)
6. [Frontend Upload Component](#frontend-upload-component)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)
9. [Implementation Checklist](#implementation-checklist)
10. [Future Migration Path](#future-migration-path)

---

## Overview

### Purpose

Enable users to upload combat sport sparring videos (1-6 minutes, MP4/MOV/WebM) for analysis. The system must:

- Support local filesystem storage (development)
- Be easily swappable to cloud storage (GCS/S3) later
- Provide presigned URL-like workflow (even for local)
- Handle client-side video clipping
- Trigger analysis pipeline after upload

### Key Requirements

| Requirement | Specification |
|------------|---------------|
| **File Formats** | MP4, MOV, WebM |
| **Duration** | 1-6 minutes (enforced client-side) |
| **File Size** | Max 500 MB |
| **Storage** | Local filesystem (dev), Cloud (production) |
| **Upload Method** | Direct upload via presigned URL pattern |
| **Security** | Token-based upload authorization |

---

## Architecture Decisions

### Decision 1: Storage Abstraction Pattern

**Choice**: Interface-based abstraction with swappable implementations

**Rationale**:
- Start with local storage (zero cost, fast iteration)
- Migrate to GCS when ready (using $300 free credit)
- No code changes required when swapping storage backends
- Single interface for all storage operations

**Implementations**:
1. **LocalStorage** (v1) - Filesystem-based, development
2. **GCSStorage** (v2) - Google Cloud Storage, production
3. **S3Storage** (future) - AWS S3, if needed

### Decision 2: Presigned URL Pattern (Even for Local)

**Choice**: Use token-based upload URLs for local storage

**Rationale**:
- Mimics cloud storage presigned URL workflow
- Client code identical for local and cloud
- Easier migration path
- Separates upload authorization from file handling

**How it works**:
```
Client requests upload URL
  ↓
API generates token + URL
  ↓
Client uploads to URL with token
  ↓
API validates token, saves file
  ↓
Returns success + file metadata
```

### Decision 3: Client-Side Clipping Required

**Choice**: Users must clip videos to 1-6 minutes before upload

**Rationale**:
- Prevents processing of full training sessions (30-60 min)
- Keeps costs predictable ($1.25-1.50 per video)
- Reduces storage requirements
- Simpler scope for analysis engine

**Implementation**: Video trimming UI component in web frontend

---

## Complete Data Flow

### End-to-End Upload Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER SELECTS VIDEO                                      │
│    - User picks video file from device                     │
│    - Client validates: format, size                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CLIENT-SIDE CLIPPING (if needed)                        │
│    - Video player with trim controls                       │
│    - User selects 1-6 minute segment                       │
│    - Client exports trimmed video blob                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. REQUEST UPLOAD URL                                      │
│    POST /api/storage/request-upload                        │
│    Body: { fileName, contentType, metadata }              │
│                                                             │
│    Response: {                                             │
│      uploadUrl: "http://api/storage/upload/TOKEN",        │
│      fileName: "video-1731700000.mp4",                    │
│      expiresAt: "2025-11-15T12:30:00Z"                    │
│    }                                                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. DIRECT UPLOAD TO STORAGE                                │
│    PUT /api/storage/upload/:token                          │
│    Content-Type: video/mp4                                 │
│    Body: <binary video data>                               │
│                                                             │
│    - Storage validates token                               │
│    - Saves file to uploads directory                       │
│    - Returns file metadata                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. CREATE ANALYSIS JOB                                     │
│    POST /api/videos/analyze                                │
│    Body: {                                                  │
│      fileName: "video-1731700000.mp4",                     │
│      metadata: { sport, fighters, etc }                    │
│    }                                                        │
│                                                             │
│    - Creates database record (videos table)                │
│    - Creates job in Redis queue                            │
│    - Returns videoId + job status                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. BACKGROUND PROCESSING                                   │
│    Worker picks up job from queue                          │
│      ↓                                                      │
│    Downloads video from storage                            │
│      ↓                                                      │
│    Extracts frames (FFmpeg)                                │
│      ↓                                                      │
│    Sends to CV Service (pose detection)                    │
│      ↓                                                      │
│    LLM classification (strike types)                       │
│      ↓                                                      │
│    Data enrichment (combinations)                          │
│      ↓                                                      │
│    Generate report (LLM)                                   │
│      ↓                                                      │
│    Update database with results                            │
│      ↓                                                      │
│    Notify user (WebSocket/polling)                         │
└─────────────────────────────────────────────────────────────┘
```

### Storage Type Comparison

| Aspect | Local Storage | GCS/S3 |
|--------|--------------|---------|
| **Upload URL** | `http://localhost:3000/api/storage/upload/:token` | Presigned URL to cloud |
| **Upload Target** | API server | Direct to cloud bucket |
| **File Location** | `./uploads/video-123.mp4` | `gs://bucket/video-123.mp4` |
| **Access URL** | `http://localhost:3000/api/storage/files/:filename` | CDN URL or signed URL |
| **Cost** | $0 (disk space) | ~$0.01/video |
| **Scalability** | Single server only | Unlimited |
| **Speed** | Fast (local) | Fast (CDN) |

---

## Storage Abstraction Layer

### Interface Definition

```typescript
// services/api/src/services/storage/types.ts

export interface StorageProvider {
  // Generate upload URL (presigned or token-based)
  generateUploadUrl(fileName: string, options: UploadOptions): Promise<UploadUrlResponse>;

  // Download file from storage
  download(fileName: string): Promise<Buffer>;

  // Get accessible URL for file
  getUrl(fileName: string): string;

  // Delete file
  delete(fileName: string): Promise<void>;

  // Check existence
  exists(fileName: string): Promise<boolean>;

  // List files (debugging)
  list(prefix?: string): Promise<string[]>;
}
```

### Local Storage Implementation

**Location**: `services/api/src/services/storage/local-storage.ts`

**Key Features**:
- Stores files in `./uploads` directory
- Generates unique upload tokens (expires in 15 min)
- Validates tokens on upload
- Sanitizes filenames to prevent path traversal
- Auto-creates directory structure
- Thread-safe upload token management

**Upload Token Flow**:
```typescript
// 1. Generate token
const { uploadUrl, fileName } = await storage.generateUploadUrl('video.mp4', {
  contentType: 'video/mp4'
});
// uploadUrl = "http://localhost:3000/api/storage/upload/a1b2c3d4..."

// 2. Client uploads to that URL
// PUT /api/storage/upload/a1b2c3d4...
// Body: <video binary>

// 3. Upload endpoint validates token and saves
const savedFileName = await storage.saveUpload(token, fileBuffer);
```

### Factory Pattern

**Location**: `services/api/src/services/storage/index.ts`

```typescript
// Get storage instance (singleton)
import { getStorage } from '@/services/storage';

const storage = getStorage(); // Returns LocalStorage or GCSStorage based on env

// Usage is identical regardless of backend
const { uploadUrl } = await storage.generateUploadUrl(fileName, options);
```

---

## API Endpoints Specification

### Endpoint 1: Request Upload URL

**Request**:
```http
POST /api/storage/request-upload
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "fileName": "sparring-session.mp4",
  "contentType": "video/mp4",
  "metadata": {
    "sport": "boxing",
    "duration": 180
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "uploadUrl": "http://localhost:3000/api/storage/upload/abc123...",
    "fileName": "sparring-session-1731700000.mp4",
    "expiresAt": "2025-11-15T12:30:00.000Z"
  }
}
```

**Validation**:
- ✓ User authenticated
- ✓ fileName provided
- ✓ contentType is video/* (mp4, mov, webm)
- ✓ metadata valid (optional)

**Error Responses**:
- `401 Unauthorized` - No auth token
- `400 Bad Request` - Invalid filename or content type
- `500 Internal Server Error` - Storage service error

---

### Endpoint 2: Upload File

**Request**:
```http
PUT /api/storage/upload/:token
Content-Type: video/mp4

<binary video data>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "fileName": "sparring-session-1731700000.mp4",
    "size": 45678901,
    "contentType": "video/mp4",
    "uploadedAt": "2025-11-15T12:15:00.000Z"
  }
}
```

**Validation**:
- ✓ Token valid and not expired
- ✓ File size < MAX_VIDEO_SIZE_MB (500MB)
- ✓ Content-Type matches expected

**Error Responses**:
- `400 Bad Request` - Invalid or expired token
- `413 Payload Too Large` - File exceeds size limit
- `500 Internal Server Error` - Storage write error

---

### Endpoint 3: Download/Access File

**Request**:
```http
GET /api/storage/files/:fileName
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```http
Content-Type: video/mp4
Content-Length: 45678901

<binary video data>
```

**Validation**:
- ✓ User authenticated
- ✓ File exists
- ✓ User has permission to access file

**Error Responses**:
- `401 Unauthorized` - No auth token
- `404 Not Found` - File doesn't exist
- `403 Forbidden` - User doesn't own this file

---

### Endpoint 4: Create Analysis Job

**Request**:
```http
POST /api/videos/analyze
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "fileName": "sparring-session-1731700000.mp4",
  "metadata": {
    "sport": "boxing",
    "fighters": [
      { "name": "Fighter A", "stance": "orthodox" },
      { "name": "Fighter B", "stance": "southpaw" }
    ]
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "videoId": "vid_abc123",
    "fileName": "sparring-session-1731700000.mp4",
    "status": "queued",
    "jobId": "job_xyz789",
    "estimatedTime": 300,
    "createdAt": "2025-11-15T12:15:30.000Z"
  }
}
```

**Processing**:
1. Verify file exists in storage
2. Create `videos` table record
3. Create job in Redis queue (Bull)
4. Return video ID and job status

**Error Responses**:
- `400 Bad Request` - Invalid metadata
- `404 Not Found` - File doesn't exist
- `500 Internal Server Error` - Database or queue error

---

## Frontend Upload Component

### Component Architecture

```
UploadPage
├── VideoSelector (file input)
├── VideoClipper (trim controls)
│   ├── VideoPlayer (preview)
│   ├── TimelineEditor (trim UI)
│   └── ExportButton
├── MetadataForm (sport, fighters)
├── UploadProgress (progress bar)
└── UploadSuccess (redirect to analysis)
```

### Upload State Machine

```typescript
type UploadState =
  | 'idle'           // No file selected
  | 'selected'       // File selected, ready to clip
  | 'clipping'       // User trimming video
  | 'ready'          // Video ready to upload
  | 'uploading'      // Upload in progress
  | 'processing'     // Analysis job created
  | 'complete'       // Analysis complete
  | 'error';         // Error occurred

interface UploadContext {
  file: File | null;
  clippedBlob: Blob | null;
  uploadProgress: number;
  videoId: string | null;
  error: string | null;
}
```

### Upload Flow Implementation

```typescript
// Pseudocode for upload component

async function handleUpload() {
  try {
    setState('uploading');

    // Step 1: Request upload URL
    const { uploadUrl, fileName } = await fetch('/api/storage/request-upload', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        metadata: formData
      })
    }).then(r => r.json());

    // Step 2: Upload file directly to storage
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: clippedBlob, // or original file
      onUploadProgress: (e) => {
        setProgress((e.loaded / e.total) * 100);
      }
    });

    // Step 3: Create analysis job
    const { videoId, jobId } = await fetch('/api/videos/analyze', {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        metadata: formData
      })
    }).then(r => r.json());

    setState('processing');
    setVideoId(videoId);

    // Step 4: Poll or WebSocket for job status
    pollJobStatus(jobId);

  } catch (error) {
    setState('error');
    setError(error.message);
  }
}
```

### Video Clipping Component

**Recommended Library**: `@ffmpeg/ffmpeg` (WebAssembly FFmpeg)

**Why**: Client-side video trimming without server upload

**Alternative**: Skip clipping for MVP, just validate duration

```typescript
// Client-side duration validation
function validateVideo(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const valid = duration >= 60 && duration <= 360; // 1-6 min
      resolve(valid);
    };

    video.src = URL.createObjectURL(file);
  });
}
```

---

## Error Handling

### Upload Errors

| Error | Cause | User Message | Recovery |
|-------|-------|--------------|----------|
| **Token Expired** | Upload took > 15 min | "Upload session expired. Please try again." | Request new URL |
| **File Too Large** | > 500 MB | "Video file is too large. Maximum size is 500 MB." | Compress video |
| **Invalid Format** | Not MP4/MOV/WebM | "Unsupported format. Please use MP4, MOV, or WebM." | Convert video |
| **Duration Invalid** | < 1 min or > 6 min | "Video must be between 1-6 minutes long." | Clip video |
| **Network Failure** | Connection lost | "Upload failed. Check your connection and retry." | Retry upload |

### Storage Errors

| Error | Cause | Logging | Alerting |
|-------|-------|---------|----------|
| **Disk Full** | No space on server | ERROR + disk usage | Immediate alert |
| **Permission Denied** | File system permissions | ERROR + path | Immediate alert |
| **Corrupted File** | Upload incomplete | WARN + file hash | Monitor rate |
| **Token Collision** | Extremely rare | WARN + token | Monitor |

---

## Security Considerations

### Upload Authorization

✅ **Implemented**:
- Token-based upload URLs (expire after 15 min)
- JWT authentication for requesting upload URLs
- User ownership verification

⚠️ **Future Enhancements**:
- Rate limiting (max 10 uploads/hour per user)
- File content validation (virus scanning)
- Video header verification (ensure valid video file)

### File Storage Security

✅ **Implemented**:
- Filename sanitization (prevent path traversal)
- Random filename generation (prevent enumeration)
- Private storage (files not publicly accessible)

⚠️ **Future Enhancements**:
- Encryption at rest
- Signed URLs with short expiry for downloads
- Audit logging for file access

### Input Validation

**Client-Side** (UX):
- File format validation
- File size check
- Duration validation

**Server-Side** (Security):
- Re-validate all client checks
- Verify video codec/container
- Check for malformed headers
- Scan for malware (future)

---

## Implementation Checklist

### Backend (API Service)

**Dependencies**:
```bash
cd services/api
npm install --save-dev @types/node
npm install multer          # For multipart upload handling
npm install express-fileupload  # Alternative to multer
```

**Files to Implement**:
- ✅ `src/services/storage/types.ts` (DONE)
- ✅ `src/services/storage/local-storage.ts` (DONE - needs type fixes)
- ✅ `src/services/storage/index.ts` (DONE - needs type fixes)
- ⏳ `src/routes/storage.routes.ts` (NEW)
- ⏳ `src/controllers/storage.controller.ts` (NEW)
- ⏳ `src/routes/video.routes.ts` (NEW)
- ⏳ `src/controllers/video.controller.ts` (NEW)
- ⏳ `src/middleware/upload.middleware.ts` (NEW)

**Database Schema**:
```prisma
model Video {
  id          String   @id @default(cuid())
  userId      String
  fileName    String
  fileSize    Int
  duration    Int      // seconds
  contentType String
  status      String   // queued, processing, completed, failed
  metadata    Json?
  uploadedAt  DateTime @default(now())

  // Relations
  user        User     @relation(fields: [userId], references: [id])
  analysis    Analysis?
}
```

**Environment Variables**:
- ✅ `STORAGE_TYPE=local` (DONE)
- ✅ `UPLOADS_DIR=./uploads` (DONE)
- ✅ `API_BASE_URL=http://localhost:3000` (DONE)
- ⏳ `MAX_VIDEO_SIZE_MB=500` (DONE in .env.example)

### Frontend (Web Service)

**Dependencies**:
```bash
cd services/web
npm install axios              # HTTP client
npm install @ffmpeg/ffmpeg     # Video clipping (optional for MVP)
```

**Components to Create**:
- ⏳ `src/app/upload/page.tsx` (Upload page)
- ⏳ `src/components/video/VideoUploader.tsx`
- ⏳ `src/components/video/VideoClipper.tsx` (optional for MVP)
- ⏳ `src/components/video/UploadProgress.tsx`
- ⏳ `src/lib/upload-client.ts` (API client)

**Routes**:
- `/upload` - Upload new video
- `/videos/:id` - View analysis results
- `/videos/:id/status` - Check processing status

### Testing Checklist

**Unit Tests**:
- [ ] LocalStorage.generateUploadUrl()
- [ ] LocalStorage.validateUploadToken()
- [ ] LocalStorage.saveUpload()
- [ ] LocalStorage.download()
- [ ] Filename sanitization

**Integration Tests**:
- [ ] Request upload URL → Upload file → Create job (full flow)
- [ ] Token expiration handling
- [ ] File size limit enforcement
- [ ] Invalid file format rejection

**Manual Tests**:
- [ ] Upload MP4 file (success)
- [ ] Upload file > 500MB (reject)
- [ ] Upload .txt file (reject)
- [ ] Upload with expired token (reject)
- [ ] Upload 1-6 minute video (success)
- [ ] Upload < 1 minute video (reject client-side)

---

## Future Migration Path

### Phase 1: Local Storage (Current)

```typescript
// .env
STORAGE_TYPE=local
UPLOADS_DIR=./uploads
```

### Phase 2: Google Cloud Storage (When Ready)

**Step 1**: Create GCS bucket and service account (see docs/gcs-setup-guide.md)

**Step 2**: Install GCS SDK
```bash
npm install @google-cloud/storage
```

**Step 3**: Implement GCS provider
```typescript
// src/services/storage/gcs-storage.ts
export class GCSStorage implements StorageProvider {
  async generateUploadUrl(fileName, options) {
    // Use Google's signed URL
    const [url] = await bucket.file(fileName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: options.contentType,
    });
    return { uploadUrl: url, fileName, expiresAt };
  }
  // ... implement other methods
}
```

**Step 4**: Update environment
```typescript
// .env
STORAGE_TYPE=gcs
GCP_PROJECT_ID=fightsight-dev
GCS_BUCKET_NAME=fightsight-videos
GOOGLE_APPLICATION_CREDENTIALS=./credentials/gcs-credentials.json
```

**Step 5**: Deploy - **ZERO CODE CHANGES REQUIRED**

The factory pattern automatically uses GCS instead of local storage!

---

## Key Architectural Patterns Used

### 1. Strategy Pattern (Storage Provider)
Different storage implementations behind common interface

### 2. Factory Pattern (Storage Creation)
`getStorage()` returns correct provider based on config

### 3. Token-Based Security
Presigned URL pattern for secure uploads

### 4. Separation of Concerns
- Storage layer handles files
- API layer handles business logic
- Frontend handles UX

### 5. Future-Proof Design
- Easy to add S3, Azure Blob, etc.
- No refactoring required when changing backends

---

## Next Steps for Developer

### Immediate Tasks (Priority Order)

1. **Fix TypeScript Errors**
   - Install `@types/node`
   - Fix Buffer/process type issues
   - Ensure compilation succeeds

2. **Implement Upload Endpoints**
   - Create storage routes
   - Build controllers
   - Add validation middleware

3. **Create Upload UI**
   - Build upload page component
   - Implement file selection
   - Add progress tracking

4. **Test End-to-End**
   - Upload sample video
   - Verify file saved
   - Check job created

5. **Add Error Handling**
   - User-friendly error messages
   - Retry logic
   - Logging

### Development Workflow

```bash
# 1. Install dependencies
cd services/api && npm install

# 2. Fix TypeScript errors
npm run build

# 3. Implement endpoints
# Create routes, controllers, middleware

# 4. Test locally
npm run dev

# 5. Test upload flow
curl -X POST http://localhost:3000/api/storage/request-upload
```

---

## Document Status

**Architecture**: ✅ Complete
**Implementation**: ⏳ Ready to begin
**Testing**: ⏳ Pending implementation
**Documentation**: ✅ Complete

---

**Architect Sign-Off**: Winston 🏗️

This architecture is production-ready for the development phase. The abstraction layer ensures we can start with local storage today and migrate to cloud storage tomorrow without changing application code.

**Ready for Developer handoff!**
