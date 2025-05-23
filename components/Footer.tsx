
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900/50 py-6 text-center text-neutral-400 text-sm mt-auto">
      <p>&copy; {new Date().getFullYear()} AI Quiz Master. All rights reserved.</p>
      <p className="mt-1">Made with <i className="fas fa-heart text-red-500"></i> by Gaganashree, Mithun and Shahabaz</p>
    </footer>
  );
};

export default Footer;
