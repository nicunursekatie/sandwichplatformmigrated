import { supabase } from "./supabase";

interface ChannelConfig {
  name: string;
  type: 'channel';
  description: string;
}

const CHAT_CHANNELS: ChannelConfig[] = [
  {
    name: 'general',
    type: 'channel',
    description: 'Open discussion for all team members'
  },
  {
    name: 'committee',
    type: 'channel',
    description: 'Specific committee discussions'
  },
  {
    name: 'hosts',
    type: 'channel',
    description: 'Coordination with sandwich collection hosts'
  },
  {
    name: 'drivers',
    type: 'channel',
    description: 'Delivery and transportation coordination'
  },
  {
    name: 'recipients',
    type: 'channel',
    description: 'Communication with receiving organizations'
  },
  {
    name: 'core_team',
    type: 'channel',
    description: 'Private administrative discussions'
  }
];

export async function initializeChatChannels() {
  console.log('Initializing chat channels...');
  
  try {
    // First, check which channels already exist
    const { data: existingChannels, error: fetchError } = await supabase
      .from('conversations')
      .select('name')
      .eq('type', 'channel');
    
    if (fetchError) {
      console.error('Error fetching existing channels:', fetchError);
      return { error: fetchError };
    }
    
    const existingChannelNames = new Set(
      existingChannels?.map(ch => ch.name) || []
    );
    
    // Filter out channels that already exist
    const channelsToCreate = CHAT_CHANNELS.filter(
      channel => !existingChannelNames.has(channel.name)
    );
    
    if (channelsToCreate.length === 0) {
      console.log('All chat channels already exist');
      return { success: true, created: 0 };
    }
    
    // Create missing channels
    const { data: createdChannels, error: createError } = await supabase
      .from('conversations')
      .insert(channelsToCreate)
      .select();
    
    if (createError) {
      console.error('Error creating channels:', createError);
      return { error: createError };
    }
    
    console.log(`Successfully created ${createdChannels?.length || 0} chat channels`);
    return { 
      success: true, 
      created: createdChannels?.length || 0,
      channels: createdChannels 
    };
    
  } catch (error) {
    console.error('Unexpected error initializing chat channels:', error);
    return { error };
  }
}

// Function to ensure a specific channel exists
export async function ensureChannelExists(channelName: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('name', channelName)
    .eq('type', 'channel')
    .single();
  
  if (error && error.code === 'PGRST116') {
    // Channel doesn't exist, create it
    const channelConfig = CHAT_CHANNELS.find(ch => ch.name === channelName);
    if (channelConfig) {
      const { data: newChannel, error: createError } = await supabase
        .from('conversations')
        .insert(channelConfig)
        .select()
        .single();
      
      if (createError) {
        console.error(`Error creating channel ${channelName}:`, createError);
        return null;
      }
      
      return newChannel;
    }
  }
  
  return data;
}