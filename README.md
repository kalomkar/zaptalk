# ZapTalk - Advanced AI Messaging Platform

ZapTalk is a modern, high-performance messaging application featuring end-to-end encryption, AI-powered chat assistance (Grok-4.20), and a sleek, customizable UI.

## 🚀 Features

- **End-to-End Encryption**: Secure messaging powered by specialized encryption libraries.
- **AI Assistant**: Integrated Grok Reasoning AI for reply suggestions and intelligent chat help.
- **Real-time Sync**: Powered by Firebase Firestore for instantaneous message delivery.
- **PWA Ready**: Install ZapTalk on your Android, iOS, or Desktop as a native app.
- **Customizable Themes**: Full support for Dark/Light modes and high-definition chat wallpapers.
- **Media Support**: Voice notes, image uploads, and multi-file sharing.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **State Management**: React Context API
- **Backend & DB**: Firebase (Auth, Firestore, Storage)
- **AI**: X.AI Grok API
- **Animations**: Motion (formerly Framer Motion)
- **UI Components**: Radix UI, Shadcn UI, Lucide Icons

## 📦 How to Deploy using GitHub

### 1. Export from AI Studio
1. In the **AI Studio** editor, click on the **⚙️ Settings** icon in the bottom-left corner.
2. Select **Export to GitHub**.
3. Follow the authentication steps to connect your GitHub account.
4. AI Studio will create a new repository and push your latest code automatically.

### 2. Manual Setup (Alternative)
1. In **Settings**, choose **Download as ZIP**.
2. Extract the ZIP on your computer.
3. Initialize a new git repo: `git init`
4. Add files: `git add .`
5. Commit: `git commit -m "initial commit"`
6. Push to your own GitHub repository.

### 3. Hosting (Vercel / Netlify)
Once your code is on GitHub, you can easily host it for free:
1. Go to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Connect your GitHub account.
3. Select the `zaptalk` repository.
4. **Environment Variables**: Make sure to add the following in your hosting provider's settings:
   - `VITE_GROK_API_KEY`: Your x.ai API key.
   - `VITE_GEMINI_API_KEY`: Your Gemini API key.
   - Any Firebase configuration found in `firebase-applet-config.json`.

## 📜 License

MIT License. See LICENSE for details.
