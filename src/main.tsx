import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/600.css';
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/700.css';
import './styles/tokens.css';
import './styles/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { createQueryClient, Providers } from './providers';

const root = document.getElementById('root');
if (!root) throw new Error('Нет элемента #root');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Providers queryClient={createQueryClient()}>
        <App />
      </Providers>
    </BrowserRouter>
  </StrictMode>,
);
