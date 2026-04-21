// Polyfills for simple-peer
import { Buffer } from 'buffer';
(window as any).global = window;
(window as any).Buffer = Buffer;
(window as any).process = {
  env: {},
  nextTick: (fn: any, ...args: any[]) => setTimeout(() => fn(...args), 0),
} as any;

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
