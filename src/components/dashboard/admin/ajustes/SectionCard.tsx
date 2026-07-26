'use client';

import { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}
