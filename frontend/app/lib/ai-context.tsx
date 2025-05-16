import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { aiApi } from "./api";

interface AISuggestion {
  originalText: string;
  enhancedText: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface AIContextType {
  suggestion: AISuggestion | null;
  isLoading: boolean; 
  error: string | null;
  getTextEnhancement: (
    text: string, 
    enhancementType?: 'general' | 'conciseness' | 'clarity' | 'impact'
  ) => Promise<void>;
  acceptSuggestion: () => string;
  rejectSuggestion: () => void;
  clearSuggestion: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTextEnhancement = useCallback(async (
    text: string, 
    enhancementType: 'general' | 'conciseness' | 'clarity' | 'impact' = 'general'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiApi.enhanceText(text, enhancementType);
      
      setSuggestion({
        originalText: response.original_text,
        enhancedText: response.enhanced_text,
        status: 'pending'
      });
    } catch (err) {
      setError('Failed to get AI enhancement. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptSuggestion = useCallback(() => {
    if (!suggestion) return '';
    
    setSuggestion({
      ...suggestion,
      status: 'accepted'
    });
    
    return suggestion.enhancedText;
  }, [suggestion]);

  const rejectSuggestion = useCallback(() => {
    if (!suggestion) return;
    
    setSuggestion({
      ...suggestion,
      status: 'rejected'
    });
  }, [suggestion]);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return (
    <AIContext.Provider
      value={{
        suggestion,
        isLoading,
        error,
        getTextEnhancement,
        acceptSuggestion,
        rejectSuggestion,
        clearSuggestion
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
} 