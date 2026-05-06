import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import axios from "axios";
import "./AccommodationEdit.css";
import {
  X, Home, MapPin, Zap, Droplets, Wifi, Car,
  Wind, Tv, Dumbbell, Waves, Camera, UtensilsCrossed,
  WashingMachine, Trash2, Users, Upload, RefreshCw,
  CheckCircle, Loader2, ChevronRight, ChevronLeft,
  Crosshair, AlertCircle, Pencil, ImagePlus,
  AlertTriangle, CheckCircle2, Info,
  Building2, DoorOpen, CigaretteOff, VolumeX, PartyPopper, PawPrint,
} from "lucide-react";
import { FaMars, FaVenus, FaVenusMars } from "react-icons/fa";

// ── Shared components ──────────────────────────────────────────────────────────
import LoadingScreen from "../Overlays/LoadingScreen/Loader";
import { useToast } from "../Overlays/ToastMessages/ToastContext";

// ─── Config ───────────────────────────────────────────────────────────────────
const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const BASE_URL            = process.env.REACT_APP_API_BASE_URL;
const SLIIT_LOCATION      = { lat: 6.9147, lng: 79.9727 };
const LIBRARIES           = ["places"];
const mapContainerStyle   = { width: "100%", height: "420px", borderRadius: "10px" };
const defaultOptions      = {
  zoomControl: true, mapTypeControl: false, scaleControl: false,
  streetViewControl: false, rotateControl: false, fullscreenControl: true,
};

const ACC_TYPES = [
  { key: "Private Room", icon: DoorOpen,  desc: "Your own private room" },
  { key: "Shared Room",  icon: Users,     desc: "Share with others"     },
  { key: "Apartment",    icon: Building2, desc: "Full apartment"        },
  { key: "House",        icon: Home,      desc: "Entire house"          },
];
const GENDER_OPTIONS = [
  { key: "mixed", label: "Mixed",      desc: "Boys & Girls",   Icon: () => <FaVenusMars size={17} /> },
  { key: "boys",  label: "Boys Only",  desc: "Male tenants",   Icon: () => <FaMars size={17} />      },
  { key: "girls", label: "Girls Only", desc: "Female tenants", Icon: () => <FaVenus size={17} />     },
];
const AMENITY_LIST = [
  { key: "WiFi",    icon: Wifi            },
  { key: "Kitchen", icon: UtensilsCrossed },
  { key: "Parking", icon: Car             },
  { key: "AC",      icon: Wind            },
  { key: "Washer",  icon: WashingMachine  },
  { key: "CCTV",    icon: Camera          },
  { key: "TV",      icon: Tv              },
  { key: "Gym",     icon: Dumbbell        },
  { key: "Pool",    icon: Waves           },
];
const RULE_LIST = [
  { key: "No Smoking",              icon: CigaretteOff },
  { key: "Quiet hours after 10 PM", icon: VolumeX      },
  { key: "No Party",                icon: PartyPopper  },
  { key: "No Pets",                 icon: PawPrint     },
];
const STEPS = [
  { num: 1, label: "Details"   },
  { num: 2, label: "Location"  },
  { num: 3, label: "Photos"    },
  { num: 4, label: "Amenities" },
  { num: 5, label: "Review"    },
];

