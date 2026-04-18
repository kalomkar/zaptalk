import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CallsTab() {
  const mockCalls = [
    { id: 1, name: 'John Doe', type: 'incoming', time: 'Today, 10:45 AM', video: false },
    { id: 2, name: 'Jane Smith', type: 'missed', time: 'Yesterday, 8:20 PM', video: true },
    { id: 3, name: 'ZapTalk AI', type: 'outgoing', time: 'Yesterday, 2:15 PM', video: false },
    { id: 4, name: 'Alex Johnson', type: 'incoming', time: 'Monday, 11:00 AM', video: false },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col py-2">
        {/* Create Call Link */}
        <div className="px-4 py-3 flex items-center gap-4 hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
          <div className="w-12 h-12 bg-accent-primary rounded-full flex items-center justify-center">
            <Link2 className="w-6 h-6 text-white -rotate-45" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Create call link</h3>
            <p className="text-sm text-text-dim">Share a link for your ZapTalk call</p>
          </div>
        </div>

        <div className="px-4 py-2">
          <h4 className="text-xs font-bold text-text-dim uppercase tracking-wider">Recent</h4>
        </div>

        {mockCalls.map((call) => (
          <div
            key={call.id}
            className="px-4 py-3 flex items-center gap-4 hover:bg-sidebar-accent/50 cursor-pointer transition-colors"
          >
            <Avatar className="w-12 h-12 border border-sidebar-border/50">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${call.name}`} />
              <AvatarFallback>{call.name[0]}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold truncate ${call.type === 'missed' ? 'text-red-500' : 'text-foreground'}`}>
                {call.name}
              </h3>
              <div className="flex items-center gap-1 text-sm text-text-dim">
                {call.type === 'incoming' && <PhoneIncoming className="w-3.5 h-3.5 text-accent-primary" />}
                {call.type === 'outgoing' && <PhoneOutgoing className="w-3.5 h-3.5 text-accent-primary" />}
                {call.type === 'missed' && <PhoneMissed className="w-3.5 h-3.5 text-red-500" />}
                <span>{call.time}</span>
              </div>
            </div>

            <Button variant="ghost" size="icon" className="text-accent-primary hover:bg-accent-primary/10">
              {call.video ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
