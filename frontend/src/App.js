/* eslint-disable */
import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { UserProvider } from "./contexts/UserContext";
import { PromoProvider } from "./contexts/PromoContext";
import {
  clearAuthSession,
  clearExpiredUserCredentials,
  isTokenExpired,
} from "./services/authSession";

import BookingConfirmationPage from "./pages/booking/BookingConfirmationPage";
import B2BLogin from "./B2B_Portal/AUTHENTICATIONS/login/B2BLogin";
import B2BRegister from "./B2B_Portal/AUTHENTICATIONS/register/B2BRegister";
import B2BDashboard from "./B2B_Portal/DASHBOARD B2B/B2BDashboard";
import B2BForgotPassword from "./B2B_Portal/AUTHENTICATIONS/forgot-password/B2BForgotPassword";
import B2BLayout from "./B2B_Portal/B2B LAYOUT/B2BLayout";
import B2BBookingsReport from "./B2B_Portal/DASHBOARD B2B/B2BBookingsReport";
import B2BLedgerStatement from "./B2B_Portal/DASHBOARD B2B/B2BLedgerStatement";
import B2BDepositRequest from "./B2B_Portal/DASHBOARD B2B/B2BDepositRequest";
import B2BMarkupSettings from "./B2B_Portal/SETTINGS B2B/B2BMarkupSettings";
import B2BLogoManagement from "./B2B_Portal/SETTINGS B2B/B2BLogoManagement";
import B2BBookingEngine from "./B2B_Portal/DASHBOARD B2B/B2BBookingEngine";
import B2BPrintTicket from "./B2B_Portal/DASHBOARD B2B/B2BPrintTicket";

import Topbar from "./components/layout/Topbar";
import SiteFooter from "./components/layout/SiteFooter";
import AuthModal from "./components/auth/AuthModal";
import HomePage from "./pages/public/HomePage";
import PrintTicketPage from "./pages/public/PrintTicketPage";
import FetchTicket from "./pages/public/FetchTicket";
import ChangePassword from "./pages/auth/ChangePassword";
import DashboardLayout from "./components/layout/DashbaordLayout";
import DashboardPage from "./pages/booking/DashboardPage";

import BankList from "./pages/account/BankList";
import QRList from "./pages/account/QRList";
import DepositRequest from "./pages/account/DepositRequest";
import TravelerList from "./pages/account/TravelerList";
import FlightBookings from "./pages/booking/FlightBookings";
import FlightCancel from "./pages/booking/FlightCancel";
import BusBookings from "./pages/booking/BusBookings";
import BusCancel from "./pages/booking/BusCancel";
import AccountStatement from "./pages/account/AccountStatement";
import EditProfile from "./pages/account/EditProfile";
import FlightSearchResults from "./pages/booking/FlightSearchResults";
import BusSearchResults from "./pages/booking/BusSearchResults";
import HotelSearchResults from "./pages/booking/HotelSearchResults";
import HotelPassengerDetailsPage from "./pages/booking/HotelPassengerDetailsPage";
import HotelPaymentPage from "./pages/booking/HotelPaymentPage";
import BusSeatSelectionPage from "./pages/booking/BusSeatSelectionPage";
import BusPassengerDetailsPage from "./pages/booking/BusPassengerDetailsPage";
import BusPaymentPage from "./pages/booking/BusPaymentPage";
import FlightSeatSelectionPage from "./pages/booking/FlightSeatSelectionPage";
import FlightPassengerDetailsPage from "./pages/booking/FlightPassengerDetailsPage";
import FlightPaymentPage from "./pages/booking/FlightPaymentPage";
import HotelBookings from "./pages/booking/HotelBookings";
import TicketConfirmationPage from "./pages/public/TicketConfirmationPage";
import MyAccount from "./pages/account/MyAccount";
import OffersPage from "./pages/public/OffersPage";
import WebCheckinPage from "./pages/public/WebCheckinPage";
import LegalPage from "./pages/public/LegalPage";
import ContactUsPage from "./pages/public/ContactUsPage";
import BlogListPage from "./pages/public/BlogListPage";
import BlogDetailPage from "./pages/public/BlogDetailPage";

