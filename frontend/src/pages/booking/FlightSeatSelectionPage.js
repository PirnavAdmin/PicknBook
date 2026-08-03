import React, { useEffect, useMemo, useState } from "react";
import {
  Info,
  Loader2,
  Utensils,
  Check,
  X,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../STYLES/FlightBookingFlow.css";
import { getFlightSeatMap, getSSR } from "../../services/flightBookingService";
import {
  readFlightBookingFlowState,
  writeFlightBookingFlowState,
} from "./flightBookingFlowStore";

function parseTravellerSummary(summary) {
  const text = String(summary || "");
  const adults = Number((text.match(/(\d+)\s*Adult/i) || [])[1] || 1);
  const children = Number((text.match(/(\d+)\s*Child/i) || [])[1] || 0);
  const infants = Number((text.match(/(\d+)\s*Infant/i) || [])[1] || 0);

  return {
    adults,
    children,
    infants,
    seatRequired: Math.max(1, adults + children),
  };
}

function getZoneName(travelClass) {
  const normalized = String(travelClass || "Economy").toLowerCase();

  if (normalized.includes("first")) {
    return "First Suite";
  }

  if (normalized.includes("business")) {
    return "Business Cabin";
  }

  if (normalized.includes("premium economy")) {
    return "Premium Economy";
  }

  return "Economy Cabin";
}

function parseSeatCode(seatCode) {
  const match = String(seatCode || "")
    .trim()
    .toUpperCase()
    .match(/^(\d+)([A-Z]+)$/);

  if (!match) {
    return null;
  }

  return {
    rowNumber: Number(match[1]),
    seatLetter: match[2],
    label: `${match[1]}${match[2]}`,
  };
}

function getSeatType(seatLetter, seatLetters) {
  const index = seatLetters.indexOf(seatLetter);
  if (index === 0 || index === seatLetters.length - 1) {
    return "window";
  }
  const half = Math.ceil(seatLetters.length / 2);
  if (index === half - 1 || index === half) {
    return "aisle";
  }
  return "middle";
}

function buildCabinFromSeatMap(seatMap, travelClass, activeSegmentIndex = 0) {
  if (!seatMap) return null;

  // New Parser for the Results array with Seats object structure
  const results = seatMap.results || seatMap.Results || [];
  if (Array.isArray(results) && results.length > 0) {
    const segmentResult = results[0];
    const seatsObj = segmentResult?.Seats || segmentResult?.seats;
    if (seatsObj && typeof seatsObj === "object") {
      const allSeats = [];
      Object.entries(seatsObj).forEach(([rowKey, colObj]) => {
        const rowNo = Number(rowKey.replace(/\D/g, "")) || 1;
        if (colObj && typeof colObj === "object") {
          Object.entries(colObj).forEach(([colKey, seatInfo]) => {
            if (seatInfo && typeof seatInfo === "object" && seatInfo.SeatNumber) {
              const seatNo = String(seatInfo.SeatNumber).trim().toUpperCase();
              const parsed = parseSeatCode(seatNo);
              if (parsed) {
                allSeats.push({
                  ...parsed,
                  rowNumber: rowNo,
                  price: Number(seatInfo.Amount ?? seatInfo.amount ?? 0),
                  isAvailable: !seatInfo.IsBooked,
                  isExitRow: Boolean(seatInfo.IsLegroom ?? seatInfo.isLegroom ?? false),
                  code: seatInfo.Code || seatInfo.code || ""
                });
              }
            }
          });
        }
      });

      if (allSeats.length > 0) {
        const rows = Array.from(new Set(allSeats.map((s) => s.rowNumber))).sort((a, b) => a - b);
        const seatLetters = Array.from(new Set(allSeats.map((s) => s.seatLetter))).sort();

        const seats = allSeats.map((seat) => {
          const type = getSeatType(seat.seatLetter, seatLetters);
          let status = seat.isAvailable ? "available" : "booked";
          if (seat.isAvailable && seat.isExitRow) {
            status = "extra";
          }
          return {
            id: seat.label,
            label: seat.label,
            rowNumber: seat.rowNumber,
            seatLetter: seat.seatLetter,
            price: seat.price,
            status,
            isExtraLegroom: seat.isExitRow,
            isWindow: type === "window",
            isAisle: type === "aisle",
            isMiddle: type === "middle",
            code: seat.code
          };
        });

        return {
          rows,
          seatLetters,
          extraLegroomRows: new Set(allSeats.filter((s) => s.isExitRow).map((s) => s.rowNumber)),
          zoneName: getZoneName(travelClass),
          seats,
          meta: {
            totalSeats: seats.length,
            availableSeats: seats.filter((s) => s.status !== "booked").length,
            bookedSeats: seats.filter((s) => s.status === "booked").length,
          },
        };
      }
    }
  }

  let rowList =
    seatMap.Row ||
    seatMap.row ||
    seatMap.Response?.Row ||
    seatMap.Results?.Row ||
    null;

  if (!rowList) {
    // SSR Dynamic Seats
    const dynamicArray = seatMap.Response?.SeatDynamic || seatMap.SeatDynamic;
    if (Array.isArray(dynamicArray) && dynamicArray.length > 0) {
      const dynamicItem = dynamicArray[activeSegmentIndex] || dynamicArray[0];
      if (dynamicItem?.SegmentSeat && Array.isArray(dynamicItem.SegmentSeat)) {
        const segSeat = dynamicItem.SegmentSeat[activeSegmentIndex] || dynamicItem.SegmentSeat[0];
        if (segSeat?.RowSeats) {
          rowList = segSeat.RowSeats;
        }
      }
    }
  }

  if (Array.isArray(rowList) && rowList.length > 0 && (rowList[0]?.Seats || rowList[0]?.seats)) {
    const allSeats = [];
    rowList.forEach((rowItem) => {
      const rowNo = Number(rowItem.RowNo || rowItem.rowNo || 1);
      const seatsArr = Array.isArray(rowItem.Seats || rowItem.seats) ? (rowItem.Seats || rowItem.seats) : [];
      seatsArr.forEach((seatObj) => {
        const seatNo = String(seatObj.SeatNo || seatObj.seatNo || "").trim();
        const parsed = parseSeatCode(seatNo);
        if (parsed) {
          const isAvailable = seatObj.Available !== undefined
            ? Boolean(seatObj.Available)
            : (seatObj.SeatStatusCode !== undefined
                ? String(seatObj.SeatStatusCode).toUpperCase() === "A"
                : true);
          allSeats.push({
            ...parsed,
            rowNumber: rowNo,
            price: Number(seatObj.Price ?? seatObj.price ?? 0),
            isAvailable,
            isExitRow: Boolean(seatObj.ExitRow ?? seatObj.exitRow ?? false),
            code: seatObj.Code || seatObj.code || ""
          });
        }
      });
    });

    if (allSeats.length > 0) {
      const rows = Array.from(new Set(allSeats.map((s) => s.rowNumber))).sort((a, b) => a - b);
      const seatLetters = Array.from(new Set(allSeats.map((s) => s.seatLetter))).sort();

      const seats = allSeats.map((seat) => {
        const type = getSeatType(seat.seatLetter, seatLetters);
        let status = seat.isAvailable ? "available" : "booked";
        if (seat.isAvailable && seat.isExitRow) {
          status = "extra";
        }
        return {
          id: seat.label,
          label: seat.label,
          rowNumber: seat.rowNumber,
          seatLetter: seat.seatLetter,
          price: seat.price,
          status,
          isExtraLegroom: seat.isExitRow,
          isWindow: type === "window",
          isAisle: type === "aisle",
          isMiddle: type === "middle",
          code: seat.code
        };
      });

      return {
        rows,
        seatLetters,
        extraLegroomRows: new Set(allSeats.filter((s) => s.isExitRow).map((s) => s.rowNumber)),
        zoneName: getZoneName(travelClass),
        seats,
        meta: {
          totalSeats: seats.length,
          availableSeats: seats.filter((s) => s.status !== "booked").length,
          bookedSeats: seats.filter((s) => s.status === "booked").length,
        },
      };
    }
  }

  if (Array.isArray(seatMap.seats)) {
    const parsedSeats = seatMap.seats
      .map((seat) => {
        const parsed = parseSeatCode(seat?.seatCode || seat?.seatNumber || seat?.SeatNo);
        if (!parsed) return null;
        return {
          ...parsed,
          price: Number(seat?.price || seat?.Price || 0),
          isBooked: Boolean(seat?.isBooked || (seat?.Available === false)),
        };
      })
      .filter(Boolean);

    if (parsedSeats.length === 0) return null;

    const rows = Array.from(new Set(parsedSeats.map((s) => s.rowNumber))).sort((a, b) => a - b);
    const seatLetters = Array.from(new Set(parsedSeats.map((s) => s.seatLetter))).sort();
    const extraLegroomRows = new Set(rows.length > 0 ? [rows[0]] : []);

    const seats = parsedSeats.map((seat) => {
      const isExtraLegroom = extraLegroomRows.has(seat.rowNumber);
      let status = seat.isBooked ? "booked" : isExtraLegroom ? "extra" : "available";
      const type = getSeatType(seat.seatLetter, seatLetters);

      return {
        id: seat.label,
        label: seat.label,
        rowNumber: seat.rowNumber,
        seatLetter: seat.seatLetter,
        price: seat.price,
        status,
        isExtraLegroom,
        isWindow: type === "window",
        isAisle: type === "aisle",
        isMiddle: type === "middle",
      };
    });

    return {
      rows,
      seatLetters,
      extraLegroomRows,
      zoneName: getZoneName(travelClass),
      seats,
      meta: {
        totalSeats: seats.length,
        availableSeats: seats.filter((s) => s.status !== "booked").length,
        bookedSeats: seats.filter((s) => s.status === "booked").length,
      },
    };
  }

  return null;
}



function getSeatSurcharge(seat) {
  if (!seat || seat.status === "booked") {
    return 0;
  }

  if (typeof seat.price === "number" && seat.price >= 0) {
    return seat.price;
  }

  let surcharge = 0;
  if (seat.isExtraLegroom) {
    surcharge += 999;
  } else if (seat.rowNumber <= 12) {
    surcharge += 350;
  }

  if (seat.isWindow) {
    surcharge += 250;
  } else if (seat.isAisle) {
    surcharge += 200;
  }

  return surcharge;
}

export default function FlightSeatSelectionPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readFlightBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.flight ? incomingState : persistedState || {};

  const flight = flowState.flight || null;
  const searchContext = flowState.searchContext || null;
  const travellers = parseTravellerSummary(searchContext?.travellers);
  const travelClass =
    flight?.className || searchContext?.cabinClass || "Economy";

  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  const [onwardSelectedSeatLabels, setOnwardSelectedSeatLabels] = useState(
    flowState.onwardSelectedSeatLabels || flowState.selectedSeatLabels || []
  );
  const [returnSelectedSeatLabels, setReturnSelectedSeatLabels] = useState(
    flowState.returnSelectedSeatLabels || []
  );

  const selectedSeatLabels = activeSegmentIndex === 0 ? onwardSelectedSeatLabels : returnSelectedSeatLabels;
  const setSelectedSeatLabels = activeSegmentIndex === 0 ? setOnwardSelectedSeatLabels : setReturnSelectedSeatLabels;
  const [mealPreference, setMealPreference] = useState(
    flowState.mealPreference || ""
  );
  const [baggagePlan, setBaggagePlan] = useState(flowState.baggagePlan || "");
  const [ssrData, setSsrData] = useState({
    baggage: [],
    meal: [],
    isLoading: false,
    error: "",
  });
  const [selectionError, setSelectionError] = useState("");

  useEffect(() => {
    if (!flight) return;

    let isSubscribed = true;
    setSsrData((prev) => ({ ...prev, isLoading: true, error: "" }));

    getSSR(flight)
      .then((data) => {
        if (!isSubscribed) return;
        const rawBaggage = data?.baggage || data?.Baggage || data?.Response?.Baggage || [];
        const rawMeals = data?.meal || data?.MealDynamic || data?.Meal || data?.Response?.MealDynamic || data?.Response?.Meal || [];

        const flattenList = (list) => {
          if (!Array.isArray(list)) return [];
          if (list.length > 0 && Array.isArray(list[0])) return list.flat();
          return list;
        };

        setSsrData({
          baggage: flattenList(rawBaggage),
          meal: flattenList(rawMeals),
          isLoading: false,
          error: data?.error || "",
        });
      })
      .catch((err) => {
        if (!isSubscribed) return;
        setSsrData({
          baggage: [],
          meal: [],
          isLoading: false,
          error: err.message || "Could not fetch add-on options",
        });
      });

    return () => {
      isSubscribed = false;
    };
  }, [flight]);
  const [seatMapCabin, setSeatMapCabin] = useState(null);
  const [seatMapError, setSeatMapError] = useState("");
  const [isSeatMapLoading, setIsSeatMapLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("seat");
  const [activeSeatFilter, setActiveSeatFilter] = useState(null);

  const [travelAssistanceAdded, setTravelAssistanceAdded] = useState(
    flowState.travelAssistanceAdded || false
  );
  const [zeroCancellationAdded, setZeroCancellationAdded] = useState(
    flowState.zeroCancellationAdded || false
  );
  const [activeInsuranceTerms, setActiveInsuranceTerms] = useState(null);

  const handleFilterToggle = (filterType) => {
    setActiveSeatFilter((prev) => (prev === filterType ? null : filterType));
  };

  const doesSeatMatchFilter = (seat, filter) => {
    if (!seat) return false;
    const isSelected = selectedSeatLabels.includes(seat.label);
    const isBooked = seat.status === "booked" || seat.isBooked;

    switch (filter) {
      case "middle_free":
        return seat.isMiddle && !seat.isExtraLegroom && seat.rowNumber > 12 && !isBooked && !isSelected;
      case "standard_window":
        return seat.isWindow && !seat.isExtraLegroom && seat.rowNumber > 12 && !isBooked && !isSelected;
      case "standard_aisle":
        return seat.isAisle && !seat.isExtraLegroom && seat.rowNumber > 12 && !isBooked && !isSelected;
      case "preferred":
        return !seat.isExtraLegroom && seat.rowNumber <= 12 && !isBooked && !isSelected;
      case "extra":
        return seat.isExtraLegroom && !isBooked && !isSelected;
      case "booked":
        return isBooked;
      case "selected":
        return isSelected;
      default:
        return true;
    }
  };

  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [tooltipCoords, setTooltipCoords] = useState({ x: 0, y: 0 });

  const handleSeatMouseEnter = (event, seat) => {
    const button = event.currentTarget;
    const container = button.closest(".airplane-fuselage-wrapper");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    setTooltipCoords({
      x: buttonRect.left - containerRect.left + buttonRect.width / 2,
      y: buttonRect.top - containerRect.top - 8,
    });
    setHoveredSeat(seat);
  };

  const handleSeatMouseLeave = () => {
    setHoveredSeat(null);
  };

  const getSeatCategoryName = (seat) => {
    if (seat.isExtraLegroom) {
      return "Extra Legroom Seat";
    }
    if (seat.rowNumber <= 12) {
      return "Preferred Seat";
    }
    return "Standard Seat";
  };

  const getSeatCategoryClass = (seat) => {
    if (seat.isExtraLegroom) {
      return "extra";
    }
    if (seat.rowNumber <= 12) {
      return "preferred";
    }
    return "standard";
  };

function get3LetterCode(val, fallback = "DEL") {
  if (!val) return fallback;
  const cleaned = String(val).trim();
  if (cleaned.length === 3) return cleaned.toUpperCase();
  const lower = cleaned.toLowerCase();
  if (lower.includes("chennai") || lower.includes("maa")) return "MAA";
  if (lower.includes("delhi") || lower.includes("del")) return "DEL";
  if (lower.includes("mumbai") || lower.includes("bom")) return "BOM";
  if (lower.includes("hyderabad") || lower.includes("hyd")) return "HYD";
  if (lower.includes("bengaluru") || lower.includes("bangalore") || lower.includes("blr")) return "BLR";
  if (lower.includes("kolkata") || lower.includes("ccu")) return "CCU";
  if (lower.includes("goa") || lower.includes("goi")) return "GOI";
  if (lower.includes("ahmedabad") || lower.includes("amd")) return "AMD";
  if (lower.includes("pune") || lower.includes("pnq")) return "PNQ";
  return cleaned.substring(0, 3).toUpperCase();
}

  const segments = useMemo(() => {
    if (flowState.isTwoWay && flowState.returnFlight) {
      const src1 = get3LetterCode(flight?.sourceCode || flight?.fromCity || searchContext?.source, "DEL");
      const dest1 = get3LetterCode(flight?.destinationCode || flight?.toCity || searchContext?.destination, "BOM");
      const src2 = get3LetterCode(flowState.returnFlight?.sourceCode || flowState.returnFlight?.fromCity || searchContext?.destination, "BOM");
      const dest2 = get3LetterCode(flowState.returnFlight?.destinationCode || flowState.returnFlight?.toCity || searchContext?.source, "DEL");
      return [`${src1}-${dest1}`, `${src2}-${dest2}`];
    }
    const src = get3LetterCode(flight?.sourceCode || flight?.fromCity || searchContext?.source, "DEL");
    const dest = get3LetterCode(flight?.destinationCode || flight?.toCity || searchContext?.destination, "BOM");
    if (flight && Number(flight.stops) > 0) {
      return [`${src}-DEL`, `DEL-${dest}`];
    }
    return [`${src}-${dest}`];
  }, [flight, searchContext, flowState]);

  const activeFlightForSeatMap = useMemo(() => {
    if (flowState.isTwoWay && flowState.returnFlight && activeSegmentIndex === 1) {
      return flowState.returnFlight;
    }
    return flight;
  }, [flowState, flight, activeSegmentIndex]);

  useEffect(() => {
    if (!flight) {
      return;
    }

    writeFlightBookingFlowState({
      flight,
      searchContext,
    });
  }, [flight, searchContext]);

  useEffect(() => {
    let isCurrent = true;

    const currentFlight = activeFlightForSeatMap || flight;

    if (!currentFlight?.id) {
      setSeatMapCabin(null);
      setSeatMapError("");
      setIsSeatMapLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    const flightId = String(currentFlight.id);
    if (!flightId) {
      setSeatMapCabin(null);
      setSeatMapError("");
      setIsSeatMapLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsSeatMapLoading(true);
    setSeatMapError("");

function markBookedSeatsInCabin(cabin, currentFlight) {
  if (!cabin || !Array.isArray(cabin.seats) || !currentFlight) return cabin;

  try {
    const flightNo = String(currentFlight.flightNumber || currentFlight.tripNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const ticketKeys = ["mock_tickets", "my_flight_bookings", "user_flight_tickets", "stored_tickets"];
    const bookedSeatLabels = new Set();

    ticketKeys.forEach((key) => {
      try {
        const listStr = localStorage.getItem(key);
        const list = listStr ? JSON.parse(listStr) : [];
        if (Array.isArray(list)) {
          list.forEach((ticket) => {
            const ticketFlightNo = String(ticket.tripNumber || ticket.flightNumber || ticket.providerName || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const isMatchingFlight = !flightNo || !ticketFlightNo || ticketFlightNo.includes(flightNo) || flightNo.includes(ticketFlightNo);
            if (isMatchingFlight && Array.isArray(ticket.passengers)) {
              ticket.passengers.forEach((p) => {
                const s = String(p.seatNumber || p.SeatNumber || p.seat || "").trim();
                if (s) bookedSeatLabels.add(s.toUpperCase());
              });
            }
          });
        }
      } catch {}
    });

    if (bookedSeatLabels.size > 0) {
      const updatedSeats = cabin.seats.map((seat) => {
        if (bookedSeatLabels.has(String(seat.label || seat.id || "").toUpperCase())) {
          return { ...seat, status: "booked", isBooked: true };
        }
        return seat;
      });

      return {
        ...cabin,
        seats: updatedSeats,
        meta: {
          ...cabin.meta,
          availableSeats: updatedSeats.filter((s) => s.status !== "booked").length,
          bookedSeats: updatedSeats.filter((s) => s.status === "booked").length,
        }
      };
    }
  } catch (e) {
    console.error("Error marking locally booked seats in cabin:", e);
  }

  return cabin;
}

    (async () => {
      try {
        setIsSeatMapLoading(true);
        setSeatMapError("");

        let seatMap = null;
        let cabin = null;

        try {
          seatMap = await getFlightSeatMap(currentFlight, travelClass);
          if (seatMap) {
            cabin = buildCabinFromSeatMap(seatMap, travelClass, activeSegmentIndex);
          }
        } catch (e) {
          console.warn("Primary seat map fetch failed, trying SSR fallback...", e);
        }

        // SSR Fallback if primary seat map failed or returned no cabin layout
        if (!cabin) {
          try {
            const ssrRes = await getSSR({
              traceId: currentFlight.traceId || flowState.traceId || flowState.TraceId || "",
              resultIndex: currentFlight.resultIndex || currentFlight.id || ""
            });
            if (ssrRes) {
              cabin = buildCabinFromSeatMap(ssrRes, travelClass, activeSegmentIndex);
            }
          } catch (ssrError) {
            console.warn("SSR seat layout fallback failed too:", ssrError);
          }
        }

        if (!isCurrent) {
          return;
        }

        if (!cabin) {
          setSeatMapCabin(null);
          setSeatMapError("Seat map unavailable.");
          return;
        }

        setSeatMapCabin(markBookedSeatsInCabin(cabin, currentFlight));
      } catch (error) {
        if (!isCurrent) {
          return;
        }
        setSeatMapCabin(null);
        setSeatMapError(
          error?.message || "Seat map unavailable."
        );
      } finally {
        if (isCurrent) {
          setIsSeatMapLoading(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [activeFlightForSeatMap, flight, travelClass, activeSegmentIndex, flowState.traceId, flowState.TraceId]);

  const cabinData = seatMapCabin;

  const seatsByLabel = useMemo(() => {
    const map = new Map();
    if (!cabinData || !cabinData.seats) {
      return map;
    }

    cabinData.seats.forEach((seat) => {
      map.set(seat.label, seat);
    });

    return map;
  }, [cabinData]);

  useEffect(() => {
    if (!seatMapCabin) {
      return;
    }

    const seatLookup = new Map();
    seatMapCabin.seats.forEach((seat) => {
      seatLookup.set(seat.label, seat);
    });

    setSelectedSeatLabels((previous) =>
      previous.filter((label) => {
        const seat = seatLookup.get(label);
        return seat && seat.status !== "booked";
      })
    );
  }, [seatMapCabin]);

  const selectedSeats = useMemo(
    () => selectedSeatLabels.map((label) => seatsByLabel.get(label)).filter(Boolean),
    [selectedSeatLabels, seatsByLabel]
  );

  const previousFareSummary = flowState.fareSummary || {};
  const baseFareTotal =
    Number(previousFareSummary.baseFare || 0) ||
    (Number(flight?.fare) || 0) * travellers.seatRequired;
  const seatSurcharge = selectedSeats.reduce(
    (sum, seat) => sum + getSeatSurcharge(seat),
    0
  );
  const selectedMealObj = ssrData.meal.find((m) => String(m.Code) === String(mealPreference));
  const mealFee = selectedMealObj ? Number(selectedMealObj.Price || 0) : 0;

  const selectedBaggageObj = ssrData.baggage.find((b) => String(b.Weight) === String(baggagePlan));
  const baggageFee = selectedBaggageObj ? Number(selectedBaggageObj.Price || 0) : 0;
  const tax = Number(previousFareSummary.tax || 0);
  const convenienceFee = Number(previousFareSummary.convenienceFee || 0);
  const discount = Number(previousFareSummary.discount || flowState.couponDiscount || 0);
  const assuredFee = Number(previousFareSummary.assuredFee || 0);
  const tripSecureFee = Number(previousFareSummary.tripSecureFee || flowState.tripSecureFee || 0);
  const passengerCount = flowState.passengers?.length || travellers.seatRequired || 1;
  const travelAssistanceFee = travelAssistanceAdded ? 189 * passengerCount : 0;
  const zeroCancellationFee = zeroCancellationAdded ? 499 * passengerCount : 0;
  const totalFare =
    baseFareTotal +
    seatSurcharge +
    mealFee +
    baggageFee +
    tax +
    convenienceFee +
    assuredFee +
    travelAssistanceFee +
    zeroCancellationFee +
    tripSecureFee -
    discount;

  if (!flight) {
    return (
      <main className="flight-flow-page">
        <div className="flight-flow-shell">
          <section className="flight-flow-empty">
            <h2>Select a flight first</h2>
            <p>Open flight results and click Book Now to start the booking flow.</p>
            <button type="button" onClick={() => navigate("/search/flights")}>Go to Flight Search</button>
          </section>
        </div>
      </main>
    );
  }

  const toggleSeat = (seat) => {
    if (!seat || seat.status === "booked") {
      return;
    }

    setSelectionError("");

    setSelectedSeatLabels((previous) => {
      if (previous.includes(seat.label)) {
        return previous.filter((label) => label !== seat.label);
      }

      if (previous.length >= travellers.seatRequired) {
        setSelectionError(
          `You can select up to ${travellers.seatRequired} seat(s) for this booking.`
        );
        return previous;
      }

      const updated = [...previous, seat.label];

      if (flowState.isTwoWay && flowState.returnFlight && activeSegmentIndex === 0 && updated.length === travellers.seatRequired) {
        setTimeout(() => {
          setActiveSegmentIndex(1);
        }, 400);
      }

      return updated;
    });
  };

  const handleContinue = () => {
    if (selectedSeats.length !== travellers.seatRequired) {
      setSelectionError(
        `Select exactly ${travellers.seatRequired} seat(s) to continue to payment.`
      );
      return;
    }

    const passengersWithSeats = Array.isArray(flowState.passengers)
      ? flowState.passengers.map((passenger, index) => ({
          ...passenger,
          seatLabel: onwardSelectedSeatLabels[index] || selectedSeats[index]?.label || passenger.seatLabel || "",
          returnSeatLabel: returnSelectedSeatLabels[index] || passenger.returnSeatLabel || "",
        }))
      : [];

    const flowPayload = {
      ...flowState,
      flight,
      searchContext,
      onwardSelectedSeatLabels,
      returnSelectedSeatLabels,
      selectedSeatLabels: onwardSelectedSeatLabels,
      selectedSeats,
      passengers: passengersWithSeats,
      mealPreference,
      baggagePlan,
      selectedMeal: selectedMealObj || null,
      selectedBaggage: selectedBaggageObj || null,
      travelAssistanceAdded,
      zeroCancellationAdded,
      fareSummary: {
        baseFare: baseFareTotal,
        seatSurcharge,
        mealFee,
        baggageFee,
        tax,
        convenienceFee,
        assuredFee,
        tripSecureFee,
        travelAssistanceFee,
        zeroCancellationFee,
        discount,
        totalFare,
      },
      payableAmount: totalFare,
    };

    writeFlightBookingFlowState(flowPayload);
    navigate("/flight/payment", { state: flowPayload });
  };

  return (
    <main className="flight-flow-page">
      {/* ── STEPPER PROGRESS HEADER ── */}
      <div className="flight-stepper-header">
        <div className="step-item completed">
          <span className="step-circle">✓</span>
          <span>Flight Selection</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step-item completed">
          <span className="step-circle">✓</span>
          <span>Review & Traveller Details</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step-item active">
          <span className="step-circle">3</span>
          <span>Add-ons</span>
        </div>
        <div className="step-line"></div>
        <div className="step-item">
          <span className="step-circle">4</span>
          <span>Payment</span>
        </div>
      </div>

      <div className="flight-booking-container">
        {/* ── LEFT COLUMN SIDEBAR ── */}
        <aside className="flight-checkout-sidebar">
          {/* Your Flight Details */}
          <div className="sidebar-card your-flight-card">
            <h3 className="sidebar-card-title">{flowState.isTwoWay ? "Your Flights (Roundtrip)" : "Your Flight"}</h3>
            
            {/* Onward Flight Segment */}
            <div style={{ marginBottom: flowState.isTwoWay ? 16 : 0 }}>
              {flowState.isTwoWay && (
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#d32f2f", textTransform: "uppercase", marginBottom: 6 }}>
                  1. Onward Flight
                </div>
              )}
              <div className="flight-segment">
                <div className="flight-city-info">
                  <span className="flight-city-code">{get3LetterCode(flight?.sourceCode || flight?.fromCity || searchContext?.source, "DEL")}</span>
                  <span className="flight-city-name">{searchContext?.source || "--"}</span>
                </div>
                <div className="flight-stops-indicator">
                  <span className="stops-text">{Number(flight?.stops || 0) > 0 ? `${flight.stops} stop` : "Non stop"}</span>
                  <div className="stops-line"></div>
                </div>
                <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                  <span className="flight-city-code">{get3LetterCode(flight?.destinationCode || flight?.toCity || searchContext?.destination, "BOM")}</span>
                  <span className="flight-city-name">{searchContext?.destination || "--"}</span>
                </div>
              </div>
              <div className="flight-meta-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{flight?.airlineName || flight?.airline} ({flight?.flightNumber})</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="flight-date-badge">{flight?.departDate || searchContext?.departureDate || "--"}</span>
                  <span className="flight-fare-badge" style={{ backgroundColor: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.85rem", border: "1px solid #a7f3d0" }}>
                    ₹{new Intl.NumberFormat("en-IN").format(Number(flight?.fare || flight?.price || flight?.priceInr || flight?.selectedTravelClassPriceInr || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Return Flight Segment */}
            {flowState.isTwoWay && flowState.returnFlight && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #cbd5e1" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#dc1e26", textTransform: "uppercase", marginBottom: 6 }}>
                  2. Return Flight
                </div>
                <div className="flight-segment">
                  <div className="flight-city-info">
                    <span className="flight-city-code">{get3LetterCode(flowState.returnFlight?.sourceCode || flowState.returnFlight?.fromCity || searchContext?.destination, "BOM")}</span>
                    <span className="flight-city-name">{searchContext?.destination || "--"}</span>
                  </div>
                  <div className="flight-stops-indicator">
                    <span className="stops-text">{Number(flowState.returnFlight?.stops || 0) > 0 ? `${flowState.returnFlight.stops} stop` : "Non stop"}</span>
                    <div className="stops-line"></div>
                  </div>
                  <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                    <span className="flight-city-code">{get3LetterCode(flowState.returnFlight?.destinationCode || flowState.returnFlight?.toCity || searchContext?.source, "DEL")}</span>
                    <span className="flight-city-name">{searchContext?.source || "--"}</span>
                  </div>
                </div>
                <div className="flight-meta-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{flowState.returnFlight?.airlineName || flowState.returnFlight?.airline} ({flowState.returnFlight?.flightNumber})</span>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="flight-date-badge">{flowState.returnFlight?.departDate || searchContext?.returnDate || "--"}</span>
                    <span className="flight-fare-badge" style={{ backgroundColor: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.85rem", border: "1px solid #a7f3d0" }}>
                      ₹{new Intl.NumberFormat("en-IN").format(Number(flowState.returnFlight?.fare || flowState.returnFlight?.price || flowState.returnFlight?.priceInr || flowState.returnFlight?.selectedTravelClassPriceInr || 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Travellers Details */}
          {flowState.passengers && flowState.passengers.length > 0 && (
            <div className="sidebar-card travellers-card">
              <h3 className="sidebar-card-title">Travellers</h3>
              {flowState.passengers.map((p, idx) => (
                <div key={p.id} className="traveller-item">
                  {idx + 1}. {p.title} {p.firstName} {p.lastName}
                </div>
              ))}
            </div>
          )}

          {/* Fare Summary */}
          <div className="sidebar-card fare-summary-card">
            <h3 className="sidebar-card-title">Fare Summary</h3>
            <div className="fare-row">
              <span>Base Fare</span>
              <span>₹ {baseFareTotal.toLocaleString("en-IN")}</span>
            </div>
            {seatSurcharge > 0 && (
              <div className="fare-row">
                <span>Seat Surcharge</span>
                <span>₹ {seatSurcharge.toLocaleString("en-IN")}</span>
              </div>
            )}
            {(mealFee + baggageFee) > 0 && (
              <div className="fare-row">
                <span>Meals & Baggage</span>
                <span>₹ {(mealFee + baggageFee).toLocaleString("en-IN")}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="fare-row">
                <span>Taxes & Fees</span>
                <span>₹ {tax.toLocaleString("en-IN")}</span>
              </div>
            )}
            {convenienceFee > 0 && (
              <div className="fare-row">
                <span>Convenience Fee</span>
                <span>₹ {convenienceFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {assuredFee > 0 && (
              <div className="fare-row">
                <span>PickNBook Fee</span>
                <span>₹ {assuredFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {tripSecureFee > 0 && (
              <div className="fare-row">
                <span>Trip Secure Fee</span>
                <span>₹ {tripSecureFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {travelAssistanceAdded && (
              <div className="fare-row">
                <span>Travel Assistance</span>
                <span>₹ {travelAssistanceFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {zeroCancellationAdded && (
              <div className="fare-row">
                <span>Zero Cancellation</span>
                <span>₹ {zeroCancellationFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="fare-row">
                <span>Instant Discount</span>
                <span className="discount-value">-₹ {discount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="fare-row total-amount-row">
              <span>Total Amount</span>
              <span>₹ {totalFare.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </aside>

        {/* ── RIGHT COLUMN MAIN CONTENT ── */}
        <section className="flight-checkout-main">
          {/* Seat Layout Main Card */}
          <div className="flight-main-card">
            <div className="seat-tabs-container">
              <span
                className={`seat-tab ${activeTab === "seat" ? "active" : ""}`}
                onClick={() => setActiveTab("seat")}
              >
                Seat
              </span>
              <span
                className={`seat-tab ${activeTab === "insurance" ? "active" : ""}`}
                onClick={() => setActiveTab("insurance")}
              >
                Insurance {flowState.assuredSecured && " (Secured)"}
              </span>
            </div>

            {activeTab === "seat" ? (
              <div>
                {/* Segment Pills */}
                <div className="segment-pills">
                  {segments.map((seg, idx) => (
                    <button
                      key={seg}
                      className={`segment-pill ${activeSegmentIndex === idx ? "active" : ""}`}
                      onClick={() => setActiveSegmentIndex(idx)}
                    >
                      {seg}
                    </button>
                  ))}
                </div>

                {/* Seat Category Legends */}
                <div className="seat-legend-row">
                  <div className="legend-badge">
                    <span className="legend-color free"></span>
                    <span>Free</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color mid"></span>
                    <span>₹350 - ₹500</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color high"></span>
                    <span>₹1200 - ₹1300</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color" style={{ backgroundColor: "#d6dee9" }}></span>
                    <span>Booked</span>
                  </div>
                  <div className="legend-badge">
                    <span className="legend-color" style={{ backgroundColor: "#f4f8fd", borderColor: "#2f5e9c" }}></span>
                    <span>Selected</span>
                  </div>
                </div>

                {/* Airplane Cabin Legends */}
                <div className="airplane-legend-container">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 className="legend-title" style={{ margin: 0, textAlign: "left" }}>Select Your Preferred Seat</h4>
                    {activeSeatFilter && (
                      <button
                        type="button"
                        onClick={() => setActiveSeatFilter(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--secondary-color)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: "4px 10px",
                          borderRadius: 6,
                          backgroundColor: "rgba(37, 99, 235, 0.08)",
                          transition: "all 0.2s"
                        }}
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                  <div className="airplane-legend-grid">
                    <div
                      className={`legend-item ${activeSeatFilter === "middle_free" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("middle_free")}
                    >
                      <div className="legend-seat standard free">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Middle Seat</span>
                        <span className="legend-price">Free</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "standard_window" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("standard_window")}
                    >
                      <div className="legend-seat standard window">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Standard Window</span>
                        <span className="legend-price">+₹250</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "standard_aisle" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("standard_aisle")}
                    >
                      <div className="legend-seat standard aisle">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Standard Aisle</span>
                        <span className="legend-price">+₹200</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "preferred" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("preferred")}
                    >
                      <div className="legend-seat preferred">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Preferred Rows 2-5</span>
                        <span className="legend-price">+₹350 - ₹600</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "extra" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("extra")}
                    >
                      <div className="legend-seat extra">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Extra Legroom</span>
                        <span className="legend-price">+₹999 - ₹1249</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "booked" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("booked")}
                    >
                      <div className="legend-seat booked">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Booked</span>
                        <span className="legend-price">Unavailable</span>
                      </div>
                    </div>
                    <div
                      className={`legend-item ${activeSeatFilter === "selected" ? "active" : ""}`}
                      onClick={() => handleFilterToggle("selected")}
                    >
                      <div className="legend-seat selected">A</div>
                      <div className="legend-info">
                        <span className="legend-label">Selected</span>
                        <span className="legend-price">Active Selection</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Airplane Fuselage Outside Layout */}
                <div className="airplane-fuselage-wrapper">
                  {isSeatMapLoading && (
                    <div className="flight-loading-overlay">
                      <Loader2 size={24} className="spin" />
                      <p>Loading aircraft seat map...</p>
                    </div>
                  )}

                  {seatMapError && (
                    <p className="flight-flow-error">
                      <Info size={14} />
                      {seatMapError}
                    </p>
                  )}

                  {cabinData && cabinData.rows && cabinData.seatLetters ? (
                    <div className="airplane-fuselage">
                      {/* Airplane Nose Cone */}
                      <div className="airplane-nose">
                        <div className="cockpit-windows">
                          <span className="cockpit-window left"></span>
                          <span className="cockpit-window center"></span>
                          <span className="cockpit-window right"></span>
                        </div>
                        <div className="flight-crew-label">COCKPIT</div>
                      </div>

                      {/* Forward Galley & Lavatories */}
                      <div className="cabin-amenities forward">
                        <div className="amenity-box galley">
                          <span className="amenity-icon">🍽️</span>
                          <span className="amenity-label">Galley</span>
                        </div>
                        <div className="amenity-box lavatory">
                          <span className="amenity-icon">🚻</span>
                          <span className="amenity-label">Lavatory</span>
                        </div>
                      </div>

                      {/* Forward Exit Doors */}
                      <div className="exit-doors-row forward">
                        <div className="exit-door left">
                          <ArrowLeft size={10} /> EXIT
                        </div>
                        <div className="exit-door-spacer"></div>
                        <div className="exit-door right">
                          EXIT <ArrowRight size={10} />
                        </div>
                      </div>

                      {/* Main Cabin Seating Area */}
                      <div className="airplane-cabin">
                        {/* Left and Right Side Walls with Windows */}
                        <div className="cabin-side-wall left-wall">
                          {cabinData.rows.map((rowNumber) => (
                            <div key={`left-win-${rowNumber}`} className="wall-window-container">
                              <span className="wall-window"></span>
                            </div>
                          ))}
                        </div>

                        <div className="cabin-side-wall right-wall">
                          {cabinData.rows.map((rowNumber) => (
                            <div key={`right-win-${rowNumber}`} className="wall-window-container">
                              <span className="wall-window"></span>
                            </div>
                          ))}
                        </div>

                        {/* Aircraft Wings */}
                        <div className="airplane-wings">
                          <div className="airplane-wing left">
                            <div className="wing-engine left-engine"></div>
                          </div>
                          <div className="airplane-wing right">
                            <div className="wing-engine right-engine"></div>
                          </div>
                        </div>

                        {/* Seating Grid */}
                        <div className="seating-grid">
                          {/* Header Seat Letters */}
                          <div className="column-labels-header">
                            <span className="row-label-placeholder"></span>
                            {cabinData.seatLetters.map((letter, index) => {
                              const cols = [];
                              if (index === Math.ceil(cabinData.seatLetters.length / 2)) {
                                cols.push(<span key="aisle-lbl-space" className="aisle-label-placeholder"></span>);
                              }
                              cols.push(
                                <span key={`header-lbl-${letter}`} className="col-letter-label">
                                  {letter}
                                </span>
                              );
                              return cols;
                            })}
                          </div>

                          {/* Seat Rows */}
                          {cabinData.rows.map((rowNumber) => {
                            const isExitRow = cabinData.extraLegroomRows.has(rowNumber);
                            const rowElements = [];

                            rowElements.push(
                              <span key={`row-lbl-${rowNumber}`} className="row-number-badge">
                                {rowNumber}
                              </span>
                            );

                            cabinData.seatLetters.forEach((seatLetter, index) => {
                              if (index === Math.ceil(cabinData.seatLetters.length / 2)) {
                                rowElements.push(
                                  <div key={`aisle-${rowNumber}`} className="cabin-aisle">
                                    <span>AISLE</span>
                                  </div>
                                );
                              }

                              const seat = seatsByLabel.get(`${rowNumber}${seatLetter}`);
                              const isSelected = selectedSeatLabels.includes(seat?.label);
                              const isBooked = !seat || seat.status === "booked";

                              let seatClass = "seat-item";
                              if (isBooked) {
                                seatClass += " booked";
                              } else if (isSelected) {
                                seatClass += " selected";
                              } else if (seat.isExtraLegroom) {
                                seatClass += " extra-legroom";
                              } else if (seat.rowNumber <= 12) {
                                seatClass += " preferred";
                              } else {
                                seatClass += " standard";
                              }

                              if (seat) {
                                if (seat.isWindow) seatClass += " seat-window";
                                else if (seat.isAisle) seatClass += " seat-aisle-side";
                                else seatClass += " seat-middle-side";
                              }

                              const doesMatch = !activeSeatFilter || doesSeatMatchFilter(seat, activeSeatFilter);
                              const isDimmed = activeSeatFilter && !doesMatch;

                              rowElements.push(
                                <div
                                  key={seat?.id || `${rowNumber}-${seatLetter}`}
                                  className={`seat-container ${isDimmed ? "dimmed" : ""}`}
                                  onMouseEnter={(e) => !isDimmed && handleSeatMouseEnter(e, seat)}
                                  onMouseLeave={handleSeatMouseLeave}
                                >
                                  <button
                                    type="button"
                                    className={seatClass}
                                    disabled={isBooked}
                                    onClick={() => toggleSeat(seat)}
                                  >
                                    <svg viewBox="0 0 100 100" className="seat-svg">
                                      <path
                                        d="M20,20 C20,10 80,10 80,20 L80,80 C80,85 75,90 70,90 L30,90 C25,90 20,85 20,80 Z"
                                        className="seat-body"
                                      />
                                      <rect x="32" y="15" width="36" height="18" rx="6" className="seat-headrest" />
                                      <path d="M28,45 L72,45 C75,45 75,78 72,78 L28,78 C25,78 25,45 28,45 Z" className="seat-cushion" />
                                      <rect x="12" y="38" width="8" height="42" rx="4" className="seat-armrest" />
                                      <rect x="80" y="38" width="8" height="42" rx="4" className="seat-armrest" />
                                    </svg>
                                    <span className="seat-letter-label">{seatLetter}</span>
                                  </button>
                                </div>
                              );
                            });

                            return (
                              <div key={`row-wrap-${rowNumber}`} className="row-wrapper">
                                {isExitRow && (
                                  <div className="exit-row-marker-row">
                                    <span className="marker-line"></span>
                                    <span className="marker-text">⚠️ EMERGENCY EXIT ROW (EXTRA LEGROOM)</span>
                                    <span className="marker-line"></span>
                                  </div>
                                )}
                                <div className={`cabin-row ${isExitRow ? "exit-row" : ""}`}>
                                  {rowElements}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Aft Galley & Lavatories */}
                      <div className="cabin-amenities aft">
                        <div className="amenity-box galley">
                          <span className="amenity-icon">🍽️</span>
                          <span className="amenity-label">Galley</span>
                        </div>
                        <div className="amenity-box lavatory">
                          <span className="amenity-icon">🚻</span>
                          <span className="amenity-label">Lavatory</span>
                        </div>
                        <div className="amenity-box lavatory">
                          <span className="amenity-icon">🚻</span>
                          <span className="amenity-label">Lavatory</span>
                        </div>
                      </div>

                      {/* Aft Exit Doors */}
                      <div className="exit-doors-row aft">
                        <div className="exit-door left">
                          <ArrowLeft size={10} /> EXIT
                        </div>
                        <div className="exit-door-spacer"></div>
                        <div className="exit-door right">
                          EXIT <ArrowRight size={10} />
                        </div>
                      </div>

                      {/* Airplane Tail Structure */}
                      <div className="airplane-tail">
                        <div className="stabilizer left"></div>
                        <div className="vertical-fin"></div>
                        <div className="stabilizer right"></div>
                      </div>
                    </div>
                  ) : (
                    !isSeatMapLoading && (
                      <div style={{ textAlign: "center", padding: "48px 24px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", margin: "24px 0", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                        <p style={{ fontWeight: 800, fontSize: "1.15rem", color: "#0f172a", marginBottom: "8px" }}>Seat Map Unavailable</p>
                        <p style={{ color: "#475569", fontSize: "0.9rem", maxWidth: "440px", margin: "0 auto", lineHeight: "1.5" }}>
                          We were unable to load the seat map from the airline's server. You can skip seat selection or try again later.
                        </p>
                      </div>
                    )
                  )}

                  {/* Custom Floating Tooltip */}
                  {hoveredSeat && (
                    <div
                      className="seat-hover-tooltip"
                      style={{
                        position: "absolute",
                        left: tooltipCoords.x,
                        top: tooltipCoords.y,
                        transform: "translate(-50%, -100%) translateY(-10px)",
                        pointerEvents: "none",
                        zIndex: 1000,
                      }}
                    >
                      <div className="tooltip-header">
                        <span className="tooltip-seat-label">Seat {hoveredSeat.label}</span>
                        <span className={`tooltip-class-badge ${getSeatCategoryClass(hoveredSeat)}`}>
                          {getSeatCategoryName(hoveredSeat)}
                        </span>
                      </div>
                      <div className="tooltip-divider"></div>
                      <div className="tooltip-body">
                        <div className="tooltip-detail">
                          <span className="detail-label">Fare Surcharge:</span>
                          <span className="detail-value highlight">
                            {getSeatSurcharge(hoveredSeat) > 0
                              ? `₹${getSeatSurcharge(hoveredSeat).toLocaleString("en-IN")}`
                              : "Free"}
                          </span>
                        </div>
                        <div className="tooltip-features">
                          {hoveredSeat.isWindow && <span className="feature-pill">🪟 Window Seat</span>}
                          {hoveredSeat.isAisle && <span className="feature-pill">🎛️ Aisle Seat</span>}
                          {hoveredSeat.isMiddle && <span className="feature-pill">🤝 Middle Seat</span>}
                          {hoveredSeat.isExtraLegroom && (
                            <span className="feature-pill highlight-pill">🦵 Extra Legroom</span>
                          )}
                          {hoveredSeat.rowNumber === 15 && <span className="feature-pill exit-row-pill">🚨 Exit Row</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="flight-seat-hint" style={{ marginTop: 12 }}>
                  Please select {travellers.seatRequired} seat(s). Window/Aisle and front/exit rows have surcharges.
                </p>

                {selectionError && (
                  <p className="flight-flow-error" style={{ color: "var(--danger-color)", margin: "8px 0" }}>
                    <Info size={14} />
                    {selectionError}
                  </p>
                )}
              </div>
            ) : (
              // Insurance Tab Content
              <div className="insurance-section-container">
                <div className="insurance-cards-grid">
                  {/* Card 1: Travel Assistance */}
                  <div className="insurance-addon-card">
                    <div className="insurance-addon-card-body">
                      <h3 className="insurance-card-title">
                        Travel <span className="highlight-green">Assistance</span>
                      </h3>
                      <p className="insurance-card-subtitle">Travel protected with exclusive benefits</p>
                      
                      <div className="insurance-benefits-list">
                        <div className="insurance-benefit-item">
                          <span className="benefit-check-circle">
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <span>Flight delay benefit beyond 2 hours</span>
                        </div>
                        <div className="insurance-benefit-item">
                          <span className="benefit-check-circle">
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <span>Emergency Medical expenses</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="insurance-read-more"
                        onClick={() => setActiveInsuranceTerms("travel")}
                      >
                        Read More
                      </button>

                      <hr className="insurance-divider" />

                      <div className="insurance-price-row">
                        <div className="insurance-price-info">
                          <span className="insurance-tax-label">Inclusive of taxes</span>
                          <span className="insurance-price-val">₹189</span>
                        </div>
                        <button
                          type="button"
                          className={`insurance-action-btn ${travelAssistanceAdded ? "added" : "add"}`}
                          onClick={() => setTravelAssistanceAdded(!travelAssistanceAdded)}
                        >
                          {travelAssistanceAdded ? (
                            <>
                              <Check size={14} strokeWidth={3} /> Added
                            </>
                          ) : (
                            "Add"
                          )}
                        </button>
                      </div>

                      <p className="insurance-terms-text">
                        By clicking on 'Add' I agree to purchase Travel Assistance and agree to all T&Cs I confirm that I am an Indian citizen upto the age of 90 years.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Zero Cancellation */}
                  <div className="insurance-addon-card recommended">
                    <div className="insurance-recommended-badge">Recommended</div>
                    <div className="insurance-addon-card-body">
                      <h3 className="insurance-card-title">
                        Zero <span className="highlight-green">Cancellation</span>
                      </h3>
                      <p className="insurance-card-subtitle">
                        Assistance service including Zero Cancellation. Cancel up to 24 hours before departure, claim your refund, no questions asked!
                      </p>
                      
                      <div className="insurance-benefits-list">
                        <div className="insurance-benefit-item">
                          <span className="benefit-check-circle">
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <span>Trip Cancellation</span>
                        </div>
                        <div className="insurance-benefit-item">
                          <span className="benefit-check-circle">
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <span>Coverage limit ₹5,000 · Cancel ≥24 hrs</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="insurance-read-more"
                        onClick={() => setActiveInsuranceTerms("cancellation")}
                      >
                        Read More
                      </button>

                      <hr className="insurance-divider" />

                      <div className="insurance-price-row">
                        <div className="insurance-price-info">
                          <span className="insurance-tax-label">Now say goodbye to Cancellation Fee</span>
                          <span className="insurance-price-val">₹499</span>
                        </div>
                        <button
                          type="button"
                          className={`insurance-action-btn ${zeroCancellationAdded ? "added" : "add"}`}
                          onClick={() => setZeroCancellationAdded(!zeroCancellationAdded)}
                        >
                          {zeroCancellationAdded ? (
                            <>
                              <Check size={14} strokeWidth={3} /> Added
                            </>
                          ) : (
                            "Add"
                          )}
                        </button>
                      </div>

                      <p className="insurance-terms-text">
                        By clicking 'Add' I agreed to purchase assistance services including zero cancellation powered by Asego and accept all applicable T&Cs. I confirm that I am an Indian citizen upto the age of 70 years.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Meals & Baggage Selection Card */}
          <div className="flight-main-card">
            <h2 className="flight-main-card-title">
              <Utensils size={20} className="header-icon" />
              Add-on Services (Meals & Baggage)
            </h2>
            {ssrData.isLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 0", color: "#666" }}>
                <Loader2 size={18} className="spin" />
                <span>Fetching live meal & baggage options from airline...</span>
              </div>
            ) : (
              <div className="form-grid-2">
                <div className="input-group">
                  <label>Meal Preference</label>
                  <select
                    className="input-control"
                    value={mealPreference}
                    onChange={(event) => setMealPreference(event.target.value)}
                  >
                    <option value="">No Meal (Included)</option>
                    {ssrData.meal.map((mealItem, index) => (
                      <option key={mealItem.Code || index} value={mealItem.Code}>
                        {mealItem.AirlineDescription || mealItem.Description || mealItem.Code} {Number(mealItem.Price) > 0 ? `(+INR ${mealItem.Price})` : "(Included)"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Checked Baggage Allowance</label>
                  <select
                    className="input-control"
                    value={baggagePlan}
                    onChange={(event) => setBaggagePlan(event.target.value)}
                  >
                    <option value="">Standard Allowance (Included)</option>
                    {ssrData.baggage.map((bagItem, index) => {
                      const bagLabel = bagItem.Weight > 0
                        ? `${bagItem.Weight} kg Excess Baggage`
                        : (bagItem.Description && bagItem.Description !== 0 ? bagItem.Description : (bagItem.Code || "Excess Baggage"));
                      return (
                        <option key={bagItem.Code || bagItem.Weight || index} value={bagItem.Code || bagItem.Weight}>
                          {bagLabel} {Number(bagItem.Price) > 0 ? `(+INR ${bagItem.Price})` : "(Included)"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── BOTTOM STICKY ACTION BAR ── */}
      <div className="bottom-action-bar">
        <div className="bottom-price-info">
          <span className="bottom-price-label">Total Fare</span>
          <span className="bottom-price-amount">₹ {totalFare.toLocaleString("en-IN")}</span>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (flowState.isTwoWay && flowState.returnFlight && activeSegmentIndex === 0) {
              setActiveSegmentIndex(1);
            } else {
              handleContinue();
            }
          }}
          disabled={selectedSeats.length !== travellers.seatRequired}
        >
          {flowState.isTwoWay && flowState.returnFlight && activeSegmentIndex === 0 ? (
            <>Select Return Flight Seats <ArrowRight size={16} /></>
          ) : (
            <>Continue to Payment <ArrowRight size={16} /></>
          )}
        </button>
      </div>

      {/* Insurance Terms Modal */}
      {activeInsuranceTerms && (
        <div className="insurance-modal-overlay" onClick={() => setActiveInsuranceTerms(null)}>
          <div className="insurance-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="insurance-modal-close"
              onClick={() => setActiveInsuranceTerms(null)}
            >
              <X size={20} />
            </button>
            {activeInsuranceTerms === "travel" ? (
              <div className="insurance-modal-body">
                <h3>Travel Assistance Benefits</h3>
                <p>Enjoy travel protection with the following exclusive coverage benefits:</p>
                <ul>
                  <li><strong>Flight Delay:</strong> Benefit beyond 2 hours delay.</li>
                  <li><strong>Emergency Medical Expenses:</strong> Medical costs incurred during transit.</li>
                  <li><strong>Baggage Delay & Loss:</strong> Assistance and financial payout.</li>
                  <li><strong>Emergency Assistance:</strong> 24x7 support coverage.</li>
                </ul>
                <p className="insurance-modal-disclaimer">
                  Valid for Indian citizens up to the age of 90 years. Inclusive of all taxes.
                </p>
              </div>
            ) : (
              <div className="insurance-modal-body">
                <h3>Zero Cancellation Benefits</h3>
                <p>Say goodbye to cancellation fees and get fully refunded with peace of mind:</p>
                <ul>
                  <li><strong>Trip Cancellation:</strong> Cancel up to 24 hours before departure.</li>
                  <li><strong>Full Refund:</strong> Claim refund of your flight fare up to ₹5,000.</li>
                  <li><strong>No Questions Asked:</strong> Processed immediately without hassle or extensive documentation.</li>
                  <li><strong>Asego Powered:</strong> Trusted assistance services.</li>
                </ul>
                <p className="insurance-modal-disclaimer">
                  Valid for Indian citizens up to the age of 70 years. Cancel >= 24 hrs prior to departure.
                </p>
              </div>
            )}
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", marginTop: "16px" }}
              onClick={() => setActiveInsuranceTerms(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
