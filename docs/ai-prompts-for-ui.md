# AI Frontend Generation Prompts for FightSight MVP

**Generated:** 2025-12-08
**For use with:** v0.dev, Lovable.ai, or similar AI frontend tools
**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS

---

## 📋 Project Context (Use this first in every prompt)

```
You are building FightSight, an AI-powered combat sports sparring video analysis platform. The app analyzes uploaded sparring videos (boxing, kickboxing, muay thai) and provides insights on strike detection, performance metrics, and actionable feedback.

**Tech Stack:**
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS (default config)
- React hooks for state management
- Native fetch API (no axios)

**Design Style:**
- Mobile-first responsive design
- Clean, minimal interface with focus on combat sports
- Primary color: blue-600 (#2563EB)
- System fonts (Tailwind defaults)
- Card-based layouts with subtle shadows

**API Base URL:** http://localhost:3000 (defined in .env as NEXT_PUBLIC_API_URL)
```

---

## 🎯 Prompt 1: Shared Layout Component

**Use this to create the consistent header/navigation across all pages**

```markdown
# High-Level Goal
Create a shared Next.js App Router layout component with a clean, minimal header navigation that works across all pages of FightSight.

# Detailed Step-by-Step Instructions

1. Create or update the file `services/web/src/app/layout.tsx`
2. Import the Tailwind CSS stylesheet
3. Add proper TypeScript metadata for SEO (title: "FightSight", description: "AI-powered combat sports video analysis")
4. Create a simple header component within the layout that includes:
   - Left side: "🥊 FightSight" logo/text (clicking returns to home "/")
   - Right side: "Upload" button that links to "/upload"
   - Header should be fixed at the top with a white background and subtle bottom border
   - Header height should be 64px (h-16)
5. The header should be responsive:
   - Mobile (<768px): Logo and upload button should still fit, logo text can shrink to just "FightSight"
   - Desktop: Full width with max-width container
6. Below the header, render {children} with appropriate padding-top to account for fixed header
7. Use Tailwind classes exclusively for all styling
8. Ensure accessibility: proper semantic HTML (header, nav tags), aria-labels where needed

# Code Examples, Data Structures & Constraints

**Expected Header Structure:**
```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
  <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
    <Link href="/">🥊 FightSight</Link>
    <Link href="/upload">Upload</Link>
  </nav>
</header>
```

**Styling Guidelines:**
- Logo: text-xl font-bold text-gray-900 hover:text-blue-600
- Upload button: bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700
- Use transition-colors for smooth hover effects

**Do NOT:**
- Add a footer
- Include complex navigation menus or dropdowns
- Add user authentication UI (not in MVP)
- Use custom CSS files or styled-components

# Define a Strict Scope

**Only modify:**
- `services/web/src/app/layout.tsx`

**Do NOT modify:**
- Any page files (page.tsx)
- Any component files
- Any other configuration files
```

---

## 🏠 Prompt 2: Landing Page

**Use this to improve the existing home page**

```markdown
# High-Level Goal
Transform the FightSight landing page into a clean, conversion-focused hero section that immediately communicates value and drives users to upload their first video.

# Detailed Step-by-Step Instructions

1. Update the file `services/web/src/app/page.tsx`
2. Remove all inline styles - use Tailwind CSS classes exclusively
3. Create a centered hero section with:
   - Large, bold headline: "AI-Powered Sparring Analysis"
   - Subheadline: "Upload your combat sports video and get instant feedback on strikes, technique, and performance"
   - Primary CTA button: "Upload Your First Video" (links to /upload)
   - 3 benefit bullets below the CTA explaining key features
4. Layout structure:
   - Full viewport height centered content (min-h-screen flex)
   - Max width container (max-w-2xl mx-auto)
   - Vertical spacing between elements (space-y-6)
5. Mobile responsive:
   - Headline: text-3xl on mobile, text-5xl on desktop
   - Padding: px-4 on mobile, px-8 on desktop
   - Button: full width on mobile, auto width centered on desktop
6. Use semantic HTML: main, h1, h2, ul, li tags appropriately

# Code Examples, Data Structures & Constraints

**Hero Section Structure:**
```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          AI-Powered Sparring Analysis
        </h1>
        <p className="text-xl text-gray-600">
          Upload your combat sports video and get instant feedback
        </p>
        <Link
          href="/upload"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Upload Your First Video
        </Link>
        <ul className="space-y-3 text-left text-gray-700">
          <li>✓ Detect strikes automatically</li>
          <li>✓ Track performance metrics</li>
          <li>✓ Get actionable feedback</li>
        </ul>
      </div>
    </main>
  );
}
```

**Color Palette:**
- Primary: blue-600 (#2563EB)
- Text: gray-900 (headlines), gray-600 (body), gray-700 (bullets)
- Background: gray-50

**Do NOT:**
- Include the status dashboard with API links (remove that)
- Add footer, testimonials, or pricing sections
- Include images or videos (emoji only for now)
- Add forms or email capture

# Define a Strict Scope

**Only modify:**
- `services/web/src/app/page.tsx`

**Do NOT modify:**
- Layout file
- Any other pages
- Component files
```

