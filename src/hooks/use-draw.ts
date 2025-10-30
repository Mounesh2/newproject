'use client';

import { useEffect, useRef, useState } from 'react';
import type { Point, DrawLine } from '@/lib/types';

export const useDraw = (onDraw: ({ ctx, currentPoint, prevPoint }: DrawLine) => void) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevPoint = useRef<null | Point>(null);

  const [mouseDown, setMouseDown] = useState(false);

  const onMouseDown = () => setMouseDown(true);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!mouseDown) return;

      const currentPoint = computePointInCanvas(e);
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !currentPoint) return;

      onDraw({ ctx, currentPoint, prevPoint: prevPoint.current });
      prevPoint.current = currentPoint;
    };

    const computePointInCanvas = (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

      return { x, y };
    };

    const mouseUpHandler = () => {
      setMouseDown(false);
      prevPoint.current = null;
    };

    // Add event listeners
    canvasRef.current?.addEventListener('mousemove', handler);
    window.addEventListener('mouseup', mouseUpHandler);
    
    // Touch events
    canvasRef.current?.addEventListener('touchmove', handler);
    window.addEventListener('touchend', mouseUpHandler);


    // Remove event listeners
    return () => {
      canvasRef.current?.removeEventListener('mousemove', handler);
      window.removeEventListener('mouseup', mouseUpHandler);
      
      canvasRef.current?.removeEventListener('touchmove', handler);
      window.removeEventListener('touchend', mouseUpHandler);
    };
  }, [onDraw, mouseDown]);

  return { canvasRef, onMouseDown, clear };
};
