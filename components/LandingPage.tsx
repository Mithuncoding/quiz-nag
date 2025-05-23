import React, { useState } from 'react';

interface LandingPageProps {
  onStartQuiz: () => void;
  onJoinSharedQuiz?: (code: string) => void;
  onJoinMultiplayerRoom?: (code: string) => void;
}

const FeatureHighlightCard: React.FC<{ icon: string; title: string; description: string; delay?: string }> = ({ icon, title, description, delay = "0s" }) => (
  <div 
    className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-purple-500/40 transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center text-center animate-fadeInUp"
    style={{ animationDelay: delay }}
  >
    <i className={`${icon} text-5xl text-purple-400 mb-5`}></i>
    <h3 className="text-2xl font-semibold text-neutral-100 mb-3">{title}</h3>
    <p className="text-neutral-300 text-sm leading-relaxed">{description}</p>
  </div>
);

const HowItWorksStep: React.FC<{number: string, title: string, description: string, icon: string, delay?: string}> = ({number, title, description, icon, delay = "0s"}) => (
    <div 
        className="flex flex-col items-center text-center p-5 bg-slate-800/50 rounded-lg shadow-lg animate-fadeInUp"
        style={{ animationDelay: delay }}
    >
        <div className="relative mb-4">
            <i className={`${icon} text-6xl text-pink-500`}></i>
            <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center border-2 border-slate-900">{number}</span>
        </div>
        <h4 className="text-xl font-semibold text-neutral-100 mb-2">{title}</h4>
        <p className="text-sm text-neutral-300">{description}</p>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onStartQuiz, onJoinSharedQuiz, onJoinMultiplayerRoom }) => {
  const [sharedQuizCode, setSharedQuizCode] = useState('');
  const [multiplayerCode, setMultiplayerCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const handleJoinShared = () => {
    if (!sharedQuizCode.trim()) {
      setError('Please enter a quiz code.');
      return;
    }
    setError(null);
    onJoinSharedQuiz && onJoinSharedQuiz(sharedQuizCode.trim());
  };
  const handleJoinMultiplayer = () => {
    if (!multiplayerCode.trim()) {
      setError('Please enter a room code.');
      return;
    }
    setError(null);
    onJoinMultiplayerRoom && onJoinMultiplayerRoom(multiplayerCode.trim());
  };
  return (
    <div className="w-full text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="min-h-[calc(90vh-80px)] flex flex-col items-center justify-center text-center px-4 py-16 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {/* Subtle background pattern or animation if desired */}
        </div>
        <div className="relative z-10 animate-fadeInDown">
          <i className="fas fa-brain text-7xl md:text-8xl text-purple-400 mb-6"></i>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
              AI Quiz Master
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Ignite Your Intellect! Forge custom quizzes, conquer challenges, and deepen your knowledge with our intelligent learning platform.
          </p>
          <button
            onClick={onStartQuiz}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-12 rounded-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg"
            aria-label="Get started creating a quiz"
          >
            <i className="fas fa-bolt mr-2"></i> Start Learning Now
          </button>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-16 md:py-24 bg-slate-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-neutral-100 mb-12 md:mb-16 animate-fadeInUp">Why Choose AI Quiz Master?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <FeatureHighlightCard 
              icon="fas fa-cogs" 
              title="Hyper-Personalized Quizzes" 
              description="Generate quizzes on ANY topic or your own text. Customize question count, difficulty (Bloom's Taxonomy), and even add timers for a real challenge!" 
              delay="0.1s"
            />
            <FeatureHighlightCard 
              icon="fas fa-lightbulb" 
              title="Gemini AI Powered" 
              description="Experience diverse, insightful questions, including image-based challenges, crafted by Google's advanced AI for a rich learning experience." 
              delay="0.2s"
            />
            <FeatureHighlightCard 
              icon="fas fa-user-graduate" 
              title="Interactive AI Tutor" 
              description="Go beyond answers. Chat with our AI Tutor to explore topics in depth, clarify doubts, or try the Socratic method for guided learning."
              delay="0.3s"
            />
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-purple-950 via-slate-900 to-purple-950">
        <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold text-center text-neutral-100 mb-12 md:mb-16 animate-fadeInUp">Simple Steps to Mastery</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <HowItWorksStep number="1" title="Define Your Quiz" description="Enter a topic, paste text, or upload a file. Set question count and difficulty." icon="fas fa-edit" delay="0.1s" />
                <HowItWorksStep number="2" title="AI Crafts Your Challenge" description="Our Gemini-powered AI generates unique questions tailored to your specifications." icon="fas fa-magic" delay="0.2s" />
                <HowItWorksStep number="3" title="Test Your Knowledge" description="Take the interactive quiz, with optional timers and instant feedback on your answers." icon="fas fa-puzzle-piece" delay="0.3s" />
                <HowItWorksStep number="4" title="Learn & Grow" description="Review results, earn badges, and chat with the AI Tutor to deepen understanding." icon="fas fa-chart-line" delay="0.4s" />
            </div>
        </div>
      </section>

      {/* New Features Spotlight Section */}
      <section className="py-16 md:py-24 bg-slate-900">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-neutral-100 mb-12 md:mb-16 animate-fadeInUp">
            <i className="fas fa-star-of-life mr-3 text-yellow-400"></i>Fresh Off The Press: Exciting New Features!
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <FeatureHighlightCard 
              icon="fas fa-child" 
              title="Explain Like I'm 5 (ELI5)" 
              description="Confused by an explanation? Click 'Explain Simpler' in results or AI Tutor for a super-easy breakdown of complex concepts." 
              delay="0.1s"
            />
            <FeatureHighlightCard 
              icon="fas fa-trophy" 
              title="Badges & Achievements" 
              description="Stay motivated! Earn cool badges for milestones like perfect scores, exploring topics, and consistent learning. Track your progress!" 
              delay="0.2s"
            />
            <FeatureHighlightCard 
              icon="fas fa-comments" 
              title="Socratic AI Tutor Mode" 
              description="Challenge yourself! Switch your AI Tutor to Socratic mode. It'll ask guiding questions to help you discover answers and think critically."
              delay="0.3s"
            />
          </div>
        </div>
      </section>

       {/* Call to Action Bottom */}
      <section className="py-16 md:py-20 bg-gradient-to-t from-purple-900 to-slate-900">
        <div className="container mx-auto px-6 text-center animate-fadeInUp">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-100 mb-6">Ready to Become a Quiz Master?</h2>
          <p className="text-lg text-neutral-300 mb-8 max-w-xl mx-auto">
            Your journey to deeper knowledge and fun learning starts here.
          </p>
          <button
            onClick={onStartQuiz}
            className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-4 px-10 rounded-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg"
          >
            <i className="fas fa-graduation-cap mr-2"></i> Create Your First Quiz
          </button>
        </div>
      </section>
      {/* FIX: Replaced Next.js specific `style jsx global` with standard `style` tag for React compatibility. */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInDown {
          animation: fadeInDown 0.8s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          opacity: 0; /* Start hidden */
          animation: fadeInUp 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
