import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, X } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    
    setPermission(Notification.permission);
    
    // Show prompt if permission hasn't been requested yet
    if (Notification.permission === 'default') {
      // Delay showing prompt to not be intrusive on first load
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported on this device');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      
      if (result === 'granted') {
        toast.success('Notifications enabled! You will receive alerts when rooms are ready.');
        // Send a test notification
        new Notification('Cleanroom Ready', {
          body: 'Notifications are now enabled!',
          icon: '/favicon.ico',
        });
      } else if (result === 'denied') {
        toast.error('Notifications blocked. You can enable them in your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  if (permission === 'granted' || permission === 'unsupported' || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-card p-4 shadow-xl border-2 border-primary/20 animate-in slide-in-from-bottom-4">
      <button 
        onClick={() => setShowPrompt(false)}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          {permission === 'denied' ? (
            <BellOff className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5 text-primary" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold">Enable Notifications</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Get notified when rooms are ready for cleaning or work.
          </p>
          
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={requestPermission}>
              Enable
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowPrompt(false)}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
