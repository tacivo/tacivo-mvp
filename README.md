# Tacivo Interview MVP

AI-powered knowledge capture through expert interviews. Transform tacit expertise into professional documentation in 15-30 minutes.

## Overview

This MVP enables organizations to capture expert knowledge through AI-conducted interviews. The system guides experts through a conversational interview and automatically generates professional case studies or best practices guides.

## Features

### 🎯 Two Document Types
- **Case Studies**: Document specific projects, deals, or events with detailed narratives
- **Best Practices Guides**: Create general playbooks and SOPs from accumulated experience

### 🎤 Voice-Enabled Interviews
- Speech-to-text for hands-free responses
- Text-to-speech for AI questions
- Auto-play mode for seamless conversation flow

### 📄 Professional Documentation
- AI-generated structured documents
- Markdown formatting with clear sections
- PDF export functionality
- 2-3 page professional output

### 💬 Smart Interview Flow
- Adaptive questioning based on expert responses
- 8-12 questions covering key aspects
- Natural, conversational tone
- Progress tracking

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **AI**: Anthropic Claude Sonnet 4
- **Voice**: ElevenLabs (Speech-to-Text & Text-to-Speech)
- **Styling**: Tailwind CSS with custom design system
- **Language**: TypeScript
- **PDF Generation**: jsPDF

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Anthropic API key
- ElevenLabs API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tacivo-interview-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.template .env.local
   ```

   Edit `.env.local` and add your API keys:
   ```env
   ANTHROPIC_API_KEY=your_key_here
   ELEVENLABS_API_KEY=your_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

4. **Set up Supabase database**

   See [docs/01-SUPABASE_SETUP.md](docs/01-SUPABASE_SETUP.md) for complete instructions.

   Quick start:
   - Create a Supabase project
   - Go to SQL Editor
   - Run `supabase/migrations/001_initial_schema.sql`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Keys Setup

### Anthropic API Key
1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys section
3. Create a new API key
4. Add to `.env.local`

### ElevenLabs API Key
1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Go to Profile Settings
3. Copy your API key
4. Add to `.env.local`

## Project Structure

```
tacivo-interview-mvp/
├── app/
│   ├── interview/
│   │   └── page.tsx              # Main interview interface
│   ├── api/
│   │   ├── chat-case-study/
│   │   │   └── route.ts          # Case study interview chat
│   │   ├── generate-doc-case-study/
│   │   │   └── route.ts          # Case study document generation
│   │   ├── speech-to-text/
│   │   │   └── route.ts          # Voice transcription
│   │   └── text-to-speech/
│   │       └── route.ts          # AI voice generation
│   ├── layout.tsx                # Root layout with fonts
│   └── globals.css               # Global styles and theme
├── components/
│   └── VoiceControls.tsx         # Microphone button component
├── hooks/
│   └── useVoiceControls.ts       # Voice recording/playback logic
├── public/
│   └── assets/                   # Logo and static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Usage Guide

### Starting an Interview

1. **Expert Information** (Step 1)
   - Enter expert name, role, and years of experience
   - Choose document type: Case Study or Best Practices Guide

2. **Context & Files** (Step 2)
   - Provide a brief description (50+ characters)
   - Optionally upload supporting documents (PDF, DOCX, PPTX, TXT, MD)

3. **Interview** (Step 3)
   - Answer AI questions via typing or voice
   - Use voice controls for hands-free operation
   - Toggle auto-play for automatic AI question playback
   - Track progress (8-12 questions)

4. **Results** (Step 4)
   - Review generated document
   - Download as PDF
   - Start a new interview

### Voice Controls

- **Microphone Button**: Click to start/stop recording
- **Auto-play Toggle**: Automatically play AI responses
- **Repeat Last**: Replay the last AI question
- **Play Message**: Hover over messages to play individual responses

## API Endpoints

### Chat Endpoints (Streaming)
- `POST /api/chat-case-study` - Conduct case study interview

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "context": {
    "expertName": "string",
    "role": "string",
    "yearsOfExperience": "string",
    "processToDocument": "string"
  }
}
```

**Response:** Server-Sent Events (SSE) stream

### Document Generation Endpoints
- `POST /api/generate-doc-case-study` - Generate case study document

**Request Body:** Same as chat endpoints

**Response:**
```json
{
  "document": "markdown content..."
}
```

### Voice Endpoints
- `POST /api/speech-to-text` - Transcribe audio to text
  - Body: FormData with audio file
  - Response: `{ "text": "transcribed content" }`

- `POST /api/text-to-speech` - Generate speech from text
  - Body: `{ "text": "content to speak" }`
  - Response: audio/mpeg stream

## Customization

### Branding
- Update logo in `public/assets/logo/`
- Modify colors in `tailwind.config.js` and `app/globals.css`
- Adjust fonts in `app/layout.tsx`

### Interview Prompts
- Case study prompts: `app/api/chat-case-study/route.ts`
- Document templates: `app/api/generate-doc-case-study/route.ts`

### Voice Settings
- Voice ID: Modify in `app/api/text-to-speech/route.ts`
- Voice settings: Adjust stability and similarity boost

## Development

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for interviews |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key for voice |

## Design System

### Color Palette
- **Book Cloth** (#CC785C): Primary accent color
- **Slate Dark** (#191919): Dark backgrounds and text
- **Ivory Light** (#FAFAF7): Light backgrounds
- **Cloud Medium** (#8F8F8A): Muted text

### Typography
- **Sans-serif**: Inter (body text)
- **Serif**: Playfair Display (headings)

## Performance Considerations

- Interview responses stream in real-time
- Voice transcription processes in ~2-3 seconds
- Document generation takes 5-10 seconds
- PDF export is instant (client-side)

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (requires microphone permissions)
- Mobile: Responsive design, voice features may vary

## Troubleshooting

### Microphone Not Working
- Check browser permissions for microphone access
- Ensure you're using HTTPS (required for getUserMedia)
- Try in a different browser

### API Errors
- Verify API keys in `.env.local`
- Check API key quotas and limits
- Review server logs for detailed errors

### Build Errors
- Clear `.next` directory: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Ensure Node.js version 18+

## License

Proprietary - All rights reserved

## Support

For questions or issues, contact [your-email@example.com]

## Recent Updates

### ✅ Completed Features
- ✅ Database integration with Supabase (PostgreSQL)
- ✅ Multi-user authentication with secure signup/login
- ✅ Interview storage and replay functionality
- ✅ User dashboard with statistics
- ✅ Document history and management
- ✅ Resume in-progress interviews
- ✅ Export documents as Markdown or PDF

See the [docs/](docs/) folder for detailed documentation on all features.

## Roadmap

Future enhancements:
- Custom document templates
- Team collaboration features
- API rate limiting
- Analytics dashboard
- File upload to Supabase Storage
- Document editing
