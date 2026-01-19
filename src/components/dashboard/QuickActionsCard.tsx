import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Camera, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { CreateClientModal } from '@/components/clients/CreateClientModal';
import { CreateEventModal } from '@/components/calendar/CreateEventModal';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { toast } from 'sonner';

export function QuickActionsCard() {
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const { createEvent } = useCalendarEvents();

  const handleCreateEvent = async (eventData: {
    title: string;
    description?: string;
    start_at: string;
    end_at?: string;
    all_day: boolean;
    location?: string;
    event_type: string;
    video_call_url?: string;
    is_private?: boolean;
  }) => {
    try {
      const result = await createEvent({
        title: eventData.title,
        description: eventData.description || null,
        start_at: eventData.start_at,
        end_at: eventData.end_at || null,
        all_day: eventData.all_day,
        location: eventData.location || null,
        event_type: eventData.event_type,
        video_call_url: eventData.video_call_url || null,
        is_private: eventData.is_private || false,
      });
      if (result) {
        toast.success('Evento criado com sucesso!');
        setEventModalOpen(false);
      }
      return result;
    } catch (error) {
      toast.error('Erro ao criar evento');
      throw error;
    }
  };

  const actions = [
    {
      label: 'Projeto',
      icon: Camera,
      onClick: () => setProjectModalOpen(true),
    },
    {
      label: 'Cliente',
      icon: Users,
      onClick: () => setClientModalOpen(true),
    },
    {
      label: 'Evento',
      icon: Calendar,
      onClick: () => setEventModalOpen(true),
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2"
      >
        {actions.map((action, index) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1.5 text-xs hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
            onClick={action.onClick}
          >
            <Plus className="h-3 w-3" />
            <action.icon className="h-3 w-3" />
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        ))}
      </motion.div>

      <CreateProjectModal
        open={projectModalOpen}
        onOpenChange={setProjectModalOpen}
        onSuccess={() => setProjectModalOpen(false)}
      />
      
      <CreateClientModal
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        onSuccess={() => setClientModalOpen(false)}
      />
      
      <CreateEventModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        onSubmit={handleCreateEvent}
      />
    </>
  );
}
