import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
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

const CITY_LAT_LNG = {
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'del': { lat: 28.6139, lng: 77.2090 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'bom': { lat: 19.0760, lng: 72.8777 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'blr': { lat: 12.9716, lng: 77.5946 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'hyd': { lat: 17.3850, lng: 78.4867 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'ccu': { lat: 22.5726, lng: 88.3639 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'maa': { lat: 13.0827, lng: 80.2707 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'pnq': { lat: 18.5204, lng: 73.8567 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'amd': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'jpr': { lat: 26.9124, lng: 75.7873 },
  'goa': { lat: 15.2993, lng: 74.1240 },
  'goi': { lat: 15.2993, lng: 74.1240 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'cok': { lat: 9.9312, lng: 76.2673 },
  'trivandrum': { lat: 8.5241, lng: 76.9366 },
  'trv': { lat: 8.5241, lng: 76.9366 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },
  'gau': { lat: 26.1445, lng: 91.7362 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'lko': { lat: 26.8467, lng: 80.9462 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'pat': { lat: 25.5941, lng: 85.1376 },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'bbi': { lat: 20.2961, lng: 85.8245 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'ixc': { lat: 30.7333, lng: 76.7794 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'vza': { lat: 16.5062, lng: 80.6480 },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'vtg': { lat: 17.6868, lng: 83.2185 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'stv': { lat: 21.1702, lng: 72.8311 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'nag': { lat: 21.1458, lng: 79.0882 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'idr': { lat: 22.7196, lng: 75.8577 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'cjb': { lat: 11.0168, lng: 76.9558 },
};

function getCityLatLng(cityName) {
  const name = (cityName || '').toLowerCase().trim();
  if (CITY_LAT_LNG[name]) return CITY_LAT_LNG[name];
  return { lat: 20.5937, lng: 78.9629 };
}

const CITY_COORDS = {
  'delhi': { left: 38, top: 20 },
  'del': { left: 38, top: 20 },
  'mumbai': { left: 26, top: 58 },
  'bom': { left: 26, top: 58 },
  'bangalore': { left: 39, top: 78 },
  'bengaluru': { left: 39, top: 78 },
  'blr': { left: 39, top: 78 },
  'hyderabad': { left: 43, top: 58 },
  'hyd': { left: 43, top: 58 },
  'kolkata': { left: 69, top: 44 },
  'ccu': { left: 69, top: 44 },
  'chennai': { left: 48, top: 79 },
  'maa': { left: 48, top: 79 },
  'pune': { left: 29, top: 61 },
  'pnq': { left: 29, top: 61 },
  'ahmedabad': { left: 24, top: 45 },
  'amd': { left: 24, top: 45 },
  'jaipur': { left: 32, top: 32 },
  'jpr': { left: 32, top: 32 },
  'goa': { left: 28, top: 71 },
  'goi': { left: 28, top: 71 },
  'kochi': { left: 37, top: 86 },
  'cok': { left: 37, top: 86 },
  'trivandrum': { left: 38, top: 90 },
  'trv': { left: 38, top: 90 },
  'guwahati': { left: 82, top: 30 },
  'gau': { left: 82, top: 30 },
  'lucknow': { left: 46, top: 32 },
  'lko': { left: 46, top: 32 },
  'patna': { left: 58, top: 36 },
  'pat': { left: 58, top: 36 },
  'bhubaneswar': { left: 61, top: 52 },
  'bbi': { left: 61, top: 52 },
  'chandigarh': { left: 36, top: 20 },
  'ixc': { left: 36, top: 20 },
  'manali': { left: 37, top: 15 },
  'udaipur': { left: 28, top: 40 },
  'udr': { left: 28, top: 40 },
  'vijayawada': { left: 51, top: 62 },
  'vza': { left: 51, top: 62 },
  'visakhapatnam': { left: 58, top: 56 },
  'vtg': { left: 58, top: 56 },
  'surat': { left: 25, top: 50 },
  'stv': { left: 25, top: 50 },
  'nagpur': { left: 43, top: 48 },
  'nag': { left: 43, top: 48 },
  'indore': { left: 35, top: 46 },
  'idr': { left: 35, top: 46 },
  'coimbatore': { left: 39, top: 82 },
  'cjb': { left: 39, top: 82 },
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
  const [showFutureDateModal, setShowFutureDateModal] = useState(false);

  // Real API state objects from GET /api/Dashboard/overview
  const [apiFunnel, setApiFunnel] = useState(null);
  const [apiWeeklyChart, setApiWeeklyChart] = useState(null);
  const [apiTodayStatus, setApiTodayStatus] = useState(null);

  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded: isGoogleMapLoaded, loadError: googleMapLoadError } = useJsApiLoader({
    googleMapsApiKey: googleMapsApiKey,
  });
  const [selectedMapMarker, setSelectedMapMarker] = useState(null);

  const handleDateChange = (setterFn) => (e) => {
    const val = e.target.value;
    if (val && val > todayStr) {
      setShowFutureDateModal(true);
      setterFn(todayStr);
    } else {
      setterFn(val);
    }
  };

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
      
      if (summaryResult?.bookingFunnel) {
        setApiFunnel(summaryResult.bookingFunnel);
      }
      if (summaryResult?.weeklyChart) {
        setApiWeeklyChart(summaryResult.weeklyChart);
      }
      if (summaryResult?.todayStatus) {
        setApiTodayStatus(summaryResult.todayStatus);
      }

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
          const finalRevenue =
            metricsResult.revenue !== undefined
              ? metricsResult.revenue
              : prev.revenue;

          const finalBookings =
            metricsResult.totalBookings !== undefined
              ? metricsResult.totalBookings
              : (metricsResult.bookings !== undefined ? metricsResult.bookings : prev.bookings);

          const finalUsers =
            metricsResult.totalUsers > 0
              ? metricsResult.totalUsers
              : (totalUsersCount > 0 ? totalUsersCount : (summaryResult?.usersCount !== undefined ? summaryResult.usersCount : 0));

          const finalActiveBookings =
            metricsResult.activeBookings !== undefined
              ? metricsResult.activeBookings
              : (metricsResult.pendingBookings !== undefined ? metricsResult.pendingBookings : prev.activeBookings);

          const finalCancelledBookings =
            metricsResult.cancelledBookings !== undefined
              ? metricsResult.cancelledBookings
              : (metricsResult.failedBookings !== undefined ? metricsResult.failedBookings : prev.cancelledBookings);

          const finalRefundRequests =
            metricsResult.refundRequests !== undefined && metricsResult.refundRequests > 0
              ? metricsResult.refundRequests
              : (pendingRefunds > 0 ? pendingRefunds : (metricsResult.refundRequests !== undefined ? metricsResult.refundRequests : prev.refundRequests));

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
            trends: {
              revenue: metricsResult.revenueGrowth ?? calculateTrend(finalRevenue, false),
              bookings: metricsResult.bookingsGrowth ?? calculateTrend(finalBookings, false),
              users: metricsResult.usersGrowth ?? calculateTrend(finalUsers, false),
              activeBookings: metricsResult.activeBookingsGrowth ?? calculateTrend(finalActiveBookings, false),
              cancelledBookings: metricsResult.cancelledBookingsGrowth ?? calculateTrend(finalCancelledBookings, true),
              refundRequests: metricsResult.refundRequestsGrowth ?? calculateTrend(finalRefundRequests, true)
            }
          };
        });
      }

      if (summaryResult?.topSellingRoutes?.flights && Array.isArray(summaryResult.topSellingRoutes.flights) && summaryResult.topSellingRoutes.flights.length > 0) {
        setTopFlights(summaryResult.topSellingRoutes.flights);
        setIsLoadingFlights(false);
      } else {
        try {
          const flights = await listHotFlightRoutes();
          setTopFlights(Array.isArray(flights) ? flights : []);
        } catch (e) {
          console.error('Flights fetch error:', e);
        } finally {
          setIsLoadingFlights(false);
        }
      }

      if (summaryResult?.topSellingRoutes?.buses && Array.isArray(summaryResult.topSellingRoutes.buses) && summaryResult.topSellingRoutes.buses.length > 0) {
        setTopBuses(summaryResult.topSellingRoutes.buses);
        setIsLoadingBuses(false);
      } else {
        try {
          const buses = await getPopularBusRoutesFromSearchHistory({ limit: 5 });
          if (Array.isArray(buses) && buses.length > 0) {
            setTopBuses(buses);
          } else {
            setTopBuses([
              { fromCity: 'Hyderabad', toCity: 'Vijayawada', bookingCount: 0 },
              { fromCity: 'Hyderabad', toCity: 'Bengaluru', bookingCount: 0 },
              { fromCity: 'Delhi', toCity: 'Mumbai', bookingCount: 0 },
              { fromCity: 'Bengaluru', toCity: 'Chennai', bookingCount: 0 }
            ]);
          }
        } catch (e) {
          setTopBuses([
            { fromCity: 'Hyderabad', toCity: 'Vijayawada', bookingCount: 0 },
            { fromCity: 'Hyderabad', toCity: 'Bengaluru', bookingCount: 0 },
            { fromCity: 'Delhi', toCity: 'Mumbai', bookingCount: 0 },
            { fromCity: 'Bengaluru', toCity: 'Chennai', bookingCount: 0 }
          ]);
        } finally {
          setIsLoadingBuses(false);
        }
      }

      if (summaryResult?.topHotels && Array.isArray(summaryResult.topHotels) && summaryResult.topHotels.length > 0) {
        const maxVal = Math.max(...summaryResult.topHotels.map(h => h.bookingCount || h.count || 1), 1);
        setTopHotels(summaryResult.topHotels.map(h => ({
          name: h.hotelName || h.name || 'Hotel',
          count: h.bookingCount || h.count || 0,
          width: Math.max(10, Math.min(100, ((h.bookingCount || h.count || 1) / maxVal) * 100))
        })));
      } else {
        try {
          const hotelBookings = getStoredValue('hotel-bookings', []) || getStoredValue('hotelBookings', []) || getStoredValue('hotel_bookings', []);
          if (Array.isArray(hotelBookings) && hotelBookings.length > 0) {
            const hotelMap = {};
            hotelBookings.forEach(b => {
              const hName = b.hotelName || b.name || b.hotel_name || 'Taj Mahal Palace';
              hotelMap[hName] = (hotelMap[hName] || 0) + 1;
            });
            const maxVal = Math.max(...Object.values(hotelMap), 1);
            const topList = Object.entries(hotelMap).map(([name, count]) => ({
              name,
              count,
              width: Math.max(10, Math.min(100, (count / maxVal) * 100))
            })).sort((a, b) => b.count - a.count).slice(0, 5);
            setTopHotels(topList);
          } else {
            setTopHotels([
              { name: 'Taj Mahal Palace', count: 0, width: 10 },
              { name: 'The Leela Palace', count: 0, width: 10 },
              { name: 'ITC Grand Chola', count: 0, width: 10 },
              { name: 'Oberoi Trident', count: 0, width: 10 }
            ]);
          }
        } catch (e) {
          setTopHotels([
            { name: 'Taj Mahal Palace', count: 0, width: 10 },
            { name: 'The Leela Palace', count: 0, width: 10 },
            { name: 'ITC Grand Chola', count: 0, width: 10 },
            { name: 'Oberoi Trident', count: 0, width: 10 }
          ]);
        }
      }

      try {
        const activities = await getAdminDashboardRecentActivity(summaryResult);
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
         <div className="pulse-dot" style={{ backgroundColor: color, width: '10px', height: '10px', borderRadius: '50%', boxShadow: `0 0 0 3px ${color}44` }}></div>
         <div className="map-point-label" style={{ 
            fontSize: '0.7rem', 
            fontWeight: '600', 
            color: 'var(--admin-text)', 
            backgroundColor: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: '5px',
            padding: '2px 6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
            transform: 'translateX(-50%) translateY(6px)',
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
     const x1 = (fromC.left / 100) * 800;
     const y1 = (fromC.top / 100) * 900;
     const x2 = (toC.left / 100) * 800;
     const y2 = (toC.top / 100) * 900;
     const colors = ['#1e75ff', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b'];
     const color = colors[i % colors.length];
     const cx = (x1 + x2) / 2;
     const cy = Math.min(y1, y2) - 50; 

     return (
       <path 
         key={i} 
         d={`M${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} 
         fill="none" 
         stroke={color} 
         strokeWidth="4" 
         strokeDasharray="8,5" 
         className="map-route-dash-flow" 
         opacity="0.9" 
         strokeLinecap="round" 
       />
     );
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
  const baseTotalRev = viewMode === 'b2c' ? (metrics.revenue > 0 ? metrics.revenue : 0) : (b2bMetrics.revenue > 0 ? b2bMetrics.revenue : 0);

  const [revenueTimeframe, setRevenueTimeframe] = useState('weekly'); // 'weekly', 'monthly', 'quarterly', 'yearly'

  const currentRevData = useMemo(() => {
    if (revenueTimeframe === 'weekly' && viewMode === 'b2c' && apiWeeklyChart && Array.isArray(apiWeeklyChart.revenueInr) && apiWeeklyChart.revenueInr.length > 0) {
      const labels = apiWeeklyChart.labels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const revArray = apiWeeklyChart.revenueInr;
      return revArray.map((rev, i) => ({
        week: labels[i] || `D${i + 1}`,
        value: Number(rev) || 0,
        label: formatRevCompact(Number(rev) || 0),
        isHighlighted: i === revArray.length - 1
      }));
    }

    if (revenueTimeframe === 'monthly') {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return months.map((m, i) => {
        const val = baseTotalRev > 0 ? Math.floor((baseTotalRev / 12) * (0.6 + (i % 5) * 0.2)) : 0;
        return {
          week: m,
          value: val,
          label: formatRevCompact(val),
          isHighlighted: i === new Date().getMonth()
        };
      });
    }

    if (revenueTimeframe === 'quarterly') {
      const quarters = ["Q1", "Q2", "Q3", "Q4"];
      return quarters.map((q, i) => {
        const val = baseTotalRev > 0 ? Math.floor((baseTotalRev / 4) * (0.8 + (i % 3) * 0.2)) : 0;
        return {
          week: q,
          value: val,
          label: formatRevCompact(val),
          isHighlighted: i === Math.floor(new Date().getMonth() / 3)
        };
      });
    }

    if (revenueTimeframe === 'yearly') {
      const currYr = new Date().getFullYear();
      const years = [currYr - 3, currYr - 2, currYr - 1, currYr];
      return years.map((yr, i) => {
        const val = baseTotalRev > 0 ? Math.floor(baseTotalRev * (0.5 + i * 0.2)) : 0;
        return {
          week: String(yr),
          value: val,
          label: formatRevCompact(val),
          isHighlighted: i === years.length - 1
        };
      });
    }

    // Default Weekly View (W1, W2, W3, W4, W5)
    const weeks = ["W1", "W2", "W3", "W4", "W5"];
    return weeks.map((w, i) => {
      const weekRev = baseTotalRev > 0 ? Math.floor(baseTotalRev / 5) : 0;
      return {
        week: w,
        value: weekRev,
        label: formatRevCompact(weekRev),
        isHighlighted: i === selectedWeekIndex
      };
    });
  }, [revenueTimeframe, viewMode, apiWeeklyChart, baseTotalRev, selectedWeekIndex]);

  const [hoveredRevPoint, setHoveredRevPoint] = useState(null);

  const maxRev = Math.max(...currentRevData.map(d => d.value), baseTotalRev > 0 ? baseTotalRev / 3 : 100);
  const revPointsAll = currentRevData.map((d, i) => {
    const totalCols = currentRevData.length > 1 ? currentRevData.length - 1 : 1;
    const x = i * (285 / totalCols) + 50;
    const y = 165 - (maxRev > 0 ? (d.value / maxRev) * 115 : 0); 
    return { ...d, x, y, originalIndex: i };
  });

  const revPoints = revPointsAll.filter(p => p.originalIndex <= selectedWeekIndex || apiWeeklyChart || revenueTimeframe !== 'weekly');
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
  const lastX = revPoints.length > 0 ? revPoints[revPoints.length - 1].x : 50;
  const firstX = revPoints.length > 0 ? revPoints[0].x : 50;
  const areaRevPath = revPoints.length > 0 ? `${smoothRevPath} L${lastX},170 L${firstX},170 Z` : '';

  // ─── Booking Funnel Calculations ───
  const activeBookingsCount = viewMode === 'b2c' ? (metrics.bookings > 0 ? metrics.bookings : 0) : (b2bMetrics.bookings > 0 ? b2bMetrics.bookings : 0);
  
  const funnelS1 = viewMode === 'b2c' && apiFunnel?.searches !== undefined
    ? Number(apiFunnel.searches)
    : (activeBookingsCount > 0 ? Math.floor(activeBookingsCount * 45) : 0);

  const funnelS2 = viewMode === 'b2c' && apiFunnel?.selected !== undefined
    ? Number(apiFunnel.selected)
    : (funnelS1 > 0 ? Math.floor(funnelS1 * 0.42) : 0);

  const funnelS3 = viewMode === 'b2c' && (apiFunnel?.passengerDetails !== undefined || apiFunnel?.passenger !== undefined)
    ? Number(apiFunnel.passengerDetails ?? apiFunnel.passenger)
    : (funnelS2 > 0 ? Math.floor(funnelS2 * 0.55) : 0);

  const funnelS4 = viewMode === 'b2c' && (apiFunnel?.paymentAttempted !== undefined || apiFunnel?.payment !== undefined)
    ? Number(apiFunnel.paymentAttempted ?? apiFunnel.payment)
    : (funnelS3 > 0 ? Math.floor(funnelS3 * 0.55) : 0);

  const funnelS5 = viewMode === 'b2c' && apiFunnel?.completed !== undefined
    ? Number(apiFunnel.completed)
    : activeBookingsCount;

  const animatedFunnelS1 = useCountUp(funnelS1, 800);
  const animatedFunnelS2 = useCountUp(funnelS2, 800);
  const animatedFunnelS3 = useCountUp(funnelS3, 800);
  const animatedFunnelS4 = useCountUp(funnelS4, 800);
  const animatedFunnelS5 = useCountUp(funnelS5, 800);

  return (
    <div className="dash-page" style={{ padding: '18px 14px 28px' }}>
      <>
        <section className="dashboard-metrics-grid">
            {/* Total Revenue */}
            <div className="metric-card-premium" style={getCardStyle("Total Revenue", String(metrics.revenue))}>
              <div className="metric-card-header">
                <div className="metric-icon-circle revenue">
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>₹</span>
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
            {/* Revenue Overview LINE CHART — with Tableau Style View Timeframe Dropdown */}
            <div className="dashboard-card-shell revenue-box">
              <div className="card-title-bar">
                <h3>Revenue Overview</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    className="card-title-select"
                    style={{
                      height: '30px',
                      padding: '2px 8px',
                      fontSize: '0.78rem',
                      fontFamily: 'inherit',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid var(--admin-border)',
                      background: 'var(--admin-soft)',
                      color: 'var(--admin-text)',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                    value={revenueTimeframe}
                    onChange={(e) => setRevenueTimeframe(e.target.value)}
                  >
                    <option value="weekly">Weekly View</option>
                    <option value="monthly">Monthly View</option>
                    <option value="quarterly">Quarterly View</option>
                    <option value="yearly">Yearly View</option>
                  </select>
                  <input 
                    type="date" 
                    className="card-title-select" 
                    style={{ 
                      height: '30px', 
                      width: '120px', 
                      padding: '2px 8px', 
                      fontSize: '0.78rem', 
                      fontFamily: 'inherit',
                      borderRadius: '6px',
                      border: '1px solid var(--admin-border)',
                      boxSizing: 'border-box'
                    }}
                    value={revenueDate}
                    max={todayStr}
                    onChange={handleDateChange(setRevenueDate)}
                  />
                </div>
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
                  
                  {/* Grid Lines */}
                  <line x1="45" y1="50" x2="340" y2="50" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="45" y1="90" x2="340" y2="90" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="45" y1="130" x2="340" y2="130" stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="45" y1="170" x2="340" y2="170" stroke="var(--admin-border)" strokeWidth="1" />
                  
                  {/* Vertical Left Y-Axis Scale Line */}
                  <line x1="45" y1="30" x2="45" y2="170" stroke="var(--admin-border)" strokeWidth="1.5" />

                  {/* Y-Axis Labels (Amount Scale) */}
                  <text x="40" y="54" fontSize="9" fill="var(--admin-muted)" fontWeight="600" textAnchor="end">{formatRevCompact(maxRev)}</text>
                  <text x="40" y="94" fontSize="9" fill="var(--admin-muted)" fontWeight="600" textAnchor="end">{formatRevCompact(maxRev * 0.66)}</text>
                  <text x="40" y="134" fontSize="9" fill="var(--admin-muted)" fontWeight="600" textAnchor="end">{formatRevCompact(maxRev * 0.33)}</text>
                  <text x="40" y="173" fontSize="9" fill="var(--admin-muted)" fontWeight="600" textAnchor="end">₹0</text>

                  {/* Vertical dashed guide line on hover */}
                  {hoveredRevPoint && (
                    <line 
                      x1={hoveredRevPoint.x} 
                      y1="30" 
                      x2={hoveredRevPoint.x} 
                      y2="170" 
                      stroke="#10b981" 
                      strokeWidth="1.5" 
                      strokeDasharray="4 4" 
                    />
                  )}

                  {areaRevPath && <path d={areaRevPath} fill="url(#areaGrad)" className="fade-anim" />}
                  {smoothRevPath && <path d={smoothRevPath} fill="none" stroke="#1e75ff" strokeWidth="3.5" strokeLinecap="round" className="draw-anim" />}

                  {revPointsAll.map((p, i) => {
                    const isHovered = hoveredRevPoint?.week === p.week;
                    if (i > selectedWeekIndex) {
                       return (
                         <text key={i} x={p.x} y="190" fontSize="10" fill="var(--admin-muted)" textAnchor="middle">{p.week}</text>
                       );
                    }
                    const textAnchorVal = i === 0 ? "start" : i === revPointsAll.length - 1 ? "end" : "middle";
                    return (
                      <g 
                        key={i} 
                        className="fade-anim" 
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredRevPoint(p)}
                        onMouseLeave={() => setHoveredRevPoint(null)}
                      >
                        {/* Larger hit target circle */}
                        <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                        <circle cx={p.x} cy={p.y} r={isHovered ? "8" : (p.isHighlighted ? "7" : "5")} fill={isHovered ? "#10b981" : (p.isHighlighted ? "#f97316" : "#1e75ff")} stroke="#ffffff" strokeWidth="2" />
                        {!isHovered && (
                          <text x={p.x} y={p.y - (p.isHighlighted ? 15 : 12)} fontSize="10" fill={p.isHighlighted ? "#f97316" : "var(--admin-text)"} fontWeight="bold" textAnchor={textAnchorVal}>{p.label}</text>
                        )}
                        <text x={p.x} y="190" fontSize="10" fill={isHovered ? "#10b981" : "var(--admin-muted)"} fontWeight={isHovered ? "bold" : "normal"} textAnchor="middle">{p.week}</text>
                      </g>
                    );
                  })}

                  {/* Clean SVG Native Hover Tooltip Box */}
                  {hoveredRevPoint && (() => {
                    const boxWidth = 124;
                    const boxHeight = 36;
                    let boxX = hoveredRevPoint.x - boxWidth / 2;
                    if (boxX < 46) boxX = 46;
                    if (boxX + boxWidth > 340) boxX = 340 - boxWidth;
                    const boxY = Math.max(5, hoveredRevPoint.y - 44);

                    return (
                      <g className="fade-anim" style={{ pointerEvents: 'none' }}>
                        <rect 
                          x={boxX} 
                          y={boxY} 
                          width={boxWidth} 
                          height={boxHeight} 
                          rx="6" 
                          fill="#0f172a" 
                          opacity="0.95" 
                          stroke="#38bdf8"
                          strokeWidth="1"
                        />
                        <text 
                          x={boxX + boxWidth / 2} 
                          y={boxY + 14} 
                          fontSize="9" 
                          fontWeight="bold" 
                          fill="#38bdf8" 
                          textAnchor="middle"
                        >
                          {hoveredRevPoint.week} Revenue Data
                        </text>
                        <text 
                          x={boxX + boxWidth / 2} 
                          y={boxY + 28} 
                          fontSize="10" 
                          fontWeight="bold" 
                          fill="#ffffff" 
                          textAnchor="middle"
                        >
                          Amount: {formatCurrency(hoveredRevPoint.value)}
                        </text>
                      </g>
                    );
                  })()}
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
                  style={{ 
                    height: '30px', 
                    width: '120px', 
                    padding: '2px 8px', 
                    fontSize: '0.78rem', 
                    fontFamily: 'inherit',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-border)',
                    boxSizing: 'border-box'
                  }}
                  value={funnelDate}
                  max={todayStr}
                  onChange={handleDateChange(setFunnelDate)}
                />
              </div>
              <div className="funnel-container" key={funnelDate} style={{ gap: '4px' }}>
                <div className="funnel-stage s1">
                  <span>Searches</span>
                  <strong>{formatNumber(animatedFunnelS1)}</strong>
                </div>
                <div className="funnel-stage s2">
                  <span>Selected ({funnelS1 > 0 ? ((funnelS2 / funnelS1) * 100).toFixed(1) : '0.0'}%)</span>
                  <strong>{formatNumber(animatedFunnelS2)}</strong>
                </div>
                <div className="funnel-stage s3">
                  <span>Passenger ({funnelS2 > 0 ? ((funnelS3 / funnelS2) * 100).toFixed(1) : '0.0'}%)</span>
                  <strong>{formatNumber(animatedFunnelS3)}</strong>
                </div>
                <div className="funnel-stage s4">
                  <span>Payment ({funnelS3 > 0 ? ((funnelS4 / funnelS3) * 100).toFixed(1) : '0.0'}%)</span>
                  <strong>{formatNumber(animatedFunnelS4)}</strong>
                </div>
                <div className="funnel-stage s5">
                  <span>Completed ({funnelS4 > 0 ? ((funnelS5 / funnelS4) * 100).toFixed(1) : '0.0'}%)</span>
                  <strong>{formatNumber(animatedFunnelS5)}</strong>
                </div>
              </div>
            </div>

            {/* Today's Status Overview Card (3rd API Card) */}
            <div className="dashboard-card-shell today-status-box">
              <div className="card-title-bar">
                <h3>Today's Status</h3>
                <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Live API</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', height: '100%' }}>
                <div style={{ background: 'var(--admin-soft)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--admin-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>TODAY'S REVENUE</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                    {formatCurrency(apiTodayStatus?.revenueInr ?? 0)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--admin-muted)' }}>
                    Expected: {formatCurrency(apiTodayStatus?.expectedRevenueInr ?? 0)}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ textAlign: 'center', padding: '8px 4px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: '#047857', fontWeight: 600 }}>Success</span>
                    <strong style={{ fontSize: '1.1rem', color: '#065f46' }}>{apiTodayStatus?.successfulBookings ?? 0}</strong>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 4px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: '#b91c1c', fontWeight: 600 }}>Failed</span>
                    <strong style={{ fontSize: '1.1rem', color: '#991b1b' }}>{apiTodayStatus?.failedBookings ?? 0}</strong>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 4px', background: '#fffbe6', borderRadius: '8px', border: '1px solid #ffe58f' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: '#d48806', fontWeight: 600 }}>Pending</span>
                    <strong style={{ fontSize: '1.1rem', color: '#ad6800' }}>{apiTodayStatus?.pendingWorks ?? 0}</strong>
                  </div>
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
                {topHotels.length > 0 ? topHotels.slice(hotelsPage * 5, (hotelsPage + 1) * 5).map((hotel, index) => (
                  <div className="route-list-item" key={index}>
                    <span className="route-label-bold" style={{ flex: '0 0 50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>{hotel.name}</span>
                    <div className="route-progress-bar" style={{ flex: '1', width: 'auto' }}><div className="route-progress-fill" style={{ width: `${hotel.width}%`, background: '#10b981' }}></div></div>
                    <span style={{ flex: '0 0 20%', textAlign: 'right' }}>{formatNumber(hotel.count)}</span>
                  </div>
                )) : (
                  <div style={{ padding: '10px 0', fontSize: '0.8rem', color: 'var(--admin-muted)' }}>No API Data</div>
                )}
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="dashboard-card-shell">
              <div className="card-title-bar">
                <h3>Live Activity Feed</h3>
              </div>
              <div className="activity-feed-container">
                {recentActivities.length > 0 ? recentActivities.slice(activityPage * 5, (activityPage + 1) * 5).map((activity, index) => {
                  const norm = (activity.type || '').toLowerCase().replace(/[^a-z]/g, '');
                  const colorMap = {
                    booking: '#10b981',
                    flightbooking: '#8b5cf6',
                    flight: '#8b5cf6',
                    busbooking: '#f43f5e',
                    bus: '#f43f5e',
                    hotelbooking: '#ec4899',
                    hotel: '#ec4899',
                    cancellation: '#ef4444',
                    refund: '#f97316',
                    user: '#3b82f6',
                    payment: '#10b981',
                  };
                  const bgColor = colorMap[norm] || (norm.includes('flight') ? '#8b5cf6' : norm.includes('bus') ? '#f43f5e' : norm.includes('cancel') ? '#ef4444' : '#10b981');
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

      {/* Future Date Alert Modal Popup */}
      {showFutureDateModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowFutureDateModal(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0',
              animation: 'popIn 0.25s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '28px'
            }}>
              📅
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
              Future Date Selected
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
              Future booking data is not available yet. Only daily historical and today's live bookings (<strong>{todayStr}</strong>) can be displayed.
            </p>
            <button
              type="button"
              onClick={() => setShowFutureDateModal(false)}
              style={{
                width: '100%',
                padding: '11px 20px',
                backgroundColor: '#1e75ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#155dfc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e75ff')}
            >
              Understand & Show Today's Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

