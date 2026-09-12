import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <Navbar />

      <main className="min-h-screen w-full bg-slate-50 md:ml-64 md:w-[calc(100%-16rem)]">
        <div className="min-h-screen w-full bg-slate-50">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;