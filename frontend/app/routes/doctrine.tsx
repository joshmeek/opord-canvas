import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import type { Route } from './+types/doctrine';
import { Navbar, MainLayout, Logo, Button, Card, CardHeader, CardTitle, CardContent } from '../lib/components';
import { useAuth } from '../lib/auth';

export function meta() {
  return [
    { title: "Doctrine Library - OPORD Canvas" },
    { name: "description", content: "Military Doctrine Library" },
  ];
}

export default function DoctrineLibrary() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const pageParam = searchParams.get('page');
  const [pdfReady, setPdfReady] = useState(false);
  const [actualPageNumber, setActualPageNumber] = useState<number | null>(null);
  
  // The PDF location - needs to be in the public folder
  const pdfUrl = "/FM_3-90.pdf";
  
  // Convert FM page reference to actual PDF page number
  useEffect(() => {
    if (!pageParam) {
      setActualPageNumber(1); // Default to first page if no page specified
      return;
    }

    // Map of FM 3-90 page references to actual PDF page numbers
    // These are approximations based on the FM 3-90 structure
    // Format: { "B-5": 414, "B-10": 419, etc. }
    const pageMap: Record<string, number> = {
      // Appendix B pages
      "B-1": 410,
      "B-2": 411,
      "B-3": 412,
      "B-4": 413,
      "B-5": 414,
      "B-6": 415,
      "B-7": 416,
      "B-8": 417,
      "B-9": 418,
      "B-10": 419,
      "B-11": 420,
      "B-12": 421,
      "B-13": 422,
      "B-14": 423,
      "B-15": 424,
      "B-16": 425,
      "B-17": 426,
      "B-18": 427,
      "B-19": 428,
      "B-20": 429,
      // Add more mappings as needed
    };

    // Handle numeric page numbers
    if (/^\d+$/.test(pageParam)) {
      setActualPageNumber(parseInt(pageParam, 10));
    } 
    // Handle FM 3-90 reference format (e.g., "B-10")
    else if (pageMap[pageParam]) {
      setActualPageNumber(pageMap[pageParam]);
    } 
    // If we don't have a mapping, try to extract the number after the dash
    else if (pageParam.includes('-')) {
      const parts = pageParam.split('-');
      if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
        // Rough estimate for other sections (not perfect but better than nothing)
        const section = parts[0].toUpperCase();
        const pageOffset = parseInt(parts[1], 10);
        
        // Base page numbers for different sections (approximate)
        const sectionBasePages: Record<string, number> = {
          "A": 390, // Appendix A starts around page 390
          "B": 410, // Appendix B starts around page 410
          "C": 430, // Appendix C starts around page 430
          // Add more sections as needed
        };
        
        if (sectionBasePages[section]) {
          setActualPageNumber(sectionBasePages[section] + pageOffset - 1);
        } else {
          // If section is unknown, default to the first page
          setActualPageNumber(1);
        }
      } else {
        // If format is unrecognized, default to the first page
        setActualPageNumber(1);
      }
    } else {
      // If format is completely unknown, default to the first page
      setActualPageNumber(1);
    }
  }, [pageParam]);
  
  useEffect(() => {
    // Check if PDF exists when component mounts
    const checkPdfExists = async () => {
      try {
        const response = await fetch(pdfUrl, { method: 'HEAD' });
        setPdfReady(response.ok);
      } catch {
        setPdfReady(false);
      }
    };
    
    checkPdfExists();
  }, [pdfUrl]);
  
  return (
    <>
      <Navbar>
        <Logo />
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-xs text-zinc-400">
              OPERATIVE: <span className="text-emerald-500">{user.email}</span>
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.history.back()}
          >
            BACK
          </Button>
        </div>
      </Navbar>
      
      <MainLayout>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-white mb-6">
          DOCTRINE <span className="text-emerald-500">LIBRARY</span>
        </h1>
        
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>FM 3-90: TACTICS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400 mb-4">
              This manual provides doctrine for tactical operations and is the capstone doctrinal publication
              for military operations at the tactical level.
            </p>
            
            {pageParam && (
              <div className="mb-4 p-2 border border-emerald-500/30 bg-emerald-500/10 rounded-sm">
                <p className="text-emerald-400 text-sm">
                  You are viewing reference page <strong>{pageParam}</strong> of FM 3-90
                  {actualPageNumber && actualPageNumber !== parseInt(pageParam) && (
                    <span> (PDF page {actualPageNumber})</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="w-full h-[800px] bg-zinc-900 border border-zinc-700 rounded-sm overflow-hidden">
          {pdfReady ? (
            <iframe 
              src={`${pdfUrl}${actualPageNumber ? `#page=${actualPageNumber}` : ''}`}
              className="w-full h-full"
              title="FM 3-90 PDF"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <p className="text-zinc-400 mb-4">PDF document not found.</p>
                <p className="text-zinc-500 text-sm">
                  Please ensure FM_3-90.pdf is placed in the public folder.
                </p>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    </>
  );
} 