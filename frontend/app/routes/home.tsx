import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { useAuth } from "../lib/auth";
import { Logo, Button, MainLayout } from "../lib/components";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "OPORD Canvas" },
    { name: "description", content: "Welcome to OPORD Canvas" },
  ];
}

export function loader({}: Route.LoaderArgs) {
  // Could redirect if needed
  return null;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  
  return (
    <MainLayout className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-2xl text-center">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        
        <h1 className="text-4xl font-bold mb-6">
          WELCOME TO <span className="text-emerald-500">OPORD CANVAS</span>
        </h1>
        
        <p className="text-zinc-400 mb-8">
          The next-generation platform for military operational planning.
        </p>
        
        <div className="flex gap-4 justify-center">
          {isAuthenticated ? (
            <Button onClick={() => window.location.href = '/dashboard'}>
              ENTER DASHBOARD
            </Button>
          ) : (
            <>
              <Button onClick={() => window.location.href = '/login'}>
                LOGIN
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/register'}>
                REGISTER
              </Button>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
