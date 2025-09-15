'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Play, Pause, Volume2, VolumeX, Maximize2, Settings, AlertTriangle, PlayCircle, StopCircle } from 'lucide-react';
import { streamService, StreamConfig as ApiStreamConfig } from '@/lib/services/streams';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/http-streaming';
import 'videojs-contrib-quality-levels';

// Video.js types
declare global {
  interface Window {
    videojs: any;
  }
}

interface StreamConfig {
  id: string;
  name: string;
  url: string;
  isPlaying: boolean;
  isMuted: boolean;
  headers?: Record<string, string>;
  cookies?: string;
  order: number;
  isLoading?: boolean;
  error?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

interface MosaicPlayerProps {
  gridSize?: number;
  streams?: StreamConfig[];
}

const MosaicPlayer: React.FC<MosaicPlayerProps> = ({ 
  gridSize = 4, 
  streams = [] 
}) => {
  const [currentGridSize, setCurrentGridSize] = useState(gridSize);
  const [customTileCount, setCustomTileCount] = useState('');
  const [currentStreams, setCurrentStreams] = useState<StreamConfig[]>(streams);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videojsLoaded, setVideojsLoaded] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [qualityTracks, setQualityTracks] = useState<any[][]>([]);
  const [selectedQualities, setSelectedQualities] = useState<number[]>([]);
  const [showQualityMenu, setShowQualityMenu] = useState<number | null>(null);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const playersRef = useRef<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load streams from API or create defaults
  const loadStreams = async () => {
    try {
      // Try to load streams from API
      const apiStreams = await streamService.getStreams();
      const gridConfig = await streamService.getGridConfig();
      
      if (gridConfig.grid_size) {
        setCurrentGridSize(gridConfig.grid_size);
      }
      
      if (apiStreams.length > 0) {
        // Convert API streams to runtime format
        const runtimeStreams = apiStreams.map((stream: ApiStreamConfig) => ({
          ...stream,
          isPlaying: false,
          isMuted: true,
          isLoading: false,
          error: undefined
        }));
        setCurrentStreams(runtimeStreams);
      } else {
        // Create empty stream placeholders for the grid size
        const emptyStreams = Array.from({ length: currentGridSize }, (_, index) => ({
          id: `empty-${index + 1}`,
          name: `Stream ${index + 1}`,
          url: '',
          isPlaying: false,
          isMuted: true,
          isLoading: false,
          error: undefined,
          order: index + 1,
          user_id: 'default',
          is_active: true
        }));
        setCurrentStreams(emptyStreams);
      }
    } catch (error) {
      // Failed to load streams from API, falling back to localStorage
      // Fallback to localStorage if API fails
      const savedStreams = localStorage.getItem('mosaicStreams');
      const savedGridSize = localStorage.getItem('mosaicGridSize');
      
      if (savedGridSize) {
        const gridSize = parseInt(savedGridSize);
        setCurrentGridSize(gridSize);
      }
      
      if (savedStreams) {
        const parsedStreams = JSON.parse(savedStreams);
        const runtimeStreams = parsedStreams.map((stream: any) => ({
          ...stream,
          isPlaying: false,
          isMuted: true,
          isLoading: false,
          error: undefined
        }));
        setCurrentStreams(runtimeStreams);
      }
    }
  };
  
  // Initialize streams
  useEffect(() => {
    if (streams.length === 0) {
      loadStreams();
    }
  }, [streams.length]);

  // Initialize Video.js
  useEffect(() => {
    const initVideojs = async () => {
      if (typeof window !== 'undefined') {
        try {
          // Initializing Video.js
          // Ensure Video.js is properly loaded
          if (typeof videojs === 'function') {
            setVideojsLoaded(true);
          } else {
            // Retry after a short delay
            setTimeout(() => {
              if (typeof videojs === 'function') {
                setVideojsLoaded(true);
                // Video.js initialized successfully on retry
              }
            }, 100);
          }
        } catch (error) {
          // Failed to initialize Video.js
        }
      }
    };

    initVideojs();
  }, []);

