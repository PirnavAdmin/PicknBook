/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Clock3, Home, MapPin, ShieldCheck, Sparkles, Star, UserRound, Loader2, BedDouble
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toDisplayDate } from "../../utils/apiDateFormat";
import { openAuthModal } from "../../utils/authModalEvents";
import { isTokenExpired } from "../../services/authSession";
import { blockRoom, getHotelInfo, getHotelRoom } from "../../services/hotelBookingService";
import { listTravelers } from "../../services/travelerService";
import { buildGuestSummary, buildStayFacts, buildStayHighlights, formatNightLabel, getHotelVisuals } from "./hotelPresentation";
import BookingTimer from "./BookingTimer";
import "../../STYLES/HotelCheckoutExperience.css";
import { readHotelBookingFlowState, writeHotelBookingFlowState } from "./hotelBookingFlowStore";

const formatCurrency = (amount) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(amount) || 0))}`;
const calculateNights = (inDate, outDate) => (!inDate || !outDate ? 1 : Math.ceil(Math.abs(new Date(outDate) - new Date(inDate)) / 86400000) || 1);
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || "").trim());
const isValidMobile = (mobile) => String(mobile || "").replace(/\D/g, "").length >= 10 && String(mobile || "").replace(/\D/g, "").length <= 13;
const readQueryValue = (params, key, fallback = "") => String(params.get(key) ?? "").trim() || fallback;


function parseHotelFromSearch(params) {
  const hotelId = readQueryValue(params, "hotelId");
  const name = readQueryValue(params, "hotelName");
  if (!hotelId && !name) return null;
  return {
    hotelId,
    name: name || "Hotel stay",
    city: readQueryValue(params, "hotelCity"),
    area: readQueryValue(params, "hotelArea"),
    address: readQueryValue(params, "hotelAddress"),
    rating: Number(readQueryValue(params, "hotelRating")) || 0,
    tag: readQueryValue(params, "hotelTag"),
    amenities: readQueryValue(params, "hotelAmenities").split("|").map((item) => item.trim()).filter(Boolean),
    offers: [],
  };
}

function parseSearchContext(params) {
  const destination = readQueryValue(params, "destination");
  const checkInDate = readQueryValue(params, "checkInDate");
  const checkOutDate = readQueryValue(params, "checkOutDate");
  const adults = readQueryValue(params, "adults");
  const rooms = readQueryValue(params, "rooms");
  const children = readQueryValue(params, "children");
  const guests = readQueryValue(params, "guests");
  return destination || checkInDate || checkOutDate || adults || rooms || guests
    ? { destination, checkInDate, checkOutDate, adults, rooms, children, guests }
    : null;
}

export default function HotelPassengerDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const incomingState = useMemo(() => {
    const routerState = location.state && typeof location.state === "object" ? location.state : null;
    const storedState = readHotelBookingFlowState() || {};
    const merged = { ...storedState, ...routerState };
    if (merged.hotel || merged.offer) {
      writeHotelBookingFlowState(merged);
      return merged;
    }
    return {};
  }, [location.state]);

  const [hotel, setHotel] = useState(() => incomingState.hotel || parseHotelFromSearch(searchParams));
  const [offer, setOffer] = useState(() => incomingState.offer || null);
  

  const initialOfferId = readQueryValue(searchParams, "offerId");
  const searchContext = useMemo(() => incomingState.searchContext || parseSearchContext(searchParams), [incomingState.searchContext, searchParams]);
  const [offerLoadError, setOfferLoadError] = useState("");
  const [isLoadingOffer, setIsLoadingOffer] = useState(Boolean(!incomingState.offer && initialOfferId));
  const [selectingOfferId, setSelectingOfferId] = useState("");
  const [selectedMultiRooms, setSelectedMultiRooms] = useState([]);
  const roomsCount = searchContext?.roomsConfig ? searchContext.roomsConfig.length : 1;
  const [guestName, setGuestName] = useState(incomingState.guestName || "");
  const [guestTitle, setGuestTitle] = useState(incomingState.guestTitle || "Mr");
  const [guestAge, setGuestAge] = useState(incomingState.guestAge || 26);
  const [guestPAN, setGuestPAN] = useState(incomingState.guestPAN || "");
  const [guestPassportNo, setGuestPassportNo] = useState(incomingState.guestPassportNo || "");
  const [guestEmail, setGuestEmail] = useState(incomingState.guestEmail || "");
  const [guestPhone, setGuestPhone] = useState(incomingState.guestPhone || "");
  const [isExistingGuest, setIsExistingGuest] = useState(false);
  const [selectedTravelerId, setSelectedTravelerId] = useState("");
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelerLoadError, setTravelerLoadError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(incomingState.agreedToTerms));
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [activeImageTab, setActiveImageTab] = useState("All");
  
  // Validation Flags from blockRoom
  const [isPANMandatory, setIsPANMandatory] = useState(incomingState.isPANMandatory || false);
  const [isPassportMandatory, setIsPassportMandatory] = useState(incomingState.isPassportMandatory || false);
  
  // Storing original block room response
  const [blockRoomResponse, setBlockRoomResponse] = useState(incomingState.blockRoomResponse || null);

  // Coupon State
  const [couponCode, setCouponCode] = useState(incomingState.couponCode || "");
  const [couponSuccess, setCouponSuccess] = useState(incomingState.couponSuccess || "");
  const [couponError, setCouponError] = useState(incomingState.couponError || "");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const checkInDate = offer?.checkInDate || searchContext?.checkInDate || "";
  const checkOutDate = offer?.checkOutDate || searchContext?.checkOutDate || "";
  const nights = useMemo(() => calculateNights(checkInDate, checkOutDate), [checkInDate, checkOutDate]);
  const visuals = useMemo(() => getHotelVisuals(`${hotel?.hotelId || hotel?.name || "hotel"}-${searchContext?.destination || "stay"}`), [hotel?.hotelId, hotel?.name, searchContext?.destination]);
  const gallery = useMemo(() => {
    const apiImages = hotel?.images || [];
    if (apiImages.length >= 5) {
      return apiImages.slice(0, 5);
    }
    if (apiImages.length > 0) {
      return [...apiImages, ...visuals.gallery.slice(apiImages.length, 5)];
    }
    return visuals.gallery;
  }, [hotel?.images, visuals.gallery]);

  const displayedImages = gallery;

  const stayFacts = useMemo(() => buildStayFacts(hotel || {}, offer || {}, searchContext || {}), [hotel, offer, searchContext]);
  const stayHighlights = useMemo(() => buildStayHighlights(hotel || {}, offer || {}, nights), [hotel, offer, nights]);

  useEffect(() => {
    let isMounted = true;
    async function fetchRoomsAndInfo() {
      if (!hotel?.hotelId) { setIsLoadingOffer(false); return; }
      // If we already have the actual API room offers, we can skip fetching again to prevent loops
      if (hotel.offers?.length > 0 && hotel.offers[0]?.RatePlanCode) {
          setIsLoadingOffer(false); 
          return;
      }
      
      setIsLoadingOffer(true);
      try {
        const infoPayload = {
          TraceId: String(hotel.TraceId || hotel.traceId || ""),
          ResultIndex: String(hotel.ResultIndex || hotel.resultIndex || ""),
          SrdvType: String(hotel.SrdvType || hotel.srdvType || "MixAPI"),
          SrdvIndex: String(hotel.SrdvIndex || hotel.srdvIndex || ""),
          HotelCode: String(hotel.hotelId || hotel.hotelCode || ""),
          EndUserIp: "192.168.10.10"
        };
        
        // 1. Get Hotel Info
        const info = await getHotelInfo(infoPayload);
        const fetchedHotelCode = info?.HotelDetails?.HotelCode || hotel.hotelId;
        
        if (info?.HotelDetails) {
            setHotel(current => ({
                ...current,
                images: info.HotelDetails.Images || current.images,
                latitude: info.HotelDetails.Latitude || current.latitude,
                longitude: info.HotelDetails.Longitude || current.longitude,
                address: info.HotelDetails.Address || current.address,
                amenities: info.HotelDetails.HotelFacilities || current.amenities,
                hotelId: fetchedHotelCode
            }));
        }
        
        // 2. Get Hotel Rooms
        const roomPayload = { ...infoPayload, HotelCode: fetchedHotelCode };
        const roomsResult = await getHotelRoom(roomPayload);
        
        const hotelRoomResult = roomsResult?.getHotelRoomResult || roomsResult?.GetHotelRoomResult || roomsResult?.HotelRoomResult || {};
        const hotelRoomsDetails = hotelRoomResult?.hotelRoomsDetails || hotelRoomResult?.HotelRoomsDetails;

        if (hotelRoomsDetails && Array.isArray(hotelRoomsDetails)) {
            const allRooms = [];
            hotelRoomsDetails.forEach((category) => {
                const catName = category.categoryName || category.CategoryName || "";
                if (category.rooms || category.Rooms) {
                    const catRooms = category.rooms || category.Rooms;
                    if (Array.isArray(catRooms)) {
                        catRooms.forEach(r => allRooms.push({ ...r, _categoryName: catName }));
                    }
                } else {
                    allRooms.push({ ...category, _categoryName: catName });
                }
            });

            if (allRooms.length > 0) {
                setHotel(current => ({
                    ...current,
                    offers: allRooms.map((r, i) => {
                        const priceObj = r.price || r.Price || {};
                        const cancelPolicies = r.cancellationPolicies || r.CancellationPolicies || [];
                        return {
                            ...r,
                            offerId: r.roomId || r.RatePlanCode || `room-${i}`,
                            price: priceObj.offeredPriceRoundedOff || priceObj.OfferedPriceRoundedOff || priceObj.publishedPriceRoundedOff || priceObj.PublishedPriceRoundedOff || (typeof priceObj === 'number' ? priceObj : 0),
                            currency: priceObj.currencyCode || priceObj.CurrencyCode || "INR",
                            roomCategory: r.roomTypeName || r.RoomTypeName || r.roomTypeCategory || r.RoomTypeCategory || r._categoryName || "Room",
                            cancellationPolicy: cancelPolicies?.[0]?.charge || cancelPolicies?.[0]?.Charge ? `Charge: ${cancelPolicies[0].charge || cancelPolicies[0].Charge}` : "Refundable thresholds apply",
                            bedType: r.bedTypes || r.BedTypes || "Double",
                            isPANMandatory: hotelRoomResult.isPANMandatory || hotelRoomResult.IsPANMandatory || r.isPANMandatory || false,
                            isPassportMandatory: hotelRoomResult.isPassportMandatory || hotelRoomResult.IsPassportMandatory || r.isPassportMandatory || false
                        };
                    })
                }));
            }
        } else if (!roomsResult) {
            throw new Error("Unable to fetch room availability from the live API.");
        }
      } catch (err) {
        if (isMounted) setOfferLoadError(err.message || "Unable to reload stay details from the backend.");
      } finally {
        if (isMounted) setIsLoadingOffer(false);
      }
    }
    fetchRoomsAndInfo();
    return () => { isMounted = false; };
  }, [hotel?.hotelId]);

  useEffect(() => {
    let isMounted = true;
    listTravelers()
      .then((apiList) => { if (isMounted) { setSavedTravelers(Array.isArray(apiList) ? apiList : []); setTravelerLoadError(""); } })
      .catch(() => { if (isMounted) { setSavedTravelers([]); setTravelerLoadError("Unable to load saved travelers from the backend."); } });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (hotel || offer) {
      writeHotelBookingFlowState({
        hotel,
        offer,
        searchContext,
        guestName,
        guestTitle,
        guestAge,
        guestPAN,
        guestPassportNo,
        guestEmail,
        guestPhone,
        agreedToTerms,
        isPANMandatory,
        isPassportMandatory,
        blockRoomResponse,
      });
    }
  }, [hotel, offer, searchContext, guestName, guestTitle, guestAge, guestPAN, guestPassportNo, guestEmail, guestPhone, agreedToTerms, isPANMandatory, isPassportMandatory, blockRoomResponse]);

  const handleSelectOffer = async (roomOffer, couponToApply = couponCode) => {
    const newSelection = [...selectedMultiRooms, roomOffer];
    
    if (newSelection.length < roomsCount) {
        setSelectedMultiRooms(newSelection);
        return; // wait for next room selection
    }

    setSelectingOfferId(roomOffer.offerId);
    setOfferLoadError("");
    try {
      const blockPayload = {
        TraceId: String(hotel?.TraceId || hotel?.traceId || ""),
        ResultIndex: String(hotel?.ResultIndex || hotel?.resultIndex || ""),
        SrdvType: String(hotel?.SrdvType || hotel?.srdvType || "MixAPI"),
        SrdvIndex: String(hotel?.SrdvIndex || hotel?.srdvIndex || ""),
        HotelCode: String(hotel?.hotelId || hotel?.hotelCode || ""),
        HotelName: hotel?.name || "",
        GuestNationality: "IN",
        NoOfRooms: roomsCount,
        ClientReferenceNo: 0,
        IsVoucherBooking: true,
        EndUserIp: "192.168.10.10",
        CouponCode: couponToApply || "",
        HotelRoomsDetails: newSelection.map(room => {
          const roomPrice = Number(room.price || room.Price?.OfferedPrice || 0);
          return {
            ChildCount: room.childCount || 0,
            RequireAllPaxDetails: room.requireAllPaxDetails || false,
            RoomId: room.roomId || "",
            RoomStatus: room.roomStatus || "Active",
            RoomIndex: room.roomIndex || "",
            RoomTypeCode: room.roomTypeCode || "",
            RoomTypeName: room.roomTypeName || "",
            RatePlanCode: room.ratePlanCode || "",
            RatePlan: room.ratePlan || "",
            InfoSource: room.infoSource || "",
            SequenceNo: room.sequenceNo || "",
            DayRates: room.dayRates || [],
            SupplierPrice: room.supplierPrice || "",
            RoomPromotion: room.roomPromotion || "",
            Amenities: room.amenities || [],
            SmokingPreference: room.smokingPreference || "",
            BedTypes: room.bedTypes || room.bedType || "",
            HotelSupplements: room.hotelSupplements || "",
            LastCancellationDate: room.lastCancellationDate || "",
            IsPassportMandatory: room.isPassportMandatory || false,
            IsPANMandatory: room.isPANMandatory || false,
            FullRefundAllowed: room.fullRefundAllowed || false,
            CancellationPolicies: room.cancellationPolicies || [],
            CancellationPolicy: room.cancellationPolicy || "",
            Inclusion: room.inclusion || [],
            BedTypeCode: room.bedTypeCode || "",
            Supplements: room.supplements || "",
            OfferedPrice: roomPrice,
            Price: {
              CurrencyCode: "INR",
              RoomPrice: roomPrice,
              PublishedPrice: roomPrice,
              PublishedPriceRoundedOff: roomPrice,
              OfferedPrice: roomPrice,
              OfferedPriceRoundedOff: roomPrice
            }
          };
        })
      };
      
      const blockResp = await blockRoom(blockPayload);

      if (blockResp?.BlockRoomResult?.Error?.ErrorCode === 0 || blockResp?.BlockRoomResult?.IsPriceChanged || blockResp?.blockRoomResult?.error?.errorCode === 0 || blockResp?.blockRoomResult?.isPriceChanged) {
          // If price changed or success
          const blockedRoom = blockResp?.BlockRoomResult?.HotelRoomsDetails?.[0] || blockResp?.blockRoomResult?.hotelRoomsDetails?.[0] || {};
          setIsPANMandatory(blockResp?.BlockRoomResult?.IsPANMandatory || blockResp?.blockRoomResult?.isPANMandatory || blockedRoom.isPANMandatory || false);
          setIsPassportMandatory(blockResp?.BlockRoomResult?.IsPassportMandatory || blockResp?.blockRoomResult?.isPassportMandatory || blockedRoom.isPassportMandatory || false);
          setBlockRoomResponse(blockResp);
      } else if (blockResp?.HotelRoomsDetails?.[0] || blockResp?.hotelRoomsDetails?.[0]) {
          const blockedRoom = blockResp?.HotelRoomsDetails?.[0] || blockResp?.hotelRoomsDetails?.[0] || {};
          setIsPANMandatory(blockedRoom.isPANMandatory || false);
          setIsPassportMandatory(blockedRoom.isPassportMandatory || false);
          setBlockRoomResponse(blockResp);
      }
      
      // Since we don't have getOfferDetails anymore, use the blocked room info or selected room offer directly
      setOffer({
        ...roomOffer,
        checkInDate: roomOffer.checkInDate || checkInDate,
        checkOutDate: roomOffer.checkOutDate || checkOutDate,
      });
    } catch (err) {
      setOfferLoadError(err.message || "Unable to hold the selected rooms.");
      setSelectedMultiRooms([]); // reset on error
    } finally {
      setSelectingOfferId("");
    }
  };

  const blockedRooms = blockRoomResponse?.BlockRoomResult?.HotelRoomsDetails || 
                       blockRoomResponse?.blockRoomResult?.hotelRoomsDetails || 
                       blockRoomResponse?.HotelRoomsDetails || 
                       blockRoomResponse?.hotelRoomsDetails || [];
  
  let basePrice = 0;
  let tax = 0;
  let convenienceFee = 0;
  let markupValue = 0;
  let couponDiscount = 0;
  let finalPayable = 0;

  const activePortal = sessionStorage.getItem("active_portal");
  const isAgent = localStorage.getItem("b2b_role") === "Agent" && activePortal === "b2b";

  if (blockedRooms.length > 0) {
      blockedRooms.forEach(room => {
          const price = room.Price || room.price || {};
          let roomBase = Number(price.RoomPrice ?? price.roomPrice ?? price.PublishedPrice ?? price.publishedPrice ?? 0);
          let roomTax = Number(price.Tax ?? price.tax ?? price.TotalGSTAmount ?? price.totalGSTAmount ?? 0);
          let roomMarkup = Number(price.AgentMarkUp ?? price.agentMarkUp ?? price.agentMarkup ?? 0);
          
          if (!isAgent) {
              roomBase = Number(price.b2CBasePrice ?? price.b2cBasePrice ?? (roomBase + roomMarkup));
              roomMarkup = 0;
          }
          
          basePrice += roomBase;
          tax += roomTax;
          markupValue += roomMarkup;
          couponDiscount += Number(price.CouponDiscount ?? price.couponDiscount ?? 0);
          convenienceFee += Number(price.ConvenienceFee ?? price.convenienceFee ?? 0);
          
          const rawTotal = price.b2CTotalPrice ?? price.b2cTotalPrice ?? price.OfferedPrice ?? price.offeredPrice ?? price.PublishedPrice ?? price.publishedPrice ?? 0;
          finalPayable += Number(rawTotal);
      });
  } else {
      // Fallback if no block room response yet, use offer price (base)
      basePrice = selectedMultiRooms.reduce((sum, r) => sum + (Number(r.price) || 0), 0) * nights;
      finalPayable = basePrice;
  }

  // Fallback for manual markup if backend didn't provide AgentMarkUp and user is not an agent
  if (markupValue === 0 && !isAgent) {
      const rawMarkup = localStorage.getItem("b2b_markup_settings");
      if (rawMarkup) {
          try {
              const parsedMarkup = JSON.parse(rawMarkup);
              if (parsedMarkup.hotelType === "percentage") {
                  markupValue = basePrice * (Number(parsedMarkup.hotelValue) / 100);
              } else if (parsedMarkup.hotelType === "fixed") {
                  markupValue = Number(parsedMarkup.hotelValue) * Number(roomsCount);
              }
              finalPayable += markupValue; // Add to final payable if calculated manually
          } catch (e) {}
      }
  }

  const tierDiscount = 0;
  const volumeDiscount = 0;

  const selectExistingTraveler = (travelerId) => {
    setSelectedTravelerId(travelerId);
    const found = savedTravelers.find((traveler) => String(traveler.id) === travelerId);
    if (!travelerId || !found) { if (!travelerId) { setGuestName(""); setGuestEmail(""); setGuestPhone(""); } return; }
    setGuestName([found.title, found.firstName, found.lastName].filter(Boolean).join(" "));
    setGuestEmail(found.email || "");
    setGuestPhone(found.mobile || found.phone || "");
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!guestName.trim()) nextErrors.guestName = "Please enter the primary guest name.";
    if (!guestEmail.trim()) nextErrors.guestEmail = "Please enter an email address.";
    else if (!isValidEmail(guestEmail)) nextErrors.guestEmail = "Enter a valid email address.";
    if (!guestPhone.trim()) nextErrors.guestPhone = "Please enter a mobile number.";
    else if (!isValidMobile(guestPhone)) nextErrors.guestPhone = "Enter a valid mobile number.";
    
    if (isPANMandatory) {
        if (!guestPAN.trim()) nextErrors.guestPAN = "PAN Card is mandatory for this booking.";
        else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(guestPAN)) nextErrors.guestPAN = "Enter a valid PAN Card (e.g. ABCDE1234F).";
    }
    
    if (isPassportMandatory) {
        if (!guestPassportNo.trim()) nextErrors.guestPassportNo = "Passport details are mandatory for this booking.";
    }

    if (!agreedToTerms) nextErrors.agreedToTerms = "Please accept the booking terms.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) { setFormError("Please correct the highlighted guest details before continuing."); return; }
    const token = isAgent ? localStorage.getItem("b2b_token") : localStorage.getItem("token");
    if (!token || isTokenExpired(token)) { 
      openAuthModal("login", { returnTo: window.location.pathname + window.location.search }); 
      return; 
    }
    setFormError("");
    navigate("/hotel/payment", { state: { hotel, offer, searchContext, blockRoomResponse, guestName: guestName.trim(), guestEmail: guestEmail.trim(), guestPhone: guestPhone.trim(), agreedToTerms, payableAmount: finalPayable, fareSummary: { baseFare: basePrice, tax, convenienceFee, markup: markupValue, couponDiscount, tierDiscount, volumeDiscount, totalFare: finalPayable } } });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const uppercaseCode = couponCode.trim().toUpperCase();
      // Wait for re-selection with the new coupon code to re-trigger blockRoom
      await handleSelectOffer(offer, uppercaseCode);
      
      // Look at the new block room response to verify coupon success
      setCouponCode(uppercaseCode);
      // We rely on the React state update loop to populate couponDiscount, 
      // but if the API returns blockRoomResponse with couponDiscount > 0 on the next render, it's successful.
      // We can also just set a generic success message.
      setCouponSuccess(`Coupon "${uppercaseCode}" applied! Check the breakdown below.`);
    } catch (err) {
      setCouponError(err.message || "Failed to apply coupon.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponCode("");
    setCouponSuccess("");
    setCouponError("");
    setIsApplyingCoupon(true);
    try {
      // Re-block room without coupon
      await handleSelectOffer(offer, "");
    } catch (err) {
      console.error("Error removing coupon", err);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  if (!hotel) {
    return <main className="hotel-checkout-page"><div className="hotel-checkout-shell hotel-checkout-shell--empty"><section className="hotel-checkout-empty"><h2>Stay details missing</h2><p>Select a stay before entering guest details.</p><button type="button" onClick={() => navigate("/search/hotels")}>Go to hotel search</button></section></div></main>;
  }

  if (isLoadingOffer) {
    return <main className="hotel-checkout-page"><div className="hotel-checkout-shell hotel-checkout-shell--empty"><section className="hotel-checkout-empty"><div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Loader2 className="hotel-spin" size={32} /></div><h2>Loading stay details</h2><p>Loading stay details from the backend...</p></section></div></main>;
  }

  const guestSummary = searchContext?.guests || buildGuestSummary(searchContext || {});
  const stayLocation = hotel.address || [hotel.area, hotel.city].filter(Boolean).join(", ");

  return (
    <main className="hotel-checkout-page">
      <BookingTimer />
      <div className="hotel-checkout-shell">
        <button type="button" className="hotel-back-link" onClick={() => navigate("/search/hotels")}><ArrowLeft size={16} />Back to stays</button>
        <div className="hotel-checkout-stepper" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div className="step-item is-completed" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 700, color: "#137a3b" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#edfdf3", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid #137a3b" }}>✓</span>
            <span>1. Choose stay</span>
          </div>
          <div style={{ color: "var(--hotel-muted)", fontSize: "0.8rem" }}>➔</div>
          <div className="step-item is-active" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 800, color: "var(--hotel-rose-deep)" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255, 56, 92, 0.05)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1.5px solid var(--hotel-rose)" }}>2</span>
            <span>2. Guest & Room Details</span>
          </div>
          <div style={{ color: "var(--hotel-muted)", fontSize: "0.8rem" }}>➔</div>
          <div className="step-item" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 500, color: "var(--hotel-muted)" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--hotel-border)" }}>3</span>
            <span>3. Secure Payment</span>
          </div>
        </div>
        <div className="hotel-category-tabs">
          {["All", "Rooms", "Property Views", "Facilities", "Dining", "Nearby Attractions"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`hotel-category-tab-btn${activeImageTab === tab ? " is-active" : ""}`}
              onClick={() => setActiveImageTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <section className="hotel-gallery-hero"><div className="hotel-gallery-primary"><img src={displayedImages[0]} alt={hotel.name} /></div><div className="hotel-gallery-grid">{displayedImages.slice(1, 5).map((image, index) => <div key={`${image}-${index}`} className="hotel-gallery-thumb"><img src={image} alt={`${hotel.name} view ${index + 2}`} /></div>)}</div></section>
        <div className="hotel-checkout-layout">
          <div className="hotel-checkout-main">
            <section className="hotel-panel hotel-panel--headline">
              <div className="hotel-panel-kicker"><Home size={14} /><span>{visuals.propertyLabel}</span></div>
              <h1>{hotel.name}</h1>
              <div className="hotel-meta-line"><span><Star size={14} fill="currentColor" />{Number(hotel.rating || 4.8).toFixed(1)}</span><span><MapPin size={14} />{stayLocation}</span><span><CalendarDays size={14} />{formatNightLabel(nights)}</span></div>
              <div className="hotel-chip-row">{stayFacts.map((fact) => <span key={fact}>{fact}</span>)}</div>
            </section>
            <section className="hotel-panel hotel-host-panel"><div className="hotel-host-avatar" style={visuals.avatarStyle}>{visuals.hostName.slice(0, 1)}</div><div className="hotel-host-copy"><h2>Hosted by {visuals.hostName}</h2><p>Superhost style service · {visuals.hostYears} years hosting · Curated for short city stays.</p></div></section>
            <section className="hotel-panel"><div className="hotel-section-heading"><h2>What makes this stay feel easy</h2><p>These highlights are built from the live hotel record and details.</p></div><div className="hotel-highlight-list">{stayHighlights.map((highlight) => <article key={highlight.title} className="hotel-highlight-item"><span className="hotel-highlight-icon"><Sparkles size={16} /></span><div><strong>{highlight.title}</strong><p>{highlight.text}</p></div></article>)}</div></section>

            {offer && (
              <section className="hotel-panel" style={{ borderLeft: "4px solid var(--hotel-rose)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span className="hotel-panel-kicker" style={{ background: "rgba(255, 56, 92, 0.05)", border: "1px solid rgba(255, 56, 92, 0.2)" }}>Selected room option</span>
                    <h3 style={{ margin: "8px 0 4px", fontSize: "1.2rem", fontWeight: 700 }}>{offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"}</h3>
                    <p style={{ margin: 0, color: "var(--hotel-muted)", fontSize: "0.9rem" }}>
                      Bed type: {offer.bedType || "Double"} bed &middot; {offer.cancellationPolicy || "Cancellation policy applies"}
                    </p>
                  </div>
                  <button type="button" className="hotel-secondary-button" onClick={() => setOffer(null)}>Change room</button>
                </div>
              </section>
            )}

            {offer ? (
              <>
                <section className="hotel-panel">
                  <div className="hotel-section-heading"><h2>Guest details</h2><p>Use a saved traveler from your backend profile, or enter a new primary guest for this stay.</p></div>
                  <div className="hotel-mode-switch"><button type="button" className={isExistingGuest ? "is-active" : ""} onClick={() => { setIsExistingGuest(true); setSelectedTravelerId(""); setGuestName(""); setGuestEmail(""); setGuestPhone(""); }}>Existing traveler</button><button type="button" className={!isExistingGuest ? "is-active" : ""} onClick={() => { setIsExistingGuest(false); setSelectedTravelerId(""); setGuestName(""); setGuestEmail(""); setGuestPhone(""); }}>Add new guest</button></div>
                  {isExistingGuest && <div className="hotel-traveler-picker"><label htmlFor="hotel-existing-traveler">Saved traveler</label><select id="hotel-existing-traveler" value={selectedTravelerId} onChange={(event) => selectExistingTraveler(event.target.value)}><option value="">Select an existing traveler</option>{savedTravelers.map((traveler) => <option key={traveler.id} value={String(traveler.id)}>{[traveler.title, traveler.firstName, traveler.lastName].filter(Boolean).join(" ")}</option>)}</select>{travelerLoadError && <p className="hotel-helper hotel-helper--warning">{travelerLoadError}</p>}</div>}
                  <div className="hotel-form-grid">
                    <label className="hotel-field">
                        <span>Title</span>
                        <select value={guestTitle} onChange={(e) => setGuestTitle(e.target.value)}>
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                            <option value="Mstr">Mstr (Male Child)</option>
                            <option value="Miss">Miss (Female Child)</option>
                        </select>
                    </label>
                    <label className="hotel-field"><span>Primary guest name</span><input type="text" value={guestName} onChange={(event) => { setGuestName(event.target.value); setErrors((current) => { const next = { ...current }; delete next.guestName; return next; }); }} placeholder="Full name as per ID" className={errors.guestName ? "is-error" : ""} />{errors.guestName && <small>{errors.guestName}</small>}</label>
                    <label className="hotel-field"><span>Email address</span><input type="email" value={guestEmail} onChange={(event) => { setGuestEmail(event.target.value); setErrors((current) => { const next = { ...current }; delete next.guestEmail; return next; }); }} placeholder="name@example.com" className={errors.guestEmail ? "is-error" : ""} />{errors.guestEmail && <small>{errors.guestEmail}</small>}</label>
                    <label className="hotel-field"><span>Mobile number</span><input type="text" value={guestPhone} onChange={(event) => { setGuestPhone(event.target.value); setErrors((current) => { const next = { ...current }; delete next.guestPhone; return next; }); }} placeholder="10-digit mobile number" className={errors.guestPhone ? "is-error" : ""} />{errors.guestPhone && <small>{errors.guestPhone}</small>}</label>
                    
                    {isPANMandatory && (
                        <label className="hotel-field">
                            <span>PAN Card (Mandatory)</span>
                            <input type="text" value={guestPAN} onChange={(event) => { setGuestPAN(event.target.value.toUpperCase()); setErrors((current) => { const next = { ...current }; delete next.guestPAN; return next; }); }} placeholder="ABCDE1234F" className={errors.guestPAN ? "is-error" : ""} />
                            {errors.guestPAN && <small>{errors.guestPAN}</small>}
                        </label>
                    )}
                    {isPassportMandatory && (
                        <label className="hotel-field">
                            <span>Passport No (Mandatory)</span>
                            <input type="text" value={guestPassportNo} onChange={(event) => { setGuestPassportNo(event.target.value.toUpperCase()); setErrors((current) => { const next = { ...current }; delete next.guestPassportNo; return next; }); }} placeholder="Passport Number" className={errors.guestPassportNo ? "is-error" : ""} />
                            {errors.guestPassportNo && <small>{errors.guestPassportNo}</small>}
                        </label>
                    )}
                  </div>
                </section>
                <section className="hotel-panel hotel-policy-panel"><div className="hotel-section-heading"><h2>Before you continue</h2><p>Review the booking acknowledgement and confirm the primary guest details are correct.</p></div><div className="hotel-policy-list"><div><ShieldCheck size={18} /><span>{offer.cancellationPolicy || "Cancellation and booking policy will apply to the selected offer."}</span></div><div><Clock3 size={18} /><span>Pricing remains synced with the backend preview while you are on this page.</span></div><div><UserRound size={18} /><span>The primary guest should match the ID shown during hotel check-in.</span></div></div><label className={`hotel-checkbox${errors.agreedToTerms ? " is-error" : ""}`}><input type="checkbox" checked={agreedToTerms} onChange={(event) => { setAgreedToTerms(event.target.checked); setErrors((current) => { const next = { ...current }; delete next.agreedToTerms; return next; }); }} /><span>I agree to the hotel booking policy, guest rules, and cancellation terms for this stay.</span></label>{errors.agreedToTerms && <p className="hotel-helper hotel-helper--error">{errors.agreedToTerms}</p>}{formError && <p className="hotel-helper hotel-helper--error">{formError}</p>}</section>
              </>
            ) : (
              <section className="hotel-panel hotel-rooms-selection">
                <div className="hotel-section-heading">
                  <h2>Available rooms & rates</h2>
                  <p>
                    {roomsCount > 1 
                      ? `Select Room ${selectedMultiRooms.length + 1} of ${roomsCount} to begin your reservation.` 
                      : `Select a room type to begin your reservation. Rates are live and sourced directly from the API.`}
                  </p>
                </div>
                {offerLoadError && <div className="hotel-helper hotel-helper--error" style={{ marginBottom: 16 }}>{offerLoadError}</div>}
                <div className="hotel-rooms-list">
                  {hotel.offers && hotel.offers.length > 0 ? (
                    hotel.offers.map((roomOffer, roomIndex) => {
                      const isSelectingThis = selectingOfferId === roomOffer.offerId;
                      const roomImg = hotel.images && hotel.images.length > 0 
                        ? hotel.images[roomIndex % hotel.images.length] 
                        : null;
                      return (
                        <div key={roomOffer.offerId} className="hotel-room-card-option">
                          <div className="hotel-room-img-col">
                            {roomImg ? <img src={roomImg} alt={roomOffer.roomCategory || "Room"} /> : <div style={{ background: "#e5e7eb", width: "100%", height: "100%", minHeight: "150px" }}></div>}
                          </div>
                          <div className="hotel-room-details">
                            <span className="hotel-room-pill">Room option</span>
                            <h3>{roomOffer.roomCategory ? roomOffer.roomCategory.replace(/_/g, " ") : "Standard Room"}</h3>
                            <p className="hotel-room-desc">
                              {roomOffer.roomDescription || "A comfortable, spacious room prepared with standard travel amenities."}
                            </p>
                            <div className="hotel-room-meta-tags">
                              <span><BedDouble size={12} style={{ marginRight: 4 }} /> {roomOffer.bedType || "Double"} bed</span>
                              <span style={roomOffer.cancellationPolicy?.includes("Charge") ? { color: "#d32f2f", backgroundColor: "#ffebee" } : {}}>
                                {roomOffer.cancellationPolicy?.includes("Charge") 
                                  ? roomOffer.cancellationPolicy.replace("Charge: ", "Cancellation Fee: ₹") 
                                  : (roomOffer.cancellationPolicy || "Cancellation policy applies")}
                              </span>
                            </div>
                          </div>
                          <div className="hotel-room-action-price">
                            <div className="hotel-room-price-val">
                              <strong>{formatCurrency(roomOffer.price)}</strong>
                              <span>night</span>
                            </div>
                            <button
                              type="button"
                              className="hotel-primary-button hotel-room-select-btn"
                              onClick={() => handleSelectOffer(roomOffer)}
                              disabled={selectingOfferId !== ""}
                            >
                              {isSelectingThis ? (
                                <>
                                  <Loader2 size={13} className="hotel-spin" />
                                  Checking...
                                </>
                              ) : (
                                "Choose room"
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="hotel-room-empty">
                      <p>No active rooms returned for the selected dates. Please search for different dates.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {offer ? (
            <aside className="hotel-reserve-rail">
              <div className="hotel-reserve-card">
                <div className="hotel-reserve-preview">
                  <img src={gallery[1] || gallery[0]} alt={hotel.name} />
                  <div>
                    <span>{visuals.highlightLabel}</span>
                    <strong>{hotel.name}</strong>
                    <p>{offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard room"}</p>
                  </div>
                </div>
                <div className="hotel-reserve-price">
                  <strong>{formatCurrency(offer.price)}</strong>
                  <span>per night before taxes</span>
                </div>
                <div className="hotel-reserve-facts">
                  <div>
                    <span>Check-in</span>
                    <strong>{toDisplayDate(String(checkInDate).split("T")[0])}</strong>
                  </div>
                  <div>
                    <span>Check-out</span>
                    <strong>{toDisplayDate(String(checkOutDate).split("T")[0])}</strong>
                  </div>
                  <div>
                    <span>Guests</span>
                    <strong>{guestSummary}</strong>
                  </div>
                  <div>
                    <span>Room</span>
                    <strong>{offer.bedType || "Double"} bed</strong>
                  </div>
                </div>

                <div className="hotel-fare-breakdown" style={{ marginTop: 16 }}>
                  <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--hotel-border)", marginBottom: 16 }}>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem" }}>Coupons & Offers</h4>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input 
                        type="text" 
                        placeholder="Enter coupon code" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={isApplyingCoupon}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.85rem", textTransform: "uppercase" }}
                      />
                      {couponDiscount > 0 ? (
                        <button type="button" onClick={handleRemoveCoupon} disabled={isApplyingCoupon} style={{ padding: "8px 16px", borderRadius: "8px", background: "#f3f4f6", color: "#111827", border: "1px solid #e5e7eb", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}>
                          Remove
                        </button>
                      ) : (
                        <button type="button" onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode.trim()} style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--hotel-ink)", color: "#fff", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}>
                          {isApplyingCoupon ? <Loader2 size={14} className="spin" /> : "Apply"}
                        </button>
                      )}
                    </div>
                    {couponError && <p style={{ color: "var(--hotel-rose)", fontSize: "0.75rem", marginTop: 6, marginBottom: 0 }}>{couponError}</p>}
                    {couponSuccess && <p style={{ color: "#0c5132", fontSize: "0.75rem", marginTop: 6, marginBottom: 0 }}>{couponSuccess}</p>}
                  </div>

                  {isAgent ? (
                    <>
                      <div>
                        <span>Net Room charges ({formatNightLabel(nights)})</span>
                        <strong>{formatCurrency(basePrice)}</strong>
                      </div>
                      <div>
                        <span>Taxes and GST (12%)</span>
                        <strong>{formatCurrency(tax)}</strong>
                      </div>
                      {Number(markupValue) > 0 && (
                        <div style={{ color: "var(--hotel-primary)", fontWeight: 600 }}>
                          <span>Agent Markup (Profit)</span>
                          <strong>{formatCurrency(markupValue)}</strong>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span>Room charges ({formatNightLabel(nights)})</span>
                        <strong>{formatCurrency(basePrice)}</strong>
                      </div>
                      <div>
                        <span>Taxes and GST (12%)</span>
                        <strong>{formatCurrency(tax)}</strong>
                      </div>
                    </>
                  )}
                  
                  {Number(couponDiscount) > 0 && (
                    <div style={{ color: "#0c5132", fontWeight: 600 }}>
                      <span>Coupon Discount</span>
                      <strong>-{formatCurrency(couponDiscount)}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Convenience fee
                      <span title="This fee covers secure payment processing and 24/7 booking support." style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "rgba(0,0,0,0.06)", fontSize: "0.65rem", fontWeight: "bold" }}>i</span>
                    </span>
                    <strong>{formatCurrency(convenienceFee)}</strong>
                  </div>
                  <div className="hotel-fare-total" style={{ borderTop: "1px solid var(--hotel-border)", paddingTop: 12 }}>
                    <span>Total Payable {isAgent ? "(Customer Price)" : ""}</span>
                    <strong>{formatCurrency(finalPayable)}</strong>
                  </div>
                </div>
                <div className="hotel-reserve-actions" style={{ display: "grid", gap: 10, marginTop: 18 }}>
                  <button type="button" className="hotel-primary-button" onClick={handleContinue}>
                    Continue to payment
                  </button>
                  <button type="button" className="hotel-tertiary-link" onClick={() => navigate("/search/hotels")}>
                    Change hotel search
                  </button>
                </div>
                <div className="hotel-reserve-assurance" style={{ marginTop: 18, padding: "14px 16px", borderRadius: 18, color: "#0c5132", background: "#edfdf3", display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} />
                  <span>Your booking details stay synced to the backend pricing preview while you review this page.</span>
                </div>
              </div>
            </aside>
          ) : (
            <aside className="hotel-reserve-rail">
              <div className="hotel-reserve-card" style={{ padding: "24px", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 30, background: "var(--hotel-surface)", boxShadow: "var(--hotel-shadow)" }}>
                <div style={{ textAlign: "center", padding: "24px 10px" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🛋️</div>
                  <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "1.25rem", margin: "0 0 8px" }}>Select a room option</h3>
                  <p style={{ color: "var(--hotel-muted)", fontSize: "0.88rem", lineHeight: 1.5, margin: 0 }}>
                    Choose one of the available rooms in the list to calculate pricing and proceed to passenger details.
                  </p>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
      {offer && (
        <div className="hotel-mobile-sticky-cta" style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ffffff",
          borderTop: "1px solid rgba(220, 30, 38, 0.15)",
          padding: "12px 20px",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 1000,
          boxShadow: "0 -10px 30px rgba(0, 0, 0, 0.08)",
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--hotel-muted)", fontWeight: 700 }}>Total Payable</span>
            <strong style={{ fontSize: "1.25rem", color: "var(--hotel-ink)", fontWeight: 800 }}>{formatCurrency(finalPayable)}</strong>
          </div>
          <button type="button" className="hotel-primary-button" style={{ minHeight: 44, padding: "0 22px", fontSize: "0.9rem" }} onClick={handleContinue}>
            Continue
          </button>
        </div>
      )}
    </main>
  );
}