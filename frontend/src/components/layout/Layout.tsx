import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-200">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        {children}
      </main>
    </div>
  );
};

export default Layout;
