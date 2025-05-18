import React from "react";
import { cn } from "./utils";

// Navbar component with cyberpunk military theme
export function Navbar({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <nav className={cn(
      "bg-zinc-900 border-b border-emerald-500/30 shadow-lg shadow-emerald-500/10",
      "fixed top-0 left-0 right-0 z-50 h-16 px-4",
      "flex items-center justify-between",
      "font-mono text-sm font-bold tracking-wider",
      className
    )}>
      {children}
    </nav>
  );
}

// Logo component
export function Logo() {
  return (
    <div className="text-emerald-500 text-xl font-black tracking-tighter flex items-center gap-2">
      <span className="inline-block w-6 h-6 bg-emerald-500 rounded-sm relative overflow-hidden">
        <span className="absolute inset-0 flex items-center justify-center text-black font-bold">O</span>
      </span>
      <span>OPORD<span className="text-white">CANVAS</span></span>
    </div>
  );
}

// Button component with cyberpunk military style
export function Button({ 
  children, 
  className, 
  variant = "primary", 
  size = "default",
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-mono text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500",
        "disabled:pointer-events-none disabled:opacity-50",
        // Variant styles
        variant === "primary" && "bg-emerald-500 text-zinc-900 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20",
        variant === "secondary" && "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700",
        variant === "outline" && "border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10",
        variant === "ghost" && "text-white hover:bg-zinc-800 hover:text-emerald-500",
        variant === "destructive" && "bg-red-500 text-white hover:bg-red-600",
        // Size styles
        size === "default" && "h-9 px-4 py-2",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-10 px-6",
        size === "icon" && "h-9 w-9",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Card component with cyberpunk military style
export function Card({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-sm border border-zinc-800 bg-zinc-900/80 shadow-md shadow-emerald-500/5",
        "backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 p-4 border-b border-zinc-800", 
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-mono text-lg font-semibold text-white tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-4 text-sm text-zinc-400", 
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardFooter({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center p-4 border-t border-zinc-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Input component
export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2",
        "text-sm font-mono text-white shadow-sm",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500",
        "placeholder:text-zinc-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

// Main layout component
export function MainLayout({ 
  children,
  className,
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_40%)]">
      <div className="pt-16">
        <div className={cn("container mx-auto px-6", className)}>
          {children}
        </div>
      </div>
    </div>
  );
} 