  // Initialize players when Video.js is loaded
  useEffect(() => {
    if (!videojsLoaded) return;

    const initializePlayers = async () => {
      try {
        // Initializing Video.js Players
      } catch (error) {
        // Error during Video.js Player initialization
        return;
      }

      // Initialize players for each video element
      playersRef.current = videoRefs.current.map((videoElement, index) => {
        if (!videoElement) {
          // Video element is null, skipping
          return null;
        }

        try {
           // Creating Video.js Player for video element
           
           // Additional safety checks
           if (typeof videojs !== 'function') {
             throw new Error('Video.js is not available as a function');
           }
           
           if (!videoElement || videoElement.tagName !== 'VIDEO') {
             throw new Error('Invalid video element');
           }
           
           const player = videojs(videoElement, {
             controls: false,
             fluid: true,
             responsive: true,
             html5: {
               hls: {
                 enableLowInitialPlaylist: true,
                 smoothQualityChange: true,
                 overrideNative: true
               }
             },
             plugins: {
               qualityLevels: {}
             }
           });
           
           // Player configured successfully

           // Enhanced error handling
           player.on('error', () => {
             const error = player.error();
             // Video.js Player error for stream
             
             // Update stream error state
             setCurrentStreams(prevStreams => {
               const updatedStreams = [...prevStreams];
               if (updatedStreams[index]) {
                 updatedStreams[index] = {
                   ...updatedStreams[index],
                   error: `Error ${error?.code}: ${error?.message || 'Unknown error'}`,
                   isLoading: false,
                   isPlaying: false
                 };
               }
               return updatedStreams;
             });
           });

           // Network and loading events
           player.on('loadstart', () => {
             // Stream: Load started
           });

           player.on('loadedmetadata', () => {
             // Stream: Metadata loaded
           });

           player.on('canplay', () => {
             // Stream: Can play
           });

           player.on('waiting', () => {
             // Stream: Waiting for data
           });

           player.on('stalled', () => {
             // Stream: Network stalled
           });

           // HLS-specific events if available
           if (player.tech_ && player.tech_.hls) {
             player.tech_.hls.on('hlsError', (event: any, data: any) => {
               // HLS Error for stream
             });
           }

           return player;
         } catch (error) {
           // Failed to create player
           return null;
         }
      });
    };

    initializePlayers();

    return () => {
      // Cleanup players
      playersRef.current.forEach(player => {
        if (player) {
          player.dispose();
        }
      });
    };
  }, [videojsLoaded, currentGridSize]);

