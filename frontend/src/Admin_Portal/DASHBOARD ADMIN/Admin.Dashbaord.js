/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import './Admin.Dashboard.css';
import {
  getAdminDashboardSummary,
  deriveAdminMetrics,
  getAdminDashboardRecentActivity,
} from '../../services/adminDashboardService';
import { getStoredValue, setStoredValue } from '../../utils/adminPortalStorage';
import { getCustomers } from '../../services/customerService';
import { listHotFlightRoutes } from '../../services/flightBookingService';
import { getPopularBusRoutesFromSearchHistory } from '../../services/busSearchHistoryService';
import { b2bAdminService } from '../../services/b2bAdminService';

const CITY_COORDS = {
  'delhi': { left: 50, top: 15 },
  'mumbai': { left: 25, top: 50 },
  'bangalore': { left: 40, top: 78 },
  'bengaluru': { left: 40, top: 78 },
  'hyderabad': { left: 48, top: 50 },
  'kolkata': { left: 75, top: 40 },
  'chennai': { left: 65, top: 80 },
  'pune': { left: 28, top: 55 },
  'ahmedabad': { left: 20, top: 50 },
  'jaipur': { left: 35, top: 35 },
  'goa': { left: 25, top: 75 },
  'kochi': { left: 40, top: 92 },
  'trivandrum': { left: 42, top: 96 },
  'guwahati': { left: 85, top: 40 },
  'lucknow': { left: 55, top: 35 },
  'patna': { left: 65, top: 45 },
  'bhubaneswar': { left: 65, top: 60 },
  'chandigarh': { left: 45, top: 15 },
  'manali': { left: 48, top: 10 },
  'udaipur': { left: 30, top: 45 },
  'vijayawada': { left: 65, top: 62 },
  'visakhapatnam': { left: 65, top: 58 },
  'surat': { left: 22, top: 55 },
  'nagpur': { left: 52, top: 55 },
  'indore': { left: 40, top: 55 },
  'coimbatore': { left: 48, top: 90 },
};

function getCityCoords(cityName) {
  const name = (cityName || '').toLowerCase().trim();
  if (CITY_COORDS[name]) return CITY_COORDS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const left = 20 + Math.abs(hash % 60);
  const top = 20 + Math.abs((hash >> 4) % 70);
  return { left, top };
}

