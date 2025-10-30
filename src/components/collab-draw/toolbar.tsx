'use client';

import { Eraser, Loader, Pen, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

type Tool = 'pen' | 'eraser';

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  color: string;
  setColor: (color: string) => void;
  width: number;
  setWidth: (width: number) => void;
  clear: () => void;
  enhance: () => void;
  isEnhancing: boolean;
}

export function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  width,
  setWidth,
  clear,
  enhance,
  isEnhancing,
}: ToolbarProps) {
  return (
    <TooltipProvider>
      <Card className="absolute top-4 left-1/2 -translate-x-1/2 z-10 shadow-lg">
        <CardContent className="p-2 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'pen' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setTool('pen')}
              >
                <Pen size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pen</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === 'eraser' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setTool('eraser')}
              >
                <Eraser size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Eraser</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-8" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative w-8 h-8">
                <Button variant="ghost" size="icon" className="w-full h-full" disabled={tool === 'eraser'}>
                  <div className="w-5 h-5 rounded-full border border-muted-foreground" style={{ backgroundColor: color }}/>
                </Button>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={tool === 'eraser'}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Color</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-32 flex items-center gap-2">
            <Slider
              min={1}
              max={50}
              step={1}
              value={[width]}
              onValueChange={(v) => setWidth(v[0])}
              disabled={tool === 'eraser'}
            />
          </div>
          
          <Separator orientation="vertical" className="h-8" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={clear}>
                <Trash2 size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear Canvas</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-8" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={enhance}
                disabled={isEnhancing}
                className="text-accent-foreground hover:text-accent-foreground hover:bg-accent/80"
              >
                {isEnhancing ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <Sparkles size={20} className="text-orange-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Enhance with AI</p>
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}