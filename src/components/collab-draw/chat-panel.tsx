'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Send, Users } from 'lucide-react';
import { Separator } from '../ui/separator';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type Message = {
  id?: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp | Date | any;
};

type Participant = {
    id?: string;
    userId: string;
    name: string;
}

function ChatPanelComponent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const name = searchParams.get('name') || 'Anonymous';
  const roomId = params.roomId as string;
  const { firestore, user } = useFirebase();

  const [newMessage, setNewMessage] = useState('');
  
  const messagesQuery = useMemoFirebase(() => 
    firestore && roomId ? query(collection(firestore, 'whiteboards', roomId, 'messages'), orderBy('timestamp', 'asc')) : null
  , [firestore, roomId]);

  const { data: messages } = useCollection<Message>(messagesQuery);
  
  const participantsQuery = useMemoFirebase(() => 
    firestore && roomId ? collection(firestore, 'whiteboards', roomId, 'participants') : null
  , [firestore, roomId]);
  const { data: usersList } = useCollection<Participant>(participantsQuery);


  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !firestore || !user) return;

    const messagesRef = collection(firestore, 'whiteboards', roomId, 'messages');
    addDocumentNonBlocking(messagesRef, {
        userId: user.uid,
        userName: name,
        text: newMessage,
        timestamp: serverTimestamp()
    });

    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <h2 className="text-xl font-semibold">Collaboration</h2>
      </div>
      <Separator className="bg-sidebar-border" />
      <Tabs defaultValue="chat" className="flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-sidebar border-b border-sidebar-border rounded-none">
          <TabsTrigger value="chat" className="gap-2 data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground rounded-none">
            <MessageCircle size={16} /> Chat
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground rounded-none">
            <Users size={16} /> Users
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex-grow flex flex-col mt-0">
          <ScrollArea className="flex-grow p-4">
            <div className="space-y-4">
              {messages?.map((msg, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${msg.userName}`} alt={msg.userName} />
                    <AvatarFallback>{msg.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{msg.userId === user?.uid ? 'You' : msg.userName}</p>
                      <p className="text-xs text-sidebar-foreground/60">{msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className="text-sm text-sidebar-foreground/80">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-sidebar-border">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-sidebar-accent border-sidebar-border focus-visible:ring-sidebar-ring"
              />
              <Button type="submit" size="icon" variant="ghost" className="hover:bg-sidebar-accent">
                <Send size={18} />
              </Button>
            </form>
          </div>
        </TabsContent>
        <TabsContent value="users" className="flex-grow mt-0">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {usersList?.map((participant) => (
                <div key={participant.userId} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${participant.name}`} alt={participant.name} />
                    <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-sm">{participant.userId === user?.uid ? 'You' : participant.name}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}


export function ChatPanel() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatPanelComponent />
    </Suspense>
  )
}
