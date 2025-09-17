import { fetchApi } from '@/lib/api-client';

export interface StreamConfig {
  id: string;
  name: string;
  url: string;
  headers?: Record<string, string>;
  cookies?: string;
  order: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface StreamConfigCreate {
  name: string;
  url: string;
  headers?: Record<string, string>;
  cookies?: string;
  order: number;
}

export interface StreamConfigUpdate {
  name?: string;
  url?: string;
  headers?: Record<string, string>;
  cookies?: string;
  order?: number;
  is_active?: boolean;
}

export interface StreamGridConfig {
  id: string;
  user_id: string;
  grid_size: number;
  streams: string[];
  created_at: string;
  updated_at: string;
}

export interface StreamGridConfigCreate {
  grid_size: number;
  streams: string[];
}

export const streamService = {
  // Stream CRUD operations
  async getStreams(skip = 0, limit = 100, activeOnly = true): Promise<StreamConfig[]> {
    const response = await fetchApi<StreamConfig[]>(
      `/api/v1/streams?skip=${skip}&limit=${limit}&active_only=${activeOnly}`
    );
    return response.data;
  },

  async getStream(streamId: string): Promise<StreamConfig> {
    const response = await fetchApi<StreamConfig>(`/api/v1/streams/${streamId}`);
    return response.data;
  },

  async createStream(streamData: StreamConfigCreate): Promise<StreamConfig> {
    const response = await fetchApi<StreamConfig>('/api/v1/streams', {
      method: 'POST',
      body: streamData
    });
    return response.data;
  },

  async updateStream(streamId: string, streamData: StreamConfigUpdate): Promise<StreamConfig> {
    const response = await fetchApi<StreamConfig>(`/api/v1/streams/${streamId}`, {
      method: 'PUT',
      body: streamData
    });
    return response.data;
  },

  async deleteStream(streamId: string): Promise<{ message: string }> {
    const response = await fetchApi<{ message: string }>(`/api/v1/streams/${streamId}`, {
      method: 'DELETE'
    });
    return response.data;
  },

  // Grid configuration
  async getGridConfig(): Promise<StreamGridConfig> {
    const response = await fetchApi<StreamGridConfig>('/api/v1/streams/grid/config');
    return response.data;
  },

  async saveGridConfig(gridData: StreamGridConfigCreate): Promise<StreamGridConfig> {
    const response = await fetchApi<StreamGridConfig>('/api/v1/streams/grid/config', {
      method: 'POST',
      body: gridData
    });
    return response.data;
  },

  // Bulk operations
  async createBulkStreams(streamsData: StreamConfigCreate[]): Promise<StreamConfig[]> {
    const response = await fetchApi<StreamConfig[]>('/api/v1/streams/bulk', {
      method: 'POST',
      body: streamsData
    });
    return response.data;
  },

  async deleteAllStreams(): Promise<{ message: string }> {
    const response = await fetchApi<{ message: string }>('/api/v1/streams/bulk', {
      method: 'DELETE'
    });
    return response.data;
  },

  // Helper functions
  async importStreamsFromCSV(csvContent: string): Promise<StreamConfig[]> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const streams: StreamConfigCreate[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length >= 3) { // Now requires at least ID, Name, URL
        const stream: StreamConfigCreate = {
          name: values[1] || `Stream ${i}`, // Name is now at index 1
          url: values[2] || '', // URL is now at index 2
          order: values[5] ? parseInt(values[5]) : i // Order from CSV or fallback to index
        };
        
        // Parse headers if present (now at index 3)
        if (values[3]) {
          try {
            stream.headers = JSON.parse(values[3]);
          } catch (e) {
            console.warn(`Failed to parse headers for stream ${i}:`, e);
          }
        }
        
        // Parse cookies if present (now at index 4)
        if (values[4]) {
          stream.cookies = values[4];
        }
        
        streams.push(stream);
      }
    }
    
    return await this.createBulkStreams(streams);
  },

  async exportStreamsToCSV(streams: StreamConfig[]): Promise<string> {
    const headers = ['ID', 'Stream Name', 'Stream URL', 'Headers (JSON)', 'Cookies', 'Order'];
    const csvLines = [headers.join(',')];
    
    streams.forEach(stream => {
      const row = [
        `"${stream.id || ''}"`, // ID column
        `"${stream.name}"`,
        `"${stream.url}"`,
        stream.headers ? `"${JSON.stringify(stream.headers)}"` : '',
        stream.cookies ? `"${stream.cookies}"` : '',
        `${stream.order || 1}` // Order column
      ];
      csvLines.push(row.join(','));
    });
    
    return csvLines.join('\n');
  }
};