---

## 📤 Prompt 3: Upload Page (Enhancement)

**Use this to polish the existing upload page**

```markdown
# High-Level Goal
Enhance the existing FightSight upload page to be more visually polished while keeping all current functionality intact (file selection, validation, upload progress).

# Detailed Step-by-Step Instructions

1. Update `services/web/src/app/upload/page.tsx` - keep all existing logic, improve visuals only
2. Wrap everything in a clean, centered layout:
   - Min height screen with gray-50 background
   - Centered card (max-w-2xl) with white background and shadow
   - Proper padding (p-8)
3. Improve the heading section:
   - H1: "Upload Sparring Video" (text-3xl font-bold)
   - Subtext below: "Upload your video for AI-powered analysis" (text-gray-600)
4. Keep the VideoUploader component exactly as-is, but ensure parent container styling is clean
5. Keep the blue info box at bottom with supported formats
6. Ensure mobile responsiveness:
   - Card: full width on mobile (no max-width), max-w-2xl on desktop
   - Padding: p-6 on mobile, p-8 on desktop

# Code Examples, Data Structures & Constraints

**Page Structure:**
```tsx
export default function UploadPage() {
  const [uploadState, setUploadState] = useState<'idle' | 'processing'>('idle');
  const [videoId, setVideoId] = useState<string | null>(null);

  const handleUploadComplete = (id: string) => {
    setVideoId(id);
    setUploadState('processing');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Upload Sparring Video</h1>
          <p className="text-gray-600 mb-8">
            Upload your video for AI-powered analysis
          </p>

          {uploadState === 'idle' && (
            <VideoUploader onUploadComplete={handleUploadComplete} />
          )}

          {uploadState === 'processing' && videoId && (
            <div>
              <ProcessingStatus videoId={videoId} />
              <button
                onClick={() => {
                  setUploadState('idle');
                  setVideoId(null);
                }}
                className="mt-6 w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Upload Another Video
              </button>
            </div>
          )}
        </div>

        {/* Keep existing blue info box */}
      </div>
    </div>
  );
}
```

**Do NOT:**
- Change VideoUploader or ProcessingStatus component logic
- Remove the "Upload Another Video" button
- Remove the supported formats info box
- Add file history or additional features

# Define a Strict Scope

**Only modify:**
- `services/web/src/app/upload/page.tsx` (visual improvements only)

**Do NOT modify:**
- VideoUploader component
- ProcessingStatus component
- Upload logic or API calls
```

---

## 📊 Prompt 4: Results Page (NEW - Most Important)

**Use this to create the missing results page**

```markdown
# High-Level Goal
Create a new results page that displays analysis insights after video processing is complete. This is the final step in the user flow and must clearly communicate the analysis results.

# Detailed Step-by-Step Instructions

1. Create a new file: `services/web/src/app/results/[videoId]/page.tsx`
2. This is a Next.js dynamic route that receives videoId as a parameter
3. On page load, fetch analysis data from the API:
   - Endpoint: `GET ${NEXT_PUBLIC_API_URL}/api/videos/${videoId}/analysis`
   - Expected response structure (from your existing API):
     ```json
     {
       "success": true,
       "data": {
         "videoId": "uuid",
         "analysisSession": {
           "id": "uuid",
           "status": "completed",
           "sessionFighters": [...],
           "strikeEvents": [...],
           "combinations": [...],
           "analysisReports": [...]
         }
       }
     }
     ```
4. Create three main sections on the page:
   - **Header**: Success message with checkmark + "Analysis Complete"
   - **Overview Card**: Key metrics (total strikes, duration, strike rate)
   - **Strike Breakdown Card**: List of strike types with counts
5. Add a primary CTA button at bottom: "Upload Another Video" (links to /upload)
6. Handle three states:
   - **Loading**: Show skeleton loaders or spinner
   - **Success**: Display analysis data
   - **Error**: Show error message with retry option
7. Mobile responsive:
   - Cards stack vertically on mobile
   - Metrics display in 2-column grid on mobile, 3-column on desktop
8. Use TypeScript for all type definitions

# Code Examples, Data Structures & Constraints

**Page Structure:**
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface AnalysisData {
  videoId: string;
  analysisSession: {
    id: string;
    status: string;
    strikeEvents: Array<{
      strikeType: string;
      // ... other fields
    }>;
    // ... other fields
  };
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}/analysis`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch analysis');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [videoId]);

  if (loading) {
    return <div>Loading...</div>; // TODO: Add spinner
  }

  if (error) {
    return <div>Error: {error}</div>; // TODO: Style error state
  }

  // Calculate metrics from data
  const totalStrikes = data?.analysisSession.strikeEvents.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Success Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900">Analysis Complete</h1>
        </div>

        {/* Overview Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📊 Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold text-blue-600">{totalStrikes}</div>
              <div className="text-sm text-gray-600">Total Strikes</div>
            </div>
            {/* Add more metrics */}
          </div>
        </div>

        {/* Strike Breakdown Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🎯 Strike Breakdown
          </h2>
          {/* TODO: Group strikes by type and display counts */}
        </div>

        {/* CTA */}
        <Link
          href="/upload"
          className="block w-full bg-blue-600 text-white text-center py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Upload Another Video
        </Link>
      </div>
    </div>
  );
}
```

**API Integration Notes:**
- Use native fetch (not axios)
- API returns nested structure - you'll need to navigate `result.data.analysisSession`
- strikeEvents array contains all detected strikes with type, timestamp, confidence
- You may need to aggregate/count strikes by type for the breakdown

**Styling:**
- Match the existing card style from upload page (white bg, rounded-lg, shadow-lg)
- Use blue-600 for primary color (metrics numbers)
- Use gray-600 for secondary text (labels)
- Icons: Use emoji for simplicity (📊, 🎯, ✅)

**Do NOT:**
- Add video player (not in MVP)
- Add export/download features
- Add comparison with other videos
- Modify the API response structure

# Define a Strict Scope

**Create these new files:**
- `services/web/src/app/results/[videoId]/page.tsx`

**Do NOT modify:**
- API endpoints or backend
- Other page files
- Component files
```

