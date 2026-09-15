import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, Search, Users, ChevronDown, Plus, Minus, BedDouble, Baby, MapPin } from "lucide-react";
import PlaceAutocomplete from "./PlaceAutocomplete";
import CustomDatePicker from "./CustomDatePicker";
import { getDefaultDateString } from "../utils/apiDateFormat";

function toDisplayDate(isoString) {
  if (!isoString) return "";
  const parts = isoString.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return isoString;
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const diffTime = new Date(checkOut) - new Date(checkIn);
  if (diffTime <= 0) return 1;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function GuestsDropdown({ rooms, adults, children, childAges, onRoomsChange, onAdultsChange, onChildrenChange, onChildAgeChange, onDone, isInline }) {
  const Counter = ({ value, onDec, onInc, min = 0, max = 99 }) => (
    <div style={{ display:"flex", alignItems:"center", border:"1px solid #fca5a5", borderRadius:"8px", padding:"2px 8px", gap:"8px" }}>
      <button type="button" onClick={() => onDec(Math.max(min, value-1))} disabled={value <= min}
        style={{ background:"transparent", border:"none", width:"20px", height:"20px", display:"flex", alignItems:"center", justifyContent:"center", color:"#dc1e26", cursor:value<=min?"not-allowed":"pointer", opacity:value<=min?0.4:1, padding:0 }}>
        <Minus size={14} strokeWidth={2} />
      </button>
      <span style={{ fontSize:"0.9rem", fontWeight:700, minWidth:"18px", textAlign:"center", color:"#0f172a" }}>{value}</span>
      <button type="button" onClick={() => onInc(Math.min(max, value+1))} disabled={value >= max}
        style={{ background:"transparent", border:"none", width:"20px", height:"20px", display:"flex", alignItems:"center", justifyContent:"center", color:"#dc1e26", cursor:value>=max?"not-allowed":"pointer", opacity:value>=max?0.4:1, padding:0 }}>
        <Plus size={14} strokeWidth={2} />
      </button>
    </div>
  );
  const Row = ({ icon: Icon, label, sub, value, onDec, onInc, min, max }) => (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
      <Icon size={18} strokeWidth={1.5} style={{ color:"#64748b", flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:"0.85rem", fontWeight:700, color:"#0f172a" }}>{label}</div>
        {sub && <div style={{ fontSize:"0.7rem", color:"#94a3b8" }}>{sub}</div>}
      </div>
      <Counter value={value} onDec={onDec} onInc={onInc} min={min} max={max} />
    </div>
  );
  return (
    <div onClick={(e) => e.stopPropagation()} style={{
      position:"absolute", top:"calc(100% + 10px)", left:isInline?"auto":0, right:isInline?0:"auto",
      width:"280px", background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:"16px",
      boxShadow:"0 16px 40px rgba(15,23,42,0.16)", padding:"8px 16px 12px", zIndex:9999,
    }}>
      <Row icon={BedDouble} label="Rooms" sub="Max 8 rooms" value={rooms} onDec={onRoomsChange} onInc={onRoomsChange} min={1} max={8} />
      <Row icon={Users} label="Adults" sub="13 years & above" value={adults} onDec={onAdultsChange} onInc={onAdultsChange} min={1} max={30} />
      <Row icon={Baby} label="Children" sub="0 to 12 years" value={children} onDec={onChildrenChange} onInc={onChildrenChange} min={0} max={10} />
      {childAges.length > 0 && (
        <div style={{ marginTop:"6px" }}>
          <span style={{ fontSize:"0.72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase" }}>Child Ages</span>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginTop:"6px" }}>
            {childAges.map((age, i) => (
              <select key={i} value={age} onChange={(e) => onChildAgeChange(i, Number(e.target.value))}
                style={{ border:"1px solid #e2e8f0", borderRadius:"8px", padding:"4px 8px", fontSize:"0.8rem", color:"#0f172a", background:"#f8fafc", cursor:"pointer" }}>
                {Array.from({length:13},(_,n) => <option key={n} value={n}>{n===0?"< 1 yr":`${n} yr${n>1?"s":""}`}</option>)}
              </select>
            ))}
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:"12px" }}>
        <button type="button" onClick={onDone}
          style={{ background:"#dc1e26", color:"#fff", border:"none", borderRadius:"10px", padding:"7px 22px", fontWeight:700, cursor:"pointer", fontSize:"0.85rem", boxShadow:"0 4px 12px rgba(220,30,38,0.3)" }}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function HotelSearchWidget({
  initialDestination = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialRoomsConfig = null,
  initialInternalCityId = null,
  onSearch,
  isInline = false
}) {
  const [destination, setDestination] = useState(() => initialDestination || "");
  const [destinationError, setDestinationError] = useState("");
  const [internalCityId, setInternalCityId] = useState(() => initialInternalCityId || null);
  const [checkInDate, setCheckInDate] = useState(() => initialCheckIn || getDefaultDateString(0));
  const [checkOutDate, setCheckOutDate] = useState(() => initialCheckOut || getDefaultDateString(1));
  const [activeDatePicker, setActiveDatePicker] = useState(null);

  const parseRoomsConfig = (config) => {
    if (!config) return null;
    if (typeof config === "string") { try { return JSON.parse(config); } catch(e) { return null; } }
    if (Array.isArray(config)) return config;
    return null;
  };
  const parsed = parseRoomsConfig(initialRoomsConfig);

  const [rooms, setRooms] = useState(() => parsed && parsed.length > 0 ? parsed.length : 1);
  const [adults, setAdults] = useState(() => parsed && parsed.length > 0 ? parsed.reduce((s,r)=>s+(r.adults||0),0) : 2);
  const [children, setChildren] = useState(() => parsed && parsed.length > 0 ? parsed.reduce((s,r)=>s+(r.children||0),0) : 0);
  const [childAges, setChildAges] = useState(() => { if (parsed && parsed.length > 0) { const a=[]; parsed.forEach(r=>{ if(r.childAges) a.push(...r.childAges); }); return a; } return []; });

  const handleRoomsChange = (n) => { setRooms(n); if(n===0){setAdults(0);setChildren(0);setChildAges([]);} else if(n>0&&adults===0) setAdults(1); };
  const handleAdultsChange = (n) => { setAdults(n); if(n>0&&rooms===0) setRooms(1); };
  const handleChildrenChange = (n) => { setChildren(n); if(n>0&&rooms===0){setRooms(1);if(adults===0)setAdults(1);} setChildAges(prev=>n>prev.length?[...prev,...Array(n-prev.length).fill(4)]:prev.slice(0,n)); };
  const handleChildAgeChange = (index, age) => { setChildAges(prev=>{ const a=[...prev]; a[index]=age; return a; }); };

  const [showGuestsDropdown, setShowGuestsDropdown] = useState(false);
  const guestsFieldRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if(guestsFieldRef.current&&!guestsFieldRef.current.contains(e.target)) setShowGuestsDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if(initialDestination) setDestination(initialDestination); }, [initialDestination]);
  useEffect(() => { if(initialInternalCityId) setInternalCityId(initialInternalCityId); }, [initialInternalCityId]);
  useEffect(() => { if(initialCheckIn) setCheckInDate(initialCheckIn); }, [initialCheckIn]);
  useEffect(() => { if(initialCheckOut) setCheckOutDate(initialCheckOut); }, [initialCheckOut]);

  const handleDestinationChange = (value, cityId) => { setDestination(value); setDestinationError(""); setInternalCityId(cityId||null); };

  const guestSummary = (rooms===0&&adults===0) ? "1 Room, 2 Adults"
    : `${rooms} Room${rooms>1?"s":""},\u00a0${adults} Adult${adults>1?"s":""}${children>0?`, ${children} Child${children>1?"ren":""}` : ""}`;

  const handleSubmit = () => {
    const destVal = destination.trim();
    if(!destVal){ setDestinationError("Destination city is required."); return; }
    setDestinationError("");
    if(onSearch){
      const cfg=[{adults:adults||2,children:children||0,childAges}];
      onSearch({ destination:destVal, checkInDate, checkOutDate, rooms:String(rooms||1), adults:String(adults||2), children:String(children||0), guests:guestSummary, roomsConfig:cfg, roomsConfigStr:JSON.stringify(cfg), internalCityId });
    }
  };

  const advanceCheckOut = (val) => {
    if(checkOutDate&&val>=checkOutDate){
      const n=new Date(val); n.setDate(n.getDate()+1);
      setCheckOutDate(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`);
    }
  };

  // ─ INLINE MODE ──────────────────────────────────────────────────────────────
  if (isInline) {
    return (
      <form className="hotel-discover-searchbar" onSubmit={(e)=>{e.preventDefault();handleSubmit();}}
        style={{ background:"#ffffff", borderRadius:"28px", padding:"8px 20px", border:"1px solid rgba(0,0,0,0.06)", boxShadow:"0 4px 20px rgba(0,0,0,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", maxWidth:"1100px", margin:"0 auto", boxSizing:"border-box", position:"relative", overflow:"visible" }}>
        <div className="hotel-discover-searchcell" style={{ display:"flex", alignItems:"center", gap:"12px", flex:"1.3 1 auto", minWidth:0, position:"relative" }}>
          <PlaceAutocomplete label="STAY DESTINATION" value={destination} onChange={handleDestinationChange} tripType="hotel" field="destination" placeholder="Enter city, area or hotel" error={destinationError} className="hotel-discover-searchcell-autocomplete" isInline={true} />
        </div>
        <div className="hotel-discover-searchcell" style={{ display:"flex", alignItems:"center", gap:"12px", flex:"1.2 1 auto", borderLeft:"1px solid rgba(15,23,42,0.08)", paddingLeft:"20px", cursor:"pointer", minWidth:0, position:"relative" }}>
          <CalendarDays size={18} color="#dc1e26" style={{ flexShrink:0 }} />
          <div style={{ display:"flex", flexDirection:"column", width:"100%", minWidth:0 }}>
            <span style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", letterSpacing:"0.05em", textTransform:"uppercase" }}>TIMELINE</span>
            <div style={{ display:"flex", alignItems:"center", gap:"6px", margin:"2px 0" }}>
              <span style={{ cursor:"pointer", color:"#0f172a", fontWeight:500, fontSize:"14px", whiteSpace:"nowrap" }} onClick={(e)=>{e.stopPropagation();setActiveDatePicker(activeDatePicker==="checkin"?null:"checkin")}}>{toDisplayDate(checkInDate)||"Select"}</span>
              <span style={{ color:"#94a3b8", fontWeight:700 }}>-</span>
              <span style={{ cursor:"pointer", color:"#0f172a", fontWeight:500, fontSize:"14px", whiteSpace:"nowrap" }} onClick={(e)=>{e.stopPropagation();setActiveDatePicker(activeDatePicker==="checkout"?null:"checkout")}}>{toDisplayDate(checkOutDate)||"dates"}</span>
            </div>
            <span style={{ fontSize:"0.72rem", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.03em" }}>{calculateNights(checkInDate,checkOutDate)} {calculateNights(checkInDate,checkOutDate)===1?"NIGHT":"NIGHTS"}</span>
            <CustomDatePicker isOpen={activeDatePicker==="checkin"} onClose={()=>setActiveDatePicker(null)} value={checkInDate} minDate={getDefaultDateString(0)} onChange={(val)=>{setCheckInDate(val);setActiveDatePicker(null);advanceCheckOut(val);}} title="Check-in Date" />
            <CustomDatePicker isOpen={activeDatePicker==="checkout"} onClose={()=>setActiveDatePicker(null)} value={checkOutDate} minDate={checkInDate||getDefaultDateString(0)} onChange={(val)=>{setCheckOutDate(val);setActiveDatePicker(null);}} title="Check-out Date" />
          </div>
        </div>
        <div className="hotel-discover-searchcell" ref={guestsFieldRef} style={{ display:"flex", alignItems:"center", gap:"12px", flex:"1.1 1 auto", borderLeft:"1px solid rgba(255,255,255,0.15)", paddingLeft:"20px", cursor:"pointer", minWidth:0, position:"relative" }} onClick={()=>setShowGuestsDropdown(p=>!p)}>
          <Users size={18} color="#dc1e26" style={{ flexShrink:0 }} />
          <div style={{ display:"flex", flexDirection:"column", minWidth:0, flex:1 }}>
            <span style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", letterSpacing:"0.05em", textTransform:"uppercase" }}>GUESTS</span>
            <span style={{ fontSize:"14px", fontWeight:500, color:"#0f172a", margin:"2px 0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{guestSummary}</span>
            <span style={{ fontSize:"0.72rem", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.03em" }}>ROOMS & GUESTS</span>
          </div>
          {showGuestsDropdown && <GuestsDropdown rooms={rooms} adults={adults} children={children} childAges={childAges} onRoomsChange={handleRoomsChange} onAdultsChange={handleAdultsChange} onChildrenChange={handleChildrenChange} onChildAgeChange={handleChildAgeChange} onDone={()=>setShowGuestsDropdown(false)} isInline={true} />}
        </div>
        <button type="button" className="hotel-discover-searchbutton" onClick={handleSubmit} style={{ borderRadius:"32px", padding:"0 24px", height:"44px", fontSize:"0.95rem", fontWeight:700, background:"linear-gradient(135deg, #dc1e26, #991b1b)", boxShadow:"0 4px 15px rgba(220,30,38,0.4)", color:"#ffffff", display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", border:"none", flexShrink:0 }}>
          <Search size={18} /><span>Search Hotels</span>
        </button>
      </form>
    );
  }

  // ─ STANDARD PILL BAR (matches the reference screenshot) ────────────────────
  return (
    <div className="hotel-pill-bar-wrap">
      <div className="hotel-pill-bar">

        {/* DESTINATION */}
        <div className="hotel-pill-field hotel-pill-destination">
          <div className="hotel-pill-field-content">
            <span className="hotel-pill-label">DESTINATION</span>
            <PlaceAutocomplete value={destination} onChange={handleDestinationChange} tripType="hotel" field="destination" placeholder="City or hotel area" error={destinationError} className="hotel-pill-autocomplete" hideLabel={true} />
          </div>
        </div>

        <div className="hotel-pill-divider" />

        {/* CHECK-IN */}
        <div className={`hotel-pill-field hotel-pill-date${activeDatePicker==="checkin"?" is-active":""}`}
          onClick={()=>setActiveDatePicker(activeDatePicker==="checkin"?null:"checkin")} style={{ position:"relative", cursor:"pointer" }}>
          <CalendarDays size={16} className="hotel-pill-icon" />
          <div className="hotel-pill-field-content">
            <span className="hotel-pill-label">CHECK-IN</span>
            <span className="hotel-pill-value">{toDisplayDate(checkInDate)||"Select date"}</span>
          </div>
          <CustomDatePicker isOpen={activeDatePicker==="checkin"} onClose={()=>setActiveDatePicker(null)} value={checkInDate} minDate={getDefaultDateString(0)} onChange={(val)=>{ setCheckInDate(val); setActiveDatePicker(null); advanceCheckOut(val); }} title="Check-in Date" />
        </div>

        <div className="hotel-pill-divider" />

        {/* CHECK-OUT */}
        <div className={`hotel-pill-field hotel-pill-date${activeDatePicker==="checkout"?" is-active":""}`}
          onClick={()=>setActiveDatePicker(activeDatePicker==="checkout"?null:"checkout")} style={{ position:"relative", cursor:"pointer" }}>
          <CalendarDays size={16} className="hotel-pill-icon" />
          <div className="hotel-pill-field-content">
            <span className="hotel-pill-label">CHECK-OUT</span>
            <span className="hotel-pill-value">{toDisplayDate(checkOutDate)||"Select date"}</span>
          </div>
          <CustomDatePicker isOpen={activeDatePicker==="checkout"} onClose={()=>setActiveDatePicker(null)} value={checkOutDate} minDate={checkInDate||getDefaultDateString(0)} onChange={(val)=>{ setCheckOutDate(val); setActiveDatePicker(null); }} title="Check-out Date" align="right" />
        </div>

        <div className="hotel-pill-divider" />

        {/* ROOMS & GUESTS */}
        <div className="hotel-pill-field hotel-pill-guests" ref={guestsFieldRef}
          onClick={()=>setShowGuestsDropdown(p=>!p)} style={{ cursor:"pointer", position:"relative" }}>
          <Users size={16} className="hotel-pill-icon" />
          <div className="hotel-pill-field-content">
            <span className="hotel-pill-label">ROOMS & GUESTS</span>
            <span className="hotel-pill-value">{guestSummary}</span>
          </div>
          <ChevronDown size={14} className={`hotel-pill-chevron${showGuestsDropdown?" open":""}`} />
          {showGuestsDropdown && <GuestsDropdown rooms={rooms} adults={adults} children={children} childAges={childAges} onRoomsChange={handleRoomsChange} onAdultsChange={handleAdultsChange} onChildrenChange={handleChildrenChange} onChildAgeChange={handleChildAgeChange} onDone={()=>setShowGuestsDropdown(false)} isInline={false} />}
        </div>

        {/* SEARCH BUTTON */}
        <button type="button" className="hotel-pill-search-btn" onClick={handleSubmit}>
          <Search size={16} />
          <span>SEARCH HOTELS</span>
        </button>

      </div>
    </div>
  );
}
