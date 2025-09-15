'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { analyticsService } from '@/lib/services/analytics';
import { Loader2, TrendingUp, ShoppingCart, MousePointer, DollarSign, Users, Target } from 'lucide-react';

interface EnhancedAnalyticsProps {
  propertyId: string;
  dateRange: {
    start: string;
    end: string;
    startDate: string;
    endDate: string;
  };
}

export default function EnhancedAnalytics({ propertyId, dateRange }: EnhancedAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [conversionsData, setConversionsData] = useState<any>(null);
  const [ecommerceData, setEcommerceData] = useState<any>(null);
  const [customEventsData, setCustomEventsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'conversions' | 'ecommerce' | 'events'>('conversions');
  const [selectedConversionType, setSelectedConversionType] = useState<string>('all');
  const [selectedMetricType, setSelectedMetricType] = useState<string>('revenue');
  const [selectedEventName, setSelectedEventName] = useState<string>('all');

  const fetchEnhancedData = async () => {
    if (!propertyId) return;
    
    setLoading(true);
    try {
      const params = {
        property_id: propertyId,
        start_date: dateRange.startDate || undefined,
        end_date: dateRange.endDate || undefined,
      };

      const [conversions, ecommerce, customEvents] = await Promise.all([
        analyticsService.getConversions({
          ...params,
          conversion_type: selectedConversionType !== 'all' ? selectedConversionType : undefined
        }),
        analyticsService.getEcommerce({
          ...params,
          metric_type: selectedMetricType
        }),
        analyticsService.getCustomEvents({
          ...params,
          event_name: selectedEventName !== 'all' ? selectedEventName : undefined
        })
      ]);

      setConversionsData(conversions);
      setEcommerceData(ecommerce);
      setCustomEventsData(customEvents);
    } catch (error) {
      console.error('Error fetching enhanced analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnhancedData();
  }, [propertyId, dateRange, selectedConversionType, selectedMetricType, selectedEventName]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const renderConversionsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Conversion Tracking</h3>
        <div className="flex space-x-2">
          {['all', 'purchase', 'signup', 'contact', 'download'].map((type) => (
            <Button
              key={type}
              variant={selectedConversionType === type ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedConversionType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {conversionsData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Total Conversions</h4>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(conversionsData.total_conversions || 0)}</div>
              <p className="text-xs text-muted-foreground">
                +{(conversionsData.conversion_rate || 0).toFixed(2)}% conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Conversion Value</h4>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(conversionsData.total_value || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(conversionsData.avg_value || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Top Converting Page</h4>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium truncate">{conversionsData.top_page || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {conversionsData.top_page_conversions || 0} conversions
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderEcommerceTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">E-commerce Analytics</h3>
        <div className="flex space-x-2">
          {['revenue', 'transactions', 'items', 'cart_abandonment'].map((type) => (
            <Button
              key={type}
              variant={selectedMetricType === type ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetricType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {ecommerceData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Total Revenue</h4>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(ecommerceData.total_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                +{(ecommerceData.revenue_growth || 0).toFixed(2)}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Transactions</h4>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(ecommerceData.total_transactions || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(ecommerceData.avg_order_value || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Items Sold</h4>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(ecommerceData.total_items || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {ecommerceData.items_per_transaction || 0} per transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Cart Abandonment</h4>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ecommerceData.abandonment_rate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(ecommerceData.abandoned_carts || 0)} abandoned carts
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {ecommerceData?.top_products && (
        <Card>
          <CardHeader>
            <h4 className="text-lg font-medium">Top Products</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ecommerceData.top_products.slice(0, 5).map((product: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="default">
                       #{index + 1}
                     </Badge>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(product.value)}</div>
                    <div className="text-xs text-muted-foreground">{product.quantity} sold</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCustomEventsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custom Events</h3>
        <div className="flex space-x-2">
          {['all', 'video_play', 'file_download', 'form_submit', 'scroll_depth', 'click_cta'].map((event) => (
            <Button
              key={event}
              variant={selectedEventName === event ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedEventName(event)}
            >
              {event.charAt(0).toUpperCase() + event.slice(1).replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {customEventsData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Total Events</h4>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(customEventsData.total_events || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {customEventsData.unique_events || 0} unique events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Event Rate</h4>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customEventsData.event_rate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                Events per session
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="text-sm font-medium">Top Event</h4>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{customEventsData.top_event || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(customEventsData.top_event_count || 0)} occurrences
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {customEventsData?.events_list && (
        <Card>
          <CardHeader>
            <h4 className="text-lg font-medium">Event Breakdown</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customEventsData.events_list.slice(0, 10).map((event: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="default">
                       {event.name}
                     </Badge>
                    <span className="text-sm text-muted-foreground">{event.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatNumber(event.count)}</div>
                    <div className="text-xs text-muted-foreground">{event.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading enhanced analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights into conversions, e-commerce, and custom events</p>
        </div>
        <Button onClick={fetchEnhancedData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Custom Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'conversions', label: 'Conversions', icon: Target },
            { id: 'ecommerce', label: 'E-commerce', icon: ShoppingCart },
            { id: 'events', label: 'Custom Events', icon: MousePointer },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'conversions' && renderConversionsTab()}
        {activeTab === 'ecommerce' && renderEcommerceTab()}
        {activeTab === 'events' && renderCustomEventsTab()}
      </div>
    </div>
  );
}