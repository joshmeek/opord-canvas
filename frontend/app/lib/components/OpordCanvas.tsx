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
  const [caretPosition, setCaretPosition] = useState<number | null>(null);
  const { analyzeOpord, analysisResults } = useOpord();
  const { 
    suggestion, 
    getTextEnhancement, 
    acceptSuggestion, 
    rejectSuggestion, 
    clearSuggestion,
    isLoading: isAILoading 
  } = useAI();
  
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
    // Remove auto-analysis on content change, only analyze when explicitly saved
    // This comment left to show what was removed
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
  const handleSelectionChange = (e?: MouseEvent) => {
    if (readOnly) return;
    
    // Short delay to let the selection stabilize
    setTimeout(() => {
      const selection = window.getSelection();
      
      if (selection && selection.toString() && contentRef.current) {
        // Get the selected range
        const range = selection.getRangeAt(0);
        
        // Only process selection if it's within our content div
        if (contentRef.current.contains(range.commonAncestorContainer)) {
          // Calculate selection position in text
          const selectedText = selection.toString();
          
          // Only proceed if we have meaningful selected text (not just whitespace)
          if (selectedText.trim().length > 0) {
            setSelectedText(selectedText);
            
            // We need to calculate the actual position in the content string
            // This is more complex with highlighted text, so we'll use a different approach
            
            // Get all text nodes before the selection start
            const textNodesBeforeSelection = getTextNodesUpTo(contentRef.current, range.startContainer);
            const offsetBefore = textNodesBeforeSelection.reduce((total, node) => {
              return total + (node.textContent || '').length;
            }, 0);
            
            const start = offsetBefore + range.startOffset;
            const end = start + selectedText.length;
            
            setSelection({ start, end });
            
            // Open AI pane when text is selected in edit mode
            setShowAIPane(true);
            return;
          }
        }
      }
      
      // Don't clear selection if AI pane is shown with suggestion
      if (!suggestion) {
        setSelection(null);
        setSelectedText('');
      }
    }, 10); // Small delay to ensure selection is complete
  };
  
  // Helper function to get all text nodes up to a specific node
  const getTextNodesUpTo = (rootNode: Node, endNode: Node): Text[] => {
    const textNodes: Text[] = [];
    const treeWalker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip empty text nodes
          if (!node.textContent || node.textContent.trim() === '') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let currentNode: Node | null = treeWalker.nextNode();
    
    while (currentNode) {
      if (currentNode === endNode) {
        break;
      }
      
      // Check if current node is before the end node in document order
      if (rootNode.contains(endNode) && 
          (currentNode.compareDocumentPosition(endNode) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        textNodes.push(currentNode as Text);
      }
      
      currentNode = treeWalker.nextNode();
    }
    
    return textNodes;
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
          <span key={`text-${i}`} className="text-section">
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
        <span key="text-last" className="text-section">
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
      
      // Do NOT analyze after accepting - we'll let the user decide when to analyze
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
  
  // Helper function to restore caret position after content update
  const restoreCaretPosition = (position: number) => {
    if (!contentRef.current) return;
    
    // Wait for React to update the DOM
    setTimeout(() => {
      // Create a range and set the position
      const range = document.createRange();
      const sel = window.getSelection();
      if (!sel) return;
      
      try {
        // Find the text node where we need to place the caret
        const container = contentRef.current;
        if (!container) return;
        
        const nodePosition = findNodeAndOffsetAtPosition(container, position);
        if (!nodePosition) return;
        
        range.setStart(nodePosition.node, nodePosition.offset);
        range.collapse(true);
        
        sel.removeAllRanges();
        sel.addRange(range);
        
        // Update our internal tracking
        setCaretPosition(position);
      } catch (e) {
        console.error("Error restoring caret position:", e);
      }
    }, 0);
  };
  
  // Find the node and offset at a specific position in the content
  const findNodeAndOffsetAtPosition = (
    container: Node, 
    targetPosition: number
  ): { node: Node, offset: number } | null => {
    // Handle empty content
    if (targetPosition === 0 && container.childNodes.length === 0) {
      return { node: container, offset: 0 };
    }
    
    let currentPosition = 0;
    
    // Create a tree walker to walk through all text nodes
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node = walker.nextNode();
    while (node) {
      const nodeLength = node.textContent?.length || 0;
      
      // Check if the target position is within this text node
      if (currentPosition + nodeLength >= targetPosition) {
        return {
          node,
          offset: targetPosition - currentPosition
        };
      }
      
      currentPosition += nodeLength;
      node = walker.nextNode();
    }
    
    // If we got here, we couldn't find the position
    // Return the last position of the last text node as fallback
    if (container.lastChild && container.lastChild.textContent) {
      return {
        node: container.lastChild,
        offset: container.lastChild.textContent.length
      };
    }
    
    return null;
  };
  
  // Handle key presses for text editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;
    
    // Special key handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const newContent = insertAtCaret('\t');
      setContent(newContent);
      if (onSave) onSave(newContent);
      
      // For Tab we use the updated caret position from insertAtCaret
      if (caretPosition !== null) {
        restoreCaretPosition(caretPosition);
      }
      return;
    }
    
    // Don't interfere with keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
    if (e.ctrlKey || e.metaKey) return;
    
    // Do not handle other keys that have special meaning (arrow keys, home, end, etc.)
    const nonContentKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown',
      'Shift', 'Control', 'Alt', 'Meta',
      'Escape', 'CapsLock', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];
    
    if (nonContentKeys.includes(e.key)) return;
  };
  
  // Handle direct text input for editing
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (readOnly) return;
    
    // Let browser handle copy, paste, etc.
    if (e.ctrlKey || e.metaKey) return;
    
    e.preventDefault(); // Prevent default for other keypresses
    
    // Track the current position before we update content
    const positionBeforeUpdate = caretPosition;
    
    if (e.key === 'Enter') {
      const newContent = insertAtCaret('\n');
      setContent(newContent);
      if (onSave) onSave(newContent);
      
      // Restore cursor position after the content is updated
      if (caretPosition !== null) {
        restoreCaretPosition(caretPosition);
      }
    } else if (e.key === 'Backspace') {
      const selection = window.getSelection();
      
      // If there's a text selection, delete it
      if (selection && selection.toString()) {
        const range = selection.getRangeAt(0);
        if (contentRef.current?.contains(range.commonAncestorContainer)) {
          // Get the text nodes before the selection start
          const textNodesBeforeSelection = getTextNodesUpTo(contentRef.current, range.startContainer);
          const offsetBefore = textNodesBeforeSelection.reduce((total, node) => {
            return total + (node.textContent || '').length;
          }, 0);
          
          const start = offsetBefore + range.startOffset;
          const selectedText = selection.toString();
          const end = start + selectedText.length;
          
          const newContent = content.substring(0, start) + content.substring(end);
          setContent(newContent);
          if (onSave) onSave(newContent);
          
          // Restore cursor to the start of the deleted selection
          restoreCaretPosition(start);
        }
      } 
      // Otherwise delete the character before the caret
      else if (caretPosition !== null && caretPosition > 0) {
        const newContent = 
          content.substring(0, caretPosition - 1) + 
          content.substring(caretPosition);
        setContent(newContent);
        if (onSave) onSave(newContent);
        
        // Move cursor back one character
        restoreCaretPosition(caretPosition - 1);
      }
    } else if (e.key.length === 1) { // Regular character input
      const newContent = insertAtCaret(e.key);
      setContent(newContent);
      if (onSave) onSave(newContent);
      
      // Restore cursor position after the new character
      if (caretPosition !== null) {
        restoreCaretPosition(caretPosition);
      }
    }
  };
  
  // Helper function to insert text at current caret position
  const insertAtCaret = (textToInsert: string): string => {
    // If there's a selection, replace it
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const range = selection.getRangeAt(0);
      if (contentRef.current?.contains(range.commonAncestorContainer)) {
        // Get the text nodes before the selection start
        const textNodesBeforeSelection = getTextNodesUpTo(contentRef.current, range.startContainer);
        const offsetBefore = textNodesBeforeSelection.reduce((total, node) => {
          return total + (node.textContent || '').length;
        }, 0);
        
        const start = offsetBefore + range.startOffset;
        const selectedText = selection.toString();
        const end = start + selectedText.length;
        
        const newContent = 
          content.substring(0, start) + 
          textToInsert + 
          content.substring(end);
        
        // Set caret position after inserted text
        setCaretPosition(start + textToInsert.length);
        return newContent;
      }
    }
    
    // Otherwise insert at current caret position
    if (caretPosition !== null) {
      const newContent = 
        content.substring(0, caretPosition) + 
        textToInsert + 
        content.substring(caretPosition);
      
      // Update caret position
      setCaretPosition(caretPosition + textToInsert.length);
      return newContent;
    }
    
    // Fallback: append to end if no caret position
    const newContent = content + textToInsert;
    setCaretPosition(newContent.length);
    return newContent;
  };
  
  // Track caret position in the content
  const updateCaretPosition = () => {
    const selection = window.getSelection();
    if (!selection || !contentRef.current) return;
    
    // Only process if selection is in our content area
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (contentRef.current.contains(range.commonAncestorContainer)) {
        // Get the text nodes before the selection point
        const textNodesBeforeSelection = getTextNodesUpTo(contentRef.current, range.startContainer);
        const offsetBefore = textNodesBeforeSelection.reduce((total, node) => {
          return total + (node.textContent || '').length;
        }, 0);
        
        // Set caret position
        setCaretPosition(offsetBefore + range.startOffset);
      }
    }
  };
  
  // Handle clicks to set caret position
  const handleContentClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    
    // Prevent click handling if clicking on a task highlight
    if ((e.target as HTMLElement).getAttribute('data-task-index')) {
      return;
    }
    
    updateCaretPosition();
    
    // When clicking in the editor and not on a task highlight, focus the editor
    if (contentRef.current) {
      contentRef.current.focus();
    }
  };
  
  // Setup paste handling
  useEffect(() => {
    if (readOnly || !contentRef.current) return;
    
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      
      const pastedText = clipboardData.getData('text');
      const newContent = insertAtCaret(pastedText);
      setContent(newContent);
      if (onSave) onSave(newContent);
    };
    
    const contentElement = contentRef.current;
    contentElement.addEventListener('paste', handlePaste);
    
    return () => {
      contentElement.removeEventListener('paste', handlePaste);
    };
  }, [readOnly, content, caretPosition, onSave]);
  
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
  
  // We need to maintain our own content state rather than relying on contentEditable
  // This ensures highlights work correctly when the content is edited
  const handleContentInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (readOnly) return;
    
    // Remember current caret position before update
    const currentPos = caretPosition;
    
    // Get the content from the contentEditable div
    const newContent = e.currentTarget.textContent || '';
    
    // Update our state if it's different
    if (newContent !== content) {
      setContent(newContent);
      
      // Don't save or analyze on every keystroke
      // The onSave callback will be called with final content on blur
      
      // Try to restore cursor position
      if (currentPos !== null) {
        restoreCaretPosition(currentPos);
      }
    }
  };
  
  // When leaving the editor, save the final content
  const handleEditorBlur = () => {
    if (readOnly || !onSave) return;
    
    // Save content but don't auto-analyze on blur
    onSave(content);
    
    // Update caret position
    updateCaretPosition();
  };
  
  // Handle mouseup for proper text selection with both double-click and drag selection
  useEffect(() => {
    if (readOnly || !contentRef.current) return;
    
    const handleMouseUp = () => {
      handleSelectionChange();
    };
    
    const contentElement = contentRef.current;
    contentElement.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      contentElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [readOnly, content, handleSelectionChange]);
  
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
            readOnly ? "" : "focus:outline-none focus:ring-1 focus:ring-emerald-700/50 selection:bg-zinc-700 selection:text-emerald-300"
          )}
          tabIndex={0}
          contentEditable={!readOnly}
          suppressContentEditableWarning={true}
          onKeyDown={handleKeyDown}
          onKeyPress={handleKeyPress}
          onClick={handleContentClick}
          onInput={handleContentInput}
          onBlur={handleEditorBlur}
          spellCheck={false}
        >
          {highlightedText || content}
        </div>
        
        {/* AI Enhancement Pane */}
        {renderAIPane()}
      </div>
      
      {/* Debugging info (optional) */}
      {!readOnly && selection && (
        <div className="absolute bottom-14 right-2 text-xs font-mono bg-zinc-900 border border-zinc-800 p-1 rounded text-zinc-400">
          Selection: {selection.start}-{selection.end}
        </div>
      )}
      
      {/* Manual analyze button - Make it more prominent */}
      {!readOnly && (
        <div className="absolute bottom-2 right-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="text-xs bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:text-emerald-400"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze for Tactical Tasks'}
          </Button>
        </div>
      )}
      
      {/* Loading indicator */}
      {isAnalyzing && (
        <div className="fixed bottom-4 right-4 bg-emerald-900/50 text-emerald-400 font-mono text-xs px-3 py-1 rounded-md animate-pulse">
          Analyzing...
        </div>
      )}
    </div>
  );
} 