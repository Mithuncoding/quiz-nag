import React, { useState } from 'react';

interface CopyLinkButtonProps {
  link: string;
  className?: string;
}

const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({ link, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center px-3 py-1.5 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow hover:from-purple-600 hover:to-pink-600 transition-all duration-200 focus:outline-none ${className || ''}`}
      aria-label="Copy link"
    >
      <i className="fas fa-link mr-2"></i>
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
};

export default CopyLinkButton; 