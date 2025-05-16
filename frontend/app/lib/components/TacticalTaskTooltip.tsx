import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { AnalysisResult } from '../api';
import { tacticalTaskApi } from '../api';
import { cn } from '../utils';

interface TacticalTaskTooltipProps {
  task: AnalysisResult;
  className?: string;
  onClose?: () => void;
}

export function TacticalTaskTooltip({ task, className, onClose }: TacticalTaskTooltipProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // If the task has an id, we could fetch additional details if needed
  useEffect(() => {
    // We could fetch more details if needed, but for now we'll use what's passed in
    if (typeof task.id === 'number' && !task.definition) {
      const fetchTaskDetails = async () => {
        setIsLoading(true);
        try {
          // Using non-null assertion since we've already checked that task.id is a number
          // @ts-ignore
          const details = await tacticalTaskApi.getById(task.id);
          // We could merge the details here if needed
        } catch (err) {
          setError('Could not load full task details');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchTaskDetails();
    }
  }, [task.id, task.definition]);
  
  const handleViewInDoctrine = () => {
    // Navigate to doctrine library and pass page number as query param
    navigate(`/doctrine?page=${task.page_number}`);
    if (onClose) {
      onClose();
    }
  };
  
  // Format the image path for display
  const getImagePath = () => {
    if (!task.image_path) return null;
    
    // Remove 'public/' prefix if it exists, as that's not needed for URL paths
    let path = task.image_path;
    if (path.startsWith('public/')) {
      path = path.substring(7);
    }
    
    // Ensure path starts with a slash
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    return path;
  };
  
  const imagePath = getImagePath();
  
  return (
    <div 
      className={cn(
        "absolute z-50 w-80 p-5 bg-zinc-900/95 backdrop-blur-sm border border-emerald-500/30 shadow-lg shadow-emerald-500/10 rounded-sm",
        "font-mono text-xs",
        className
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-emerald-500 font-bold tracking-wider">{task.task}</h4>
        <button 
          onClick={onClose}
          className="text-zinc-500 hover:text-white text-lg"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      
      {isLoading ? (
        <div className="text-emerald-400 text-xs animate-pulse">Loading task details...</div>
      ) : error ? (
        <div className="text-red-400 text-xs">{error}</div>
      ) : (
        <>
          <div className="text-zinc-300 mb-4 max-h-40 overflow-y-auto text-xs leading-relaxed">
            {task.definition}
          </div>
          
          <div className="text-zinc-500 text-xs mb-3 flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-emerald-500/30 rounded-full"></span>
            FM 3-90 Page: <span className="text-emerald-400">{task.page_number}</span>
          </div>
          
          {imagePath && (
            <div className="mb-4">
              <img 
                src={imagePath} 
                alt={`Illustration for ${task.task}`}
                className="w-full object-cover border border-zinc-700 rounded-sm"
                loading="lazy"
              />
            </div>
          )}
          
          <button
            onClick={handleViewInDoctrine}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-emerald-500 hover:bg-zinc-700 transition-colors rounded-sm flex items-center justify-center gap-2 mt-2"
          >
            <span className="text-xs">VIEW IN DOCTRINE LIBRARY</span>
          </button>
        </>
      )}
    </div>
  );
} 