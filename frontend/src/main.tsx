import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import './styles/animations.css';

const { createElement: e } = React;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(e(App));