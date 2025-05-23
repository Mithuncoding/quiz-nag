import React, { useState, useEffect, useRef } from 'react';
import { QuizConfig, BLOOM_TAXONOMY_LEVELS, SURPRISE_ME_TOPICS, DEFAULT_TIME_PER_QUESTION, Quiz } from '../types';
import { MIN_QUESTIONS, MAX_QUESTIONS, DEFAULT_QUESTIONS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { createSharedQuizInFirestore, saveQuizToFirestore } from '../services/firestoreService';
import CopyLinkButton from './CopyLinkButton';

interface QuizGeneratorFormProps {
  onGenerateQuiz: (config: QuizConfig) => void; // Updated signature
  initialError?: string | null;
  apiKeyStatus?: string;
  navigateToSharedQuiz: (sharedQuizId: string) => void; 
  shareModalOpen?: boolean;
  setShareModalOpen?: (open: boolean) => void;
  shareLink?: string;
  shareProctoring?: boolean;
}

const QuizGeneratorForm: React.FC<QuizGeneratorFormProps> = ({ onGenerateQuiz, initialError, apiKeyStatus, navigateToSharedQuiz, shareModalOpen, setShareModalOpen, shareLink, shareProctoring }) => {
  const [topicOrText, setTopicOrText] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(DEFAULT_QUESTIONS);
  const [bloomLevel, setBloomLevel] = useState<string>('');
  const [isTimed, setIsTimed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formApiKeyError, setFormApiKeyError] = useState<string|null>(null);
  const { currentUser } = useAuth();

  // For sharing options
  const [shareQuiz, setShareQuiz] = useState<boolean>(false);
  const [enableProctoring, setEnableProctoring] = useState<boolean>(false);
  const [isSharingLoading, setIsSharingLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialError && !initialError.includes("Pexels")) { 
         setError(initialError);
    } else if (initialError?.includes("Pexels") && !apiKeyStatus?.includes("Gemini")) {
         // No-op
    }
  }, [initialError, apiKeyStatus]);

  useEffect(() => {
    if (apiKeyStatus && !apiKeyStatus.includes("Pexels")) { 
        setFormApiKeyError(apiKeyStatus);
    } else if (apiKeyStatus?.includes("Pexels") && !apiKeyStatus?.includes("Gemini")){
        setFormApiKeyError(null);
    } else {
        setFormApiKeyError(null);
    }
  }, [apiKeyStatus]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null); setError(null); 
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/plain') {
        try {
          const text = await file.text();
          setTopicOrText(text);
        } catch (e) {
          console.error("Error reading text file:", e);
          setFileError('Could not read the text file. Please try again.');
        }
      } else {
        setFileError('Unsupported file type. Please upload a .txt file.');
      }
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSurpriseMe = () => {
    const randomIndex = Math.floor(Math.random() * SURPRISE_ME_TOPICS.length);
    setTopicOrText(SURPRISE_ME_TOPICS[randomIndex]);
    setError(null); setFileError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicOrText.trim()) {
      setError('Please enter a topic, paste some text, or upload a file.');
      return;
    }
    if (formApiKeyError && !formApiKeyError.includes("Pexels")) { 
        setError(formApiKeyError); 
        return;
    }
    if (shareQuiz && !currentUser) {
      setError("Please login to share a quiz.");
      return;
    }

    setError(null); setFileError(null);
    const config: QuizConfig = { 
        topicOrText, 
        numQuestions, 
        bloomLevel, 
        isTimed, 
        isPublic: shareQuiz, // Set isPublic flag based on shareQuiz toggle
        enableProctoring: shareQuiz && enableProctoring 
    };
    
    // App.tsx's handleGenerateQuiz will now handle the isPublic flag
    // and the subsequent sharing logic if isPublic is true.
    // setIsSharingLoading can be set in App.tsx if the generation itself is part of sharing.
    // For now, the button will show its own loading state based on isSharingLoading,
    // but the actual async operation is in App.tsx.
    if (shareQuiz) {
        setIsSharingLoading(true); // Indicate sharing process has started
    }
    onGenerateQuiz(config);
    // App.tsx will eventually reset loading states. If onGenerateQuiz is async,
    // then App.tsx should manage the setIsSharingLoading(false) or equivalent.
    // For now, this button's loading state is optimistic or App.tsx handles it.
  };

  return (
    <div className="bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl p-6 md:p-10 transform hover:scale-[1.01] transition-transform duration-300">
      <h2 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Create Your Ultimate Quiz!</h2>
      
      {formApiKeyError && (
        <div className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm" role="alert">
          <i className="fas fa-exclamation-triangle mr-2"></i>{formApiKeyError}
        </div>
      )}
      {error && ( // Show general error if not an API key error
         <div className="mb-4 p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm" role="alert">
            <i className="fas fa-times-circle mr-2"></i>{error}
        </div>
      )}
      {fileError && (
         <div className="mb-4 p-3 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-sm" role="alert">
            <i className="fas fa-file-alt mr-2"></i>{fileError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="topicOrText" className="block text-sm font-medium text-neutral-300 mb-1">
            Topic, Custom Text, or Upload File
          </label>
          <textarea
            id="topicOrText" value={topicOrText} onChange={(e) => setTopicOrText(e.target.value)}
            placeholder="e.g., 'The Renaissance', paste a long article, or upload a .txt file..."
            rows={5}
            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors duration-200 shadow-sm"
          />
           <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
            <label htmlFor="fileUpload" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm inline-flex items-center justify-center">
              <i className="fas fa-upload mr-2"></i> Upload .txt File
            </label>
            <input type="file" id="fileUpload" ref={fileInputRef} className="hidden" accept=".txt" onChange={handleFileChange}/>
             <button type="button" onClick={handleSurpriseMe}
                className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm inline-flex items-center justify-center">
                <i className="fas fa-dice mr-2"></i> Surprise Me!
              </button>
           </div>
            <p className="mt-1 text-xs text-neutral-400">Upload a .txt file for custom quiz content.</p>
        </div>

        <div>
          <label htmlFor="numQuestions" className="block text-sm font-medium text-neutral-300 mb-1">
            Number of Questions: <span className="font-bold text-purple-400">{numQuestions}</span>
          </label>
          <input type="range" id="numQuestions" min={MIN_QUESTIONS} max={MAX_QUESTIONS} step={5} value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
           <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>{MIN_QUESTIONS}</span><span>{MAX_QUESTIONS}</span>
          </div>
        </div>

        <div>
          <label htmlFor="bloomLevel" className="block text-sm font-medium text-neutral-300 mb-1">Bloom's Taxonomy Level (Optional)</label>
          <select id="bloomLevel" value={bloomLevel} onChange={(e) => setBloomLevel(e.target.value)}
            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors duration-200 shadow-sm text-neutral-200">
            {BLOOM_TAXONOMY_LEVELS.map(level => (<option key={level.value} value={level.value} className="bg-slate-800 text-neutral-200">{level.label}</option>))}
          </select>
        </div>
        
        <div>
          <label htmlFor="isTimed" className="flex items-center cursor-pointer group">
            <div className="relative">
              <input type="checkbox" id="isTimed" className="sr-only peer" checked={isTimed} onChange={() => setIsTimed(!isTimed)} />
              <div className="block w-10 h-6 rounded-full transition-colors bg-slate-600 peer-checked:bg-green-500"></div>
              <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
            </div>
            <div className="ml-3 text-sm font-medium text-neutral-300 group-hover:text-white">Enable Per-Question Timer ({DEFAULT_TIME_PER_QUESTION}s)</div>
          </label>
        </div>
        
        {/* Share Options - Only if logged in */}
        {currentUser && (
            <div className="space-y-4 p-4 border border-purple-500/30 rounded-lg bg-slate-700/30">
                <h4 className="text-lg font-semibold text-purple-300">Multiplayer & Sharing</h4>
                <div>
                    <label htmlFor="shareQuizToggle" className="flex items-center cursor-pointer group">
                        <div className="relative">
                        <input type="checkbox" id="shareQuizToggle" className="sr-only peer" checked={shareQuiz} onChange={() => setShareQuiz(!shareQuiz)} />
                        <div className="block w-10 h-6 rounded-full transition-colors bg-slate-600 peer-checked:bg-green-500"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                        </div>
                        <div className="ml-3 text-sm font-medium text-neutral-300 group-hover:text-white">Make this a Shareable Quiz</div>
                    </label>
                </div>

                {shareQuiz && (
                    <div>
                        <label htmlFor="enableProctoringToggle" className="flex items-center cursor-pointer group">
                            <div className="relative">
                            <input type="checkbox" id="enableProctoringToggle" className="sr-only peer" checked={enableProctoring} onChange={() => setEnableProctoring(!enableProctoring)} />
                            <div className="block w-10 h-6 rounded-full transition-colors bg-slate-600 peer-checked:bg-yellow-500"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                            </div>
                            <div className="ml-3 text-sm font-medium text-neutral-300 group-hover:text-white">Enable Strict Proctoring (Conceptual - requests camera)</div>
                        </label>
                         <p className="text-xs text-yellow-400 mt-1">Note: Proctoring is conceptual and mainly for testing camera access. No actual recording or analysis occurs.</p>
                    </div>
                )}
            </div>
        )}
        {!currentUser && (
             <p className="text-sm text-yellow-400 mt-1 text-center">Login to enable Shareable Quiz features.</p>
        )}


        <button type="submit"
          disabled={!!(formApiKeyError && !formApiKeyError.includes("Pexels")) || isSharingLoading || (shareQuiz && !currentUser)}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSharingLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Preparing Shareable Quiz...</> : 
           shareQuiz ? <><i className="fas fa-share-alt mr-2"></i>Generate & Share Quiz</> :
           <><i className="fas fa-magic mr-2"></i>Generate Quiz for Myself</>}
        </button>
      </form>
      {/* Share Modal */}
      {shareModalOpen && shareLink && setShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full relative border border-purple-700/40 animate-fadeInUp">
            <button
              className="absolute top-3 right-3 text-neutral-400 hover:text-white text-xl"
              onClick={() => setShareModalOpen(false)}
              aria-label="Close share modal"
            >
              <i className="fas fa-times"></i>
            </button>
            <h3 className="text-2xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Share Your Quiz!</h3>
            <div className="mb-4">
              <label className="block text-sm text-neutral-300 mb-1 font-semibold">Shareable Link:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-neutral-200 text-sm select-all"
                  onFocus={e => e.target.select()}
                />
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow"
                  onClick={() => {navigator.clipboard.writeText(shareLink);}}
                  aria-label="Copy link"
                >
                  <i className="fas fa-copy mr-1"></i> Copy
                </button>
              </div>
            </div>
            <div className="mb-4 flex gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Join my quiz! ' + shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow"
                aria-label="Share via WhatsApp"
              >
                <i className="fab fa-whatsapp"></i> WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent('Join my quiz!')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow"
                aria-label="Share via Telegram"
              >
                <i className="fab fa-telegram-plane"></i> Telegram
              </a>
              <a
                href={`mailto:?subject=Join my quiz!&body=${encodeURIComponent('Join my quiz! ' + shareLink)}`}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow"
                aria-label="Share via Email"
              >
                <i className="fas fa-envelope"></i> Email
              </a>
            </div>
            <div className="mb-2 text-sm text-neutral-400">
              <span className="font-semibold text-neutral-200">Proctoring:</span> {shareProctoring ? 'Enabled' : 'Disabled'}
            </div>
            <div className="flex justify-center mt-4">
              <button
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                onClick={() => setShareModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizGeneratorForm;
