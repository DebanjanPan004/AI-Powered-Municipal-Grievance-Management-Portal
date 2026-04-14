import React, { useState, useEffect } from 'react';

// Analytics Dashboard Component - combines data visualization with resource allocation tools
const AnalyticsDashboard = ({ user, grievances, workers, onAssignTask }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('month'); // week, month, year
  const [selectedMetric, setSelectedMetric] = useState('count'); // count, avgTime, category
  const [workerEfficiency, setWorkerEfficiency] = useState([]);
  const [optimalAssignments, setOptimalAssignments] = useState([]);

  useEffect(() => {
    // Load required fonts and icons for charts
    const link = document.createElement('link');
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Load chart.js if needed for visualizations
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.async = true;
    document.head.appendChild(script);

    // Fetch analytics data when component mounts
    fetchAnalyticsData();
    calculateWorkerEfficiency();
    generateOptimalAssignments();
  }, []);

  // Fetch analytics data based on selected filters
  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeRange, selectedMetric]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch analytics data from backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/analytics?timeRange=${selectedTimeRange}&metric=${selectedMetric}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);

      // Initialize chart once data is loaded
      if (data) {
        setTimeout(() => {
          initializeCharts(data);
        }, 100);
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. ' + err.message);
      
      // Use sample data for demonstration if API fails
      setAnalyticsData(getSampleAnalyticsData());
      setTimeout(() => {
        initializeCharts(getSampleAnalyticsData());
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  // Calculate worker efficiency metrics
  const calculateWorkerEfficiency = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/analytics/worker-efficiency`, 
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch worker efficiency data');
      }
      
      const data = await response.json();
      setWorkerEfficiency(data.workers || []);
    } catch (err) {
      console.error('Error fetching worker efficiency:', err);
      
      // If API fails, calculate locally as fallback
      if (grievances && workers) {
        const efficiency = workers.map(worker => {
          // Find all grievances assigned to this worker
          const assignedGrievances = grievances.filter(g => 
            g.assigned_worker && g.assigned_worker.user_id === worker.user_id
          );

          // Calculate completion rate
          const completedCount = assignedGrievances.filter(g => g.status === 'completed').length;
          const completionRate = assignedGrievances.length > 0 
            ? (completedCount / assignedGrievances.length) * 100 
            : 0;

          // Calculate average resolution time (in days)
          const resolutionTimes = assignedGrievances
            .filter(g => g.status === 'completed' && g.assignment_details)
            .map(g => {
              const assignedDate = new Date(g.assignment_details.assigned_at);
              const completedDate = new Date(g.assignment_details.updated_at || Date.now());
              return (completedDate - assignedDate) / (1000 * 60 * 60 * 24); // days
            });

          const avgResolutionTime = resolutionTimes.length > 0
            ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
            : 0;

          return {
            ...worker,
            metrics: {
              completionRate,
              avgResolutionTime,
              totalAssigned: assignedGrievances.length,
              totalCompleted: completedCount,
              activeGrievances: assignedGrievances.filter(g => g.status !== 'completed').length
            }
          };
        });

        setWorkerEfficiency(efficiency);
      }
    }
  };

  // Generate optimal worker assignments
  const generateOptimalAssignments = () => {
    // In a real implementation, this would use an algorithm considering:
    // 1. Worker proximity to grievance
    // 2. Worker current workload
    // 3. Worker skills/department match to grievance category
    // 4. Worker efficiency metrics

    // For now, we'll create a simplified version
    const pendingGrievances = grievances?.filter(g => g.status === 'pending') || [];
    
    const assignments = pendingGrievances.map(grievance => {
      // Find closest worker with matching department and lowest workload
      let bestWorker = null;
      let bestScore = -Infinity;

      if (workers) {
        workers.forEach(worker => {
          // Calculate a score based on multiple factors (higher is better)
          const proximityScore = worker.distance ? 100 - Math.min(worker.distance * 10, 100) : 0;
          const workloadScore = 100 - Math.min(worker.current_tasks * 20, 100);
          
          // Department matching (simplified)
          const departmentMatchScore = worker.department_name === grievance.category ? 50 : 0;
          
          // Efficiency score based on completion rate and time
          const efficiencyWorker = workerEfficiency.find(w => w.user_id === worker.user_id);
          const efficiencyScore = efficiencyWorker 
            ? (efficiencyWorker.metrics.completionRate * 0.5) - (efficiencyWorker.metrics.avgResolutionTime * 10)
            : 0;
          
          // Calculate total score
          const totalScore = proximityScore + workloadScore + departmentMatchScore + efficiencyScore;
          
          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestWorker = worker;
          }
        });
      }
      
      return {
        grievance,
        recommendedWorker: bestWorker,
        score: bestScore,
        reasonSummary: bestWorker ? `${bestWorker.full_name} is recommended based on proximity, workload, and efficiency.` : 'No suitable worker found.'
      };
    });
    
    setOptimalAssignments(assignments);
  };

  // Initialize charts using Chart.js
  const initializeCharts = (data) => {
    if (typeof window.Chart === 'undefined') {
      console.log('Chart.js not loaded yet, retrying...');
      setTimeout(() => initializeCharts(data), 500);
      return;
    }

    // Destroy existing charts to prevent duplicates
    const chartIds = ['grievanceTypeChart', 'resolutionTimeChart', 'trendsChart', 'workerPerformanceChart'];
    chartIds.forEach(id => {
      const chartElement = document.getElementById(id);
      if (chartElement) {
        const chartInstance = window.Chart.getChart(chartElement);
        if (chartInstance) {
          chartInstance.destroy();
        }
      }
    });

    // Configure charts with data
    setupGrievanceTypeChart(data.categoryData);
    setupResolutionTimeChart(data.resolutionTimeData);
    setupTrendsChart(data.trendsData);
    setupWorkerPerformanceChart(data.workerPerformanceData);
  };

  // Setup individual charts
  const setupGrievanceTypeChart = (data) => {
    const ctx = document.getElementById('grievanceTypeChart');
    if (!ctx) return;

    new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: [
            'rgba(0, 255, 135, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#ffffff'
            }
          },
          title: {
            display: true,
            text: 'Grievance Categories',
            color: '#ffffff',
            font: {
              size: 16
            }
          }
        }
      }
    });
  };

  const setupResolutionTimeChart = (data) => {
    const ctx = document.getElementById('resolutionTimeChart');
    if (!ctx) return;

    new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Avg. Resolution Time (days)',
          data: data.values,
          backgroundColor: 'rgba(0, 255, 135, 0.5)',
          borderColor: 'rgba(0, 255, 135, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a9b8'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a9b8'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#ffffff'
            }
          },
          title: {
            display: true,
            text: 'Resolution Time by Category',
            color: '#ffffff',
            font: {
              size: 16
            }
          }
        }
      }
    });
  };

  const setupTrendsChart = (data) => {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;

    new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'New Grievances',
          data: data.newValues,
          borderColor: 'rgba(0, 255, 135, 1)',
          backgroundColor: 'rgba(0, 255, 135, 0.1)',
          fill: true,
          tension: 0.4
        }, {
          label: 'Resolved Grievances',
          data: data.resolvedValues,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a9b8'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#a0a9b8'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#ffffff'
            }
          },
          title: {
            display: true,
            text: 'Grievance Trends Over Time',
            color: '#ffffff',
            font: {
              size: 16
            }
          }
        }
      }
    });
  };

  const setupWorkerPerformanceChart = (data) => {
    const ctx = document.getElementById('workerPerformanceChart');
    if (!ctx) return;

    new window.Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.labels,
        datasets: data.datasets.map((dataset, index) => ({
          label: dataset.label,
          data: dataset.values,
          backgroundColor: `rgba(0, 255, 135, ${0.3 - (index * 0.05)})`,
          borderColor: index === 0 ? 'rgba(0, 255, 135, 1)' : 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }))
      },
      options: {
        responsive: true,
        scales: {
          r: {
            angleLines: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            pointLabels: {
              color: '#ffffff'
            },
            ticks: {
              backdropColor: 'rgba(0, 0, 0, 0.5)',
              color: '#a0a9b8'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#ffffff'
            }
          },
          title: {
            display: true,
            text: 'Worker Performance Comparison',
            color: '#ffffff',
            font: {
              size: 16
            }
          }
        }
      }
    });
  };

  // Get sample analytics data for testing/demonstration
  const getSampleAnalyticsData = () => {
    return {
      categoryData: {
        labels: ['Roads', 'Drainage', 'Waste Management', 'Street Lights', 'Water Supply', 'Public Property'],
        values: [38, 24, 18, 12, 8, 5]
      },
      resolutionTimeData: {
        labels: ['Roads', 'Drainage', 'Waste Management', 'Street Lights', 'Water Supply', 'Public Property'],
        values: [3.2, 4.5, 2.8, 1.5, 3.7, 5.1]
      },
      trendsData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        newValues: [12, 19, 15, 27, 22, 18, 21, 25, 17],
        resolvedValues: [10, 15, 13, 22, 20, 17, 19, 24, 16]
      },
      workerPerformanceData: {
        labels: ['Completion Rate', 'Resolution Speed', 'Citizen Satisfaction', 'Task Volume', 'Location Coverage'],
        datasets: [
          {
            label: 'Top Performers',
            values: [90, 85, 88, 75, 92]
          },
          {
            label: 'Average Workers',
            values: [75, 68, 72, 80, 65]
          }
        ]
      },
      summaryStats: {
        totalGrievances: 486,
        resolvedGrievances: 312,
        pendingGrievances: 174,
        avgResolutionTime: 3.2,
        completionRate: 64.2
      }
    };
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Analytics Dashboard Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ 
          margin: '0', 
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fas fa-chart-line" style={{ color: '#00ff87' }}></i>
          Analytics Dashboard
        </h2>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Time Range Filter */}
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="week" style={{ background: '#1a1b1f', color: '#ffffff' }}>Last Week</option>
            <option value="month" style={{ background: '#1a1b1f', color: '#ffffff' }}>Last Month</option>
            <option value="year" style={{ background: '#1a1b1f', color: '#ffffff' }}>Last Year</option>
          </select>
          
          {/* Metric Filter */}
          <select 
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="count" style={{ background: '#1a1b1f', color: '#ffffff' }}>Grievance Count</option>
            <option value="avgTime" style={{ background: '#1a1b1f', color: '#ffffff' }}>Resolution Time</option>
            <option value="category" style={{ background: '#1a1b1f', color: '#ffffff' }}>By Category</option>
          </select>
          
          <button
            onClick={fetchAnalyticsData}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #00ff87, #00d96f)',
              color: '#0a0b0d',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-sync-alt"></i>
            Update
          </button>
        </div>
      </div>
      
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 0',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 135, 0.1)'
        }}>
          <i className="fas fa-spinner fa-spin" style={{ 
            fontSize: '32px', 
            color: '#00ff87', 
            marginBottom: '16px' 
          }}></i>
          <p style={{ color: '#a0a9b8', fontSize: '16px' }}>Loading analytics data...</p>
        </div>
      ) : error ? (
        <div style={{ 
          padding: '20px', 
          background: 'rgba(244, 67, 54, 0.1)',
          border: '1px solid rgba(244, 67, 54, 0.3)',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#ff6b6b'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
          {error}
        </div>
      ) : (
        <div>
          {/* Summary Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Total Grievances */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#a0a9b8', marginBottom: '8px' }}>
                <i className="fas fa-clipboard-list" style={{ marginRight: '8px', color: '#00ff87' }}></i>
                Total Grievances
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff' }}>
                {analyticsData.summaryStats.totalGrievances}
              </div>
            </div>
            
            {/* Resolved Grievances */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#a0a9b8', marginBottom: '8px' }}>
                <i className="fas fa-check-circle" style={{ marginRight: '8px', color: '#00ff87' }}></i>
                Resolved Grievances
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff' }}>
                {analyticsData.summaryStats.resolvedGrievances}
                <span style={{ 
                  fontSize: '14px', 
                  color: '#00ff87', 
                  marginLeft: '8px',
                  fontWeight: '600'
                }}>
                  ({analyticsData.summaryStats.completionRate}%)
                </span>
              </div>
            </div>
            
            {/* Pending Grievances */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#a0a9b8', marginBottom: '8px' }}>
                <i className="fas fa-clock" style={{ marginRight: '8px', color: '#ffb74d' }}></i>
                Pending Grievances
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff' }}>
                {analyticsData.summaryStats.pendingGrievances}
              </div>
            </div>
            
            {/* Avg. Resolution Time */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#a0a9b8', marginBottom: '8px' }}>
                <i className="fas fa-stopwatch" style={{ marginRight: '8px', color: '#64b5f6' }}></i>
                Avg. Resolution Time
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff' }}>
                {analyticsData.summaryStats.avgResolutionTime}
                <span style={{ 
                  fontSize: '14px', 
                  color: '#a0a9b8', 
                  marginLeft: '4px',
                  fontWeight: '400'
                }}>
                  days
                </span>
              </div>
            </div>
          </div>
          
          {/* Chart Row 1 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* Grievance by Category Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              height: '350px'
            }}>
              <canvas id="grievanceTypeChart"></canvas>
            </div>
            
            {/* Resolution Time by Category Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              height: '350px'
            }}>
              <canvas id="resolutionTimeChart"></canvas>
            </div>
          </div>
          
          {/* Chart Row 2 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* Trends Over Time Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              height: '350px'
            }}>
              <canvas id="trendsChart"></canvas>
            </div>
            
            {/* Worker Performance Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              height: '350px'
            }}>
              <canvas id="workerPerformanceChart"></canvas>
            </div>
          </div>
          
          {/* Resource Allocation Section */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-tasks" style={{ color: '#00ff87' }}></i>
              Optimal Resource Allocation
            </h3>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#a0a9b8', margin: '0 0 16px 0' }}>
                  The system has analyzed pending grievances and available workers to recommend the following optimal assignments:
                </p>
              </div>
              
              {optimalAssignments.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {optimalAssignments.map((assignment, index) => (
                    <div 
                      key={index}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(0, 255, 135, 0.15)',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '20px'
                      }}
                    >
                      <div style={{ flex: '1' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ 
                            fontWeight: '600', 
                            color: '#00ff87',
                            fontSize: '16px'
                          }}>
                            Grievance #{assignment.grievance.id}:
                          </span>
                          <span style={{ color: '#ffffff' }}>{assignment.grievance.title}</span>
                        </div>
                        
                        <div style={{ 
                          color: '#a0a9b8', 
                          fontSize: '14px',
                          margin: '8px 0'
                        }}>
                          <span style={{ display: 'inline-block', width: '110px', color: '#64b5f6' }}>Category:</span> 
                          {assignment.grievance.category}
                        </div>
                        
                        <div style={{ 
                          color: '#a0a9b8', 
                          fontSize: '14px',
                          margin: '8px 0'
                        }}>
                          <span style={{ display: 'inline-block', width: '110px', color: '#64b5f6' }}>Location:</span>
                          {assignment.grievance.latitude.toFixed(6)}, {assignment.grievance.longitude.toFixed(6)}
                        </div>
                        
                        <div style={{ 
                          marginTop: '12px',
                          padding: '8px 12px',
                          background: 'rgba(0, 255, 135, 0.1)',
                          borderRadius: '6px',
                          fontSize: '14px',
                          color: '#a0a9b8',
                          border: '1px solid rgba(0, 255, 135, 0.2)'
                        }}>
                          <div style={{ fontWeight: '600', color: '#00ff87', marginBottom: '4px' }}>
                            <i className="fas fa-lightbulb" style={{ marginRight: '6px' }}></i>
                            Recommendation:
                          </div>
                          {assignment.recommendedWorker ? (
                            <div>
                              <strong style={{ color: '#ffffff' }}>{assignment.recommendedWorker.full_name}</strong> is the optimal worker for this task.
                              <div style={{ marginTop: '4px', fontSize: '13px' }}>
                                {assignment.reasonSummary}
                              </div>
                            </div>
                          ) : (
                            <div>No suitable worker available at this time.</div>
                          )}
                        </div>
                      </div>
                      
                      {assignment.recommendedWorker && (
                        <button
                          onClick={() => onAssignTask(assignment.grievance.id, assignment.recommendedWorker.user_id)}
                          style={{
                            background: 'linear-gradient(135deg, #00ff87, #00d96f)',
                            color: '#0a0b0d',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 8px 15px rgba(0, 255, 135, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          <i className="fas fa-user-plus"></i>
                          Assign Now
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '30px',
                  color: '#a0a9b8'
                }}>
                  <i className="fas fa-check-circle" style={{ 
                    fontSize: '32px', 
                    color: '#00ff87', 
                    marginBottom: '16px' 
                  }}></i>
                  <p>No pending grievances requiring assignment.</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Worker Efficiency Section */}
          <div>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-user-clock" style={{ color: '#00ff87' }}></i>
              Worker Efficiency Metrics
            </h3>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              padding: '0',
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              overflow: 'hidden'
            }}>
              {/* Table Header */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: '60px 2fr 1fr 1.5fr 1fr 1fr 1fr',
                padding: '16px 24px',
                background: 'rgba(0, 255, 135, 0.1)',
                borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
                fontWeight: '600',
                color: '#00ff87',
                fontSize: '14px'
              }}>
                <div>#</div>
                <div>Worker Name</div>
                <div>Department</div>
                <div>Completion Rate</div>
                <div>Avg. Time</div>
                <div>Completed</div>
                <div>Active</div>
              </div>
              
              {/* Table Body */}
              {workerEfficiency.length > 0 ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {workerEfficiency
                    .sort((a, b) => b.metrics.completionRate - a.metrics.completionRate)
                    .map((worker, index) => (
                    <div 
                      key={worker.user_id}
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: '60px 2fr 1fr 1.5fr 1fr 1fr 1fr',
                        padding: '16px 24px',
                        borderBottom: '1px solid rgba(0, 255, 135, 0.1)',
                        background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                        color: '#ffffff',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ color: '#00ff87', fontWeight: '600' }}>{index + 1}</div>
                      <div style={{ fontWeight: '500' }}>{worker.full_name}</div>
                      <div style={{ color: '#a0a9b8' }}>{worker.department_name || 'Not assigned'}</div>
                      <div>
                        <div style={{ 
                          width: '100%', 
                          height: '8px', 
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginBottom: '4px'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${worker.metrics.completionRate}%`,
                            background: worker.metrics.completionRate > 80 ? '#00ff87' : 
                                      worker.metrics.completionRate > 60 ? '#64b5f6' : 
                                      worker.metrics.completionRate > 40 ? '#ffb74d' : '#ff6b6b',
                            borderRadius: '4px',
                            transition: 'width 1s ease-in-out'
                          }}></div>
                        </div>
                        <div style={{ 
                          color: worker.metrics.completionRate > 80 ? '#00ff87' : 
                                worker.metrics.completionRate > 60 ? '#64b5f6' : 
                                worker.metrics.completionRate > 40 ? '#ffb74d' : '#ff6b6b',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          {worker.metrics.completionRate.toFixed(1)}%
                        </div>
                      </div>
                      <div style={{ color: '#a0a9b8' }}>
                        {worker.metrics.avgResolutionTime.toFixed(1)} days
                      </div>
                      <div style={{ color: '#a0a9b8' }}>
                        {worker.metrics.totalCompleted}
                      </div>
                      <div style={{ color: '#a0a9b8' }}>
                        {worker.metrics.activeGrievances}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '30px',
                  color: '#a0a9b8'
                }}>
                  <p>No worker data available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;