// ─── Component ────────────────────────────────────────────────────────────────
function AccommodationEdit() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const { isLoaded: mapIsLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // ── Shared toast ───────────────────────────────────────────────────────────
  const { toast } = useToast();

  // ── Page state ─────────────────────────────────────────────────────────────
  const [isLoading,   setIsLoading]   = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving,    setIsSaving]    = useState(false);

  // ── Validation errors ──────────────────────────────────────────────────────
  const [errors, setErrors] = useState({});
  const setError       = (key, msg) => setErrors(p => ({ ...p, [key]: msg }));
  const clearError     = (key)      => setErrors(p => { const n = { ...p }; delete n[key]; return n; });
  const clearAllErrors = ()         => setErrors({});

  const FieldError = ({ field }) =>
    errors[field]
      ? <p className="ae-field-error"><AlertCircle size={12} /> {errors[field]}</p>
      : null;

  // ── Counter component ──────────────────────────────────────────────────────
  const Counter = ({ label, value, setter, min = 1, max = 10, errorKey }) => (
    <div className={`ae-counter${errors[errorKey] ? " ae-counter--error" : ""}`}>
      <span className="ae-counter__label">{label}</span>
      <div className="ae-counter__controls">
        <button type="button" className="ae-counter__btn"
          onClick={() => { setter(v => Math.max(min, Number(v) - 1)); clearError(errorKey); }}
          disabled={Number(value) <= min}>−</button>
        <span className="ae-counter__val">{value}</span>
        <button type="button" className="ae-counter__btn"
          onClick={() => { setter(v => Math.min(max, Number(v) + 1)); clearError(errorKey); }}
          disabled={Number(value) >= max}>+</button>
      </div>
    </div>
  );

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  const [title,            setTitle]            = useState("");
  const [description,      setDescription]      = useState("");
  const [accType,          setAccType]          = useState("Private Room");
  const [genderPref,       setGenderPref]       = useState("mixed");
  const [bedrooms,         setBedrooms]         = useState(1);
  const [beds,             setBeds]             = useState(1);
  const [bathrooms,        setBathrooms]        = useState(1);
  const [pricePerMonth,    setPricePerMonth]    = useState("");
  const [keyMoneyDuration, setKeyMoneyDuration] = useState(0);
  const [utilities,        setUtilities]        = useState({ electricity: false, water: false });
  const [rules,            setRules]            = useState([]);
  const [otherRules,       setOtherRules]       = useState("");

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  const [map,                 setMap]                 = useState(null);
  const [selectedLocation,    setSelectedLocation]    = useState(SLIIT_LOCATION);
  const [address,             setAddress]             = useState("");
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);
  const [distance,            setDistance]            = useState("Distance not available");

  // ── Step 3 — local-only photo state ───────────────────────────────────────
  const fileInputRef   = useRef(null);
  const updateInputRef = useRef(null);
  const [photos,       setPhotos]       = useState([]);
  const [deletedIds,   setDeletedIds]   = useState([]);
  const [replacingIdx, setReplacingIdx] = useState(null);

  // ── Step 4 ─────────────────────────────────────────────────────────────────
  const [amenities, setAmenities] = useState([]);

  // ── Step 5 ─────────────────────────────────────────────────────────────────
  const [isVerified, setIsVerified] = useState(false);
  const [isAgreed,   setIsAgreed]   = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const calculatedKeyMoney = pricePerMonth && keyMoneyDuration
    ? Number(pricePerMonth) * Number(keyMoneyDuration) : 0;

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { setLoadError("No accommodation ID provided."); setIsLoading(false); return; }
    (async () => {
      try {
        const res  = await axios.get(`${BASE_URL}/accommodation/${id}`);
        const data = res.data.data;
        setTitle(data.title || "");
        setDescription(data.description || "");
        setAccType(data.accommodationType || "Private Room");
        setGenderPref(data.genderPreference || "mixed");
        setBedrooms(data.bedrooms || 1);
        setBeds(data.beds || 1);
        setBathrooms(data.bathrooms || 1);
        setPricePerMonth(data.pricePerMonth?.toString() || "");
        setKeyMoneyDuration(data.keyMoneyDuration || 0);
        setUtilities({
          electricity: data.utilityBills?.electricityIncluded ?? false,
          water:       data.utilityBills?.waterIncluded       ?? false,
        });
        const allRules   = data.rules || [];
        const presetKeys = RULE_LIST.map(r => r.key);
        setRules(allRules.filter(r => presetKeys.includes(r)));
        setOtherRules(allRules.filter(r => !presetKeys.includes(r)).join(", "));
        setAddress(data.address || "");
        setAmenities(data.amenities || []);
        if (data.location?.coordinates) {
          const [lng, lat] = data.location.coordinates;
          setSelectedLocation({ lat, lng });
          setHasSelectedLocation(true);
        }
        if (data.images?.length) {
          setPhotos(data.images.map(imgId => ({
            kind: "existing",
            existingId: imgId,
            preview: `${BASE_URL}/photo/${imgId}`,
          })));
        }
        setIsLoading(false);
      } catch {
        setLoadError("Failed to load accommodation data. Please try again.");
        setIsLoading(false);
      }
    })();
  }, [id]);

  // ── Distance ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const R    = 6371e3;
    const dLat = (selectedLocation.lat - SLIIT_LOCATION.lat) * Math.PI / 180;
    const dLon = (selectedLocation.lng - SLIIT_LOCATION.lng) * Math.PI / 180;
    const a    = Math.sin(dLat/2)**2
               + Math.cos(SLIIT_LOCATION.lat*Math.PI/180)
               * Math.cos(selectedLocation.lat*Math.PI/180)
               * Math.sin(dLon/2)**2;
    const d    = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    setDistance(d > 1000 ? (d/1000).toFixed(2)+" km" : Math.round(d)+" m");
  }, [selectedLocation]);

  // ── Map ────────────────────────────────────────────────────────────────────
  const onMapLoad  = useCallback(m => setMap(m), []);
  const onMapClick = (e) => {
    const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setSelectedLocation(loc); setHasSelectedLocation(true); clearError("location");
    new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
      if (status === "OK" && results[0]) { setAddress(results[0].formatted_address); clearError("address"); }
    });
  };
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) { toast("Geolocation is not supported.", "warning"); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSelectedLocation(loc); setHasSelectedLocation(true); clearError("location");
        if (map) { map.panTo(loc); map.setZoom(17); }
        new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
          if (status === "OK" && results[0]) { setAddress(results[0].formatted_address); clearError("address"); }
        });
      },
      () => toast("Could not get your location. Check browser permissions.", "warning"),
    );
  };
  const handleSLIIT = () => {
    setSelectedLocation(SLIIT_LOCATION); setHasSelectedLocation(true); clearError("location");
    if (map) { map.panTo(SLIIT_LOCATION); map.setZoom(17); }
  };

  // ── Local-only photo handlers ──────────────────────────────────────────────
  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const slots = 5 - photos.length;
    if (slots <= 0) { toast("Maximum 5 photos allowed.", "warning"); return; }
    files.slice(0, slots).forEach(file => {
      setPhotos(p => [...p, { kind: "new", file, preview: URL.createObjectURL(file) }]);
    });
    clearError("photos");
    e.target.value = null;
  };
  const handleDeletePhoto = (index) => {
    const item = photos[index];
    if (item.existingId) setDeletedIds(p => [...p, item.existingId]);
    if (item.kind !== "existing") URL.revokeObjectURL(item.preview);
    setPhotos(p => p.filter((_, i) => i !== index));
  };
  const triggerReplace = (index) => { setReplacingIdx(index); updateInputRef.current.click(); };
  const handlePhotoReplace = (e) => {
    const file = e.target.files[0];
    if (!file || replacingIdx === null) return;
    const item = photos[replacingIdx];
    if (item.existingId) setDeletedIds(p => [...p, item.existingId]);
    if (item.kind !== "existing") URL.revokeObjectURL(item.preview);
    const updated = [...photos];
    updated[replacingIdx] = { kind: "new", file, preview: URL.createObjectURL(file) };
    setPhotos(updated);
    setReplacingIdx(null);
    e.target.value = null;
  };

  // ── Amenities & Rules ──────────────────────────────────────────────────────
  const toggleAmenity = (key) =>
    setAmenities(p => p.includes(key) ? p.filter(a => a !== key) : [...p, key]);
  const toggleRule = (key) =>
    setRules(p => p.includes(key) ? p.filter(r => r !== key) : [...p, key]);
  const clampValue = (value, min, max, setter) => {
    if (value === "") return;
    const num = Number(value);
    setter(num < min ? min : num > max ? max : num);
  };

  // ── Step validation ────────────────────────────────────────────────────────
  const validateStep1 = () => {
    let valid = true;
    if (!title.trim())                 { setError("title",       "Title is required.");                          valid = false; }
    else if (title.length > 80)        { setError("title",       "Title cannot exceed 80 characters.");          valid = false; }
    if (!description.trim())           { setError("description", "Description is required.");                    valid = false; }
    else if (description.length > 400) { setError("description", "Description cannot exceed 400 characters.");   valid = false; }
    if (bedrooms < 1 || bedrooms > 10)   { setError("bedrooms",  "Bedrooms must be between 1 and 10.");         valid = false; }
    if (beds < 1 || beds > 10)           { setError("beds",      "Beds must be between 1 and 10.");             valid = false; }
    if (bathrooms < 1 || bathrooms > 10) { setError("bathrooms", "Bathrooms must be between 1 and 10.");        valid = false; }
    const numPrice = Number(pricePerMonth);
    if (!pricePerMonth || numPrice < 1000 || numPrice > 500000)
      { setError("price", "Price must be between LKR 1,000 and 500,000."); valid = false; }
    const numKey = Number(keyMoneyDuration);
    if (numKey < 0 || numKey > 6)
      { setError("keyDuration", "Key money duration must be 0–6 months."); valid = false; }
    if (!valid) toast("Please fix the highlighted fields before continuing.", "error");
    return valid;
  };
  const validateStep2 = () => {
    let valid = true;
    if (!hasSelectedLocation) { setError("location", "Please pin your location on the map."); valid = false; }
    if (!address.trim())      { setError("address",  "Address is required.");                  valid = false; }
    if (!valid) toast("Please complete the location details.", "error");
    return valid;
  };
  const validateStep3 = () => {
    if (photos.length === 0) {
      setError("photos", "Please add at least one photo.");
      toast("Please add at least one photo.", "error");
      return false;
    }
    clearError("photos");
    return true;
  };
  const validateStep5 = () => {
    let valid = true;
    if (!isVerified) { setError("verify", "Please confirm accuracy.");   valid = false; }
    if (!isAgreed)   { setError("agree",  "Please agree to the terms."); valid = false; }
    if (!valid) toast("Please fix the highlighted fields before saving.", "error");
    return valid;
  };

  const handleNext = () => {
    const validators = { 1: validateStep1, 2: validateStep2, 3: validateStep3 };
    if (validators[currentStep] && !validators[currentStep]()) return;
    clearAllErrors();
    setCurrentStep(s => s + 1);
  };
  const handlePrev = () => { clearAllErrors(); setCurrentStep(s => s - 1); };
  const handleExit = () => navigate(-1);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateStep5()) return;
    setIsSaving(true);
    try {
      // 1. Delete removed photos
      for (const deleteId of deletedIds) {
        try {
          await axios.delete(`${BASE_URL}/photo/${deleteId}`);
        } catch {
          console.warn(`Failed to delete photo ${deleteId}`);
        }
      }

      // 2. Upload new photos and collect final IDs
      const finalImageIds = [];
      for (let i = 0; i < photos.length; i++) {
        const item = photos[i];
        if (item.kind === "existing") {
          finalImageIds.push(item.existingId);
        } else if (item.kind === "new") {
          const fd = new FormData();
          fd.append("photo", item.file);
          try {
            const res = await axios.post(`${BASE_URL}/photo`, fd);
            if (res.data.success) {
              finalImageIds.push(res.data.data._id);
            } else {
              throw new Error("Upload response indicated failure");
            }
          } catch {
            toast(`Photo ${i + 1} upload failed. Please try again.`, "error");
            setIsSaving(false);
            return;
          }
        }
      }

      // 3. Save accommodation
      await axios.put(`${BASE_URL}/accommodation/${id}`, {
        title, description, address,
        accommodationType: accType,
        genderPreference: genderPref,
        bedrooms: Number(bedrooms), beds: Number(beds), bathrooms: Number(bathrooms),
        pricePerMonth: Number(pricePerMonth), keyMoneyDuration: Number(keyMoneyDuration),
        utilityBills: { electricityIncluded: utilities.electricity, waterIncluded: utilities.water },
        location: { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
        distance, amenities,
        rules: otherRules ? [...rules, otherRules] : rules,
        images: finalImageIds,
      });

      toast("Accommodation updated successfully!", "success");
      setTimeout(() => navigate(-1), 1800);

    } catch (err) {
      toast(err.response?.data?.message || "Something went wrong. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (isLoading) return <LoadingScreen />;

  if (loadError) return (
    <div className="ae-root">
      <div className="ae-topbar">
        <a href="/Listings" className="hn-nav__logo">
          <img src="/Images/logo2.png" alt="Unisewana Logo"
            style={{ height: "32px", width: "auto", display: "block" }} />
        </a>
        <button className="ae-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>
      <div className="ae-state-screen">
        <AlertCircle size={32} style={{ color: "#cf1322" }} />
        <p style={{ color: "#cf1322", fontWeight: 500 }}>{loadError}</p>
        <button className="ae-btn-primary" onClick={handleExit}>Go Back</button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ae-root">
      {/* Hidden file inputs */}
      <input type="file" multiple accept="image/*" ref={fileInputRef}   hidden onChange={handlePhotoAdd} />
      <input type="file"          accept="image/*" ref={updateInputRef} hidden onChange={handlePhotoReplace} />

      {/* Top Bar */}
      <div className="ae-topbar">
        <a href="/Listings" className="hn-nav__logo">
          <img src="/Images/logo2.png" alt="Unisewana Logo"
            style={{ height: "32px", width: "auto", display: "block" }} />
        </a>
        <div className="ae-topbar-center">
          <Pencil size={13} />
          <span>Editing listing</span>
          <div className="ae-topbar-center-dot" />
          <span style={{ color: "#1c1c1e", fontWeight: 700 }}>{title || "…"}</span>
        </div>
        <button className="ae-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>

      {/* Progress Bar */}
      <div className="ae-progress-wrapper">
        <div className="ae-progress-bar">
          {STEPS.map(step => (
            <div key={step.num}
              className={`ae-progress-segment${currentStep >= step.num ? " filled" : ""}`} />
          ))}
        </div>
      </div>

      <div className="ae-layout">

        {/* ══ STEP 1 — Details ══ */}
        {currentStep === 1 && (
          <div className="ae-card">
            <div className="ae-card-title">Property details</div>
            <div className="ae-card-subtitle">Update the basic information about your accommodation</div>

            <div className="ae-field">
              <label className="ae-label">Property title <span>*</span></label>
              <input className={`ae-input${errors.title ? " ae-input--error" : ""}`}
                type="text" value={title} maxLength={80}
                onChange={e => { setTitle(e.target.value); clearError("title"); }}
                placeholder="e.g. Cozy 2-Bedroom Apartment near SLIIT" />
              <div className="ae-field-footer" style={{ justifyContent: "space-between" }}>
                <FieldError field="title" />
                <span className={`ae-char-count${title.length > 65 ? " warn" : ""}`}>{title.length}/80</span>
              </div>
            </div>

            <div className="ae-field">
              <label className="ae-label">Description <span>*</span></label>
              <textarea className={`ae-textarea${errors.description ? " ae-input--error" : ""}`}
                value={description} maxLength={400}
                onChange={e => { setDescription(e.target.value); clearError("description"); }}
                placeholder="Describe your property — location perks, room quality, nearby facilities…" />
              <div className="ae-field-footer" style={{ justifyContent: "space-between" }}>
                <FieldError field="description" />
                <span className={`ae-char-count${description.length > 320 ? " warn" : ""}`}>{description.length}/400</span>
              </div>
            </div>

            <div className="ae-field">
              <label className="ae-label">Accommodation type <span>*</span></label>
              <div className="ae-type-grid">
                {ACC_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.key} type="button"
                      className={`ae-type-card${accType === t.key ? " selected" : ""}`}
                      onClick={() => setAccType(t.key)}>
                      <div className="ae-type-icon"><Icon size={18} /></div>
                      <span className="ae-type-name">{t.key}</span>
                      <span className="ae-type-desc">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ae-field">
              <label className="ae-label">Accommodation for <span>*</span></label>
              <div className="ae-option-row">
                {GENDER_OPTIONS.map(g => (
                  <button key={g.key} type="button"
                    className={`ae-option-card${genderPref === g.key ? " active" : ""}`}
                    onClick={() => setGenderPref(g.key)}>
                    <div className="ae-option-icon-box"><g.Icon /></div>
                    <div className="ae-option-info">
                      <span className="ae-option-name">{g.label}</span>
                      <span className="ae-option-desc">{g.desc}</span>
                    </div>
                    {genderPref === g.key && <CheckCircle size={16} style={{ color: "#FF6B2B", flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="ae-divider" />

            <div className="ae-field">
              <label className="ae-label">Capacity <span>(1–10 each)</span></label>
              <div className="ae-counters-row">
                <div>
                  <Counter label="Bedrooms"  value={bedrooms}  setter={setBedrooms}  errorKey="bedrooms" />
                  <FieldError field="bedrooms" />
                </div>
                <div>
                  <Counter label="Beds"      value={beds}      setter={setBeds}      errorKey="beds" />
                  <FieldError field="beds" />
                </div>
                <div>
                  <Counter label="Bathrooms" value={bathrooms} setter={setBathrooms} errorKey="bathrooms" />
                  <FieldError field="bathrooms" />
                </div>
              </div>
            </div>

            <div className="ae-divider" />

            <div className="ae-field">
              <label className="ae-label">Utilities included</label>
              <div className="ae-utility-row">
                <button type="button"
                  className={`ae-utility-card${utilities.electricity ? " active" : ""}`}
                  onClick={() => setUtilities(u => ({ ...u, electricity: !u.electricity }))}>
                  <Zap size={18} /><span>Electricity</span>
                  <span className={`ae-badge${utilities.electricity ? " on" : " off"}`}>
                    {utilities.electricity ? "Included" : "Not incl."}
                  </span>
                </button>
                <button type="button"
                  className={`ae-utility-card${utilities.water ? " active" : ""}`}
                  onClick={() => setUtilities(u => ({ ...u, water: !u.water }))}>
                  <Droplets size={18} /><span>Water</span>
                  <span className={`ae-badge${utilities.water ? " on" : " off"}`}>
                    {utilities.water ? "Included" : "Not incl."}
                  </span>
                </button>
              </div>
            </div>

            <div className="ae-divider" />

            <div className="ae-field">
              <label className="ae-label">Pricing</label>
              <div className="ae-row">
                <div>
                  <label className="ae-sub-label">Rent / month (LKR) <span>*</span></label>
                  <input className={`ae-input${errors.price ? " ae-input--error" : ""}`}
                    type="number" value={pricePerMonth} placeholder="e.g. 25000"
                    onChange={e => { setPricePerMonth(e.target.value); clearError("price"); }}
                    onBlur={e => clampValue(e.target.value, 1000, 500000, setPricePerMonth)} />
                  <FieldError field="price" />
                </div>
                <div>
                  <label className="ae-sub-label">Key money (months)</label>
                  <input className={`ae-input${errors.keyDuration ? " ae-input--error" : ""}`}
                    type="number" min="0" max="6" value={keyMoneyDuration}
                    onChange={e => { setKeyMoneyDuration(e.target.value); clearError("keyDuration"); }}
                    onBlur={e => clampValue(e.target.value, 0, 6, setKeyMoneyDuration)} />
                  <FieldError field="keyDuration" />
                </div>
              </div>
            </div>

            {calculatedKeyMoney > 0 && (
              <div className="ae-key-money-info">
                <span>🔑 Key money total:</span>
                <strong>LKR {calculatedKeyMoney.toLocaleString()}</strong>
              </div>
            )}

            <div className="ae-divider" />

            <div className="ae-field">
              <label className="ae-label">House rules</label>
              <div className="ae-rules-grid">
                {RULE_LIST.map(({ key, icon: Icon }) => {
                  const active = rules.includes(key);
                  return (
                    <button key={key} type="button"
                      className={`ae-rule-item${active ? " active" : ""}`}
                      onClick={() => toggleRule(key)}>
                      <Icon size={15} /><span>{key}</span>
                      {active && <CheckCircle size={12} className="ae-rule-check" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ae-field">
              <label className="ae-label">Other rules <span>optional</span></label>
              <textarea className="ae-textarea" rows="2"
                value={otherRules} onChange={e => setOtherRules(e.target.value)}
                placeholder="e.g. No loud music after 11 PM, no overnight guests…" />
            </div>

            <div className="ae-nav">
              <div />
              <button className="ae-btn-primary" onClick={handleNext}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ══ STEP 2 — Location ══ */}
        {currentStep === 2 && (
          <div className="ae-card">
            <div className="ae-card-title">Property location</div>
            <div className="ae-card-subtitle">Click the map to pin your property's exact position</div>

            {mapLoadError ? (
              <div className="ae-map-error">
                <MapPin size={22} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Map failed to load</div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>Check your internet connection and reload.</div>
                </div>
              </div>
            ) : !mapIsLoaded ? (
              <div className="ae-map-loading"><Loader2 size={22} className="ae-spin" /><span>Loading map…</span></div>
            ) : (
              <div className="ae-map-wrapper">
                <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation}
                  zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                  <Marker position={selectedLocation} draggable onDragEnd={onMapClick} />
                </GoogleMap>
              </div>
            )}

            {errors.location && (
              <div className="ae-location-error"><AlertCircle size={14} /> {errors.location}</div>
            )}

            <div className="ae-map-actions">
              <button className="ae-map-btn" onClick={handleSLIIT}><MapPin size={14} /> SLIIT University</button>
              <button className="ae-map-btn" onClick={handleCurrentLocation}><Crosshair size={14} /> Use my location</button>
            </div>

            {hasSelectedLocation && (
              <div className="ae-distance-badge">
                <MapPin size={13} /><span><strong>{distance}</strong> from SLIIT University</span>
              </div>
            )}

            <div className="ae-field" style={{ marginTop: 16 }}>
              <label className="ae-label">Address <span>*</span></label>
              <textarea className={`ae-textarea${errors.address ? " ae-input--error" : ""}`}
                rows="2" value={address}
                onChange={e => { setAddress(e.target.value); clearError("address"); }}
                placeholder="Full address…" />
              <FieldError field="address" />
            </div>

            <div className="ae-nav">
              <button className="ae-btn-secondary" onClick={handlePrev}><ChevronLeft size={15} /> Previous</button>
              <button className="ae-btn-primary"   onClick={handleNext}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 — Photos ══ */}
        {currentStep === 3 && (
          <div className="ae-card">
            <div className="ae-card-title">Property photos</div>
            <div className="ae-card-subtitle">
              Changes are saved only when you click <strong>Save changes</strong> — feel free to add, remove or replace photos here
            </div>

            <div className="ae-field">
              <label className="ae-label">Photos <span>* at least 1 required</span></label>
              <div className={`ae-upload-zone${errors.photos ? " ae-upload-zone--error" : ""}`}
                onClick={() => {
                  if (photos.length >= 5) { toast("Maximum 5 photos allowed.", "warning"); return; }
                  fileInputRef.current.click();
                }}>
                <div className="ae-upload-icon"><Upload size={20} /></div>
                <div className="ae-upload-text">
                  {photos.length >= 5 ? "Maximum photos reached" : "Click to add photos"}
                </div>
                <div className="ae-upload-hint">
                  PNG, JPG — up to 5 photos · {photos.length}/5 · uploaded on save
                </div>
              </div>
              <FieldError field="photos" />
            </div>

            {(deletedIds.length > 0 || photos.some(p => p.kind === "new")) && (
              <div className="ae-pending-badge">
                <AlertTriangle size={13} />
                <span>
                  {[
                    deletedIds.length > 0 &&
                      `${deletedIds.length} photo${deletedIds.length > 1 ? "s" : ""} queued for deletion`,
                    photos.filter(p => p.kind === "new").length > 0 &&
                      `${photos.filter(p => p.kind === "new").length} new photo${photos.filter(p => p.kind === "new").length > 1 ? "s" : ""} ready to upload`,
                  ].filter(Boolean).join(" · ")}
                  {" "}— will apply on Save
                </span>
              </div>
            )}

            <div className="ae-photo-grid">
              {[0,1,2,3,4].map(index => (
                <div key={index} className="ae-photo-box">
                  {photos[index] ? (
                    <div className="ae-photo-box-inner">
                      {index === 0 && <div className="ae-photo-cover-badge">Cover</div>}
                      {photos[index].kind === "new" && <div className="ae-photo-pending-overlay">New</div>}
                      <img src={photos[index].preview} alt={`photo-${index}`} />
                      <div className="ae-photo-box-actions">
                        <button type="button" className="ae-icon-btn del"
                          onClick={() => handleDeletePhoto(index)} title="Remove photo">
                          <Trash2 size={11} />
                        </button>
                        <button type="button" className="ae-icon-btn upd"
                          onClick={() => triggerReplace(index)} title="Replace photo">
                          <RefreshCw size={11} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="ae-photo-box-empty" onClick={() => fileInputRef.current.click()}>
                      <ImagePlus size={18} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="ae-nav">
              <button className="ae-btn-secondary" onClick={handlePrev}><ChevronLeft size={15} /> Previous</button>
              <button className="ae-btn-primary"   onClick={handleNext}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ══ STEP 4 — Amenities ══ */}
        {currentStep === 4 && (
          <div className="ae-card">
            <div className="ae-card-title">Amenities</div>
            <div className="ae-card-subtitle">Select all facilities available at your property</div>

            <div className="ae-amenities-grid">
              {AMENITY_LIST.map(({ key, icon: Icon }) => {
                const active = amenities.includes(key);
                return (
                  <button key={key} type="button"
                    className={`ae-amenity-item${active ? " active" : ""}`}
                    onClick={() => toggleAmenity(key)}>
                    <Icon size={15} />
                    <span>{key}</span>
                    {active && <CheckCircle size={12} className="ae-amenity-check" />}
                  </button>
                );
              })}
            </div>

            <div className="ae-nav">
              <button className="ae-btn-secondary" onClick={handlePrev}><ChevronLeft size={15} /> Previous</button>
              <button className="ae-btn-primary"   onClick={handleNext}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ══ STEP 5 — Review ══ */}
        {currentStep === 5 && (
          <div className="ae-card">
            <div className="ae-card-title">Review & save</div>
            <div className="ae-card-subtitle">
              Confirm everything looks right — photo changes will be applied when you save
            </div>

            <div className="ae-section-label">Listing preview</div>
            <div className="ae-preview-card">
              {photos[0]
                ? <img src={photos[0].preview} alt="cover" className="ae-preview-cover" />
                : <div className="ae-preview-cover-placeholder"><ImagePlus size={28} color="#555" /></div>}
              <div className="ae-preview-body">
                <div className="ae-preview-name">{title || "Your Property Title"}</div>
                <div className="ae-preview-meta">
                  <span><MapPin size={12} /> {address ? address.split(",")[0] : "Location not set"}</span>
                  <span><Zap size={12} /> LKR {Number(pricePerMonth||0).toLocaleString()} / month</span>
                </div>
                <div className="ae-preview-chips">
                  <span className="ae-chip orange">{accType}</span>
                  <span className="ae-chip dark">
                    {genderPref === "boys" ? "Boys Only" : genderPref === "girls" ? "Girls Only" : "Mixed"}
                  </span>
                  {utilities.electricity && <span className="ae-chip dark"><Zap size={11}/> Electricity incl.</span>}
                  {utilities.water       && <span className="ae-chip dark"><Droplets size={11}/> Water incl.</span>}
                </div>
              </div>
            </div>

            <div className="ae-divider" />

            <div style={{ marginBottom: 24 }}>
              <div className="ae-section-label">Property details</div>
              <table className="ae-summary-table">
                <tbody>
                  {[
                    ["Title",     title],
                    ["Type",      accType],
                    ["Gender",    genderPref === "boys" ? "Boys Only" : genderPref === "girls" ? "Girls Only" : "Mixed"],
                    ["Bedrooms",  bedrooms],
                    ["Beds",      beds],
                    ["Bathrooms", bathrooms],
                    ["Rent",      `LKR ${Number(pricePerMonth||0).toLocaleString()} / month`],
                    ["Key money", keyMoneyDuration > 0 ? `${keyMoneyDuration} month(s)` : "None"],
                    ["Distance",  distance],
                    ["Address",   address],
                    ["Amenities", amenities.length > 0 ? amenities.join(", ") : "None selected"],
                    ["Rules",     [...rules, ...(otherRules ? [otherRules] : [])].join(", ") || "None"],
                    ["Photos",    `${photos.length} (${photos.filter(p => p.kind === "new").length} new, ${deletedIds.length} to delete)`],
                  ].map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
                </tbody>
              </table>
            </div>

            <div className="ae-divider" />

            <div className="ae-verify-section">
              <div className="ae-verify-section__title">Confirmation</div>
              <label className={`ae-check-label${errors.verify ? " ae-check-label--error" : ""}`}>
                <input type="checkbox" checked={isVerified}
                  onChange={e => { setIsVerified(e.target.checked); clearError("verify"); }} />
                I confirm all updated information is accurate and up to date.
              </label>
              {errors.verify && (
                <p className="ae-field-error" style={{ marginLeft: 26 }}>
                  <AlertCircle size={12} /> {errors.verify}
                </p>
              )}
              <label className={`ae-check-label${errors.agree ? " ae-check-label--error" : ""}`} style={{ marginTop: 4 }}>
                <input type="checkbox" checked={isAgreed}
                  onChange={e => { setIsAgreed(e.target.checked); clearError("agree"); }} />
                I agree to the Terms of Service and listing guidelines.
              </label>
              {errors.agree && (
                <p className="ae-field-error" style={{ marginLeft: 26 }}>
                  <AlertCircle size={12} /> {errors.agree}
                </p>
              )}
            </div>

            {isSaving && (
              <div className="ae-saving-indicator">
                <Loader2 size={15} className="ae-spin" />
                Applying photo changes and saving your listing…
              </div>
            )}

            <div className="ae-nav">
              <button className="ae-btn-secondary" onClick={handlePrev} disabled={isSaving}>
                <ChevronLeft size={15} /> Previous
              </button>
              <button className="ae-btn-save" onClick={handleSave}
                disabled={isSaving || !isVerified || !isAgreed}>
                {isSaving
                  ? <><Loader2 size={15} className="ae-spin"/> Saving…</>
                  : <><CheckCircle size={15}/> Save changes</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AccommodationEdit;