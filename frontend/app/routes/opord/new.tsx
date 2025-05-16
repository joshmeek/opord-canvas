import React, { useState } from 'react';
import { useNavigate, redirect } from 'react-router';
import type { Route } from './+types/new';
import { useAuth } from '../../lib/auth';
import { useOpord } from '../../lib/opord-context';
import { Navbar, MainLayout, Logo, Button, Card, CardHeader, CardTitle, CardContent, CardFooter, Input } from '../../lib/components';
import { OpordCanvas } from '../../lib/components/OpordCanvas';

export function meta() {
  return [
    { title: "New OPORD - OPORD Canvas" },
    { name: "description", content: "Create a new OPORD" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Check if we're in a browser environment before accessing localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('token');
    if (!token) {
      return redirect('/login');
    }
  }
  return null;
}

export default function NewOPORD() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createOpord, isLoading, error: opordError } = useOpord();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content) {
      setError('Please provide both title and content.');
      return;
    }
    
    try {
      await createOpord(title, content);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to create OPORD. Please try again.');
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
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
          >
            CANCEL
          </Button>
        </div>
      </Navbar>
      
      <MainLayout>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white mb-6">
            NEW <span className="text-emerald-500">OPORD</span>
          </h1>
          
          <Card>
            <CardHeader>
              <CardTitle>MISSION DETAILS</CardTitle>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {(error || opordError) && (
                  <div className="p-2 border border-red-500/20 bg-red-500/10 text-red-400 rounded-sm text-xs font-mono">
                    {error || opordError}
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1" htmlFor="title">
                    TITLE
                  </label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter mission title"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1" htmlFor="content">
                    CONTENT
                  </label>
                  <OpordCanvas
                    initialContent={content}
                    onSave={handleContentChange}
                  />
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "CREATING..." : "CREATE OPORD"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </MainLayout>
    </>
  );
} 