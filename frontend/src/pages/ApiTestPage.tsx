import React from 'react';
import { RakutenAPITestComponent } from '../components/RakutenAPITestComponent';

export const ApiTestPage: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
      padding: '20px'
    }}>
      <RakutenAPITestComponent />
    </div>
  );
};