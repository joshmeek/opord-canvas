import React from 'react';
import { cn } from '../utils';

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface AlertDialogContentProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

interface AlertDialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  return (
    <>
      {children}
    </>
  );
}

export function AlertDialogTrigger({ asChild, children }: AlertDialogTriggerProps) {
  return <>{children}</>;
}

export function AlertDialogContent({ className, children }: AlertDialogContentProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={cn(
          "fixed z-50 w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-lg",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ className, children }: AlertDialogHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
}

export function AlertDialogFooter({ className, children }: AlertDialogFooterProps) {
  return (
    <div className={cn("mt-6 flex justify-end space-x-2", className)}>
      {children}
    </div>
  );
}

export function AlertDialogTitle({ className, children }: AlertDialogTitleProps) {
  return (
    <h2 className={cn("text-xl font-bold text-white", className)}>
      {children}
    </h2>
  );
}

export function AlertDialogDescription({ className, children }: AlertDialogDescriptionProps) {
  return (
    <p className={cn("mt-2 text-sm text-zinc-400", className)}>
      {children}
    </p>
  );
}

export function AlertDialogAction({ className, children, ...props }: AlertDialogActionProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AlertDialogCancel({ className, children, ...props }: AlertDialogCancelProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
} 