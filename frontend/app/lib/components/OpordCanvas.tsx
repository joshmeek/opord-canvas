import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { JSX } from 'react';
import { useOpord } from '../opord-context';
import { useAI } from '../ai-context';
import { TacticalTaskTooltip } from './TacticalTaskTooltip';
import type { AnalysisResult } from '../api';
import { tacticalTaskApi } from '../api';
import { Button } from '../components';
import { cn } from '../utils';

interface OpordCanvasProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  className?: string;
  readOnly?: boolean;
}

// Interface matching the API response for analysis results
interface APIAnalysisResult {
  details: {
    id: number;
    name: string;
    definition: string;
    image_path: string;
    page_number: string;
    related_figures: string[];
    source_reference: string;
  };
  start_index: number;
  end_index: number;
  task_name: string;
}

export function OpordCanvas({ 
  initialContent = '', 
  onSave,
  className,
  readOnly = false
}: OpordCanvasProps) {
  const [content, setContent] = useState(initialContent);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<AnalysisResult | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [debouncedContent, setDebouncedContent] = useState(initialContent);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [highlightedText, setHighlightedText] = useState<JSX.Element | null>(null);
  const { analyzeOpord, analysisResults } = useOpord();
  const { 
    suggestion, 
    getTextEnhancement, 
    acceptSuggestion, 
    rejectSuggestion, 
    clearSuggestion,
    isLoading: isAILoading 
  } = useAI();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize with initial content
  useEffect(() => {
    setContent(initialContent);
    setDebouncedContent(initialContent);
  }, [initialContent]);
  
  // Debounce content changes for analysis
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedContent(content);
    }, 1000); // 1 second debounce
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content]);
  
  // Auto-analyze content when it changes (debounced)
  useEffect(() => {
    if (debouncedContent !== initialContent && !readOnly) {
      runAnalysis();
    }
  }, [debouncedContent, initialContent, readOnly]);
  
  // Handle manual analysis
  const runAnalysis = async () => {
    if (isAnalyzing || !content.trim()) return;
    
    setIsAnalyzing(true);
    try {
      await analyzeOpord(content);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Handle selection change for AI enhancement
  const handleSelectionChange = () => {
    if (readOnly) return;
    
    const selection = window.getSelection();
    
    if (selection && selection.toString() && contentRef.current) {
      // Get the selected range
      const range = selection.getRangeAt(0);
      
      // Only process selection if it's within our content div
      if (contentRef.current.contains(range.commonAncestorContainer)) {
        // Calculate selection position in text
        const fullText = content;
        const selectedText = selection.toString();
        
        // Find indexes of this selection in the content
        // This is a simplified approach - we're assuming the selected text is unique in the content
        const start = fullText.indexOf(selectedText);
        if (start >= 0) {
          const end = start + selectedText.length;
          setSelection({ start, end });
          return;
        }
      }
    }
    
    setSelection(null);
  };
  
  // Convert API format analysis results to our internal format
  const processedAnalysisResults = React.useMemo(() => {
    if (!analysisResults || !analysisResults.length) return [];
    
    // Check if the results are already in our internal format
    if ('task' in analysisResults[0]) {
      return analysisResults as AnalysisResult[];
    }
    
    // Convert from API format to our internal format
    return (analysisResults as unknown as APIAnalysisResult[]).map(result => {
      // Debug log to help troubleshoot
      console.log(`Task ${result.task_name}: ${result.start_index}-${result.end_index}, Content: "${content.substring(result.start_index, result.end_index)}"`);
      
      return {
        task: result.task_name,
        position: {
          start: result.start_index,
          end: result.end_index
        },
        definition: result.details.definition,
        page_number: result.details.page_number,
        image_path: result.details.image_path,
        id: result.details.id
      };
    });
  }, [analysisResults, content]);
  
  // Find all occurrences of a task name in the content
  const findAllTaskPositions = useCallback((taskName: string) => {
    const positions = [];
    const taskNameVariations = [
      taskName,                     // Exact match
      taskName.toUpperCase(),       // Uppercase
      taskName.toLowerCase(),       // Lowercase
      taskName.charAt(0).toUpperCase() + taskName.slice(1).toLowerCase() // Title case
    ];
    
    // Find all occurrences of all variations
    for (const variation of taskNameVariations) {
      let pos = 0;
      while (pos < content.length) {
        const index = content.indexOf(variation, pos);
        if (index === -1) break;
        
        // Check if this is a standalone word by checking boundaries
        const prevChar = index > 0 ? content[index - 1] : ' ';
        const nextChar = index + variation.length < content.length ? content[index + variation.length] : ' ';
        const isWordBoundaryBefore = /\W/.test(prevChar) || prevChar === ' ';
        const isWordBoundaryAfter = /\W/.test(nextChar) || nextChar === ' ';
        
        if (isWordBoundaryBefore && isWordBoundaryAfter) {
          positions.push({
            start: index,
            end: index + variation.length,
            actualText: content.substring(index, index + variation.length)
          });
        }
        
        pos = index + 1; // Move past this occurrence
      }
    }
    
    // Sort and return unique positions
    return positions.sort((a, b) => a.start - b.start);
  }, [content]);
  
  // Generate the highlighted content as JSX
  useEffect(() => {
    if (!content || !processedAnalysisResults.length) {
      setHighlightedText(null);
      return;
    }
    
    // Build a map of all positions that need highlighting
    interface HighlightPosition {
      start: number;
      end: number;
      task: AnalysisResult;
      actualText: string;
    }
    
    const positions: HighlightPosition[] = [];
    
    // Find all occurrences of each unique task
    const uniqueTasks = Array.from(new Set(processedAnalysisResults.map(r => r.task)));
    
    uniqueTasks.forEach(taskName => {
      const taskDetails = processedAnalysisResults.find(r => r.task === taskName);
      if (!taskDetails) return;
      
      const occurrences = findAllTaskPositions(taskName);
      occurrences.forEach(occurrence => {
        positions.push({
          start: occurrence.start,
          end: occurrence.end,
          actualText: occurrence.actualText,
          task: {
            ...taskDetails,
            task: occurrence.actualText, // Use the actual text from the document
            position: {
              start: occurrence.start,
              end: occurrence.end
            }
          }
        });
      });
    });
    
    // Sort positions by start index to process them in order
    positions.sort((a, b) => a.start - b.start);
    
    // Remove any overlapping positions
    const filteredPositions: HighlightPosition[] = [];
    let lastEnd = -1;
    
    positions.forEach(pos => {
      if (pos.start > lastEnd) { // Changed from >= to > to be stricter
        filteredPositions.push(pos);
        lastEnd = pos.end;
      }
    });
    
    // Generate the content with highlights
    let lastIndex = 0;
    const elements: JSX.Element[] = [];
    
    filteredPositions.forEach((pos, i) => {
      // Add regular text before this task
      if (pos.start > lastIndex) {
        elements.push(
          <span key={`text-${i}`}>
            {content.substring(lastIndex, pos.start)}
          </span>
        );
      }
      
      // Add highlighted task with original case preserved
      elements.push(
        <span 
          key={`task-${i}`}
          className="bg-emerald-700/40 text-emerald-200 font-medium px-1 py-0.5 rounded border border-emerald-600/50 shadow-sm shadow-emerald-900/30 cursor-pointer hover:bg-emerald-600/50 hover:text-white transition-colors"
          data-task-index={i}
          onClick={(e) => {
            e.stopPropagation();
            handleTaskClick(pos.task, e.currentTarget);
          }}
        >
          {pos.actualText}
        </span>
      );
      
      lastIndex = pos.end;
    });
    
    // Add remaining text after the last task
    if (lastIndex < content.length) {
      elements.push(
        <span key="text-last">
          {content.substring(lastIndex)}
        </span>
      );
    }
    
    setHighlightedText(<>{elements}</>);
  }, [content, processedAnalysisResults, findAllTaskPositions]);
  
  // Handle click on a tactical task term
  const handleTaskClick = (task: AnalysisResult, element: HTMLElement) => {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
    
    // Calculate position relative to the editor
    setTooltipPosition({
      top: rect.bottom - editorRect.top,
      left: rect.left - editorRect.left
    });
    
    setActiveTooltip(task);
  };
  
  // Request AI enhancement for selected text
  const handleAIEnhancement = async (enhancementType: 'general' | 'conciseness' | 'clarity' | 'impact' = 'general') => {
    if (!selection) return;
    
    const selectedText = content.substring(selection.start, selection.end);
    await getTextEnhancement(selectedText, enhancementType);
  };
  
  // Apply AI enhancement to the selected text
  const handleAcceptSuggestion = () => {
    if (!suggestion || !selection) return;
    
    const enhancedText = acceptSuggestion();
    
    // Replace the selected text with the enhanced text
    const newContent = 
      content.substring(0, selection.start) + 
      enhancedText + 
      content.substring(selection.end);
    
    setContent(newContent);
    
    // Reset selection and clear suggestion
    setSelection(null);
    clearSuggestion();
    
    // If there's a save callback, call it
    if (onSave) {
      onSave(newContent);
    }
  };
  
  // Reject AI enhancement
  const handleRejectSuggestion = () => {
    rejectSuggestion();
    setSelection(null);
  };
  
  // Handle "real" textarea input changes (when editing)
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (onSave) {
      onSave(newContent);
    }
  };
  
  // Hidden textarea used only for editing
  const renderHiddenTextarea = () => {
    if (readOnly) return null;
    
    return (
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleContentChange}
        className="w-full h-full opacity-0 absolute inset-0 z-10"
        style={{ caretColor: 'transparent' }}
      />
    );
  };
  
  return (
    <div 
      className={cn(
        "flex flex-col h-full",
        className
      )}
    >
      {/* Document editor with fixed toolbar */}
      <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-sm shadow-xl overflow-hidden">
        {/* Document toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-red-500 rounded-full"></div>
            <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-xs font-mono text-zinc-400">
            OPORD CANVAS - {isAnalyzing ? "ANALYZING..." : "READY"}
          </div>
          <div>
            {!readOnly && !suggestion && !selection && (
              <Button
                variant="outline"
                size="sm"
                onClick={runAnalysis}
                disabled={isAnalyzing || !content.trim()}
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Tactical Tasks"}
              </Button>
            )}
          </div>
        </div>
        
        {/* Document content area - main view */}
        <div 
          ref={editorRef} 
          className="relative flex-1 w-full overflow-auto p-8 px-16"
          onMouseUp={handleSelectionChange}
          onClick={() => setActiveTooltip(null)}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.01)_0%,transparent_70%)]"></div>
          
          {/* The hidden textarea for actual editing */}
          {renderHiddenTextarea()}
          
          {/* The visible content with highlights */}
          <div 
            ref={contentRef}
            className="relative text-white font-mono text-base leading-relaxed whitespace-pre-wrap"
          >
            {highlightedText || content}
          </div>
          
          {/* Tactical Task Tooltip */}
          {activeTooltip && (
            <div 
              style={{ 
                position: 'absolute', 
                top: tooltipPosition.top, 
                left: tooltipPosition.left,
                zIndex: 50,
              }}
            >
              <TacticalTaskTooltip 
                task={activeTooltip} 
                onClose={() => setActiveTooltip(null)} 
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Selection tools */}
      {selection && !readOnly && (
        <div className="mt-4 p-4 border border-zinc-700 bg-zinc-800/80 backdrop-blur-sm rounded-sm">
          <h4 className="text-xs font-mono text-zinc-400 mb-3">ENHANCE SELECTED TEXT</h4>
          <div className="flex flex-wrap gap-3">
            <Button 
              size="sm" 
              onClick={() => handleAIEnhancement('general')}
              disabled={isAILoading}
            >
              General Enhancement
            </Button>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => handleAIEnhancement('conciseness')}
              disabled={isAILoading}
            >
              Make Concise
            </Button>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => handleAIEnhancement('clarity')}
              disabled={isAILoading}
            >
              Improve Clarity
            </Button>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => handleAIEnhancement('impact')}
              disabled={isAILoading}
            >
              Add Impact
            </Button>
          </div>
        </div>
      )}
      
      {/* AI Suggestion display */}
      {suggestion && (
        <div className="mt-4 p-6 border border-zinc-700 bg-zinc-800/80 backdrop-blur-sm rounded-sm">
          <h4 className="text-sm font-mono text-emerald-500 mb-3">AI ENHANCEMENT SUGGESTION</h4>
          
          <div className="mb-4">
            <div className="text-xs text-zinc-500 mb-1">ORIGINAL TEXT:</div>
            <div className="p-3 bg-zinc-900/80 text-zinc-400 font-mono text-sm rounded-sm border border-zinc-800">
              {suggestion.originalText}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-xs text-zinc-500 mb-1">ENHANCED TEXT:</div>
            <div className="p-3 bg-zinc-900/80 text-emerald-400 font-mono text-sm rounded-sm border border-zinc-800">
              {suggestion.enhancedText}
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRejectSuggestion}
            >
              Reject
            </Button>
            <Button 
              size="sm"
              onClick={handleAcceptSuggestion}
            >
              Accept & Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 