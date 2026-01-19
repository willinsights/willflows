import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationToCreate {
  user_id: string;
  workspace_id: string;
  title: string;
  message: string;
  type: string;
  entity_type?: string;
  entity_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking deadlines and upcoming events...');

    const now = new Date();
    
    // Get all users with push enabled
    const { data: pushUsers, error: pushError } = await supabaseAdmin
      .from('user_push_preferences')
      .select('user_id, events_enabled, deadlines_enabled, advance_hours')
      .eq('push_enabled', true);

    if (pushError) {
      console.error('Error fetching push users:', pushError);
      throw pushError;
    }

    if (!pushUsers || pushUsers.length === 0) {
      console.log('No users with push enabled');
      return new Response(JSON.stringify({ message: 'No users with push enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pushUsers.length} users with push enabled`);

    const notificationsToCreate: NotificationToCreate[] = [];

    for (const pushUser of pushUsers) {
      const advanceMs = pushUser.advance_hours * 60 * 60 * 1000;
      const checkWindowStart = new Date(now.getTime());
      const checkWindowEnd = new Date(now.getTime() + advanceMs);

      // Get user's workspaces
      const { data: memberships, error: membershipError } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', pushUser.user_id);

      if (membershipError || !memberships) {
        console.error(`Error fetching workspaces for user ${pushUser.user_id}:`, membershipError);
        continue;
      }

      const workspaceIds = memberships.map(m => m.workspace_id);

      // Check upcoming events if enabled
      if (pushUser.events_enabled) {
        const { data: events, error: eventsError } = await supabaseAdmin
          .from('calendar_events')
          .select('id, title, start_at, workspace_id')
          .in('workspace_id', workspaceIds)
          .gte('start_at', checkWindowStart.toISOString())
          .lte('start_at', checkWindowEnd.toISOString())
          .order('start_at', { ascending: true })
          .limit(10);

        if (eventsError) {
          console.error('Error fetching events:', eventsError);
        } else if (events && events.length > 0) {
          for (const event of events) {
            // Check if notification already exists
            const { data: existing } = await supabaseAdmin
              .from('notifications')
              .select('id')
              .eq('user_id', pushUser.user_id)
              .eq('entity_type', 'calendar_event')
              .eq('entity_id', event.id)
              .eq('type', 'event_reminder')
              .single();

            if (!existing) {
              const eventDate = new Date(event.start_at);
              const formattedTime = eventDate.toLocaleTimeString('pt-PT', { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              const formattedDate = eventDate.toLocaleDateString('pt-PT', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
              });

              notificationsToCreate.push({
                user_id: pushUser.user_id,
                workspace_id: event.workspace_id,
                title: 'Evento próximo',
                message: `${event.title} - ${formattedDate} às ${formattedTime}`,
                type: 'event_reminder',
                entity_type: 'calendar_event',
                entity_id: event.id,
              });
            }
          }
        }
      }

      // Check upcoming deadlines if enabled
      if (pushUser.deadlines_enabled) {
        const { data: projects, error: projectsError } = await supabaseAdmin
          .from('projects')
          .select('id, name, delivery_date, workspace_id')
          .in('workspace_id', workspaceIds)
          .eq('is_delivered', false)
          .not('delivery_date', 'is', null)
          .gte('delivery_date', checkWindowStart.toISOString().split('T')[0])
          .lte('delivery_date', checkWindowEnd.toISOString().split('T')[0])
          .order('delivery_date', { ascending: true })
          .limit(10);

        if (projectsError) {
          console.error('Error fetching projects:', projectsError);
        } else if (projects && projects.length > 0) {
          for (const project of projects) {
            // Check if notification already exists
            const { data: existing } = await supabaseAdmin
              .from('notifications')
              .select('id')
              .eq('user_id', pushUser.user_id)
              .eq('entity_type', 'project')
              .eq('entity_id', project.id)
              .eq('type', 'deadline_reminder')
              .single();

            if (!existing) {
              const deliveryDate = new Date(project.delivery_date!);
              const formattedDate = deliveryDate.toLocaleDateString('pt-PT', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
              });

              notificationsToCreate.push({
                user_id: pushUser.user_id,
                workspace_id: project.workspace_id,
                title: 'Prazo de entrega próximo',
                message: `${project.name} - Entrega: ${formattedDate}`,
                type: 'deadline_reminder',
                entity_type: 'project',
                entity_id: project.id,
              });
            }
          }
        }
      }
    }

    // Create all notifications
    if (notificationsToCreate.length > 0) {
      console.log(`Creating ${notificationsToCreate.length} notifications`);
      
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error('Error creating notifications:', insertError);
        throw insertError;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      notificationsCreated: notificationsToCreate.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-deadlines:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