  // Auto-load streams when players are ready
  useEffect(() => {
    if (!videojsLoaded || playersRef.current.length === 0) return;

    const loadStreams = async () => {
      // Load each stream independently to prevent one failure from affecting others
      const loadPromises = currentStreams.slice(0, playersRef.current.length).map(async (stream, i) => {
        const player = playersRef.current[i];
        
        if (player && stream.url && !stream.isLoading && !stream.error) {
          try {
            // Set loading state for this specific stream
            setCurrentStreams(prevStreams => {
              const updatedStreams = [...prevStreams];
              if (updatedStreams[i]) {
                updatedStreams[i] = { ...updatedStreams[i], isLoading: true, error: undefined };
              }
              return updatedStreams;
            });
            
            player.src({
              src: stream.url,
              type: 'application/x-mpegURL'
            });
            
            // Update quality tracks after successful load
            updateQualityTracks(i, player);
            
            // Clear loading state and mark as successful
            setCurrentStreams(prevStreams => {
              const updatedStreams = [...prevStreams];
              if (updatedStreams[i]) {
                updatedStreams[i] = { ...updatedStreams[i], isLoading: false, error: undefined };
              }
              return updatedStreams;
            });
          } catch (error) {
            // Failed to load stream
            // Set error state for this specific stream only
            setCurrentStreams(prevStreams => {
              const updatedStreams = [...prevStreams];
              if (updatedStreams[i]) {
                updatedStreams[i] = { 
                  ...updatedStreams[i], 
                  isLoading: false, 
                  error: `Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  isPlaying: false
                };
              }
              return updatedStreams;
            });
          }
        }
      });

      // Wait for all streams to attempt loading (but don't fail if some fail)
      await Promise.allSettled(loadPromises);
    };

    loadStreams();
  }, [videojsLoaded, playersRef.current.length]);

  // Close quality menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showQualityMenu !== null) {
        const target = event.target as Element;
        if (!target.closest('.quality-menu-container')) {
          setShowQualityMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQualityMenu]);

  const getGridClass = (size: number) => {
    const cols = Math.ceil(Math.sqrt(size));
    const maxCols = Math.min(cols, 8); // Cap at 8 columns for readability
    
    if (maxCols <= 1) return 'grid-cols-1';
    if (maxCols <= 2) return 'grid-cols-2';
    if (maxCols <= 3) return 'grid-cols-3';
    if (maxCols <= 4) return 'grid-cols-4';
    if (maxCols <= 5) return 'grid-cols-5';
    if (maxCols <= 6) return 'grid-cols-6';
    if (maxCols <= 7) return 'grid-cols-7';
    return 'grid-cols-8';
  };

  const togglePlay = async (index: number) => {
    const stream = currentStreams[index];
    const player = playersRef.current[index];
    const videoElement = videoRefs.current[index];

    if (!player || !videoElement || !stream) return;

    try {
      if (stream.isPlaying) {
        videoElement.pause();
        const updatedStreams = [...currentStreams];
        updatedStreams[index] = { ...stream, isPlaying: false };
        setCurrentStreams(updatedStreams);
      } else {
        // Set loading state
        const loadingStreams = [...currentStreams];
        loadingStreams[index] = { ...stream, isLoading: true, error: undefined };
        setCurrentStreams(loadingStreams);

        // Load stream if not already loaded
        if (!videoElement.src && stream.url) {
          await player.load(stream.url);
        }
        
        try {
          await videoElement.play();
          const updatedStreams = [...currentStreams];
          updatedStreams[index] = { ...stream, isPlaying: true, isLoading: false, error: undefined };
          setCurrentStreams(updatedStreams);
        } catch (playError: any) {
          // Handle autoplay restrictions
          if (playError.name === 'NotAllowedError') {
            setAutoplayBlocked(true);
            const errorStreams = [...currentStreams];
            errorStreams[index] = { 
              ...stream, 
              isLoading: false, 
              error: 'Click to play (autoplay blocked)' 
            };
            setCurrentStreams(errorStreams);
          } else {
            throw playError;
          }
        }
      }
    } catch (error) {
      // Error toggling play
      const errorStreams = [...currentStreams];
      errorStreams[index] = { 
        ...stream, 
        isLoading: false, 
        error: 'Playback failed' 
      };
      setCurrentStreams(errorStreams);
    }
  };

  const toggleMute = (index: number) => {
    const stream = currentStreams[index];
    const videoElement = videoRefs.current[index];

    if (!videoElement || !stream) return;

    videoElement.muted = !stream.isMuted;
    const updatedStreams = [...currentStreams];
    updatedStreams[index] = { ...stream, isMuted: !stream.isMuted };
    setCurrentStreams(updatedStreams);
  };

  const retryStream = async (index: number) => {
    const stream = currentStreams[index];
    const player = playersRef.current[index];
    const videoElement = videoRefs.current[index];

    if (!player || !videoElement || !stream || !stream.url) return;

    try {
      // Reset error state and set loading
      setCurrentStreams(prevStreams => {
        const updatedStreams = [...prevStreams];
        if (updatedStreams[index]) {
          updatedStreams[index] = {
            ...updatedStreams[index],
            error: undefined,
            isLoading: true,
            isPlaying: false
          };
        }
        return updatedStreams;
      });

      // Reset current stream if any
      try {
        player.reset();
      } catch (resetError) {
        // Warning during reset for stream
      }
      
      // Reload the stream
      player.src({
        src: stream.url,
        type: 'application/x-mpegURL'
      });
      
      // Clear loading state and mark as successful
      setCurrentStreams(prevStreams => {
        const updatedStreams = [...prevStreams];
        if (updatedStreams[index]) {
          updatedStreams[index] = {
            ...updatedStreams[index],
            error: undefined,
            isLoading: false
          };
        }
        return updatedStreams;
      });
      
      // Stream retried successfully
      
      // Update quality tracks after successful load
      updateQualityTracks(index, player);
    } catch (error: any) {
      // Failed to retry stream
      setCurrentStreams(prevStreams => {
        const updatedStreams = [...prevStreams];
        if (updatedStreams[index]) {
          updatedStreams[index] = {
            ...updatedStreams[index],
            isLoading: false,
            error: `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
        return updatedStreams;
      });
    }
  };

  // Auto-retry failed streams periodically
  useEffect(() => {
    const retryInterval = setInterval(() => {
      currentStreams.forEach((stream, index) => {
        // Auto-retry streams that have errors and are not currently loading
        if (stream.error && !stream.isLoading && stream.url && playersRef.current[index]) {
          // Auto-retrying failed stream
          retryStream(index);
        }
      });
    }, 30000); // Retry every 30 seconds

    return () => clearInterval(retryInterval);
  }, [currentStreams]);

  // Quality management functions
  const updateQualityTracks = (index: number, player: any) => {
    if (!player) return;
    
    try {
      // Video.js quality tracks are available after the source is loaded
      player.ready(() => {
        const qualityLevels = player.qualityLevels && player.qualityLevels();
         if (qualityLevels) {
           const tracks: any[] = [];
           for (let i = 0; i < qualityLevels.length; i++) {
             const level = qualityLevels[i];
             tracks.push({
               id: i,
               height: level.height,
               width: level.width,
               bandwidth: level.bandwidth,
               label: `${level.height}p`
             });
           }
          // Available quality tracks for stream
          
          setQualityTracks(prev => {
            const newTracks = [...prev];
            newTracks[index] = tracks;
            return newTracks;
          });
        }
      });
      
      // Set initial selected quality to auto (adaptive)
      setSelectedQualities(prev => {
        const newSelected = [...prev];
        newSelected[index] = -1; // -1 represents auto/adaptive
        return newSelected;
      });
    } catch (error) {
      // Failed to get quality tracks for stream
    }
  };

  const selectQuality = async (streamIndex: number, trackId: number) => {
    const player = playersRef.current[streamIndex];
    if (!player) return;

    try {
      const qualityLevels = player.qualityLevels && player.qualityLevels();
      if (!qualityLevels) return;
      
      if (trackId === -1) {
        // Enable adaptive bitrate - enable all quality levels
        for (let i = 0; i < qualityLevels.length; i++) {
          qualityLevels[i].enabled = true;
        }
        // Stream: Enabled adaptive bitrate
      } else {
        // Disable adaptive and select specific track
        for (let i = 0; i < qualityLevels.length; i++) {
          qualityLevels[i].enabled = i === trackId;
        }
        // Stream: Selected quality level
      }
      
      setSelectedQualities(prev => {
        const newSelected = [...prev];
        newSelected[streamIndex] = trackId;
        return newSelected;
      });
      
      setShowQualityMenu(null);
    } catch (error) {
      // Failed to select quality for stream
    }
  };

  const formatQualityLabel = (track: any) => {
    const height = track.height || 'Unknown';
    const bandwidth = track.bandwidth ? Math.round(track.bandwidth / 1000) : 'Unknown';
    return `${height}p (${bandwidth} kbps)`;
  };

  const updateStreamUrl = async (index: number, url: string) => {
    const stream = currentStreams[index];
    if (!stream) return;
    
    // Update local state immediately for responsiveness
    const updatedStreams = [...currentStreams];
    updatedStreams[index] = { ...updatedStreams[index], url };
    setCurrentStreams(updatedStreams);
    
    try {
      // Save to API
      await streamService.updateStream(stream.id, { url });
    } catch (error) {
      // Failed to update stream URL via API
      // Could add error handling here, but for now we keep the local change
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const changeGridSize = async (newSize: number) => {
    setCurrentGridSize(newSize);
    setCustomTileCount(''); // Clear custom input when using preset
    
    try {
      // Save grid size to API
      await streamService.saveGridConfig({
        grid_size: newSize,
        streams: currentStreams.slice(0, newSize).map(s => s.id)
      });
      
      // Adjust streams array to match new grid size
      const adjustedStreams = [...currentStreams];
      
      // If we need more streams, create empty placeholders
      if (newSize > currentStreams.length) {
        const additionalStreams = Array.from({ length: newSize - currentStreams.length }, (_, index) => ({
           id: `empty-${currentStreams.length + index + 1}`,
           name: `Stream ${currentStreams.length + index + 1}`,
           url: '',
           isPlaying: false,
           isMuted: true,
           isLoading: false,
           order: currentStreams.length + index + 1,
           user_id: 'default',
           is_active: true,
           error: undefined
         }));
         
         adjustedStreams.push(...additionalStreams);
         setCurrentStreams(adjustedStreams);
      } else {
          // Just trim the existing streams
          setCurrentStreams(adjustedStreams.slice(0, newSize));
        }
    } catch (error) {
      // Failed to update grid size via API, falling back to localStorage
      // Fallback to localStorage
      localStorage.setItem('mosaicGridSize', newSize.toString());
      
      const newStreams = Array.from({ length: newSize }, (_, index) => {
        if (index < currentStreams.length) {
          return currentStreams[index];
        }
        return {
          id: `stream-${index + 1}`,
          name: `Stream ${index + 1}`,
          url: '',
          isPlaying: false,
          isMuted: true,
          order: index + 1
        };
      });
      
      setCurrentStreams(newStreams);
    }
  };

  const handleCustomTileCount = (value: string) => {
    setCustomTileCount(value);
    const count = parseInt(value);
    if (count >= 1 && count <= 49) {
      changeGridSize(count);
    }
  };

  // Play all streams
  const playAllStreams = () => {
    setCurrentStreams(prevStreams => 
      prevStreams.map(stream => ({
        ...stream,
        isPlaying: true
      }))
    );
  };

  // Stop all streams
  const stopAllStreams = () => {
    setCurrentStreams(prevStreams => 
      prevStreams.map(stream => ({
        ...stream,
        isPlaying: false
      }))
    );
  };

  return (
    <>
    <Card className="w-full h-full bg-white shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap justify-center items-center gap-2">
            {/* Grid Size Controls */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={currentGridSize === 16 ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => changeGridSize(16)}
                className="p-2 text-xs"
              >
                4x4
              </Button>
              <Button
                variant={currentGridSize === 25 ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => changeGridSize(25)}
                className="p-2 text-xs"
              >
                5x5
              </Button>
              <Button
                variant={currentGridSize === 36 ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => changeGridSize(36)}
                className="p-2 text-xs"
              >
                6x6
              </Button>
              <Button
                variant={currentGridSize === 49 ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => changeGridSize(49)}
                className="p-2 text-xs"
              >
                7x7
              </Button>
            </div>
            
            {/* Stream Count Display */}
            <div className="flex gap-4 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-medium">Active: {currentStreams.filter(s => s.isPlaying).length}</span>
              <span className="font-medium">Total: {currentStreams.length}</span>
            </div>
            
            {/* Custom Tile Count Input */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Custom:</label>
              <input
                type="number"
                min="1"
                max="49"
                value={customTileCount}
                onChange={(e) => handleCustomTileCount(e.target.value)}
                placeholder="1-49"
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              Fullscreen
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/stream-monitoring/channel-viewer/settings?gridSize=${currentGridSize}`}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            
            {/* Play All / Stop All Controls */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={playAllStreams}
                className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <PlayCircle className="w-4 h-4" />
                Play All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={stopAllStreams}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <StopCircle className="w-4 h-4" />
                Stop All
              </Button>
            </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Autoplay Warning */}
        {autoplayBlocked && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Autoplay Blocked</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Your browser has blocked autoplay. Click the play button on each stream to start playback.
            </p>
          </div>
        )}
        
        <div 
          ref={containerRef}
          className={`grid gap-2 ${getGridClass(currentGridSize)} ${isFullscreen ? 'h-screen' : 'min-h-[80vh]'}`}
        >
          {currentStreams.slice(0, currentGridSize).map((stream, index) => (
            <div key={stream.id} className={`relative rounded-lg overflow-hidden group ${
              stream.error ? 'bg-red-600' : 'bg-black'
            }`}>
              <video
                ref={(el) => {
                  videoRefs.current[index] = el;
                }}
                className="w-full h-full object-cover"
                muted={stream.isMuted}
                playsInline
                controls={false}
                onError={(e) => {
                  // Video element error for stream
                  // Handle video element errors without affecting other streams
                  setCurrentStreams(prevStreams => {
                    const updatedStreams = [...prevStreams];
                    if (updatedStreams[index]) {
                      updatedStreams[index] = {
                        ...updatedStreams[index],
                        error: 'Video playback error',
                        isLoading: false,
                        isPlaying: false
                      };
                    }
                    return updatedStreams;
                  });
                }}
              />
              
              {/* Loading Overlay */}
              {stream.isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <span className="text-sm">Loading stream...</span>
                  </div>
                </div>
              )}
              
              {/* Error Overlay */}
              {stream.error && (
                <div className="absolute inset-0 bg-red-900 bg-opacity-90 flex items-center justify-center">
                  <div className="text-white text-center p-4 max-w-xs">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-300" />
                    <div className="text-sm font-medium mb-2">Stream Error</div>
                    <div className="text-xs mb-3 break-words">{stream.error}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryStream(index)}
                      className="bg-white text-red-900 hover:bg-gray-100 text-xs px-3 py-1"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Stream Info Overlay */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                {stream.name}
                {stream.isPlaying && (
                  <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </div>
              
              {/* Controls Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePlay(index)}
                    className="bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                  >
                    {stream.isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMute(index)}
                    className="bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                  >
                    {stream.isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {/* Quality Control Button */}
                  {qualityTracks[index] && qualityTracks[index].length > 1 && (
                    <div className="relative quality-menu-container">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQualityMenu(showQualityMenu === index ? null : index)}
                        className="bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      
                      {/* Quality Selection Menu */}
                      {showQualityMenu === index && (
                        <div className="absolute bottom-full mb-2 left-0 bg-black bg-opacity-90 text-white rounded-lg shadow-lg min-w-[150px] z-50">
                          <div className="p-2">
                            <div className="text-xs font-medium mb-2 text-gray-300">Quality</div>
                            
                            {/* Auto/Adaptive Option */}
                            <button
                              onClick={() => selectQuality(index, -1)}
                              className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-white hover:bg-opacity-20 transition-colors ${
                                selectedQualities[index] === -1 ? 'bg-blue-600' : ''
                              }`}
                            >
                              Auto (Adaptive)
                            </button>
                            
                            {/* Individual Quality Options */}
                            {qualityTracks[index]
                              .sort((a: any, b: any) => (b.height || 0) - (a.height || 0))
                              .map((track: any) => (
                                <button
                                  key={track.id}
                                  onClick={() => selectQuality(index, track.id)}
                                  className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-white hover:bg-opacity-20 transition-colors ${
                                    selectedQualities[index] === track.id ? 'bg-blue-600' : ''
                                  }`}
                                >
                                  {formatQualityLabel(track)}
                                </button>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Stream URL Input */}
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <input
                  type="text"
                  value={stream.url}
                  onChange={(e) => updateStreamUrl(index, e.target.value)}
                  placeholder="Enter stream URL (RTMP, HLS, DASH)"
                  className="w-full px-2 py-1 text-xs bg-black bg-opacity-70 text-white rounded border-none outline-none placeholder-gray-400"
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Grid Size Info */}
        <div className="mt-4 flex justify-center items-center text-sm text-gray-600">
          <span>Grid Size: {currentGridSize} tiles</span>
        </div>
      </CardContent>
    </Card>


    </>
  );
};

export default MosaicPlayer;