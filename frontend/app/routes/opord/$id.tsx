import React, { useState, useEffect } from 'react';
import { useNavigate, redirect } from 'react-router';
import type { Route } from './+types/$id';
import { useAuth } from '../../lib/auth';
import { useOpord } from '../../lib/opord-context';
import { Navbar, MainLayout, Logo, Button, Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../lib/components';
import { OpordCanvas } from '../../lib/components/OpordCanvas';

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `OPORD Details - OPORD Canvas` },
    { name: "description", content: "View OPORD details" },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  // Check if we're in a browser environment before accessing localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('token');
    if (!token) {
      return redirect('/login');
    }
  }
  
  try {
    // We'll rely on the OpordContext for data loading
    return { id: params.id };
  } catch (error) {
    throw new Response("Not Found", { status: 404 });
  }
}

export default function OPORDDetail({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    currentOpord, 
    getOpordById, 
    updateOpord, 
    isLoading, 
    error 
  } = useOpord();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  // Load OPORD data when component mounts
  useEffect(() => {
    if (loaderData.id) {
      getOpordById(Number(loaderData.id));
    }
  }, [loaderData.id, getOpordById]);
  
  // Initialize edited content when OPORD is loaded
  useEffect(() => {
    if (currentOpord) {
      setEditedContent(currentOpord.content);
    }
  }, [currentOpord]);
  
  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      if (currentOpord) {
        updateOpord(currentOpord.id, { content: editedContent });
      }
    }
    setIsEditing(!isEditing);
  };
  
  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
  };
  
  if (isLoading || !currentOpord) {
    return (
      <>
        <Navbar>
          <Logo />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
          >
            BACK TO DASHBOARD
          </Button>
        </Navbar>
        
        <MainLayout>
          <div className="flex justify-center py-12">
            <div className="text-emerald-500 font-mono text-sm animate-pulse">
              LOADING MISSION DATA...
            </div>
          </div>
        </MainLayout>
      </>
    );
  }
  
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
        <div className="w-full mx-auto">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white mb-2">
            {currentOpord.title || "Untitled OPORD"}
          </h1>
          
          <div className="text-xs text-zinc-500 mb-6">
            Created: {new Date(currentOpord.created_at).toLocaleString()}
            {currentOpord.updated_at && ` • Updated: ${new Date(currentOpord.updated_at).toLocaleString()}`}
          </div>
          
          {error && (
            <div className="mb-4 p-3 border border-red-500/20 bg-red-500/10 text-red-400 rounded-sm font-mono text-sm">
              {error}
            </div>
          )}
          
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>MISSION CONTENT</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
              >
                {isEditing ? "SAVE CHANGES" : "EDIT"}
              </Button>
            </CardHeader>
            <CardContent>
              <OpordCanvas
                initialContent={isEditing ? editedContent : currentOpord.content}
                onSave={handleContentChange}
                readOnly={!isEditing}
                className="min-h-[80vh]"
              />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </>
  );
} 