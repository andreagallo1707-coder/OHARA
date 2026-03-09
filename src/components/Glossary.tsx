import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { GlossaryTerm } from '../hooks/useGlossary';

interface GlossaryTextProps {
  text: string;
  glossary: Record<string, GlossaryTerm>;
  children: React.ReactNode;
}

export const GlossaryText: React.FC<GlossaryTextProps> = ({ text, glossary, children }) => {
  // This is a simplified version. In a real app, we'd want to parse the markdown 
  // and only highlight terms in text nodes, not in code blocks or links.
  // For now, we'll rely on the fact that we're wrapping the rendered markdown.
  // However, ReactMarkdown renders its own components.
  // A better approach is to pass a custom component to ReactMarkdown.
  
  return (
    <Tooltip.Provider delayDuration={300}>
      {children}
    </Tooltip.Provider>
  );
};

export const GlossaryTermHighlight: React.FC<{ term: string; definition: string; children: React.ReactNode }> = ({ term, definition, children }) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className="cursor-help border-b border-dotted border-ohara-red-vivid/50 hover:bg-ohara-red-vivid/10 transition-colors">
          {children}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-[100] max-w-xs p-3 bg-ohara-card border border-ohara-border rounded-xl shadow-2xl text-sm text-zinc-300 animate-in fade-in zoom-in duration-200"
          sideOffset={5}
        >
          <div className="font-bold text-ohara-red-vivid mb-1 uppercase text-[10px] tracking-widest">{term}</div>
          {definition}
          <Tooltip.Arrow className="fill-ohara-border" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