---

## 🔄 Prompt 5: Processing Status Enhancement

**OPTIONAL - Only if you want to improve the existing component**

```markdown
# High-Level Goal
Polish the existing ProcessingStatus component to auto-redirect to results page when analysis is complete.

# Detailed Step-by-Step Instructions

1. Update `services/web/src/components/video/ProcessingStatus.tsx`
2. Import useRouter from next/navigation
3. When status becomes 'completed', automatically navigate to results page:
   ```tsx
   if (statusData.analysisStatus === 'completed') {
     router.push(`/results/${videoId}`);
   }
   ```
4. Keep all existing UI and polling logic
5. Only change: replace console.log with router.push navigation

# Code Examples, Data Structures & Constraints

```tsx
import { useRouter } from 'next/navigation';

// Inside component
const router = useRouter();

// In useEffect where you check status
if (statusData.analysisStatus === 'completed') {
  router.push(`/results/${videoId}`);
}
```

**Do NOT:**
- Change the polling interval
- Modify the UI
- Change error handling

# Define a Strict Scope

**Only modify:**
- `services/web/src/components/video/ProcessingStatus.tsx` (add navigation only)
```

---

## 📝 Usage Instructions

### How to Use These Prompts:

1. **Start with Prompt 1 (Layout)** - Creates consistent header across all pages
2. **Then Prompt 2 (Landing)** - Improves the home page
3. **Then Prompt 3 (Upload)** - Polishes the upload page
4. **Then Prompt 4 (Results)** - Creates the NEW results page ⭐ (most important)
5. **Optional: Prompt 5** - Adds auto-navigation from processing to results

### Tips for Best Results:

- **Copy the entire prompt** including the "Project Context" section at the top
- **Use one prompt at a time** - Build iteratively
- **Review and test** each generated component before moving to the next
- **Modify as needed** - AI-generated code will need refinement
- **Test the full flow** - After all prompts, test: Landing → Upload → Processing → Results

### Platform-Specific Notes:

**For v0.dev:**
- Paste the entire prompt into the chat
- v0 will generate React/Next.js code directly
- Copy the generated code into your project files

**For Lovable.ai:**
- Paste the prompt into the project chat
- Lovable will create/modify files in your project
- Review changes in the file tree before accepting

**For Claude Code or Cursor:**
- Use these prompts directly in the chat
- Reference the specific files mentioned in each prompt
- Ask for TypeScript strict mode compliance

---

## ⚠️ Important Reminders

**All AI-generated code requires:**
- ✅ Human review and testing
- ✅ TypeScript type checking
- ✅ Mobile responsiveness testing
- ✅ API integration validation
- ✅ Error handling verification
- ✅ Accessibility audit

**The Results Page (Prompt 4) will need the most refinement** because:
- The API response structure is complex (nested data)
- You'll need to aggregate strike counts by type
- May need additional error handling based on real data
- Future enhancements (video player, timeline) will build on this

---

## 🚀 After Implementation

Once all screens are built, test this complete flow:

1. Visit http://localhost:3001 (landing page)
2. Click "Upload Your First Video"
3. Select a video file and upload
4. Wait on processing status screen
5. Auto-redirect to results page when complete
6. View analysis insights
7. Click "Upload Another Video" to start again

**Expected Result:** Smooth, linear user flow with no broken links or missing pages.