import AdminLogin from "./Admin_Portal/AUTHENTICATIONS/login admin/login admin";
import AdminPin from "./Admin_Portal/AUTHENTICATIONS/verifing/adminpin";
import AdminLayout from "./Admin_Portal/adminlayout";
import AdminSectionPlaceholder from "./Admin_Portal/PLACEHOLDERS/SectionPlaceholder";
import AdminDashboard from "./Admin_Portal/DASHBOARD ADMIN/Admin.Dashbaord";
import DiscountList from "./Admin_Portal/B2C BUS MANAGEMENT/Discount List/DiscountList";
import AddB2CBusDiscount from "./Admin_Portal/B2C BUS MANAGEMENT/Discount List/AddB2CBusDiscount";
import DiscountMapping from "./Admin_Portal/B2C BUS MANAGEMENT/Discount Mapping/DiscountMapping";
import BusBookingList from "./Admin_Portal/B2C BUS MANAGEMENT/Booking List/bookingList";
import BusCancellationList from "./Admin_Portal/B2C BUS MANAGEMENT/Cancellation List/BusCancellationList";
import BusConvenienceFee from "./Admin_Portal/B2C BUS MANAGEMENT/convenience fee/BusConvenienceFee";
import BusEditConvenienceFee from "./Admin_Portal/B2C BUS MANAGEMENT/convenience fee/BusAddConvenienceFee";
import BusSearchHistory from "./Admin_Portal/B2C BUS MANAGEMENT/Search History/BusSearchHistory";
import BusVoucherSettings from "./Admin_Portal/B2C BUS MANAGEMENT/Vocher settings/BusVocherSettings";
import BusMarkupList from "./Admin_Portal/B2C BUS MANAGEMENT/MarkupList/BusMarkupList";
import BusGstSettings from "./Admin_Portal/B2C BUS MANAGEMENT/GstSettings/BusGstSettings";
import BusCouponList from "./Admin_Portal/B2C BUS MANAGEMENT/Coupon list/BusCouponList";
import BusUsedCouponsList from "./Admin_Portal/B2C BUS MANAGEMENT/Used coupon list/BusUsedCouponsList";
import BusAddConvenienceFee from "./Admin_Portal/B2C BUS MANAGEMENT/convenience fee/BusAddConvenienceFee";
import BusPopularRoutes from "./Admin_Portal/B2C BUS MANAGEMENT/Popular Bus Routes/PopularBusRoutes";
import FlightDiscountList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Discount List/DiscountList";
import AddB2CFlightDiscount from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Discount List/AddB2CFlightDiscount";
import HotelEditConvenienceFee from "./Admin_Portal/B2C HOTEL MANAGEMENT/convenience fee/HotelEditConvenienceFee";
import HotelVoucherSettings from "./Admin_Portal/HOTEL MANAGEMENT/Voucher Settings/HotelVoucherSettings";
import HotelPopularDestinations from "./Admin_Portal/HOTEL MANAGEMENT/Popular Destinations/HotelPopularDestinations";
import AdminAboutUsPage from "./Admin_Portal/PAGE MANAGEMENT/AboutUs/aboutus";
import AdminTestimonialList from "./Admin_Portal/TESTIMONIAL MANAGEMENT/TESTIMONIAL LIST/Admin.TestimonialList";
import AdminAddTestimonial from "./Admin_Portal/TESTIMONIAL MANAGEMENT/ADD TESTIMONIAL/Admin.AddTestimonial";
import FlightBookingList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Booking List/FlightBookingList";
import FlightCancelRequestList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Cancellation Request List/FlightCancelRequestList";
import FlightConvenienceFee from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Convenience fee/FlightConvenienceFee";
import FlightEditConvenienceFee from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Convenience fee/FlightEditConvenienceFee";
import FlightRemarkList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Remark List/FlightRemarkList";
import FlightRemarkEditList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Remark List/FlightRemarkEditList";
import FlightAmendmentsList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Amendments List/FlightAmendmentsList";
import FlightSearchHistory from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Flight Search History/FlightSearchHistory";
import PendingAirlinesList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Pending Airline List/PendingAirlinesList";
import PendingAirlinesEditList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Pending Airline List/PendingAirlinesEditList";
import FlightAllowedFareType from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Allowed Fare type/FlightAllowedFareType";
import AirlineWebCheckLink from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Airline Web Check Link/AirlineWebCheckLink";
import AirlineBrandList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/AIRLINE BRANDS/AirlineBrandList";
import FlightMarkupList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/B2C Flight Markup/FlightMarkupList";
import FlightCouponList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Coupon List/FlightCoupon";
import FlightUsedCouponList from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Used Coupon List/FlightUsedCoupon";
import FlightPopularRoutes from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Flight Popular Routes/FlightPopularRoutes";
import FlightPopularDestination from "./Admin_Portal/B2C FLIGHT MANAGEMENT/Popular Destinantion/FlightPopularDestination";
import HotelDiscountList from "./Admin_Portal/B2C HOTEL MANAGEMENT/Discount List/HotelDiscountList";
import HotelCouponList from "./Admin_Portal/B2C HOTEL MANAGEMENT/Coupon List/HotelCouponList";
import HotelConvenienceFee from "./Admin_Portal/B2C HOTEL MANAGEMENT/convenience fee/HotelConvenienceFee";
import HotelGstSettings from "./Admin_Portal/B2C HOTEL MANAGEMENT/GstSettings/HotelGstSettings";
import HotelBookingList from "./Admin_Portal/HOTEL MANAGEMENT/Booking List/HotelBookingList";
import HotelCancellationList from "./Admin_Portal/HOTEL MANAGEMENT/Cancellation List/HotelCancellationList";
import HotelSearchHistory from "./Admin_Portal/HOTEL MANAGEMENT/Search History/HotelSearchHistory";
import TaxManagement from "./Admin_Portal/PAYMENT MANAGEMENT/Tax Management/TaxManagement";
import AllPages from "./Admin_Portal/PAGE MANAGEMENT/ALL PAGE LIST/AllPages";
import AddPage from "./Admin_Portal/PAGE MANAGEMENT/ADD NEW PAGE/AddPage";
import AdminMenuListPage from "./Admin_Portal/MENU MANAGEMENT/MENU LIST/MenuList";
import AdminMenuAddPage from "./Admin_Portal/MENU MANAGEMENT/ADD MENU/addmenu";
import AdminOfferListPage from "./Admin_Portal/OFFER MANAGEMENT/OFFER LIST/OfferList";
import AdminAddOfferPage from "./Admin_Portal/OFFER MANAGEMENT/ADD NEW OFFER/AddOffer";
import AdminOfferCategoryListPage from "./Admin_Portal/OFFER MANAGEMENT/OFFER CATEGORY LIST/OfferCategoryList";
import AdminAddOfferCategoryPage from "./Admin_Portal/OFFER MANAGEMENT/ADD OFFER CATEGORY/AddOfferCategory";
import { openAuthModal } from "./utils/authModalEvents";
import PaymentSettings from "./Admin_Portal/PAYMENT MANAGEMENT/Payment Settings/payment Settings";
import AdminBlogList from "./Admin_Portal/BLOG MANAGEMENT/Blog List/Admin.Bloglist";
import AdminAddBlog from "./Admin_Portal/BLOG MANAGEMENT/ADD BLOG/Admin.Addblog";
import AdminBlogSubCategoryList from "./Admin_Portal/BLOG MANAGEMENT/BLOG SUB CATEGORY LIST/Admin.SubCategorylist";
import AdminAddBlogSubCategory from "./Admin_Portal/BLOG MANAGEMENT/ADD BLOG SUB CATEGORY/Admin.AddblogSubCategory";
import AdminBlogCategoryList from "./Admin_Portal/BLOG MANAGEMENT/BLOG CATEGORY LIST/Admin.BlogCategorylist";
import AdminAddBlogCategory from "./Admin_Portal/BLOG MANAGEMENT/ADD BLOG CATEGORY/Admin.Addblogcategory";
import AdminCustomerList from "./Admin_Portal/CUSTOMER MANAGEMENT/CUSTOMER LIST/Admin.Customerlist";
import AdminAddNewCustomer from "./Admin_Portal/CUSTOMER MANAGEMENT/ADD NEW CUSTOMER/Admin.AddNewCustomer";
import AdminDepositRequestList from "./Admin_Portal/CUSTOMER MANAGEMENT/DEPOSITE REQUEST LIST/Admin.Depositelist";
import AdminQueryList from "./Admin_Portal/QUERY MANAGEMENT/QUERY LIST/Admin.QueryList";
import { getActiveTheme } from "./services/themeService";
import ThemesList from "./Admin_Portal/THEME MANAGEMENT/ThemesList";
import B2CHeaderTheme from "./Admin_Portal/THEME MANAGEMENT/B2CHeaderTheme";
import B2CHomeTheme from "./Admin_Portal/THEME MANAGEMENT/B2CHomeTheme";

