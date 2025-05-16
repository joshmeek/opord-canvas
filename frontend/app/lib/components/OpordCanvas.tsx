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
  const [showAIPane, setShowAIPane] = useState(false);
  const [selectedText, setSelectedText] = useState('');
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
        setSelectedText(selectedText);
        
        // Find indexes of this selection in the content
        // This is a simplified approach - we're assuming the selected text is unique in the content
        const start = fullText.indexOf(selectedText);
        if (start >= 0) {
          const end = start + selectedText.length;
          setSelection({ start, end });
          // Open AI pane when text is selected in edit mode
          if (!readOnly && selectedText.trim().length > 0) {
            setShowAIPane(true);
          }
          return;
        }
      }
    }
    
    // Don't clear selection if AI pane is shown with suggestion
    if (!suggestion) {
      setSelection(null);
      setSelectedText('');
    }
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
    if (!selection || !selectedText) return;
    
    await getTextEnhancement(selectedText, enhancementType);
  };
  
  // Apply AI enhancement to the selected text
  const handleAcceptSuggestion = () => {
    if (!suggestion || !selection) return;
    
    // Get the enhanced text from AI
    const enhancedText = acceptSuggestion();
    
    // Update the content with the enhanced text
    const newContent = 
      content.substring(0, selection.start) + 
      enhancedText + 
      content.substring(selection.end);
    
    setContent(newContent);
    
    if (onSave) {
      onSave(newContent);
    }
    
    // Clear suggestion and selection
    clearSuggestion();
    setSelection(null);
    setSelectedText('');
    setShowAIPane(false);
  };
  
  // Reject AI enhancement
  const handleRejectSuggestion = () => {
    rejectSuggestion();
    clearSuggestion();
  };
  
  // Handle "real" textarea input changes (when editing)
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (onSave) {
      onSave(newContent);
    }
  };
  
  // Listen to mouseup for text selection
  useEffect(() => {
    const handleMouseUp = () => handleSelectionChange();
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [content, readOnly]);
  
  // Hidden textarea used only for editing
  const renderHiddenTextarea = () => {
    if (readOnly) return null;
    
    return (
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleContentChange}
        className="absolute top-0 left-0 opacity-0 pointer-events-none h-0"
      />
    );
  };
  
  const handleCloseAIPane = () => {
    clearSuggestion();
    setShowAIPane(false);
  };
  
  // Render the AI enhancement pane
  const renderAIPane = () => {
    if (!showAIPane || readOnly) return null;
    
    return (
      <div className="border-l border-zinc-800 bg-zinc-900 w-1/3 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-emerald-500 font-bold">AI Enhancement</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCloseAIPane}
          >
            Close
          </Button>
        </div>
        
        {selectedText && !suggestion && (
          <>
            <div className="border border-zinc-800 rounded p-3 mb-4">
              <h4 className="text-xs text-zinc-500 mb-1">Selected Text:</h4>
              <p className="text-white text-sm">{selectedText}</p>
            </div>
            
            <div className="mb-4">
              <h4 className="text-xs text-zinc-500 mb-2">Enhance text for:</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => handleAIEnhancement('general')}
                  variant="outline"
                  size="sm"
                  disabled={isAILoading}
                >
                  {isAILoading ? 'Processing...' : 'General'}
                </Button>
                <Button 
                  onClick={() => handleAIEnhancement('clarity')}
                  variant="outline"
                  size="sm"
                  disabled={isAILoading}
                >
                  Clarity
                </Button>
                <Button 
                  onClick={() => handleAIEnhancement('conciseness')}
                  variant="outline"
                  size="sm"
                  disabled={isAILoading}
                >
                  Conciseness
                </Button>
                <Button 
                  onClick={() => handleAIEnhancement('impact')}
                  variant="outline"
                  size="sm"
                  disabled={isAILoading}
                >
                  Impact
                </Button>
              </div>
            </div>
          </>
        )}
        
        {suggestion && (
          <div className="mt-4">
            <div className="border border-zinc-800 rounded p-3 mb-4">
              <h4 className="text-xs text-zinc-500 mb-1">Enhanced Text:</h4>
              <p className="text-white text-sm">{suggestion.enhancedText}</p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleAcceptSuggestion}
                variant="primary"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-600"
              >
                Apply
              </Button>
              <Button 
                onClick={handleRejectSuggestion}
                variant="outline"
                size="sm"
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className={cn("relative border border-zinc-800 bg-zinc-950 rounded-md", className)}>
      {activeTooltip && (
        <div 
          style={{ 
            position: 'absolute',
            top: tooltipPosition.top, 
            left: tooltipPosition.left,
            zIndex: 50 
          }}
        >
          <TacticalTaskTooltip
            task={activeTooltip}
            onClose={() => setActiveTooltip(null)}
          />
        </div>
      )}
      
      <div 
        ref={editorRef}
        className={cn(
          "flex h-full", 
          readOnly ? "cursor-default" : "cursor-text"
        )}
      >
        {/* Main content area */}
        <div 
          ref={contentRef}
          className={cn(
            "p-4 font-mono text-sm text-white leading-relaxed whitespace-pre-wrap flex-1 min-h-[300px]",
            readOnly ? "" : "focus:outline-none"
          )}
          tabIndex={0}
        >
          {renderHiddenTextarea()}
          
          {/* Display content with or without highlights */}
          {highlightedText || content}
          
          {/* Loading indicator */}
          {isAnalyzing && (
            <div className="fixed bottom-4 right-4 bg-emerald-900/50 text-emerald-400 font-mono text-xs px-3 py-1 rounded-md animate-pulse">
              Analyzing...
            </div>
          )}
        </div>
        
        {/* AI Enhancement Pane */}
        {renderAIPane()}
      </div>
    </div>
  );
} 