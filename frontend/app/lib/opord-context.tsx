import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { OPORD, AnalysisResult } from "./api";
import { opordApi, analysisApi } from "./api";

interface OpordContextType {
  currentOpord: OPORD | null;
  analysisResults: AnalysisResult[];
  error: string | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  getOpordById: (id: number) => Promise<void>;
  createOpord: (title: string, content: string) => Promise<OPORD>;
  updateOpord: (id: number, data: { title?: string; content?: string }) => Promise<void>;
  analyzeOpord: (text: string) => Promise<AnalysisResult[] | undefined>;
  clearOpord: () => void;
}

const OpordContext = createContext<OpordContextType | undefined>(undefined);

export function OpordProvider({ children }: { children: ReactNode }) {
  const [currentOpord, setCurrentOpord] = useState<OPORD | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getOpordById = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const opord = await opordApi.getById(id);
      setCurrentOpord(opord);
      
      // If the opord already has analysis results, set them
      if (opord.analysis_results?.length) {
        setAnalysisResults(opord.analysis_results as AnalysisResult[]);
      }
    } catch (err) {
      setError('Failed to load OPORD. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createOpord = useCallback(async (title: string, content: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const opord = await opordApi.create({ title, content });
      setCurrentOpord(opord);
      return opord;
    } catch (err) {
      setError('Failed to create OPORD. Please try again.');
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateOpord = useCallback(async (id: number, data: { title?: string; content?: string }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const opord = await opordApi.update(id, data);
      setCurrentOpord(opord);
    } catch (err) {
      setError('Failed to update OPORD. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzeOpord = useCallback(async (text: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const results = await analysisApi.analyzeTasks(text);
      setAnalysisResults(results);
      
      // If we have a current OPORD, update it with the analysis results
      if (currentOpord) {
        await opordApi.update(currentOpord.id, { analysis_results: results });
      }
      
      return results;
    } catch (err) {
      setError('Failed to analyze text. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentOpord]);

  const clearOpord = useCallback(() => {
    setCurrentOpord(null);
    setAnalysisResults([]);
    setError(null);
  }, []);

  return (
    <OpordContext.Provider
      value={{
        currentOpord,
        analysisResults,
        error,
        isLoading,
        isAnalyzing,
        getOpordById,
        createOpord,
        updateOpord,
        analyzeOpord,
        clearOpord
      }}
    >
      {children}
    </OpordContext.Provider>
  );
}

export function useOpord() {
  const context = useContext(OpordContext);
  if (context === undefined) {
    throw new Error("useOpord must be used within an OpordProvider");
  }
  return context;
} 