// B2B Management Portal imports
import WalletManagement from "./Admin_Portal/B2B_MANAGEMENT/WalletManagement/WalletManagement";
import TopRoutes from "./Admin_Portal/B2B_MANAGEMENT/TopRoutes/TopRoutes";
import Settings from "./Admin_Portal/B2B_MANAGEMENT/Settings/Settings";
import Reports from "./Admin_Portal/B2B_MANAGEMENT/Reports/Reports";
import Notifications from "./Admin_Portal/B2B_MANAGEMENT/Notifications/Notifications";
import MarkupManagement from "./Admin_Portal/B2B_MANAGEMENT/MarkupManagement/MarkupManagement";
import Logs from "./Admin_Portal/B2B_MANAGEMENT/Logs/Logs";
import Ledger from "./Admin_Portal/B2B_MANAGEMENT/Ledger/Ledger";
import DepositManagement from "./Admin_Portal/B2B_MANAGEMENT/DepositManagement/DepositManagement";
import CommissionManagement from "./Admin_Portal/B2B_MANAGEMENT/CommissionManagement/CommissionManagement";
import AgentManagement from "./Admin_Portal/B2B_MANAGEMENT/AgentManagement/AgentManagement";
import AgentBookings from "./Admin_Portal/B2B_MANAGEMENT/AgentBookings/AgentBookings";
import B2CFooterTheme from "./Admin_Portal/THEME MANAGEMENT/B2CFooterTheme";
import "./STYLES/AtlasTheme.css";

const ADMIN_PATHS = {
  base: "/admin",
  login: "/admin/login",
  pin: "/admin/pin",
};

const USER_PROTECTED_PATH_PREFIXES = [
  "/bus/payment",
  "/flight/payment",
  "/hotel/payment",
  "/dashboard",
  "/edit-profile",
  "/change-password",
];

function isUserProtectedPath(pathname) {
  const normalizedPath = String(pathname || "").toLowerCase();
  return USER_PROTECTED_PATH_PREFIXES.some((prefix) =>
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );
}

function buildReturnTo(location) {
  return `${location.pathname || "/"}${location.search || ""}${location.hash || ""}`;
}

const ADMIN_MENU_ROUTES = {
  list: "menu-management/menus",
  add: "menu-management/menus/new",
};

const ADMIN_MENU_PATHS = {
  list: `${ADMIN_PATHS.base}/${ADMIN_MENU_ROUTES.list}`,
  add: `${ADMIN_PATHS.base}/${ADMIN_MENU_ROUTES.add}`,
};

const ADMIN_OFFER_ROUTES = {
  list: "offer-management/offers",
  add: "offer-management/offers/new",
  categories: "offer-management/categories",
  addCategory: "offer-management/categories/new",
};

const ADMIN_OFFER_PATHS = {
  list: `${ADMIN_PATHS.base}/${ADMIN_OFFER_ROUTES.list}`,
  add: `${ADMIN_PATHS.base}/${ADMIN_OFFER_ROUTES.add}`,
  categories: `${ADMIN_PATHS.base}/${ADMIN_OFFER_ROUTES.categories}`,
  addCategory: `${ADMIN_PATHS.base}/${ADMIN_OFFER_ROUTES.addCategory}`,
};

const HIDE_TOPBAR_PATHS = new Set([
  "/login",
  "/register",
  "/verify",
  "/verify-otp",
  "/forget",
  "/forgot-password",
  "/reset-password",
  "/resetpassword",
]);

const FORCE_FOOTER_PATHS = new Set([
  "/fetch-ticket",
  "/web-checkin",
]);

const LEGACY_REDIRECTS = [
  { from: "/Login", to: "/login" },
  { from: "/Register", to: "/register" },
  { from: "/Verify", to: "/verify" },
  { from: "/verify-otp", to: "/verify" },
  { from: "/Forget", to: "/forgot-password" },
  { from: "/forget", to: "/forgot-password" },
  { from: "/reset-password", to: "/forgot-password" },
  { from: "/resetpassword", to: "/forgot-password" },
  { from: "/Admin_login", to: ADMIN_PATHS.login },
  { from: "/Admin_Pin", to: ADMIN_PATHS.pin },
  { from: "/DataTable", to: "/" },
];

