import React, { useState } from 'react';
import { useNavigate, redirect } from 'react-router';
import type { Route } from './+types/$id';
import { useAuth } from '../../lib/auth';
import { opordApi } from '../../lib/api';
import { analysisApi, type AnalysisResult } from '../../lib/api';
import { Navbar, MainLayout, Logo, Button, Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../lib/components';

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `${loaderData?.opord?.title || 'OPORD'} - OPORD Canvas` },
    { name: "description", content: "View OPORD details" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return redirect('/login');
  }
  
  try {
    const opord = await opordApi.getById(Number(params.id));
    return { opord };
  } catch (error) {
    throw new Response("Not Found", { status: 404 });
  }
}

export default function OPORDDetail({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { opord } = loaderData;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const results = await analysisApi.analyzeTasks(opord.content);
      setAnalysisResults(results);
    } catch (err) {
      console.error('Error analyzing OPORD:', err);
      setError('Failed to analyze OPORD. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
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
            onClick={() => navigate('/dashboard')}
          >
            BACK TO DASHBOARD
          </Button>
        </div>
      </Navbar>
      
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white mb-2">
            {opord.title || "Untitled OPORD"}
          </h1>
          
          <div className="text-xs text-zinc-500 mb-6">
            Created: {new Date(opord.created_at).toLocaleString()}
            {opord.updated_at && ` • Updated: ${new Date(opord.updated_at).toLocaleString()}`}
          </div>
          
          <div className="flex gap-6 flex-col lg:flex-row">
            <div className="flex-1">
              <Card>
                <CardHeader>
                  <CardTitle>MISSION CONTENT</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap font-mono text-sm text-zinc-300">
                    {opord.content}
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button
                    variant="outline"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? "ANALYZING..." : "ANALYZE TACTICAL TASKS"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="w-full lg:w-96">
              <Card>
                <CardHeader>
                  <CardTitle>TACTICAL ANALYSIS</CardTitle>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="p-2 border border-red-500/20 bg-red-500/10 text-red-400 rounded-sm text-xs font-mono mb-4">
                      {error}
                    </div>
                  )}
                  
                  {isAnalyzing ? (
                    <div className="text-emerald-500 font-mono text-sm animate-pulse">
                      ANALYZING DOCUMENT...
                    </div>
                  ) : analysisResults.length > 0 ? (
                    <ul className="space-y-3">
                      {analysisResults.map((result, index) => (
                        <li key={index} className="border border-zinc-800 p-3 rounded-sm">
                          <h3 className="text-emerald-500 font-bold mb-1">{result.task}</h3>
                          <p className="text-xs text-zinc-400 mb-2">{result.definition}</p>
                          <div className="text-xs text-zinc-500">
                            FM 3-90 Page: {result.page_number}
                          </div>
                          {result.image_path && (
                            <div className="mt-2">
                              <img 
                                src={result.image_path} 
                                alt={`Illustration for ${result.task}`}
                                className="w-full object-cover border border-zinc-700"
                              />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-500 text-sm">
                      Click "Analyze Tactical Tasks" to identify and define military tasks in your OPORD.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  );
} 