'use client';

import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-contrib-quality-levels';

const StreamTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const testStreamUrl = 'https://mcdn-test.toffeelive.com/cdn/live/sony_sports_1_hd_160/index.m3u8';

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize Video.js player
    const player = videojs(videoRef.current, {
      controls: true,
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

    playerRef.current = player;

    // Player ready event
    player.ready(() => {
      console.log('Video.js player is ready');
      setPlayerReady(true);
    });

    // Error handling
    player.on('error', () => {
      const playerError = player.error();
      console.error('Video.js Player error:', {
        code: playerError?.code,
        message: playerError?.message
      });
      setError(`Player Error ${playerError?.code}: ${playerError?.message || 'Unknown error'}`);
      setLoading(false);
    });

    // Load start event
    player.on('loadstart', () => {
      console.log('Load start');
      setLoading(true);
      setError(null);
    });

    // Can play event
    player.on('canplay', () => {
      console.log('Can play - stream loaded successfully');
      setLoading(false);
    });

    // Load error event
    player.on('loadeddata', () => {
      console.log('Loaded data - stream metadata loaded');
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

  const loadTestStream = () => {
    if (!playerRef.current) return;

    console.log('Loading test stream:', testStreamUrl);
    setLoading(true);
    setError(null);

    try {
      playerRef.current.src({
        src: testStreamUrl,
        type: 'application/x-mpegURL'
      });
    } catch (err: any) {
      console.error('Error loading stream:', err);
      setError(`Load Error: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">HLS Stream Test</h1>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Test Stream URL: <code className="bg-gray-100 px-2 py-1 rounded">{testStreamUrl}</code>
        </p>
        
        <button
          onClick={loadTestStream}
          disabled={!playerReady || loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {loading ? 'Loading...' : 'Load Test Stream'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          Loading stream...
        </div>
      )}

      <div className="bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="video-js vjs-default-skin w-full"
          data-setup="{}"
          playsInline
        />
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Player Ready: {playerReady ? '✅' : '❌'}</p>
        <p>Loading: {loading ? '🔄' : '✅'}</p>
        <p>Error: {error ? '❌' : '✅'}</p>
      </div>
    </div>
  );
};

export default StreamTest;