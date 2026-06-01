#ThreadAi-RealTimeAiVideoCall-Rag-gooey-Genai-CV

ThreadAI Presentation:https://drive.google.com/file/d/1j74qSU0fiax_Je0gJxyRurgjA-CeSZgP/view?usp=sharing

# Thread.ai  
### Real-Time Multimodal AI Chat with RAG, Vision & AI Video Avatar

Thread.ai is a real-time multimodal AI interaction platform built with React + TypeScript.  
It combines conversational AI, document-grounded responses (RAG), computer vision, OCR, and AI-powered lip-synced avatar video generation.

The system integrates Firebase authentication, Pinecone vector search, PDF parsing, TensorFlow-based object detection, and a Gooey.ai-powered TTS + lipsync pipeline.

---

## 🚀 Core Capabilities

- 💬 Conversational AI Interface
- 📄 Document-Grounded Responses (RAG via Pinecone)
- 🧠 PDF Ingestion & Embedding Pipeline
- 👁️ Object Detection (TensorFlow COCO-SSD)
- 🔎 OCR (Tesseract.js)
- 🎥 AI Video Avatar with Lip-Sync (Gooey.ai)
- 🔐 Firebase Authentication
- 🗂 Firestore-based Chat Storage
- 🎨 Tailwind + Framer Motion UI

---

## 🏗 Architecture Overview

### Frontend (Vite + React + TypeScript)
- Chat interface
- Avatar rendering
- Transcript view
- Sidebar + multi-session layout
- Authentication flow
- Dashboard & Landing pages

### AI & Data Layer
- Pinecone Vector Database for embeddings
- PDF parsing using `pdfjs-dist`
- OCR using `tesseract.js`
- Object detection using `@tensorflow-models/coco-ssd`
- Vision pipeline via `vision.ts`
- Text-to-Speech pipeline via `tts.ts`

### Backend (Gooey Lipsync Server)
Located in `/gooey`

- Express server
- Proxy to Gooey.ai LipsyncTTS API
- Secure API key handling
- Video generation + face sync

---

## 🛠 Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Framer Motion
- Lucide Icons
- React Router v7

### AI / Data
- Pinecone
- Supabase (client present)
- TensorFlow.js
- COCO-SSD Model
- Tesseract.js (OCR)
- pdfjs-dist
- Firebase (Auth + Firestore)

### Backend
- Node.js
- Express
- Gooey.ai LipsyncTTS API

---

## 📂 Project Structure

```
/src
  /components
  /contexts
  /pages
  /services
  /lib
  /types

/gooey
  server.js
```

---

## 📦 Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/thread-ai.git
cd thread-ai
```

---

### 2️⃣ Install Frontend Dependencies

```bash
npm install
```

---

### 3️⃣ Install Gooey Server Dependencies

```bash
cd gooey
npm install
cd ..
```

---

## ▶ Running the Project

### Start Frontend

```bash
npm run dev
```

Runs on:
```
http://localhost:5173
```

---

### Start Gooey Lipsync Server

```bash
cd gooey
node server.js
```

Runs on:
```
http://localhost:3001
```

---

## 🔐 Environment Variables

Create `.env` in the root directory:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_PINECONE_API_KEY=
VITE_PINECONE_INDEX_NAME=


```

---

Create `.env` inside `/gooey`:

```env
GOOEY_API_KEY=your_gooey_api_key
PORT=3001
```

---

## 🧠 Features Explained

### 📄 Retrieval-Augmented Generation (RAG)
- PDF ingestion
- Embedding storage in Pinecone
- Context injection into AI responses

### 👁 Vision + OCR
- Object detection via COCO-SSD
- OCR text extraction via Tesseract
- Enables multimodal contextual reasoning

### 🎥 AI Video Avatar
- Text → TTS
- TTS → Gooey Lipsync
- Generates lip-synced AI face video

---

## 🎯 Use Cases

- Real-time AI virtual assistant
- Document-grounded advisory system
- AI tutoring platform
- Interactive AI persona system
- Multimodal AI experimentation
- AI + Computer Vision integration demos

---

## 🏆 Recognition

🥇 1st Position – AI Track (National Project Expo)  
Recognized for multimodal orchestration, RAG implementation, and AI video integration.

---

## 📽 Demo

Short Demo Video:  
https://youtu.be/ci9qdkgSVss

---

## 🚧 Future Improvements

- Scalable inference pipeline
- Real-time streaming LLM responses
- Better latency optimization
- Edge deployment for AI modules
- Production-ready containerization

---

## 🤝 Contributing

Pull requests are welcome.

For major changes:
- Open an issue first
- Discuss architectural impact
- Maintain modular service structure

---

## 📄 License

Educational / Research Use Only.

---

## 👨‍💻 Author

Vivek Kumar Garg  
AI Systems Builder | Full-Stack Developer  | GenAI 
Portfolio: https://vivekfolio-six.vercel.app/

---

> Thread.ai explores how conversational AI, vector search, vision models, and AI-generated video can be orchestrated into a single real-time multimodal system.
