'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [name, setName] = useState('');
  const [createName, setCreateName] = useState('');
  const [room, setRoom] = useState('');
  const [newRoomId, setNewRoomId] = useState<string | null>(null);
  const router = useRouter();
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 });
  const { firestore, auth, user } = useFirebase();

  const [isValidatingRoom, setIsValidatingRoom] = useState(false);
  const [isRoomValid, setIsRoomValid] = useState(false);

  useEffect(() => {
    const validateRoom = () => {
      if (room.trim().length > 0) {
        setIsValidatingRoom(true);
        setIsRoomValid(false);
        const roomDocRef = doc(firestore, 'whiteboards', room.trim());
        getDoc(roomDocRef).then((roomDoc) => {
            setIsRoomValid(roomDoc.exists());
        }).catch((error) => {
            const contextualError = new FirestorePermissionError({
                operation: 'get',
                path: roomDocRef.path,
            });
            errorEmitter.emit('permission-error', contextualError);
            setIsRoomValid(false);
        }).finally(() => {
            setIsValidatingRoom(false);
        });
      } else {
        setIsRoomValid(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      validateRoom();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [room, firestore]);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && room.trim() && isRoomValid) {
      router.push(`/room/${room.trim()}?name=${name.trim()}`);
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (createName.trim().length === 4 && user) {
      const generatedRoomId = Math.random().toString(36).substring(2, 9);
      
      const whiteboardRef = doc(firestore, 'whiteboards', generatedRoomId);
      const whiteboardData = {
        id: generatedRoomId,
        name: `${createName}'s Whiteboard`,
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp(),
        ownerId: user.uid,
      };

      setDoc(whiteboardRef, whiteboardData)
        .then(() => {
            setName(createName); // Set the name for joining
            setNewRoomId(generatedRoomId);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: whiteboardRef.path,
              operation: 'create',
              requestResourceData: whiteboardData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  const handleJoinNewRoom = () => {
    if (newRoomId && name.trim()) {
      router.push(`/room/${newRoomId}?name=${name.trim()}`);
    }
  }

  const handleCopy = () => {
    if(newRoomId) {
      copyToClipboard(newRoomId);
    }
  }
  
  const handleCreateNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 4) {
      setCreateName(numericValue);
    }
  }

  return (
    <main className="flex items-center justify-center h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">CollabDraw</CardTitle>
          <CardDescription>
            Create or join a room to start collaborating.
          </CardDescription>
        </CardHeader>
        <Tabs defaultValue="join" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join">Join Room</TabsTrigger>
            <TabsTrigger value="create">Create Room</TabsTrigger>
          </TabsList>
          <TabsContent value="join">
            <form onSubmit={handleJoinRoom}>
              <CardContent className="grid gap-4 pt-6">
                <div className="grid gap-2">
                  <Label htmlFor="name-join">Name</Label>
                  <Input
                    id="name-join"
                    type="text"
                    placeholder="Enter your name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    suppressHydrationWarning
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="room-join">Room</Label>
                  <div className="relative">
                    <Input
                      id="room-join"
                      type="text"
                      placeholder="Enter room name"
                      required
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className={cn(
                        'pr-10',
                        isRoomValid && 'border-green-500 focus-visible:ring-green-500'
                      )}
                      suppressHydrationWarning
                    />
                    {isValidatingRoom && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                    {room.length > 0 && !isValidatingRoom && isRoomValid && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={!isRoomValid || isValidatingRoom || !name.trim()} suppressHydrationWarning>
                  Join Room
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
          <TabsContent value="create">
            <form onSubmit={handleCreateRoom}>
              <CardContent className="grid gap-4 pt-6">
                <div className="grid gap-2">
                  <Label htmlFor="name-create">Name</Label>
                  <Input
                    id="name-create"
                    type="tel"
                    placeholder="Enter 4-digit name"
                    required
                    value={createName}
                    onChange={handleCreateNameChange}
                    maxLength={4}
                    pattern="[0-9]*"
                    suppressHydrationWarning
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={createName.length !== 4 || !user} suppressHydrationWarning>
                  { !user ? 'Connecting...' : 'Create Room' }
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      <AlertDialog open={!!newRoomId} onOpenChange={() => setNewRoomId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Room Created!</AlertDialogTitle>
            <AlertDialogDescription>
              Share this room ID with others to collaborate. Your name for this room is {createName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 rounded-md border border-input p-2">
            <p className="flex-grow text-sm font-mono bg-muted px-2 py-1 rounded">
              {newRoomId}
            </p>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setNewRoomId(null)}>
              Close
            </Button>
            <AlertDialogAction onClick={handleJoinNewRoom}>
              Join Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
