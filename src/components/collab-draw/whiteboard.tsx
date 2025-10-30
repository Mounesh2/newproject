'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useDraw } from '@/hooks/use-draw';
import { useToast } from '@/hooks/use-toast';
import { enhanceWithAI } from '@/lib/actions';
import type { DrawEvent, DrawLine, Point, Participant } from '@/lib/types';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { ChatPanel } from './chat-panel';
import { Toolbar } from './toolbar';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, serverTimestamp, query, orderBy, where, Timestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

function drawLine({ prevPoint, currentPoint, ctx, color, width }: DrawLine & { ctx: CanvasRenderingContext2D }) {
  const startPoint = prevPoint ?? currentPoint;
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(startPoint.x, startPoint.y);
  ctx.lineTo(currentPoint.x, currentPoint.y);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(startPoint.x, startPoint.y, width / 2, 0, 2 * Math.PI);
  ctx.fill();
}

const WhiteboardFC = () => {
  const [color, setColor] = useState<string>('#000');
  const [drawWidth, setDrawWidth] = useState<number>(5);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const name = searchParams.get('name') || 'Anonymous';
  const roomId = params.roomId as string;
  const { firestore, user } = useFirebase();
  const lastTimestamp = useRef(new Date());

  const drawingEventsQuery = useMemoFirebase(() => 
    firestore && roomId ? query(collection(firestore, 'whiteboards', roomId, 'drawingEvents'), where('timestamp', '>', lastTimestamp.current), orderBy('timestamp', 'asc')) : null
  , [firestore, roomId]);

  const { data: drawingEvents } = useCollection<DrawEvent>(drawingEventsQuery);

  const drawEvent = (event: DrawEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { eventData, eventType } = event;
    const data = JSON.parse(eventData);

    const drawColor = eventType === 'eraser' ? '#F0F0F0' : data.color;
    const width = eventType === 'eraser' ? 20 : data.width;
    drawLine({ ctx, currentPoint: data.currentPoint, prevPoint: data.prevPoint, color: drawColor, width });
  };
  
  useEffect(() => {
    if (drawingEvents && drawingEvents.length > 0) {
      drawingEvents.forEach(event => {
        if(event.userId !== user?.uid) {
          drawEvent(event);
        }
        if (event.timestamp instanceof Timestamp) {
            const eventDate = event.timestamp.toDate();
            if (eventDate > lastTimestamp.current) {
                lastTimestamp.current = eventDate;
            }
        }
      });
    }
  }, [drawingEvents, user?.uid]);


  const sendDrawEvent = (data: Omit<DrawLine, 'ctx'>) => {
    if (!firestore || !roomId || !user) return;
    const drawingEventsRef = collection(firestore, 'whiteboards', roomId, 'drawingEvents');
    const eventData: Omit<DrawEvent, 'id'> = {
        userId: user.uid,
        eventType: tool,
        eventData: JSON.stringify({
            prevPoint: data.prevPoint,
            currentPoint: data.currentPoint,
            color: data.color,
            width: data.width
        }),
        timestamp: serverTimestamp()
    };
    addDocumentNonBlocking(drawingEventsRef, eventData);
  }

  const onDraw = useCallback(({ ctx, currentPoint, prevPoint }: Omit<DrawLine, 'color' | 'width'> & { ctx: CanvasRenderingContext2D }) => {
    const currentToolColor = tool === 'eraser' ? '#F0F0F0' : color;
    const currentToolWidth = tool === 'eraser' ? 20 : drawWidth;
    drawLine({ ctx, currentPoint, prevPoint, color: currentToolColor, width: currentToolWidth });
    sendDrawEvent({ prevPoint, currentPoint, color: currentToolColor, width: currentToolWidth });
  }, [color, drawWidth, tool, sendDrawEvent]);

  const { canvasRef, onMouseDown, clear } = useDraw(onDraw);
  
  const historyQuery = useMemoFirebase(() => 
    firestore && roomId ? query(collection(firestore, 'whiteboards', roomId, 'drawingEvents'), orderBy('timestamp', 'asc')) : null
  , [firestore, roomId]);

  const { data: historyEvents, isLoading: isHistoryLoading } = useCollection<DrawEvent>(historyQuery);

  const redrawHistory = useCallback(() => {
    if (historyEvents) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      historyEvents.forEach(event => {
        drawEvent(event);
      });
    }
  }, [historyEvents, canvasRef]);

  useEffect(() => {
    if (!user || !firestore || !roomId) return;
    const participantRef = doc(firestore, 'whiteboards', roomId, 'participants', user.uid);
    
    const participantData: Participant = {
        userId: user.uid,
        name: name,
    };
    
    setDocumentNonBlocking(participantRef, participantData, { merge: true });

    const handleBeforeUnload = () => {
        deleteDocumentNonBlocking(participantRef);
    }
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // Clean up on component unmount or user change
        deleteDocumentNonBlocking(participantRef);
    }

  }, [user, firestore, roomId, name]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const resizeCanvas = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        redrawHistory();
      }
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();
      
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [canvasRef, redrawHistory]);

  const handleEnhance = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsEnhancing(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const result = await enhanceWithAI({ drawingDataUri: dataUrl });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.enhancedDrawing) {
        const image = new Image();
        image.onload = () => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            clear();
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          }
        };
        image.src = result.enhancedDrawing;
        toast({
          title: 'Success!',
          description: 'Your drawing has been enhanced by AI.',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'AI Enhancement Failed',
        description: errorMessage,
      });
    } finally {
      setIsEnhancing(false);
    }
  };
  
  const handleLogout = () => {
    router.push('/');
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" side="right">
        <ChatPanel />
      </Sidebar>
      <SidebarInset>
        <div className="relative w-full h-full flex flex-col">
          <header className="absolute top-4 left-4 z-10 flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut size={16} />
              <span>Logout</span>
            </Button>
            <h1 className="text-2xl font-bold">CollabDraw</h1>
          </header>
          <div className="absolute top-4 right-4 z-10">
            <SidebarTrigger />
          </div>
          <Toolbar
            tool={tool}
            setTool={setTool}
            color={color}
            setColor={setColor}
            width={drawWidth}
            setWidth={setDrawWidth}
            clear={clear}
            enhance={handleEnhance}
            isEnhancing={isEnhancing}
          />
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
            className="w-full h-full flex-grow cursor-crosshair"
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function Whiteboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WhiteboardFC />
    </Suspense>
  )
}
