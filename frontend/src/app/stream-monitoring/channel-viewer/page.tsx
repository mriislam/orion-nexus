'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import MosaicPlayer from '@/components/MosaicPlayer';

export default function ChannelViewer() {
  return (
    <Layout fullHeight={true}>
      <div className="h-full">
        {/* Mosaic Player Section - Full Height */}
        <div className="h-full">
          <MosaicPlayer gridSize={4} />
        </div>
      </div>
    </Layout>
  );
}