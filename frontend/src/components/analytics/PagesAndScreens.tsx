import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Download, Calendar, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import { Search, Users, Eye, Clock, Activity } from 'lucide-react';

// Simple components to replace missing UI components
const CardTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <h3 className={`text-lg font-semibold ${className || ''}`}>{children}</h3>
);

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className || ''}`} />
);

const Alert: React.FC<{ variant?: string; children: React.ReactNode }> = ({ variant, children }) => (
  <div className={`p-4 rounded-lg border ${
    variant === 'destructive' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
  }`}>
    {children}
  </div>
);

const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-sm">{children}</div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { className?: string }> = ({ className, ...props }) => (
  <input
    className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className || ''}`}
    {...props}
  />
);

// Simple date formatter
const formatDate = (dateString: string, formatStr: string): string => {
  const date = new Date(dateString);
  if (formatStr === 'MMM dd') {
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }
  return date.toLocaleDateString();
};



interface PageData {
  page_title: string;
  page_path: string;
  views: number;
  active_users: number;
  views_percentage: number;
  users_percentage: number;
  average_engagement_time: number;
  events: number;
}

interface PagesAndScreensData {
  property_id: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  total_views: number;
  total_active_users: number;
  pages: PageData[];
  row_count: number;
  generated_at: string;
}

interface PagesAndScreensProps {
  propertyId?: string;
}

const PagesAndScreens: React.FC<PagesAndScreensProps> = ({ propertyId = '421645046' }) => {
  const [data, setData] = useState<PagesAndScreensData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Removed date filter state variables as per user request

  const fetchPagesAndScreensData = async () => {
    if (!propertyId) {
      console.warn('No property ID provided for Pages and Screens');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/v1/analytics/${propertyId}/pages-and-screens`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching pages and screens data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Removed date filter handler functions
  
  const exportData = async (format: 'excel' | 'csv' | 'pdf') => {
    if (!data || !propertyId) return;
    
    try {
      const response = await fetch(`/api/v1/analytics/${propertyId}/pages-and-screens/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      // Get the filename from the response headers or create a default one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `pages-and-screens-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/); 
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log(`Successfully exported data in ${format} format`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchPagesAndScreensData();
    }
  }, [propertyId]);

  const formatEngagementTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toLocaleString();
  };

  const filteredPages = data?.pages.filter(page =>
    page.page_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.page_path.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredPages.length);
  const paginatedPages = filteredPages.slice(startIndex, endIndex);

  // Reset to first page when items per page changes
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Reset to first page when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };



  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading pages and screens data: {error}
          <Button 
            onClick={fetchPagesAndScreensData} 
            variant="outline" 
            size="sm" 
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>No data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Pages and Screens</h2>
        
        {/* Export Controls */}
         <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('excel')}
              className="text-xs"
            >
              <FileSpreadsheet className="w-3 h-3 mr-1" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('csv')}
              className="text-xs"
            >
              <FileText className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('pdf')}
              className="text-xs"
            >
              <FileImage className="w-3 h-3 mr-1" />
              PDF
            </Button>
          </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.total_views)}</div>
            <p className="text-xs text-muted-foreground">
              Last 28 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.total_active_users)}</div>
            <p className="text-xs text-muted-foreground">
              Unique visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.row_count}</div>
            <p className="text-xs text-muted-foreground">
              Tracked pages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date Range</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {formatDate(data.date_range.start_date, 'MMM dd')} - {formatDate(data.date_range.end_date, 'MMM dd')}
            </div>
            <p className="text-xs text-muted-foreground">
              28 days period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pages Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Pages and Screens</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Rows per page:
                </label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <Badge variant="secondary">
                {filteredPages.length} pages
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">#</th>
                  <th className="text-left p-2 font-medium">Page Title</th>
                  <th className="text-right p-2 font-medium">Views</th>
                  <th className="text-right p-2 font-medium">Views %</th>
                  <th className="text-right p-2 font-medium">Users</th>
                  <th className="text-right p-2 font-medium">Users %</th>
                  <th className="text-right p-2 font-medium">Avg. Time</th>
                  <th className="text-right p-2 font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPages.map((page, index) => (
                  <tr key={`${page.page_path}-${index}`} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-sm text-muted-foreground">
                      {startIndex + index + 1}
                    </td>
                    <td className="p-2">
                      <div className="max-w-[300px]">
                        <div className="font-medium text-sm truncate" title={page.page_title}>
                          {page.page_title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate" title={page.page_path}>
                          {page.page_path}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-right font-medium">
                      {formatNumber(page.views)}
                    </td>
                    <td className="p-2 text-right text-sm text-muted-foreground">
                      {page.views_percentage.toFixed(2)}%
                    </td>
                    <td className="p-2 text-right font-medium">
                      {formatNumber(page.active_users)}
                    </td>
                    <td className="p-2 text-right text-sm text-muted-foreground">
                      {page.users_percentage.toFixed(2)}%
                    </td>
                    <td className="p-2 text-right text-sm">
                      {formatEngagementTime(page.average_engagement_time)}
                    </td>
                    <td className="p-2 text-right text-sm text-muted-foreground">
                      {formatNumber(page.events)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {endIndex} of {filteredPages.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            i === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PagesAndScreens;