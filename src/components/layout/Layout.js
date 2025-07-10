import React from 'react';
import Header from './Header';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-300">
      <Header />
      {children}
    </div>
  );
};

export default Layout; 