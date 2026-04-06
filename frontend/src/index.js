import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initApiAuth } from './services/apiAuth';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Never block first paint forever: native Preferences.get can hang; cap mount after 5s max.
const INIT_AUTH_MAX_MS = 5000;
Promise.race([
  initApiAuth().catch((e) => console.warn('initApiAuth:', e)),
  new Promise((resolve) => setTimeout(resolve, INIT_AUTH_MAX_MS)),
]).finally(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