const ADMIN_PLACEHOLDER_DESCRIPTION = "This module is getting configured.";

const adminPlaceholder = (title, description = ADMIN_PLACEHOLDER_DESCRIPTION) => (
  <AdminSectionPlaceholder title={title} description={description} />
);

const FlightVoucherSettings = () => adminPlaceholder("Flight Voucher Settings");

function RequireAdmin({ children }) {
  const sanitize = (val) => {
    const text = String(val ?? "").trim();
    return (text === "undefined" || text === "null") ? "" : text;
  };

  const adminToken = sanitize(localStorage.getItem("adminToken"));
  const adminRole = sanitize(localStorage.getItem("adminRole"));

  if (adminToken && adminRole) {
    return children;
  }

  // Legacy fallback if admin keys are missing but user token and user role exist:
  const userToken = sanitize(localStorage.getItem("token"));
  const userRole = sanitize(localStorage.getItem("role"));

  let parsedUserRole = "";
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userObj = JSON.parse(userStr);
      parsedUserRole = sanitize(userObj?.role || userObj?.Role);
    }
  } catch {
    // Ignore JSON parse errors
  }

  const resolvedRole = adminRole || userRole || parsedUserRole;
  const resolvedToken = adminToken || userToken;

  if (!resolvedToken || resolvedRole !== "admin") {
    return <Navigate to={ADMIN_PATHS.login} replace />;
  }

  return children;
}

function RequireAgent({ children }) {
  const sanitize = (val) => {
    const text = String(val ?? "").trim();
    return (text === "undefined" || text === "null") ? "" : text;
  };

  const userToken = sanitize(localStorage.getItem("b2b_token"));
  const userRole = sanitize(localStorage.getItem("b2b_role"));

  let parsedUserRole = "";
  try {
    const userStr = localStorage.getItem("b2b_user");
    if (userStr) {
      const userObj = JSON.parse(userStr);
      parsedUserRole = sanitize(userObj?.role || userObj?.Role);
    }
  } catch {
    // Ignore JSON parse errors
  }

  const resolvedRole = userRole || parsedUserRole;

  if (!userToken || resolvedRole.toLowerCase() !== "agent" || isTokenExpired(userToken)) {
    localStorage.removeItem("b2b_token");
    localStorage.removeItem("b2b_role");
    localStorage.removeItem("b2b_user");
    localStorage.removeItem("b2b_userId");
    return <Navigate to="/b2b/login" replace />;
  }

  return children;
}

function BookingRouteWrapper({ element }) {
  const sanitize = (val) => {
    const text = String(val ?? "").trim();
    return (text === "undefined" || text === "null") ? "" : text;
  };
  const b2bToken = sanitize(localStorage.getItem("b2b_token"));
  const b2bRole = sanitize(localStorage.getItem("b2b_role"));
  const activePortal = sessionStorage.getItem("active_portal") || "b2c";
  const isAgent = activePortal === "b2b" && b2bToken && b2bRole.toLowerCase() === "agent" && !isTokenExpired(b2bToken);

  if (isAgent) {
    return (
      <RequireAgent>
        <B2BLayout bookingFlow={true}>{element}</B2BLayout>
      </RequireAgent>
    );
  }
  return element;
}


function AdminMenuListRoute() {
  const navigate = useNavigate();

  return <AdminMenuListPage onAddMenu={() => navigate(ADMIN_MENU_PATHS.add)} />;
}

function AdminMenuAddRoute() {
  const navigate = useNavigate();

  return <AdminMenuAddPage onBack={() => navigate(ADMIN_MENU_PATHS.list)} />;
}

function AdminOfferListRoute() {
  const navigate = useNavigate();

  return <AdminOfferListPage onAddOffer={() => navigate(ADMIN_OFFER_PATHS.add)} />;
}

function AdminOfferAddRoute() {
  const navigate = useNavigate();

  return <AdminAddOfferPage onBack={() => navigate(ADMIN_OFFER_PATHS.list)} />;
}

function AdminOfferCategoryListRoute() {
  const navigate = useNavigate();

  return <AdminOfferCategoryListPage onAddCategory={() => navigate(ADMIN_OFFER_PATHS.addCategory)} />;
}

function AdminOfferCategoryAddRoute() {
  const navigate = useNavigate();

  return <AdminAddOfferCategoryPage onBack={() => navigate(ADMIN_OFFER_PATHS.categories)} />;
}

