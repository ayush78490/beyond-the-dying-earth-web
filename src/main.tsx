import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/share-tech-mono/400.css';
import './styles/global.css';
import App from './App';
import { prefersReducedMotion } from './hooks/useReducedMotion';

// Scroll reveals hide content only when motion is allowed and JS is running.
if (!prefersReducedMotion()) document.documentElement.classList.add('js-motion');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
