import React from 'react';
import ReactDOM from 'react-dom/client';
import SimpleApp from './SimpleApp';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  React.createElement(React.StrictMode, null,
    React.createElement(SimpleApp)
  )
);