function AuthPopupRedirect({ mode }) {
  useEffect(() => {
    openAuthModal(mode);
  }, [mode]);

  return <Navigate to="/" replace />;
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const loadColors = () => {
      try {
        const fallback = localStorage.getItem("admin_fallback_home");
        if (fallback) {
          const theme = JSON.parse(fallback);
          const root = document.documentElement;
          if (theme.primaryColor) {
            root.style.setProperty("--theme-primary", theme.primaryColor);
            root.style.setProperty("--theme-primary-strong", theme.primaryColor);
          }
          if (theme.secondaryColor) {
            root.style.setProperty("--theme-secondary", theme.secondaryColor);
          }
        }
      } catch (e) {
        console.error("Error loading theme fallback colors", e);
      }
    };

    const loadActiveTheme = async () => {
      try {
        const theme = await getActiveTheme();
        if (theme) {
          const root = document.documentElement;
          if (theme.primaryColor) root.style.setProperty("--theme-primary", theme.primaryColor);
          if (theme.primaryStrongColor) root.style.setProperty("--theme-primary-strong", theme.primaryStrongColor);
          if (theme.pageBgColor) root.style.setProperty("--theme-page", theme.pageBgColor);
          if (theme.surfaceColor) root.style.setProperty("--theme-surface", theme.surfaceColor);
          if (theme.textColor) root.style.setProperty("--theme-text", theme.textColor);
          if (theme.borderColor) root.style.setProperty("--theme-border", theme.borderColor);
        }
      } catch (err) {
        console.error("Error loading active B2C theme colors:", err);
        loadColors();
      }
    };

    loadColors();
    loadActiveTheme();

    window.addEventListener("storage", loadColors);
    return () => {
      window.removeEventListener("storage", loadColors);
    };
  }, []);

  useEffect(() => {
    const path = (location.pathname || "").toLowerCase();
    if (path.startsWith("/b2b")) {
      sessionStorage.setItem("active_portal", "b2b");
    } else if (path === "/" || path === "/home") {
      sessionStorage.setItem("active_portal", "b2c");
    }
  }, [location]);

  useEffect(() => {
    const checkSession = () => {
      const currentPath = (location.pathname || "").toLowerCase();
      const isAdmin = currentPath.startsWith("/admin");
      const loginPath = isAdmin ? "/admin/login" : "";

      // Skip checking/redirecting if already on the login path
      if (loginPath && currentPath === loginPath) {
        return;
      }

      if (isAdmin) {
        // Session timeout checks for the admin portal are removed as requested.
      } else {
        // Agents use b2b_token — never apply the B2C login guard to them
        const b2bToken = localStorage.getItem("b2b_token");
        const b2bRole = (localStorage.getItem("b2b_role") || "").toLowerCase();
        const isLoggedInAgent = b2bToken && b2bRole === "agent";
        if (isLoggedInAgent) {
          return; // Agent is authenticated via b2b_token — no B2C check needed
        }

        const token = localStorage.getItem("token");
        if (!token && isUserProtectedPath(currentPath)) {
          openAuthModal("login", { returnTo: buildReturnTo(location) });
          navigate("/", { replace: true });
          return;
        }

        if (token && isTokenExpired(token)) {
          clearExpiredUserCredentials();
          if (isUserProtectedPath(currentPath)) {
            openAuthModal("login", { returnTo: buildReturnTo(location) });
            navigate("/", { replace: true });
          }
        }
      }
    };

    checkSession();
    const intervalId = setInterval(checkSession, 5000);
    return () => clearInterval(intervalId);
  }, [location, navigate]);

  // Scroll to top of page on route or search parameter updates
  useEffect(() => {
    const rootEl = document.getElementById("root");
    if (rootEl) {
      rootEl.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  const normalizedPath = (location.pathname || "").toLowerCase();
  const isAdminPath = normalizedPath.startsWith("/admin");
  const isB2BPath = normalizedPath.startsWith("/b2b");
  
  const isAgent = localStorage.getItem("b2b_role") === "Agent";
  
  const isBookingPath =
    normalizedPath === "/web-checkin" ||
    normalizedPath === "/fetch-ticket" ||
    normalizedPath === "/print-ticket" ||
    normalizedPath.startsWith("/search/flights") ||
    normalizedPath.startsWith("/flight/search") ||
    normalizedPath.startsWith("/search/buses") ||
    normalizedPath.startsWith("/bus/search") ||
    normalizedPath.startsWith("/search/hotels") ||
    normalizedPath.startsWith("/hotel/search") ||
    normalizedPath.startsWith("/bus/seats") ||
    normalizedPath.startsWith("/bus/seat-selection") ||
    normalizedPath.startsWith("/bus/passenger-details") ||
    normalizedPath.startsWith("/bus/payment") ||
    normalizedPath.startsWith("/flight/seats") ||
    normalizedPath.startsWith("/flight/seat-selection") ||
    normalizedPath.startsWith("/flight/passenger-details") ||
    normalizedPath.startsWith("/flight/payment") ||
    normalizedPath.startsWith("/hotel/passenger-details") ||
    normalizedPath.startsWith("/hotel/payment") ||
    normalizedPath.startsWith("/booking/confirmation") ||
    normalizedPath.startsWith("/ticket/confirmation") ||
    normalizedPath.startsWith("/booking-confirmation") ||
    normalizedPath.startsWith("/ticket-confirmation");

  const isInsideB2B = isB2BPath || (isAgent && isBookingPath);
  
  const shouldHideTopbar =
    isAdminPath || isInsideB2B || HIDE_TOPBAR_PATHS.has(normalizedPath);
  const shouldShowFooter =
    !isAdminPath &&
    !isInsideB2B &&
    (FORCE_FOOTER_PATHS.has(normalizedPath) || !HIDE_TOPBAR_PATHS.has(normalizedPath));

  return (
    <>
      {!shouldHideTopbar && <Topbar />}

      <Routes>
        <Route path="/b2b/login" element={<B2BLogin />} />
        <Route path="/b2b/register" element={<B2BRegister />} />
        <Route path="/b2b/forgot-password" element={<B2BForgotPassword />} />
        <Route path="/b2b" element={<Navigate to="/b2b/dashboard" replace />} />
        <Route
          path="/b2b/dashboard"
          element={
            <RequireAgent>
              <B2BLayout />
            </RequireAgent>
          }
        >
          <Route index element={<B2BDashboard />} />
          <Route path="book" element={<B2BBookingEngine />} />
          <Route path="bookings" element={<B2BBookingsReport />} />
          <Route path="flight-bookings" element={<FlightBookings />} />
          <Route path="bus-bookings" element={<BusBookings />} />
          <Route path="hotel-bookings" element={<HotelBookings />} />
          <Route path="ledger" element={<B2BLedgerStatement />} />
          <Route path="deposit-request" element={<B2BDepositRequest />} />
          <Route path="bank-list" element={<BankList />} />
          <Route path="qr-list" element={<QRList />} />
          <Route path="traveler-list" element={<TravelerList />} />
          <Route path="my-account" element={<MyAccount />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="markup" element={<B2BMarkupSettings />} />
          <Route path="logo-management" element={<B2BLogoManagement />} />
          <Route path="print-ticket" element={<B2BPrintTicket />} />
          <Route path="*" element={<B2BDashboard />} />
        </Route>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPopupRedirect mode="login" />} />
        <Route path="/register" element={<AuthPopupRedirect mode="login" />} />
        <Route path="/verify" element={<AuthPopupRedirect mode="login" />} />
        <Route path="/forgot-password" element={<AuthPopupRedirect mode="login" />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/online/:slug" element={<LegalPage />} />
        <Route path="/legal/:slug" element={<LegalPage />} />
        <Route path="/contact-us" element={<ContactUsPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="/travel-guide" element={<BlogListPage />} />
        <Route path="/travel-guide/:slug" element={<BlogDetailPage />} />
        <Route path="/blogs" element={<BlogListPage />} />
        <Route path="/blogs/:slug" element={<BlogDetailPage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/blog/:id" element={<BlogDetailPage />} />

        <Route path="/web-checkin" element={<BookingRouteWrapper element={<WebCheckinPage />} />} />
        <Route path="/fetch-ticket" element={<BookingRouteWrapper element={<FetchTicket />} />} />
        <Route path="/print-ticket" element={<BookingRouteWrapper element={<PrintTicketPage />} />} />

        {/* Flight search & checkout variants */}
        <Route path="/search/flights" element={<BookingRouteWrapper element={<FlightSearchResults />} />} />
        <Route path="/flight/search" element={<BookingRouteWrapper element={<FlightSearchResults />} />} />
        <Route path="/flight/seats" element={<BookingRouteWrapper element={<FlightSeatSelectionPage />} />} />
        <Route path="/flight/seat-selection" element={<BookingRouteWrapper element={<FlightSeatSelectionPage />} />} />
        <Route path="/flight/passenger-details" element={<BookingRouteWrapper element={<FlightPassengerDetailsPage />} />} />
        <Route path="/flight/payment" element={<BookingRouteWrapper element={<FlightPaymentPage />} />} />

        {/* Bus search & checkout variants */}
        <Route path="/search/buses" element={<BookingRouteWrapper element={<BusSearchResults />} />} />
        <Route path="/bus/search" element={<BookingRouteWrapper element={<BusSearchResults />} />} />
        <Route path="/bus/seats" element={<BookingRouteWrapper element={<BusSeatSelectionPage />} />} />
        <Route path="/bus/seat-selection" element={<BookingRouteWrapper element={<BusSeatSelectionPage />} />} />
        <Route path="/bus/passenger-details" element={<BookingRouteWrapper element={<BusPassengerDetailsPage />} />} />
        <Route path="/bus/payment" element={<BookingRouteWrapper element={<BusPaymentPage />} />} />

        {/* Hotel search & checkout variants */}
        <Route path="/search/hotels" element={<BookingRouteWrapper element={<HotelSearchResults />} />} />
        <Route path="/hotel/search" element={<BookingRouteWrapper element={<HotelSearchResults />} />} />
        <Route path="/hotel/passenger-details" element={<BookingRouteWrapper element={<HotelPassengerDetailsPage />} />} />
        <Route path="/hotel/payment" element={<BookingRouteWrapper element={<HotelPaymentPage />} />} />

        {/* Confirmation variants */}
        <Route path="/booking/confirmation" element={<BookingRouteWrapper element={<BookingConfirmationPage />} />} />
        <Route path="/ticket/confirmation" element={<BookingRouteWrapper element={<TicketConfirmationPage />} />} />
        <Route path="/booking-confirmation" element={<BookingRouteWrapper element={<BookingConfirmationPage />} />} />
        <Route path="/ticket-confirmation" element={<BookingRouteWrapper element={<TicketConfirmationPage />} />} />

        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/change-password" element={<ChangePassword />} />

        <Route path={ADMIN_PATHS.login} element={<AdminLogin />} />
        <Route path={ADMIN_PATHS.pin} element={<AdminPin />} />
        <Route
          path={ADMIN_PATHS.base}
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route
            index
            element={<AdminDashboard />}
          />
          <Route path="b2c-bus/discounts" element={<DiscountList />} />
          <Route path="b2c-bus/discounts/new" element={<AddB2CBusDiscount />} />
          <Route path="b2c-bus/discount-list" element={<DiscountList />} />
          <Route path="b2c-bus/add-discount" element={<AddB2CBusDiscount />} />
          <Route path="b2c-bus/discount-mapping" element={<DiscountMapping />} />
          <Route path="b2c-bus/booking-list" element={<BusBookingList />} />
          <Route path="b2c-bus/cancellation-list" element={<BusCancellationList />} />
          <Route path="b2c-bus/convenience-fee" element={<BusConvenienceFee />} />
          <Route path="b2c-bus/convenience-fee/edit" element={<BusEditConvenienceFee />} />
          <Route path="b2c-bus/convenience-fee/add" element={<BusAddConvenienceFee />} />
          <Route path="b2c-bus/search-history" element={<BusSearchHistory />} />
          <Route path="b2c-bus/voucher-settings" element={<BusVoucherSettings />} />
          <Route path="b2c-bus/markup-list" element={<BusMarkupList />} />
          <Route path="b2c-bus/gst-settings" element={<BusGstSettings />} />
          <Route path="b2c-bus/coupon-list" element={<BusCouponList />} />
          <Route path="b2c-bus/used-coupon-list" element={<BusUsedCouponsList />} />
          <Route path="b2c-bus/popular-routes" element={<BusPopularRoutes />} />

          {/* B2C Flight Management */}
          <Route path="b2c-flight/discounts" element={<FlightDiscountList />} />
          <Route path="b2c-flight/discounts/new" element={<AddB2CFlightDiscount />} />
          <Route path="b2c-flight/discount-list" element={<FlightDiscountList />} />
          <Route path="b2c-flight/add-discount" element={<AddB2CFlightDiscount />} />
          <Route path="b2c-flight/booking-list" element={<FlightBookingList />} />
          <Route path="b2c-flight/cancellation-requests" element={<FlightCancelRequestList />} />
          <Route path="b2c-flight/cancellation-request-list" element={<FlightCancelRequestList />} />
          <Route path="b2c-flight/convenience-fee" element={<FlightConvenienceFee />} />
          <Route path="b2c-flight/convenience-fee/add" element={<FlightEditConvenienceFee />} />
          <Route path="b2c-flight/convenience-fee/edit" element={<FlightEditConvenienceFee />} />
          <Route path="b2c-flight/remark-list" element={<FlightRemarkList />} />
          <Route path="b2c-flight/remark-list/add" element={<FlightRemarkEditList />} />
          <Route path="b2c-flight/remark-list/edit" element={<FlightRemarkEditList />} />
          <Route path="b2c-flight/remark-edit-list" element={<FlightRemarkEditList />} />
          <Route path="b2c-flight/amendments" element={<FlightAmendmentsList />} />
          <Route path="b2c-flight/amendments-list" element={<FlightAmendmentsList />} />
          <Route path="b2c-flight/allowed-fare-types" element={<FlightAllowedFareType />} />
          <Route path="b2c-flight/allowed-fare-type" element={<FlightAllowedFareType />} />
          <Route path="b2c-flight/search-history" element={<FlightSearchHistory />} />
          <Route path="b2c-flight/pending-airlines" element={<PendingAirlinesList />} />
          <Route path="b2c-flight/pending-airlines/add" element={<PendingAirlinesEditList />} />
          <Route path="b2c-flight/pending-airlines/edit" element={<PendingAirlinesEditList />} />
          <Route path="b2c-flight/pending-airline-list" element={<PendingAirlinesList />} />
          <Route path="b2c-flight/pending-airline-edit-list" element={<PendingAirlinesEditList />} />
          <Route path="b2c-flight/airline-webcheck-links" element={<AirlineWebCheckLink />} />
          <Route path="b2c-flight/airline-webcheck-link" element={<AirlineWebCheckLink />} />
          <Route path="b2c-flight/airline-brands" element={<AirlineBrandList />} />
          <Route path="b2c-flight/markup" element={<FlightMarkupList />} />
          <Route path="b2c-flight/markup-list" element={<FlightMarkupList />} />
          <Route path="b2c-flight/coupon-list" element={<FlightCouponList />} />
          <Route path="b2c-flight/used-coupon-list" element={<FlightUsedCouponList />} />
          <Route path="b2c-flight/popular-routes" element={<FlightPopularRoutes />} />
          <Route path="b2c-flight/popular-destinations" element={<FlightPopularDestination />} />
          <Route path="b2c-flight/popular-destination" element={<FlightPopularDestination />} />
          <Route path="b2c-flight/voucher-settings" element={<FlightVoucherSettings />} />

          {/* B2C Hotel Management */}
          <Route path="b2c-hotel/discount-list" element={<HotelDiscountList />} />
          <Route path="b2c-hotel/coupon-list" element={<HotelCouponList />} />
          <Route path="b2c-hotel/convenience-fee" element={<HotelConvenienceFee />} />
          <Route path="b2c-hotel/add-convenience-fee" element={<HotelEditConvenienceFee />} />
          <Route path="b2c-hotel/gst-settings" element={<HotelGstSettings />} />
          <Route path="b2c-hotel/voucher-settings" element={<HotelVoucherSettings />} />

          {/* Hotel Management */}
          <Route path="hotel-management/booking-list" element={<HotelBookingList />} />
          <Route path="hotel-management/cancellation-list" element={<HotelCancellationList />} />
          <Route path="hotel-management/search-history" element={<HotelSearchHistory />} />
          <Route path="hotel-management/discounts" element={<HotelDiscountList />} />
          <Route path="hotel-management/coupon-list" element={<HotelCouponList />} />
          <Route path="hotel-management/convenience-fee" element={<HotelConvenienceFee />} />
          <Route path="hotel-management/gst-settings" element={<HotelGstSettings />} />
          <Route path="hotel-management/popular-destinations" element={<HotelPopularDestinations />} />

          {/* Page Management */}
          <Route path="page-management/pages" element={<AllPages />} />
          <Route path="page-management/pages/new" element={<AddPage />} />
          <Route path="page-management/all-pages" element={<AllPages />} />
          <Route path="page-management/add-page" element={<AddPage />} />
          <Route path="page-management/about-us" element={<AdminAboutUsPage />} />

          {/* Menu Management */}
          <Route path={ADMIN_MENU_ROUTES.list} element={<AdminMenuListRoute />} />
          <Route path={ADMIN_MENU_ROUTES.add} element={<AdminMenuAddRoute />} />

          {/* Offer Management */}
          <Route path={ADMIN_OFFER_ROUTES.list} element={<AdminOfferListRoute />} />
          <Route path={ADMIN_OFFER_ROUTES.add} element={<AdminOfferAddRoute />} />
          <Route path={ADMIN_OFFER_ROUTES.categories} element={<AdminOfferCategoryListRoute />} />
          <Route path={ADMIN_OFFER_ROUTES.addCategory} element={<AdminOfferCategoryAddRoute />} />

          <Route path="AllPages" element={<Navigate to="page-management/pages" replace />} />
          <Route path="AddPage" element={<Navigate to="page-management/pages/new" replace />} />
          <Route path="payment-management/tax-management" element={<TaxManagement />} />
          <Route path="payment-management/payment-setting" element={<PaymentSettings />} />
          <Route path="payment-management/payment-settings" element={<PaymentSettings />} />
          {/* Account Management */}
          <Route path="account-management/transaction-log" element={adminPlaceholder("Transaction Log")} />
          <Route path="account-management/bank-list" element={adminPlaceholder("Bank List")} />
          <Route path="account-management/qrcode-list" element={adminPlaceholder("QR Code List")} />
          <Route path="account-management/payment-upload" element={adminPlaceholder("Payment Upload")} />
          <Route path="account-management/payment-upload-list" element={adminPlaceholder("Payment Upload List")} />
          <Route path="account-management/balance-sheet" element={adminPlaceholder("Balance Sheet")} />
          {/* Blog Management */}
          <Route path="blog-management/blog-list" element={<AdminBlogList />} />
          <Route path="blog-management/add-blog" element={<AdminAddBlog />} />
          <Route path="blog-management/edit-blog/:blogId" element={<AdminAddBlog />} />
          <Route path="blog-management/blog-sub-category-list" element={<AdminBlogSubCategoryList />} />
          <Route path="blog-management/add-blog-sub-category" element={<AdminAddBlogSubCategory />} />
          <Route path="blog-management/blog-category-list" element={<AdminBlogCategoryList />} />
          <Route path="blog-management/add-blog-category" element={<AdminAddBlogCategory />} />
          {/* Customer Management */}
          <Route path="customer-management/customer-list" element={<AdminCustomerList />} />
          <Route path="customer-management/add-new-customer" element={<AdminAddNewCustomer />} />
          <Route path="customer-management/deposit-request-list" element={<AdminDepositRequestList />} />
          
          {/* B2B Management */}
          <Route path="b2b-management/agent-management" element={<AgentManagement />} />
          <Route path="b2b-management/agent-bookings" element={<AgentBookings />} />
          <Route path="b2b-management/deposit-management" element={<DepositManagement />} />
          <Route path="b2b-management/wallet-management" element={<WalletManagement />} />
          <Route path="b2b-management/ledger" element={<Ledger />} />
          <Route path="b2b-management/commission-management" element={<CommissionManagement />} />
          <Route path="b2b-management/markup-management" element={<MarkupManagement />} />
          <Route path="b2b-management/reports" element={<Reports />} />
          <Route path="b2b-management/top-routes" element={<TopRoutes />} />
          <Route path="b2b-management/notifications" element={<Notifications />} />
          <Route path="b2b-management/logs" element={<Logs />} />
          <Route path="b2b-management/settings" element={<Settings />} />

          {/* Query Management */}
          <Route path="query-management/query-list" element={<AdminQueryList />} />
          {/* Security Management */}
          <Route path="security-management/black-list-ip" element={adminPlaceholder("Black List IP")} />
          <Route path="security-management/white-list-ip" element={adminPlaceholder("White List IP")} />
          {/* Site Management */}
          <Route path="site-management/site-setting" element={adminPlaceholder("Site Setting")} />
          <Route path="site-management/social-links" element={adminPlaceholder("Social Links")} />
          <Route path="site-management/slider-image" element={adminPlaceholder("Slider Image")} />
          <Route path="site-management/add-home-slider-image" element={adminPlaceholder("Add Home Slider Image")} />
          <Route path="site-management/home-slider-2-image" element={adminPlaceholder("Home Slider 2 Image")} />
          <Route path="site-management/add-home-slider-2-image" element={adminPlaceholder("Add Home Slider 2 Image")} />
          <Route path="site-management/manual-booking-supplier" element={adminPlaceholder("Manual Booking Supplier")} />
          <Route path="site-management/meta-data-list" element={adminPlaceholder("Meta Data List")} />
          <Route path="site-management/seo-link-list" element={adminPlaceholder("SEO Link List")} />
          {/* Testimonial Management */}
          <Route path="testimonial-management/testimonial-list" element={<AdminTestimonialList />} />
          <Route path="testimonial-management/add-testimonial" element={<AdminAddTestimonial />} />
          {/* Theme Management */}
          <Route path="theme-management/b2c-header-theme" element={<B2CHeaderTheme />} />
          <Route path="theme-management/b2c-home-theme" element={<B2CHomeTheme />} />
          <Route path="theme-management/b2c-footer-theme" element={<B2CFooterTheme />} />
          <Route path="theme-management/themes-list" element={<ThemesList />} />
          <Route
            path="placeholder"
            element={adminPlaceholder(
              "Module Coming Soon",
              "This admin module is not wired yet."
            )}
          />
          <Route path="*" element={<Navigate to={ADMIN_PATHS.base} replace />} />
        </Route>

        <Route path="/data-table" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="bank-list" element={<BankList />} />
          <Route path="qr-list" element={<QRList />} />
          <Route path="deposit-request" element={<DepositRequest />} />
          <Route path="traveler-list" element={<TravelerList />} />
          <Route path="flight-bookings" element={<FlightBookings />} />
          <Route path="flight-cancel" element={<FlightCancel />} />
          <Route path="bus-bookings" element={<BusBookings />} />
          <Route path="bus-cancel" element={<BusCancel />} />
          <Route path="hotel-bookings" element={<HotelBookings />} />
          <Route path="account-statement" element={<AccountStatement />} />
          <Route path="my-account" element={<MyAccount />} />
          <Route path="edit-profile" element={<Navigate to="/edit-profile" replace />} />
          <Route path="change-password" element={<Navigate to="/change-password" replace />} />
        </Route>

        {LEGACY_REDIRECTS.map((route) => (
          <Route
            key={route.from}
            path={route.from}
            element={<Navigate to={route.to} replace />}
          />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {shouldShowFooter && <SiteFooter />}
      <AuthModal />
    </>
  );
}

function App() {
  return (
    <UserProvider>
      <PromoProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </PromoProvider>
    </UserProvider>
  );
}

export default App;