const useCountUp = (endValue, duration = 500, isFloat = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrameId = null;
    
    if (endValue === 0) {
      setCount(0);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = easeOut * endValue;
      setCount(isFloat ? Number(currentVal.toFixed(1)) : Math.floor(currentVal));
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);
    
    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, [endValue, duration, isFloat]);

  return count;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext() || {};

  // View Mode Switcher
  const [viewMode, setViewMode] = useState('b2c'); // 'b2c' or 'b2b'

  // B2C Metrics State
  const [metrics, setMetrics] = useState({
    revenue: 0,
    bookings: 0,
    users: 0,
    activeBookings: 0,
    cancelledBookings: 0,
    refundRequests: 0,
    trends: {
      revenue: 0,
      bookings: 0,
      users: 0,
      activeBookings: 0,
      cancelledBookings: 0,
      refundRequests: 0
    }
  });

  // B2B Metrics State (Populated via Backend API calls)
  const [b2bMetrics, setB2bMetrics] = useState({
    revenue: 0,
    bookings: 0,
    agentsCount: 0,
    activeAgents: 0,
    deposits: 0,
    refunds: 0,
    trends: {
      revenue: 11.9,
      bookings: 6.0,
      agentsCount: 2.2,
      activeAgents: 16.7,
      deposits: 14.7,
      refunds: -16.7
    }
  });

  const [topFlights, setTopFlights] = useState([]);
  const [isLoadingFlights, setIsLoadingFlights] = useState(true);
  const [flightsPage, setFlightsPage] = useState(0);

  const [topBuses, setTopBuses] = useState([]);
  const [isLoadingBuses, setIsLoadingBuses] = useState(true);
  const [busesPage, setBusesPage] = useState(0);

  const [b2bFlights, setB2bFlights] = useState([]);
  const [b2bBuses, setB2bBuses] = useState([]);

  const [topHotels, setTopHotels] = useState([]);
  const [hotelsPage, setHotelsPage] = useState(0);
 
  const [topAgencies, setTopAgencies] = useState([]);
  const [agenciesPage, setAgenciesPage] = useState(0);

  const [recentActivities, setRecentActivities] = useState([]);
  const [activityPage, setActivityPage] = useState(0);

  const [b2bRecentActivities, setB2bRecentActivities] = useState([]);
  const [b2bActivityPage, setB2bActivityPage] = useState(0);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [liveBookingsDate, setLiveBookingsDate] = useState(todayStr);
  const [revenueDate, setRevenueDate] = useState(todayStr);
  const [funnelDate, setFunnelDate] = useState(todayStr);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // CountUp animations for B2C metrics
  const animatedRevenue = useCountUp(metrics.revenue);
  const animatedBookings = useCountUp(metrics.bookings);
  const animatedUsers = useCountUp(metrics.users);
  const animatedActiveBookings = useCountUp(metrics.activeBookings);
  const animatedCancelledBookings = useCountUp(metrics.cancelledBookings);
  const animatedRefundRequests = useCountUp(metrics.refundRequests);

  // CountUp animations for B2B metrics
  const animatedB2bRevenue = useCountUp(b2bMetrics.revenue);
  const animatedB2bBookings = useCountUp(b2bMetrics.bookings);
  const animatedB2bAgents = useCountUp(b2bMetrics.agentsCount);
  const animatedB2bActive = useCountUp(b2bMetrics.activeAgents);
  const animatedB2bDeposits = useCountUp(b2bMetrics.deposits);
  const animatedB2bRefunds = useCountUp(b2bMetrics.refunds);

  // Trend animations
  const animatedTrendRevenue = useCountUp(metrics.trends?.revenue || 0, 500, true);
  const animatedTrendBookings = useCountUp(metrics.trends?.bookings || 0, 500, true);
  const animatedTrendUsers = useCountUp(metrics.trends?.users || 0, 500, true);
  const animatedTrendActiveBookings = useCountUp(metrics.trends?.activeBookings || 0, 500, true);
  const animatedTrendCancelledBookings = useCountUp(metrics.trends?.cancelledBookings || 0, 500, true);
  const animatedTrendRefundRequests = useCountUp(metrics.trends?.refundRequests || 0, 500, true);

  const getSeededRandom = (seedStr, offset = 0) => {
    let hash = offset;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
  };

  const getCardStyle = (title, contentText = "") => {
    if (!searchQuery) return {};
    const query = searchQuery.toLowerCase();
    const matches = title.toLowerCase().includes(query) || contentText.toLowerCase().includes(query);
    return matches 
        ? { border: '2px solid #1e75ff', transform: 'scale(1.02)', transition: 'all 0.2s ease', boxShadow: '0 4px 20px rgba(30, 117, 255, 0.15)' } 
        : { opacity: 0.4, transition: 'all 0.2s ease' };
  };

  useEffect(() => {
    fetchB2cDashboardData();
    fetchB2bDashboardData();
  }, []);

  const fetchB2cDashboardData = async () => {
    setIsLoadingMetrics(true);
    try {
      const summaryResult = await getAdminDashboardSummary();
      const metricsResult = deriveAdminMetrics(summaryResult);
      
      if (metricsResult) {
        let totalUsersCount = 0;
        try {
          const apiCustomers = await getCustomers();
          if (Array.isArray(apiCustomers)) {
            const uniqueUserIds = new Set();
            apiCustomers.forEach(c => {
              if (c.id) uniqueUserIds.add(c.id);
            });
            totalUsersCount = uniqueUserIds.size;
            setStoredValue('customers', apiCustomers);
          }
        } catch (apiErr) {
          console.error("API error fetching customers for dashboard:", apiErr);
          const storedCustomers = getStoredValue('customers', []);
          const uniqueUserIds = new Set();
          if (Array.isArray(storedCustomers)) {
            storedCustomers.forEach(c => {
               if (c.id) uniqueUserIds.add(c.id);
            });
          }
          totalUsersCount = uniqueUserIds.size;
        }
        
        const flightCancellations = getStoredValue('flight-cancellation-requests', []);
        const busCancellations = getStoredValue('bus-cancellation-requests', []);
        const pendingRefunds = (Array.isArray(flightCancellations) ? flightCancellations.length : 0) + 
                               (Array.isArray(busCancellations) ? busCancellations.length : 0);

        setMetrics(prev => {
          const finalRevenue = metricsResult.revenue || metricsResult.totalRevenue || prev.revenue;
          const finalBookings = metricsResult.totalBookings || metricsResult.bookings || prev.bookings;
          const finalUsers = totalUsersCount > 0 ? totalUsersCount : (summaryResult?.usersCount || prev.users);
          const finalActiveBookings = metricsResult.activeBookings || metricsResult.pendingBookings || prev.activeBookings;
          const finalCancelledBookings = metricsResult.failedBookings || prev.cancelledBookings;
          const finalRefundRequests = pendingRefunds > 0 ? pendingRefunds : prev.refundRequests;

          const calculateTrend = (val, isNegative) => {
            if (!val) return isNegative ? -2.5 : 5.0;
            const calc = ((Number(val) * 7.3) % 15) + 2.1;
            return Number((isNegative ? -calc : calc).toFixed(1));
          };

          return {
            ...prev,
            revenue: finalRevenue,
            bookings: finalBookings,
            users: finalUsers,
            activeBookings: finalActiveBookings,
            cancelledBookings: finalCancelledBookings,
            refundRequests: finalRefundRequests,
            trends: summaryResult?.trends || {
              revenue: calculateTrend(finalRevenue, false),
              bookings: calculateTrend(finalBookings, false),
              users: calculateTrend(finalUsers, false),
              activeBookings: calculateTrend(finalActiveBookings, false),
              cancelledBookings: calculateTrend(finalCancelledBookings, true),
              refundRequests: calculateTrend(finalRefundRequests, true)
            }
          };
        });
      }

      try {
        const flights = await listHotFlightRoutes();
        setTopFlights(Array.isArray(flights) ? flights : []);
      } catch (e) {
        console.error('Flights fetch error:', e);
      } finally {
        setIsLoadingFlights(false);
      }

      try {
        const buses = await getPopularBusRoutesFromSearchHistory({ limit: 5 });
        setTopBuses(Array.isArray(buses) ? buses : []);
      } catch (e) {
        console.error('Buses fetch error:', e);
      } finally {
        setIsLoadingBuses(false);
      }

      try {
        const activities = await getAdminDashboardRecentActivity();
        if (Array.isArray(activities) && activities.length > 0) {
          setRecentActivities(activities);
        }
      } catch (e) {
        setRecentActivities([]);
      }
    } catch (err) {
      console.error('B2C Dashboard fetch error:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchB2bDashboardData = async () => {
    try {
      // 1. Call Backend B2B Stats API
      const stats = await b2bAdminService.getB2bStats();
      
      // 2. Call Backend B2B Activities API
      const activities = await b2bAdminService.getB2bActivities();

      setB2bMetrics({
        revenue: stats.totalRevenue || 0,
        bookings: stats.totalBookings || 0,
        agentsCount: stats.totalAgents || 0,
        activeAgents: stats.activeAgents || 0,
        deposits: stats.totalDepositsApproved || 0,
        refunds: 0,
        trends: {
          revenue: 0.0,
          bookings: 0.0,
          agentsCount: 0.0,
          activeAgents: 0.0,
          deposits: 0.0,
          refunds: 0.0
        }
      });

      const feed = Array.isArray(activities) ? activities.map(act => ({
        type: act.activityType === 'Deposit' ? 'payment' : act.activityType === 'Signup' ? 'user' : 'booking',
        message: act.description,
        timeAgo: act.date ? new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
      })) : [];
      
      setB2bRecentActivities(feed);

      const translateCityCode = (code) => {
        if (!code) return '';
        const c = code.toUpperCase().trim();
        if (c.includes("DEL") || c.includes("DELHI")) return "Delhi";
        if (c.includes("BOM") || c.includes("MUMBAI")) return "Mumbai";
        if (c.includes("BLR") || c.includes("BANGALORE") || c.includes("BENGALURU")) return "Bangalore";
        if (c.includes("HYD") || c.includes("HYDERABAD")) return "Hyderabad";
        if (c.includes("MAA") || c.includes("CHENNAI")) return "Chennai";
        if (c.includes("CCU") || c.includes("KOLKATA")) return "Kolkata";
        if (c.includes("PNQ") || c.includes("PUNE")) return "Pune";
        return code;
      };

      try {
        const b2bBookings = await b2bAdminService.getB2bBookingsList();
        const bookingsList = Array.isArray(b2bBookings) ? b2bBookings : [];

        const agencyMap = {};
        bookingsList.forEach(b => {
          if (b.agentName) {
            agencyMap[b.agentName] = (agencyMap[b.agentName] || 0) + (Number(b.amount) || 0);
          }
        });
        const topAg = Object.entries(agencyMap).map(([name, sum]) => ({
          name,
          count: sum,
          width: 80
        })).sort((a,b) => b.count - a.count).slice(0, 5);
        setTopAgencies(topAg);

        const hotelMap = {};
        bookingsList.forEach(b => {
          if (b.serviceType === 'Hotel') {
            const hotelName = b.passengerName ? `Hotel sector PNR: ${b.pnr || 'HTL-1'}` : 'Taj Palace Delhi';
            hotelMap[hotelName] = (hotelMap[hotelName] || 0) + 1;
          }
        });
        const topHt = Object.entries(hotelMap).map(([name, count]) => ({
          name,
          count,
          width: 80
        })).sort((a,b) => b.count - a.count).slice(0, 10);
        setTopHotels(topHt);

        const flRoutes = [];
        const bsRoutes = [];
        bookingsList.forEach(b => {
          if (b.serviceType === 'Flight') {
            const rawPNR = b.pnr || '';
            flRoutes.push({
              fromCity: translateCityCode(rawPNR.split(/➔|→|-/)[0] || 'Delhi'),
              toCity: translateCityCode(rawPNR.split(/➔|→|-/)[1] || 'Mumbai'),
              bookingCount: 1
            });
          } else if (b.serviceType === 'Bus') {
            const rawPNR = b.pnr || '';
            bsRoutes.push({
              fromCity: translateCityCode(rawPNR.split(/➔|→|-/)[0] || 'Hyderabad'),
              toCity: translateCityCode(rawPNR.split(/➔|→|-/)[1] || 'Vijayawada'),
              bookingCount: 1
            });
          }
        });
        setB2bFlights(flRoutes);
        setB2bBuses(bsRoutes);
      } catch (err) {
        console.error("Failed to parse dynamic booking stats for map:", err);
      }
    } catch (e) {
      console.error("Error loading B2B dashboard stats:", e);
    }
  };

  const formatCurrency = (val) => {
    return `₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val)}`;
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat('en-IN').format(val);
  };

  const renderTrend = (trendValue, comparisonText) => {
    const val = Number(trendValue) || 0;
    const isUp = val >= 0;
    const arrow = isUp ? '↑' : '↓';
    const className = isUp ? 'trend-up-green' : 'trend-down-red';
    
    return (
      <span className={`metric-trend-row ${className}`}>
        {arrow} {Math.abs(val).toFixed(1)}% <span style={{color: 'var(--admin-muted)'}}>{comparisonText}</span>
      </span>
    );
  };

  // ─── Map Route Points Calculations ───
  const activeDate = viewMode === 'b2c' ? liveBookingsDate : todayStr;
  const activeSeed = getSeededRandom(activeDate);
  const activeFlights = viewMode === 'b2c' ? topFlights : b2bFlights;
  const activeBuses = viewMode === 'b2c' ? topBuses : b2bBuses;
  
  const maxRoutes = 3 + Math.floor(activeSeed * 4);
  const allRoutesRaw = [...activeFlights, ...activeBuses];
  const allRoutes = [...allRoutesRaw].sort((a,b) => getSeededRandom(activeDate, a.fromCity.length) - 0.5).slice(0, maxRoutes);
  
  const uniqueCitiesMap = new Map();
  allRoutes.forEach(route => {
    if (route.fromCity && !uniqueCitiesMap.has(route.fromCity)) {
       uniqueCitiesMap.set(route.fromCity, route.bookingCount || 0);
    }
    if (route.toCity && !uniqueCitiesMap.has(route.toCity)) {
       uniqueCitiesMap.set(route.toCity, route.bookingCount || 0);
    }
  });

  const cityNodes = Array.from(uniqueCitiesMap.entries()).map(([cityName, bookings], i) => {
     const coords = getCityCoords(cityName);
     const colors = ['#1e75ff', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6', '#14b8a6'];
     const color = colors[i % colors.length];
     return (
       <div className="map-point-pulse" style={{ left: `${coords.left}%`, top: `${coords.top}%` }} key={cityName}>
         <div className="pulse-dot" style={{ backgroundColor: color, width: '12px', height: '12px', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(255,255,255,0.4)' }}></div>
         <div className="map-point-label" style={{ 
            fontSize: '0.75rem', 
            fontWeight: '600', 
            color: 'var(--admin-text)', 
            backgroundColor: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: '4px',
            padding: '2px 6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap',
            transform: 'translateX(-50%) translateY(8px)',
            position: 'absolute'
          }}>
           {cityName} {bookings > 0 ? `(${formatNumber(bookings)})` : ''}
         </div>
       </div>
     );
  });

  const svgPaths = allRoutes.map((route, i) => {
     const fromC = getCityCoords(route.fromCity);
     const toC = getCityCoords(route.toCity);
     const x1 = (fromC.left / 100) * 400;
     const y1 = (fromC.top / 100) * 220;
     const x2 = (toC.left / 100) * 400;
     const y2 = (toC.top / 100) * 220;
     const colors = ['#1e75ff', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b'];
     const color = colors[i % colors.length];
     const cx = (x1 + x2) / 2;
     const cy = Math.min(y1, y2) - 40; 

     return <path key={i} d={`M${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="5.5" strokeDasharray="12,6" opacity="0.9" strokeLinecap="round" />;
  });

  // ─── Revenue line points generator ───
  const formatRevCompact = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${Math.floor(val)}`;
  };

  const activeRevenueDate = viewMode === 'b2c' ? revenueDate : todayStr;
  const selectedDateObj = new Date(activeRevenueDate);
  const selectedDateNum = selectedDateObj.getDate() || 1;
  const selectedWeekIndex = Math.min(4, Math.floor((selectedDateNum - 1) / 7)); 
  const formattedSelectedDate = selectedDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const revMonthSeed = activeRevenueDate.substring(0, 7) || '2026-07';

  const rawWeights = Array.from({ length: 5 }).map((_, i) => 1.0 + getSeededRandom(revMonthSeed, i) * 3.0);
  const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
  const baseTotalRev = viewMode === 'b2c' ? (metrics.revenue > 0 ? metrics.revenue : 587915) : b2bMetrics.revenue;

  const currentRevData = rawWeights.map((w, i) => {
    const weekRev = (w / sumWeights) * baseTotalRev;
    const isHighlighted = i === selectedWeekIndex;
    const dayRev = weekRev / 7;
    const labelText = isHighlighted 
      ? `${formattedSelectedDate} (${formatRevCompact(dayRev)})` 
      : formatRevCompact(weekRev);

    return {
      week: `W${i + 1}`,
      value: weekRev,
      label: labelText,
      isHighlighted
    };
  });

  const maxRev = Math.max(...currentRevData.map(d => d.value), baseTotalRev / 3);
  const revPointsAll = currentRevData.map((d, i) => {
    const x = i * (330 / 4) + 10;
    const y = 160 - (d.value / maxRev) * 100; 
    return { ...d, x, y, originalIndex: i };
  });

  const revPoints = revPointsAll.filter(p => p.originalIndex <= selectedWeekIndex);
  const getSmoothPath = (points) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M${points[0].x},${points[0].y}`;
    let d = `M${points[0].x},${points[0].y} `;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      const cx = (p1.x + p2.x) / 2;
      d += `C${cx},${p1.y} ${cx},${p2.y} ${p2.x},${p2.y} `;
    }
    return d;
  };

  const smoothRevPath = getSmoothPath(revPoints);
  const lastX = revPoints.length > 0 ? revPoints[revPoints.length - 1].x : 10;
  const areaRevPath = revPoints.length > 0 ? `${smoothRevPath} L${lastX},180 L10,180 Z` : '';

  // ─── Booking Funnel Calculations ───
  const activeBookingsCount = viewMode === 'b2c' ? (metrics.bookings > 0 ? metrics.bookings : 93) : b2bMetrics.bookings;
  const funnelS1 = viewMode === 'b2c' 
    ? (actualBookings => actualBookings * 45 + Math.floor(getSeededRandom(funnelDate, 100) * 10000))(activeBookingsCount)
    : 1800; // Searches B2B
  const funnelS2 = viewMode === 'b2c' 
    ? Math.floor(funnelS1 * (0.30 + getSeededRandom(funnelDate, 101) * 0.15))
    : Math.floor(funnelS1 * 0.42); // Selected B2B
  const funnelS3 = viewMode === 'b2c' 
    ? Math.floor(funnelS2 * (0.45 + getSeededRandom(funnelDate, 102) * 0.15))
    : Math.floor(funnelS2 * 0.58); // Passenger B2B
  const funnelS4 = viewMode === 'b2c' 
    ? Math.floor(funnelS3 * (0.45 + getSeededRandom(funnelDate, 103) * 0.15))
    : Math.floor(funnelS3 * 0.55); // Payment B2B
  const funnelS5 = viewMode === 'b2c' 
    ? activeBookingsCount + Math.floor(getSeededRandom(funnelDate, 104) * (activeBookingsCount * 0.1))
    : activeBookingsCount; // Completed B2B

  const animatedFunnelS1 = useCountUp(funnelS1, 800);
  const animatedFunnelS2 = useCountUp(funnelS2, 800);
  const animatedFunnelS3 = useCountUp(funnelS3, 800);
  const animatedFunnelS4 = useCountUp(funnelS4, 800);
  const animatedFunnelS5 = useCountUp(funnelS5, 800);

  return (
    <div className="dash-page" style={{ padding: '0px 10px 24px' }}>
      
      {/* ─── Premium Header with toggle buttons ─── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '6px', marginBottom: '6px', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Toggle Pills */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '100px', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <button
            onClick={() => setViewMode('b2c')}
            style={{
              border: 'none',
              background: viewMode === 'b2c' ? '#1e75ff' : 'transparent',
              color: viewMode === 'b2c' ? '#ffffff' : '#000000',
              padding: '8px 18px',
              borderRadius: '100px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: viewMode === 'b2c' ? '0 2px 6px rgba(30,117,255,0.3)' : 'none'
            }}
          >
            <span style={{ color: viewMode === 'b2c' ? '#ffffff' : '#000000', fontWeight: '700' }}>
              🌐 B2C Retail
            </span>
          </button>
          <button
            onClick={() => setViewMode('b2b')}
            style={{
              border: 'none',
              background: viewMode === 'b2b' ? '#1e75ff' : 'transparent',
              color: viewMode === 'b2b' ? '#ffffff' : '#000000',
              padding: '8px 18px',
              borderRadius: '100px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: viewMode === 'b2b' ? '0 2px 6px rgba(30,117,255,0.3)' : 'none'
            }}
          >
            <span style={{ color: viewMode === 'b2b' ? '#ffffff' : '#000000', fontWeight: '700' }}>
              💼 B2B Retail
            </span>
          </button>
        </div>
      </div>

      {viewMode === 'b2c' ? (
        /* ════════════════════════════════════════════════════════════ */
        /*                          B2C LAYOUT                          */
        /* ════════════════════════════════════════════════════════════ */
        <>
          <section className="dashboard-metrics-grid">
            {/* Total Revenue */}
            <div className="metric-card-premium" style={getCardStyle("Total Revenue", String(metrics.revenue))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle revenue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <span className="metric-title-text">Total Revenue</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatCurrency(animatedRevenue)}</span>
                {renderTrend(animatedTrendRevenue, "vs last month")}
              </div>
            </div>

            {/* Total Bookings */}
            <div className="metric-card-premium" style={getCardStyle("Total Bookings", String(metrics.bookings))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle bookings">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <span className="metric-title-text">Total Bookings</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatNumber(animatedBookings)}</span>
                {renderTrend(animatedTrendBookings, "vs last month")}
              </div>
            </div>

            {/* Total Users */}
            <div className="metric-card-premium" style={getCardStyle("Total Users", String(metrics.users))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle users">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <span className="metric-title-text">Total Users</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatNumber(animatedUsers)}</span>
                {renderTrend(animatedTrendUsers, "vs last month")}
              </div>
            </div>

            {/* Active Bookings */}
            <div className="metric-card-premium" style={getCardStyle("Active Bookings", String(metrics.activeBookings))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle active">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <span className="metric-title-text">Active Bookings</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatNumber(animatedActiveBookings)}</span>
                {renderTrend(animatedTrendActiveBookings, "vs yesterday")}
              </div>
            </div>

            {/* Cancelled Bookings */}
            <div className="metric-card-premium" style={getCardStyle("Cancelled Bookings", String(metrics.cancelledBookings))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle cancelled">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
                <span className="metric-title-text">Cancelled Bookings</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatNumber(animatedCancelledBookings)}</span>
                {renderTrend(animatedTrendCancelledBookings, "vs yesterday")}
              </div>
            </div>

            {/* Refund Requests */}
            <div className="metric-card-premium" style={getCardStyle("Refund Requests", String(metrics.refundRequests))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle refund">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <span className="metric-title-text">Refund Requests</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatNumber(animatedRefundRequests)}</span>
                {renderTrend(animatedTrendRefundRequests, "vs yesterday")}
              </div>
            </div>
          </section>

          <section className="dashboard-row-layout">
            {/* Live Bookings Overview MAP */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Live Bookings Overview</h3>
                <input 
                  type="date" 
                  className="card-title-select" 
                  style={{ width: '120px', padding: '4px 8px', fontSize: '0.8rem', fontFamily: 'inherit' }}
                  value={liveBookingsDate}
                  onChange={(e) => setLiveBookingsDate(e.target.value)}
                />
              </div>
              <div className="live-bookings-map-container">
                <svg viewBox="0 0 400 220" className="map-svg-bg" style={{ overflow: 'visible' }}>
                  <path d="M50 40 L150 40 L190 70 L230 40 L350 40 L350 180 L50 180 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
                  {svgPaths}
                </svg>
                {cityNodes}
              </div>
            </div>

            {/* Revenue Overview LINE CHART */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Revenue Overview</h3>
                <input 
                  type="date" 
                  className="card-title-select" 
                  style={{ width: '120px', padding: '4px 8px', fontSize: '0.8rem', fontFamily: 'inherit' }}
                  value={revenueDate}
                  onChange={(e) => setRevenueDate(e.target.value)}
                />
              </div>
              <div style={{ position: 'relative', height: '220px', width: '100%' }}>
                <svg viewBox="0 0 350 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <style>
                    {`
                      @keyframes drawPath {
                        from { stroke-dashoffset: 1000; }
                        to { stroke-dashoffset: 0; }
                      }
                      .draw-anim {
                        stroke-dasharray: 1000;
                        animation: drawPath 1.5s ease-out forwards;
                      }
                      .fade-anim {
                        animation: fadeIn 1.5s ease-out forwards;
                      }
                      @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                      }
                    `}
                  </style>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e75ff" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#1e75ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line x1="10" y1="50" x2="340" y2="50" stroke="var(--admin-border)" strokeWidth="1" />
                  <line x1="10" y1="90" x2="340" y2="90" stroke="var(--admin-border)" strokeWidth="1" />
                  <line x1="10" y1="130" x2="340" y2="130" stroke="var(--admin-border)" strokeWidth="1" />
                  <line x1="10" y1="170" x2="340" y2="170" stroke="var(--admin-border)" strokeWidth="1" />

                  {areaRevPath && <path d={areaRevPath} fill="url(#areaGrad)" className="fade-anim" />}
                  {smoothRevPath && <path d={smoothRevPath} fill="none" stroke="#1e75ff" strokeWidth="3.5" strokeLinecap="round" className="draw-anim" />}

                  {revPointsAll.map((p, i) => {
                    if (i > selectedWeekIndex) {
                       return (
                         <text key={i} x={p.x} y="190" fontSize="10" fill="var(--admin-muted)" textAnchor="middle">{p.week}</text>
                       );
                    }
                    return (
                      <g key={i} className="fade-anim">
                        <circle cx={p.x} cy={p.y} r={p.isHighlighted ? "7" : "5"} fill={p.isHighlighted ? "#f97316" : "#1e75ff"} stroke="#ffffff" strokeWidth="2" />
                        <text x={p.x} y={p.y - (p.isHighlighted ? 15 : 12)} fontSize="10" fill={p.isHighlighted ? "#f97316" : "var(--admin-text)"} fontWeight="bold" textAnchor="middle">{p.label}</text>
                        <text x={p.x} y="190" fontSize="10" fill="var(--admin-muted)" textAnchor="middle">{p.week}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Booking Funnel */}
            <div className="dashboard-card-shell funnel-box">
              <div className="card-title-bar">
                <h3>Booking Funnel</h3>
                <input 
                  type="date" 
                  className="card-title-select" 
                  style={{ width: '120px', padding: '4px 8px', fontSize: '0.8rem', fontFamily: 'inherit' }}
                  value={funnelDate}
                  onChange={(e) => setFunnelDate(e.target.value)}
                />
              </div>
              <div className="funnel-container" key={funnelDate} style={{ gap: '4px' }}>
                <div className="funnel-stage s1">
                  <span>Searches</span>
                  <strong>{formatNumber(animatedFunnelS1)}</strong>
                </div>
                <div className="funnel-stage s2">
                  <span>Selected ({((funnelS2 / funnelS1) * 100).toFixed(1)}%)</span>
                  <strong>{formatNumber(animatedFunnelS2)}</strong>
                </div>
                <div className="funnel-stage s3">
                  <span>Passenger ({((funnelS3 / funnelS2) * 100).toFixed(1)}%)</span>
                  <strong>{formatNumber(animatedFunnelS3)}</strong>
                </div>
                <div className="funnel-stage s4">
                  <span>Payment ({((funnelS4 / funnelS3) * 100).toFixed(1)}%)</span>
                  <strong>{formatNumber(animatedFunnelS4)}</strong>
                </div>
                <div className="funnel-stage s5">
                  <span>Completed ({((funnelS5 / funnelS4) * 100).toFixed(1)}%)</span>
                  <strong>{formatNumber(animatedFunnelS5)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-four-cols">
            {/* Top Selling Flights */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Top Selling Routes (Flights)</h3>
                {topFlights.length > 5 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setFlightsPage(p => Math.max(0, p - 1))} 
                      disabled={flightsPage === 0}
                      style={{ background: 'none', border: 'none', cursor: flightsPage === 0 ? 'default' : 'pointer', color: flightsPage === 0 ? 'var(--admin-border)' : 'var(--admin-text)', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button 
                      onClick={() => setFlightsPage(p => Math.min(Math.ceil(topFlights.length / 5) - 1, p + 1))} 
                      disabled={flightsPage >= Math.ceil(topFlights.length / 5) - 1}
                      style={{ background: 'none', border: 'none', cursor: flightsPage >= Math.ceil(topFlights.length / 5) - 1 ? 'default' : 'pointer', color: flightsPage >= Math.ceil(topFlights.length / 5) - 1 ? 'var(--admin-border)' : 'var(--admin-text)', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {isLoadingFlights ? (
                  <div style={{ padding: '10px 0', fontSize: '0.8rem', color: 'var(--admin-muted)' }}>Loading data...</div>
                ) : topFlights.length > 0 ? topFlights.slice(flightsPage * 5, (flightsPage + 1) * 5).map((route, i) => {
                  const count = route.bookingCount || route.searches || 0;
                  const maxBookings = Math.max(...topFlights.map(r => r.bookingCount || r.searches || 1));
                  const width = Math.max(10, (count / maxBookings) * 100);
                  return (
                    <div className="route-list-item" key={i}>
                      <span className="route-label-bold" style={{ flex: '0 0 50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>{route.fromCity} → {route.toCity}</span>
                      <div className="route-progress-bar" style={{ flex: '1', width: 'auto' }}><div className="route-progress-fill" style={{ width: `${width}%`, background: '#ef4444' }}></div></div>
                      <span style={{ flex: '0 0 20%', textAlign: 'right' }}>{formatNumber(count)}</span>
                    </div>
                  );
                }) : (
                  <div style={{ padding: '10px 0', fontSize: '0.8rem', color: 'var(--admin-muted)' }}>No API Data</div>
                )}
              </div>
            </div>

            {/* Top Selling Buses */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Top Selling Routes (Buses)</h3>
                {topBuses.length > 5 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setBusesPage(p => Math.max(0, p - 1))} 
                      disabled={busesPage === 0}
                      style={{ background: 'none', border: 'none', cursor: busesPage === 0 ? 'default' : 'pointer', color: busesPage === 0 ? 'var(--admin-border)' : 'var(--admin-text)', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button 
                      onClick={() => setBusesPage(p => Math.min(Math.ceil(topBuses.length / 5) - 1, p + 1))} 
                      disabled={busesPage >= Math.ceil(topBuses.length / 5) - 1}
                      style={{ background: 'none', border: 'none', cursor: busesPage >= Math.ceil(topBuses.length / 5) - 1 ? 'default' : 'pointer', color: busesPage >= Math.ceil(topBuses.length / 5) - 1 ? 'var(--admin-border)' : 'var(--admin-text)', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {isLoadingBuses ? (
                  <div style={{ padding: '10px 0', fontSize: '0.8rem', color: 'var(--admin-muted)' }}>Loading data...</div>
                ) : topBuses.length > 0 ? topBuses.slice(busesPage * 5, (busesPage + 1) * 5).map((route, i) => {
                  const count = route.bookingCount || route.searches || 0;
                  const maxBookings = Math.max(...topBuses.map(r => r.bookingCount || r.searches || 1));
                  const width = Math.max(10, (count / maxBookings) * 100);
                  return (
                    <div className="route-list-item" key={i}>
                      <span className="route-label-bold" style={{ flex: '0 0 50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>{route.fromCity} → {route.toCity}</span>
                      <div className="route-progress-bar" style={{ flex: '1', width: 'auto' }}><div className="route-progress-fill" style={{ width: `${width}%`, background: '#3b82f6' }}></div></div>
                      <span style={{ flex: '0 0 20%', textAlign: 'right' }}>{formatNumber(count)}</span>
                    </div>
                  );
                }) : (
                  <div style={{ padding: '10px 0', fontSize: '0.8rem', color: 'var(--admin-muted)' }}>No API Data</div>
                )}
              </div>
            </div>

            {/* Top Hotels */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Top Hotels by Bookings</h3>
                {topHotels.length > 5 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setHotelsPage(p => Math.max(0, p - 1))} 
                      disabled={hotelsPage === 0}
                      style={{ background: 'none', border: 'none', cursor: hotelsPage === 0 ? 'default' : 'pointer', color: hotelsPage === 0 ? 'var(--admin-border)' : 'var(--admin-text)', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button 
                      onClick={() => setHotelsPage(p => Math.min(Math.ceil(topHotels.length / 5) - 1, p + 1))} 
                      disabled={hotelsPage >= Math.ceil(topHotels.length / 5) - 1}
                      style={{ background: 'none', border: 'none', cursor: hotelsPage >= Math.ceil(topHotels.length / 5) - 1 ? 'default' : 'pointer', color: hotelsPage >= Math.ceil(topHotels.length / 5) - 1 ? 'var(--admin-border)' : 'var(--admin-text)', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {topHotels.slice(hotelsPage * 5, (hotelsPage + 1) * 5).map((hotel, index) => (
                  <div className="route-list-item" key={index}>
                    <span className="route-label-bold" style={{ flex: '0 0 50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>{hotel.name}</span>
                    <div className="route-progress-bar" style={{ flex: '1', width: 'auto' }}><div className="route-progress-fill" style={{ width: `${hotel.width}%`, background: '#10b981' }}></div></div>
                    <span style={{ flex: '0 0 20%', textAlign: 'right' }}>{formatNumber(hotel.count)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Live Activity Feed</h3>
              </div>
              <div className="activity-feed-container">
                {recentActivities.length > 0 ? recentActivities.slice(activityPage * 5, (activityPage + 1) * 5).map((activity, index) => {
                  const colorMap = {
                    booking: '#10b981',
                    cancellation: '#ef4444',
                    refund: '#f97316',
                    user: '#3b82f6',
                    hotel: '#ec4899',
                    flight: '#8b5cf6',
                    bus: '#f43f5e',
                    payment: '#10b981',
                  };
                  const bgColor = colorMap[(activity.type || '').toLowerCase()] || '#ef4444';
                  return (
                    <div className="activity-feed-item" key={index}>
                      <div className="activity-dot-circle" style={{ backgroundColor: bgColor }}></div>
                      <div className="activity-content-box">
                        <strong>{activity.message || activity.description || 'Unknown activity'}</strong>
                        <span className="activity-time-stamp">{activity.timeAgo || 'Just now'}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ padding: '10px 0', fontSize: '0.8rem', color: 'var(--admin-muted)' }}>No recent activities available</div>
                )}
              </div>
              {recentActivities.length > 5 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <button 
                    onClick={() => setActivityPage(p => Math.max(0, p - 1))} 
                    disabled={activityPage === 0}
                    style={{ background: 'none', border: 'none', cursor: activityPage === 0 ? 'default' : 'pointer', color: activityPage === 0 ? 'var(--admin-border)' : 'var(--admin-text)', padding: '4px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button 
                    onClick={() => setActivityPage(p => Math.min(Math.ceil(recentActivities.length / 5) - 1, p + 1))} 
                    disabled={activityPage >= Math.ceil(recentActivities.length / 5) - 1}
                    style={{ background: 'none', border: 'none', cursor: activityPage >= Math.ceil(recentActivities.length / 5) - 1 ? 'default' : 'pointer', color: activityPage >= Math.ceil(recentActivities.length / 5) - 1 ? 'var(--admin-border)' : 'var(--admin-text)', padding: '4px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        /* ════════════════════════════════════════════════════════════ */
        /*                          B2B LAYOUT                          */
        /* ════════════════════════════════════════════════════════════ */
        <>
          <section className="dashboard-metrics-grid">
            {/* Agent Revenue */}
            <div className="metric-card-premium" style={getCardStyle("Agent Revenue", String(b2bMetrics.revenue))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle revenue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <span className="metric-title-text">Agent Revenue</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatCurrency(animatedB2bRevenue)}</span>
                {renderTrend(b2bMetrics.trends.revenue, "vs last month")}
              </div>
            </div>

            {/* Agent Bookings */}
            <div className="metric-card-premium" style={getCardStyle("Agent Bookings", String(b2bMetrics.bookings))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle bookings">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <span className="metric-title-text">Agent Bookings</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatNumber(animatedB2bBookings)}</span>
                {renderTrend(b2bMetrics.trends.bookings, "vs last month")}
              </div>
            </div>

            {/* Total Agents */}
            <div className="metric-card-premium" style={getCardStyle("Total Agents", String(b2bMetrics.agentsCount))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle users">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <span className="metric-title-text">Total Agents</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatNumber(animatedB2bAgents)}</span>
                {renderTrend(b2bMetrics.trends.agentsCount, "vs last month")}
              </div>
            </div>

            {/* Active Agents */}
            <div className="metric-card-premium" style={getCardStyle("Active Agents", String(b2bMetrics.activeAgents))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle active">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <span className="metric-title-text">Active Agents</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatNumber(animatedB2bActive)}</span>
                {renderTrend(b2bMetrics.trends.activeAgents, "vs yesterday")}
              </div>
            </div>

            {/* Agent Deposits */}
            <div className="metric-card-premium" style={getCardStyle("Agent Deposits", String(b2bMetrics.deposits))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle cancelled">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
                <span className="metric-title-text">Agent Deposits</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatCurrency(animatedB2bDeposits)}</span>
                {renderTrend(b2bMetrics.trends.deposits, "vs yesterday")}
              </div>
            </div>

            {/* B2B Cancellations */}
            <div className="metric-card-premium" style={getCardStyle("Agent Cancellations", String(b2bMetrics.refunds))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle refund">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <span className="metric-title-text">Agent Cancelled</span>
              </div>
              <div className="metric-card-body">
                <span className="metric-value-huge">{formatNumber(animatedB2bRefunds)}</span>
                {renderTrend(b2bMetrics.trends.refunds, "vs yesterday")}
              </div>
            </div>
          </section>

          <section className="dashboard-row-layout">
            {/* B2B Live Bookings Overview MAP */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Agent Bookings Overview</h3>
              </div>
              <div className="live-bookings-map-container">
                <svg viewBox="0 0 400 220" className="map-svg-bg" style={{ overflow: 'visible' }}>
                  <path d="M50 40 L150 40 L190 70 L230 40 L350 40 L350 180 L50 180 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
                  {svgPaths}
                </svg>
                {cityNodes}
              </div>
            </div>

            {/* Agent Revenue Overview LINE CHART */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Agent Revenue Overview</h3>
              </div>
              <div style={{ position: 'relative', height: '220px', width: '100%' }}>
                <svg viewBox="0 0 350 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="areaGradB2B" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e75ff" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#1e75ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line x1="10" y1="50" x2="340" y2="50" stroke="var(--admin-border)" strokeWidth="1" />
                  <line x1="10" y1="90" x2="340" y2="90" stroke="var(--admin-border)" strokeWidth="1" />
                  <line x1="10" y1="130" x2="340" y2="130" stroke="var(--admin-border)" strokeWidth="1" />
                  <line x1="10" y1="170" x2="340" y2="170" stroke="var(--admin-border)" strokeWidth="1" />

                  {areaRevPath && <path d={areaRevPath} fill="url(#areaGradB2B)" className="fade-anim" />}
                  {smoothRevPath && <path d={smoothRevPath} fill="none" stroke="#1e75ff" strokeWidth="3.5" strokeLinecap="round" className="draw-anim" />}

                  {revPointsAll.map((p, i) => {
                    if (i > selectedWeekIndex) {
                       return (
                         <text key={i} x={p.x} y="190" fontSize="10" fill="var(--admin-muted)" textAnchor="middle">{p.week}</text>
                       );
                    }
                    return (
                      <g key={i} className="fade-anim">
                        <circle cx={p.x} cy={p.y} r={p.isHighlighted ? "7" : "5"} fill={p.isHighlighted ? "#f97316" : "#1e75ff"} stroke="#ffffff" strokeWidth="2" />
                        <text x={p.x} y={p.y - (p.isHighlighted ? 15 : 12)} fontSize="10" fill={p.isHighlighted ? "#f97316" : "var(--admin-text)"} fontWeight="bold" textAnchor="middle">{p.label}</text>
                        <text x={p.x} y="190" fontSize="10" fill="var(--admin-muted)" textAnchor="middle">{p.week}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* B2B Agent Booking Funnel */}
            <div className="dashboard-card-shell funnel-box">
              <div className="card-title-bar">
                <h3>Agent Booking Funnel</h3>
              </div>
              <div className="funnel-container" key={funnelDate} style={{ gap: '4px' }}>
                <div className="funnel-stage s1">
                  <span>Searches</span>
                  <strong>{formatNumber(animatedFunnelS1)}</strong>
                </div>
                <div className="funnel-stage s2">
                  <span>Selected ({((funnelS2 / funnelS1) * 100).toFixed(1)}%)</span>
                  <strong>{formatNumber(animatedFunnelS2)}</strong>
                </div>
                <div className="funnel-stage s3">
                  <span>Passenger ({((funnelS3 / funnelS2) * 100).toFixed(1)}%)</span>
                  <strong>{formatNumber(animatedFunnelS3)}</strong>
                </div>
                <div className="funnel-stage s4">
                  <span>Payment ({((funnelS4 / funnelS3) * 100).toFixed(1)}%)</span>
                  <strong>{formatNumber(animatedFunnelS4)}</strong>
                </div>
                <div className="funnel-stage s5">
                  <span>Completed ({((funnelS5 / funnelS4) * 100).toFixed(1)}%)</span>
                  <strong>{formatNumber(animatedFunnelS5)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-four-cols">
            {/* Top Agencies */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Top Agencies by Revenue</h3>
                {topAgencies.length > 5 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setAgenciesPage(p => Math.max(0, p - 1))} 
                      disabled={agenciesPage === 0}
                      style={{ background: 'none', border: 'none', cursor: agenciesPage === 0 ? 'default' : 'pointer', color: agenciesPage === 0 ? 'var(--admin-border)' : 'var(--admin-text)', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button 
                      onClick={() => setAgenciesPage(p => Math.min(Math.ceil(topAgencies.length / 5) - 1, p + 1))} 
                      disabled={agenciesPage >= Math.ceil(topAgencies.length / 5) - 1}
                      style={{ background: 'none', border: 'none', cursor: agenciesPage >= Math.ceil(topAgencies.length / 5) - 1 ? 'default' : 'pointer', color: agenciesPage >= Math.ceil(topAgencies.length / 5) - 1 ? 'var(--admin-border)' : 'var(--admin-text)', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {topAgencies.slice(agenciesPage * 5, (agenciesPage + 1) * 5).map((agency, index) => (
                  <div className="route-list-item" key={index}>
                    <span className="route-label-bold" style={{ flex: '0 0 50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>{agency.name}</span>
                    <div className="route-progress-bar" style={{ flex: '1', width: 'auto' }}><div className="route-progress-fill" style={{ width: `${agency.width}%`, background: '#10b981' }}></div></div>
                    <span style={{ flex: '0 0 20%', textAlign: 'right' }}>{formatCurrency(agency.count)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* B2B Live Activity Feed */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Agent Activity Feed</h3>
              </div>
              <div className="activity-feed-container">
                {b2bRecentActivities.length > 0 ? b2bRecentActivities.slice(b2bActivityPage * 5, (b2bActivityPage + 1) * 5).map((activity, index) => {
                  const colorMap = {
                    booking: '#10b981',
                    cancellation: '#ef4444',
                    refund: '#f97316',
                    user: '#3b82f6',
                    hotel: '#ec4899',
                    flight: '#8b5cf6',
                    bus: '#f43f5e',
                    payment: '#10b981',
                  };
                  const bgColor = colorMap[(activity.type || '').toLowerCase()] || '#ef4444';
                  return (
                    <div className="activity-feed-item" key={index}>
                      <div className="activity-dot-circle" style={{ backgroundColor: bgColor }}></div>
                      <div className="activity-content-box">
                        <strong>{activity.message || activity.description || 'Agent activity'}</strong>
                        <span className="activity-time-stamp">{activity.timeAgo || 'Just now'}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ padding: '10px 0', fontSize: '0.8rem', color: 'var(--admin-muted)' }}>No agent activities logged</div>
                )}
              </div>
              {b2bRecentActivities.length > 5 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <button 
                    onClick={() => setB2bActivityPage(p => Math.max(0, p - 1))} 
                    disabled={b2bActivityPage === 0}
                    style={{ background: 'none', border: 'none', cursor: b2bActivityPage === 0 ? 'default' : 'pointer', color: b2bActivityPage === 0 ? 'var(--admin-border)' : 'var(--admin-text)', padding: '4px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button 
                    onClick={() => setB2bActivityPage(p => Math.min(Math.ceil(b2bRecentActivities.length / 5) - 1, p + 1))} 
                    disabled={b2bActivityPage >= Math.ceil(b2bRecentActivities.length / 5) - 1}
                    style={{ background: 'none', border: 'none', cursor: b2bActivityPage >= Math.ceil(b2bRecentActivities.length / 5) - 1 ? 'default' : 'pointer', color: b2bActivityPage >= Math.ceil(b2bRecentActivities.length / 5) - 1 ? 'var(--admin-border)' : 'var(--admin-text)', padding: '4px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
