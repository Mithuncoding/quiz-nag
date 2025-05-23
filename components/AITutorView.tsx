
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { ChatMessage, AITutorMode } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';
import { getSimplifiedExplanation } from '../services/geminiService';
import Loader from './Loader';

interface AITutorViewProps {
  topic: string;
  apiKeyStatus: string;
}

const AITutorView: React.FC<AITutorViewProps> = ({ topic, apiKeyStatus }) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading for sending messages
  const [isInitializing, setIsInitializing] = useState<boolean>(true); // Specific loading for chat init
  const [error, setError] = useState<string | null>(null);
  const [tutorMode, setTutorMode] = useState<AITutorMode>('standard');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const initializeChat = useCallback(async (mode: AITutorMode) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError("Gemini API Key not available. AI Tutor cannot function.");
      setMessages([{ id: Date.now().toString(), role: 'system', text: "AI Tutor requires a Gemini API Key to function. Please ensure it's configured.", timestamp: Date.now() }]);
      setIsInitializing(false);
      return;
    }
    
    setIsInitializing(true);
    setError(null);
    setMessages([]); // Clear previous messages on mode change or re-init

    try {
      const ai = new GoogleGenAI({ apiKey });
      let systemInstruction = `You are an expert AI Tutor specializing in "${topic}". Your goal is to help the user understand this topic better. Be patient, encouraging, and explain concepts clearly and concisely. Ask follow-up questions to stimulate critical thinking if appropriate. Keep your responses focused on the topic. Do not go off-topic. If the user asks something completely unrelated to "${topic}", politely steer them back or state that you can only discuss "${topic}".`;
      
      if (mode === 'socratic') {
        systemInstruction = `You are an AI Tutor using the Socratic method, specializing in "${topic}". Your primary goal is to guide the user to discover answers and understanding themselves. Respond to user queries mostly by asking insightful, probing questions. Avoid giving direct answers or lengthy explanations unless specifically asked to clarify a point after Socratic exploration. Encourage critical thinking. If the user seems stuck, you can provide small hints or slightly more direct guidance, but always try to return to questioning. Stay focused on "${topic}".`;
      }
      
      const newChat = ai.chats.create({
        model: GEMINI_MODEL_TEXT,
        config: { systemInstruction },
      });
      setChat(newChat);

      const initialGreeting = mode === 'socratic' 
        ? `Hello! I'm your Socratic Guide for "${topic}". Let's explore this topic together. What's on your mind?`
        : `Hello! I'm your AI Tutor for "${topic}". How can I help you understand this topic better? Ask me anything!`;
      setMessages([{ id: Date.now().toString(), role: 'model', text: initialGreeting, timestamp: Date.now() }]);

    } catch (err) {
      console.error("Error initializing AI Tutor chat:", err);
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred during AI Tutor initialization.";
      setError(`Failed to initialize AI Tutor: ${errorMsg}`);
      setMessages([{id: Date.now().toString(), role: 'system', text: `Error: Could not start AI Tutor session for "${topic}". ${errorMsg}`, timestamp: Date.now() }]);
    } finally {
      setIsInitializing(false);
      inputRef.current?.focus();
    }
  }, [topic]);

  useEffect(() => {
    initializeChat(tutorMode);
  }, [topic, tutorMode, initializeChat]);


  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || !chat || isLoading || isInitializing) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: userInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      const stream = await chat.sendMessageStream({ message: userMessage.text });
      let currentModelResponse = "";
      const modelMessageId = (Date.now() + 1).toString(); // Ensure unique ID
      
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: "...", timestamp: parseInt(modelMessageId) }]);

      for await (const chunk of stream) {
        currentModelResponse += chunk.text;
        setMessages(prev => prev.map(msg => 
            msg.id === modelMessageId ? { ...msg, text: currentModelResponse } : msg
        ));
      }
      if (!currentModelResponse.trim()) {
        setMessages(prev => prev.map(msg => 
            msg.id === modelMessageId ? { ...msg, text: "I'm not sure how to respond to that. Could you try rephrasing?" } : msg
        ));
      }

    } catch (err) {
      console.error("Error sending message to AI Tutor:", err);
      const errorText = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(`AI Tutor error: ${errorText}`);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', text: `Error: ${errorText}`, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [chat, userInput, isLoading, isInitializing]);

  const handleSimplifyTutorMessage = async (messageId: string) => {
    if (!process.env.API_KEY) {
        setError("Gemini API Key is not configured. Cannot simplify explanation.");
        return;
    }
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].simplifiedText) return;

    const originalText = messages[messageIndex].text;
    setMessages(prev => prev.map(msg => msg.id === messageId ? {...msg, isSimplifying: true} : msg));
    setError(null);

    try {
      const simplified = await getSimplifiedExplanation(originalText);
      setMessages(prev => prev.map(msg => msg.id === messageId ? {...msg, simplifiedText: simplified, isSimplifying: false} : msg));
    } catch (err) {
      console.error("ELI5 Tutor Error:", err);
      setError(err instanceof Error ? err.message : "Failed to simplify message.");
      setMessages(prev => prev.map(msg => msg.id === messageId ? {...msg, isSimplifying: false, simplifiedText: "[Could not simplify this message]"} : msg));
    }
  };

  const toggleTutorMode = () => {
    setTutorMode(prevMode => prevMode === 'standard' ? 'socratic' : 'standard');
    // useEffect will call initializeChat with the new mode
  };


  if (apiKeyStatus && !apiKeyStatus.includes("Pexels")) { // Primary check for Gemini key missing
     return (
        <div className="p-4 bg-red-800/30 text-red-300 rounded-lg text-center">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          AI Tutor requires a valid Gemini API Key to function. Please ensure it's configured.
        </div>
     );
  }
  
  if (isInitializing) {
    return <Loader message={`Initializing AI Tutor for "${topic}" (${tutorMode} mode)...`} />;
  }

  return (
    <div className="bg-slate-700/50 p-4 md:p-6 rounded-lg shadow-xl flex flex-col h-[500px] max-h-[70vh]">
      <div className="flex justify-between items-center border-b border-slate-600 pb-3 mb-3">
        <h3 className="text-xl font-semibold text-purple-300 text-center">
          <i className="fas fa-chalkboard-teacher mr-2"></i>AI Tutor: {topic}
        </h3>
        <div className="flex items-center">
          <span className="mr-2 text-sm text-neutral-300">{tutorMode === 'socratic' ? 'Socratic Guide' : 'Standard Tutor'}</span>
          <label htmlFor="tutorModeToggle" className="flex items-center cursor-pointer">
            <div className="relative">
              {/* FIX: Corrected typo in onChange handler from toggleTutor to toggleTutorMode */}
              <input type="checkbox" id="tutorModeToggle" className="sr-only peer" checked={tutorMode === 'socratic'} onChange={toggleTutorMode} />
              <div className="block w-10 h-6 rounded-full transition-colors bg-slate-600 peer-checked:bg-green-500"></div>
              <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
            </div>
          </label>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] p-3 rounded-xl shadow relative group ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : msg.role === 'model'
                  ? 'bg-slate-600 text-neutral-200 rounded-bl-none'
                  : 'bg-red-700 text-white w-full text-center' // System/Error messages
              }`}
            >
              {msg.role === 'model' && msg.text === "..." ? (
                <span className="italic animate-pulse">AI is thinking...</span>
              ) : (
                <>
                  <p className="whitespace-pre-wrap break-words">{msg.simplifiedText || msg.text}</p>
                  {msg.simplifiedText && (
                     <button 
                        onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? {...m, simplifiedText: undefined, isSimplifying: false} : m))}
                        className="text-xs text-blue-300 hover:text-blue-200 mt-1 ml-auto block"
                        aria-label="Show original message"
                    >
                        Show Original
                    </button>
                  )}
                </>
              )}
               {msg.role === 'model' && msg.text !== "..." && !msg.simplifiedText && process.env.API_KEY && (
                    <button
                        onClick={() => handleSimplifyTutorMessage(msg.id)}
                        disabled={msg.isSimplifying}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-purple-600 hover:bg-purple-700 text-white p-1 rounded-full text-xs w-6 h-6 flex items-center justify-center"
                        aria-label="Explain simpler"
                    >
                        {msg.isSimplifying ? <i className="fas fa-spinner fa-spin text-[10px]"></i> : <i className="fas fa-child text-[10px]"></i>}
                    </button>
                )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && !messages.some(m => m.role === 'system' && m.text.includes(error)) && (
        <p className="text-red-400 text-sm mb-2 text-center">{error}</p>
      )}

      <div className="flex items-center border-t border-slate-600 pt-4">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && !isInitializing && handleSendMessage()}
          placeholder={tutorMode === 'socratic' ? "What are you pondering?" : "Ask a question..."}
          className="flex-grow p-3 bg-slate-800 border border-slate-600 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-neutral-200 disabled:opacity-50"
          disabled={isLoading || isInitializing || !chat || !!error && messages.some(m=>m.role==='system')}
          aria-label="Your message to the AI Tutor"
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || isInitializing || !chat || !userInput.trim() || (!!error && messages.some(m=>m.role==='system'))}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-5 rounded-r-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message to AI Tutor"
        >
          {isLoading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
        </button>
      </div>
    </div>
  );
};

export default AITutorView;
