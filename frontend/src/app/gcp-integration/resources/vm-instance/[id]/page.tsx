'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const VMInstanceDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const instanceId = params.id as string;

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VM Instance Details</h1>
            <p className="text-gray-600 mt-1">Instance ID: {instanceId}</p>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => router.back()}
          >
            Back to List
          </Button>
        </div>

        <Card className="hover:shadow-lg hover:scale-100">
          <CardHeader>
            <h2 className="text-lg font-semibold">Instance Information</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instance ID
                </label>
                <p className="text-gray-900">{instanceId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Badge variant="success">Details view coming soon</Badge>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-gray-600">
                This is a placeholder details page. In a full implementation, this would show:
              </p>
              <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
                <li>Complete instance configuration</li>
                <li>Network settings and firewall rules</li>
                <li>Disk and storage information</li>
                <li>Monitoring metrics and logs</li>
                <li>Instance management actions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default VMInstanceDetailsPage;