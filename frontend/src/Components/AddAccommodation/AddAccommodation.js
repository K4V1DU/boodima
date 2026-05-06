import React, { useState, useCallback, useRef, useEffect } from "react";
import "./AddAccommodation.css";
import {
  GoogleMap,
  Marker,
  Autocomplete,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import {
  FaTrash,
  FaSyncAlt,
  FaMars,
  FaVenus,
  FaVenusMars,
} from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import axios from "axios";
import {
  Home,
  Users,
  BedDouble,
  Bath,
  Wifi,
  Car,
  Wind,
  UtensilsCrossed,
  Tv,
  Dumbbell,
  Waves,
  WashingMachine,
  Camera,
  ShieldCheck,
  MapPin,
  Crosshair,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  Upload,
  Image as ImageIcon,
  Building2,
  DoorOpen,
  Zap,
  Droplets,
  CigaretteOff,
  VolumeX,
  PartyPopper,
  PawPrint,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  AlertTriangle,
} from "lucide-react";

// ── Shared toast ───────────────────────────────────────────────────────────────
import { useToast } from "../Overlays/ToastMessages/ToastContext";

const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const SLIIT_LOCATION = { lat: 6.9147, lng: 79.9727 };
const LIBRARIES = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "420px",
  borderRadius: "10px",
};
const defaultOptions = {
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
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
  { num: 1, label: "Details"  },
  { num: 2, label: "Location" },
  { num: 3, label: "Photos"   },
  { num: 4, label: "Save"     },
];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R    = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Component ────────────────────────────────────────────────────────────────
const AddAccommodation = () => {
  const navigate = useNavigate();
  const updateInputRef = useRef(null);

  // ── Shared toast ───────────────────────────────────────────────────────────
  const { toast } = useToast();

  const { isLoaded: mapsReady } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [showForm,    setShowForm]    = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const [isLoggedIn,  setIsLoggedIn]  = useState(true);

  // ── Validation errors ──────────────────────────────────────────────────────
  const [errors, setErrors] = useState({});
  const setError   = (key, msg) => setErrors(p => ({ ...p, [key]: msg }));
  const clearError = (key)      => setErrors(p => { const n = { ...p }; delete n[key]; return n; });

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  const [genderPref,  setGenderPref]  = useState("mixed");
  const [accType,     setAccType]     = useState("Private Room");
  const [rooms,       setRooms]       = useState(1);
  const [beds,        setBeds]        = useState(1);
  const [bathrooms,   setBathrooms]   = useState(1);
  const [utilities,   setUtilities]   = useState({ electricity: false, water: false });
  const [amenities,   setAmenities]   = useState([]);

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  const [selectedLocation,    setSelectedLocation]    = useState(SLIIT_LOCATION);
  const [address,             setAddress]             = useState("");
  const [map,                 setMap]                 = useState(null);
  const [autocomplete,        setAutocomplete]        = useState(null);
  const [searchInput,         setSearchInput]         = useState("");
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);

  // ── Step 3 ─────────────────────────────────────────────────────────────────
  const [photos,        setPhotos]        = useState([]);
  const [updatingIndex, setUpdatingIndex] = useState(null);
  const [title,         setTitle]         = useState("");
  const [description,   setDescription]   = useState("");

  // ── Step 4 ─────────────────────────────────────────────────────────────────
  const [price,       setPrice]       = useState("");
  const [keyDuration, setKeyDuration] = useState(0);
  const [rules,       setRules]       = useState([]);
  const [otherRules,  setOtherRules]  = useState("");
  const [isVerified,  setIsVerified]  = useState(false);
  const [isAgreed,    setIsAgreed]    = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const calculatedKeyMoney = price && keyDuration
    ? Number(price) * Number(keyDuration) : 0;
  const distanceFromSLIIT = calculateDistance(
    selectedLocation.lat, selectedLocation.lng,
    SLIIT_LOCATION.lat,   SLIIT_LOCATION.lng,
  );
  const getFormattedDistance = () =>
    distanceFromSLIIT < 1
      ? `${Math.round(distanceFromSLIIT * 1000)} meters`
      : `${distanceFromSLIIT.toFixed(1)} km`;

  // ── Login guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const uid = localStorage.getItem("CurrentUserId");
    if (!uid) {
      setIsLoggedIn(false);
      toast("You're not logged in. Please log in to list an accommodation.", "warning");
    }
  }, []); // eslint-disable-line

  // ── Helpers ────────────────────────────────────────────────────────────────
  const clampValue = (value, min, max, setter) => {
    if (value === "") return;
    const num = Number(value);
    setter(num < min ? min : num > max ? max : num);
  };
  const toggleAmenity = (name) =>
    setAmenities(p => p.includes(name) ? p.filter(a => a !== name) : [...p, name]);
  const toggleRule = (name) =>
    setRules(p => p.includes(name) ? p.filter(r => r !== name) : [...p, name]);

  const handleExit = () => navigate("/Listings");
  const handleGetStarted = () => {
    if (!isLoggedIn) {
      toast("Please log in before listing an accommodation.", "error");
      return;
    }
    setShowForm(true);
  };

  // ── Step validation ────────────────────────────────────────────────────────
  const validateStep1 = () => {
    let valid = true;
    if (rooms < 1 || rooms > 10)         { setError("rooms",     "Rooms must be between 1 and 10.");     valid = false; }
    if (beds < 1 || beds > 10)           { setError("beds",      "Beds must be between 1 and 10.");      valid = false; }
    if (bathrooms < 1 || bathrooms > 10) { setError("bathrooms", "Bathrooms must be between 1 and 10."); valid = false; }
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
    let valid = true;
    if (photos.length === 0)       { setError("photos",      "Please upload at least one photo.");        valid = false; }
    if (!title.trim())             { setError("title",       "Title is required.");                       valid = false; }
    else if (title.length > 50)    { setError("title",       "Title cannot exceed 50 characters.");       valid = false; }
    if (!description.trim())       { setError("description", "Description is required.");                 valid = false; }
    else if (description.length > 200) { setError("description", "Description cannot exceed 200 characters."); valid = false; }
    if (!valid) toast("Please fix the highlighted fields before continuing.", "error");
    return valid;
  };
  const validateStep4 = () => {
    const numPrice = Number(price);
    const numKey   = Number(keyDuration);
    let valid = true;
    if (!price || numPrice < 5000 || numPrice > 50000)
      { setError("price",       "Price must be between LKR 5,000 and 50,000."); valid = false; }
    if (numKey < 0 || numKey > 3)
      { setError("keyDuration", "Key money duration must be 0–3 months.");       valid = false; }
    if (!isVerified) { setError("verify", "Please confirm accuracy.");   valid = false; }
    if (!isAgreed)   { setError("agree",  "Please agree to the terms."); valid = false; }
    if (!valid) toast("Please fix the highlighted fields before saving.", "error");
    return valid;
  };

  const handleNextStep     = () => {
    const validators = [null, validateStep1, validateStep2, validateStep3];
    if (validators[currentStep] && !validators[currentStep]()) return;
    setCurrentStep(s => s + 1);
  };
  const handlePreviousStep = () => setCurrentStep(s => s - 1);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSaveListing = async () => {
    if (!validateStep4()) return;

    const CURRENT_USER_ID = localStorage.getItem("CurrentUserId") ?? "";
    if (!CURRENT_USER_ID) {
      toast("Session expired. Please log in again.", "error");
      return;
    }

    setIsSaving(true);
    const imageIds = [];

    for (let i = 0; i < photos.length; i++) {
      const fd = new FormData();
      fd.append("photo", photos[i].file);
      try {
        const res = await axios.post(`${BASE_URL}/Photo`, fd);
        if (res.data.success) imageIds.push(res.data.data._id);
        else throw new Error("Upload failed");
      } catch {
        toast(`Photo ${i + 1} upload failed. Please try again.`, "error");
        setIsSaving(false);
        return;
      }
    }

    const getYesterday = () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    };

    const payload = {
      owner:             CURRENT_USER_ID,
      title:             title.trim(),
      description:       description.trim(),
      address:           address.trim(),
      location:          { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
      distance:          getFormattedDistance(),
      price:             Number(price),
      pricePerMonth:     Number(price),
      type:              accType,
      accommodationType: accType,
      keyMoneyDuration:  Number(keyDuration),
      genderPreference:  genderPref,
      bedrooms:          Number(rooms),
      beds:              Number(beds),
      bathrooms:         Number(bathrooms),
      amenities,
      rules:             otherRules ? [...rules, otherRules] : rules,
      utilityBills:      { electricityIncluded: utilities.electricity, waterIncluded: utilities.water },
      images:            imageIds,
      isAvailable:       true,
      expireDate:        getYesterday(),
    };

    try {
      const res = await axios.post(`${BASE_URL}/Accommodation`, payload);
      if (res.data) {
        toast("Listing saved successfully!", "success");
        setTimeout(() => navigate("/Listings"), 1800);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        "Something went wrong. Check required fields.";
      toast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Photo handlers ─────────────────────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 5 - photos.length;
    if (remaining <= 0) { toast("Maximum 5 photos allowed.", "warning"); return; }
    files.slice(0, remaining).forEach(file =>
      setPhotos(p => [...p, { file, preview: URL.createObjectURL(file) }])
    );
    clearError("photos");
    e.target.value = null;
  };
  const handleDeletePhoto = (index) => setPhotos(p => p.filter((_, i) => i !== index));
  const triggerUpdate = (index) => { setUpdatingIndex(index); updateInputRef.current.click(); };
  const handlePhotoUpdate = (e) => {
    const file = e.target.files[0];
    if (!file || updatingIndex === null) return;
    const updated = [...photos];
    updated[updatingIndex] = { file, preview: URL.createObjectURL(file) };
    setPhotos(updated);
    setUpdatingIndex(null);
    e.target.value = null;
  };

  // ── Map handlers ───────────────────────────────────────────────────────────
  const onMapLoad          = useCallback(m => setMap(m), []);
  const onAutocompleteLoad = (ac) => setAutocomplete(ac);

  const pinLocation = useCallback((loc, addr) => {
    setSelectedLocation(loc);
    setHasSelectedLocation(true);
    if (addr) { setAddress(addr); setSearchInput(addr); }
    clearError("location");
    clearError("address");
    if (map) { map.panTo(loc); map.setZoom(17); }
  }, [map]); // eslint-disable-line

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (place.geometry?.location) {
      const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
      pinLocation(loc, place.formatted_address || place.name);
    }
  };
  const onMapClick = (e) => {
    const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setSelectedLocation(loc);
    setHasSelectedLocation(true);
    clearError("location");
    new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
      if (status === "OK" && results[0]) {
        setAddress(results[0].formatted_address);
        setSearchInput(results[0].formatted_address);
        clearError("address");
      }
    });
  };
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { toast("Geolocation is not supported by your browser.", "warning"); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSelectedLocation(loc);
        setHasSelectedLocation(true);
        clearError("location");
        new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
          if (status === "OK" && results[0]) {
            setAddress(results[0].formatted_address);
            setSearchInput(results[0].formatted_address);
            clearError("address");
          }
        });
        if (map) { map.panTo(loc); map.setZoom(17); }
      },
      () => toast("Could not get your location. Please check browser permissions.", "warning"),
    );
  };
  const handleSLIITLocation = () => {
    pinLocation(SLIIT_LOCATION, "SLIIT University, Malabe, Sri Lanka");
  };

  // ── Field helpers ──────────────────────────────────────────────────────────
  const FieldError = ({ field }) =>
    errors[field]
      ? <p className="aac-field-error"><AlertCircle size={12} /> {errors[field]}</p>
      : null;

  const Counter = ({ label, value, setter, min = 1, max = 10, errorKey }) => (
    <div className={`aac-counter${errors[errorKey] ? " aac-counter--error" : ""}`}>
      <span className="aac-counter__label">{label}</span>
      <div className="aac-counter__controls">
        <button type="button" className="aac-counter__btn"
          onClick={() => { setter(v => Math.max(min, Number(v) - 1)); clearError(errorKey); }}
          disabled={Number(value) <= min}>−</button>
        <span className="aac-counter__val">{value}</span>
        <button type="button" className="aac-counter__btn"
          onClick={() => { setter(v => Math.min(max, Number(v) + 1)); clearError(errorKey); }}
          disabled={Number(value) >= max}>+</button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="aac-root">
      {/* Hidden file input for photo update */}
      <input type="file" accept="image/*" ref={updateInputRef}
        style={{ display: "none" }} onChange={handlePhotoUpdate} />

      {/* TOP BAR */}
      <div className={`aac-topbar${!showForm ? " dark" : ""}`}>
        <div className="hn-nav__logo-wrap">
          <a href="/Listings" className="hn-nav__logo">
            <img
              src={showForm ? "/Images/logo2.png" : "/Images/logo6.png"}
              alt="Unisewana Logo"
              style={{ height: "32px", width: "auto", display: "block" }}
            />
          </a>
        </div>
        <button className="aac-exit-btn" onClick={handleExit}>
          <IoClose size={14} /> Exit
        </button>
      </div>

      {/* HERO */}
      {!showForm && (
        <div className="aac-hero">
          <div className="aac-hero__bg" />
          <div className="aac-hero__overlay" />
          <div className="aac-hero__content">
            <p className="aac-hero__eyebrow">List your space on Uni Sewana</p>
            <h1 className="aac-hero__title">
              Host students.<br /><em>Earn every month.</em>
            </h1>
            <p className="aac-hero__sub">
              List your boarding, apartment, or private room and connect directly
              with SLIIT students looking for accommodation nearby.
            </p>
            <button className="aac-hero__cta" onClick={handleGetStarted}>
              Get started <ChevronRight size={17} />
            </button>
            {!isLoggedIn && (
              <div className="aac-hero__login-warn">
                <AlertCircle size={15} />
                You need to be logged in to list an accommodation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <>
          {/* PROGRESS BAR */}
          <div className="aac-progress-wrapper">
            <div className="aac-progress-bar">
              {STEPS.map(step => (
                <div key={step.num}
                  className={`aac-progress-segment${currentStep >= step.num ? " filled" : ""}`} />
              ))}
            </div>
          </div>

          <div className="aac-layout">

            {/* ───────── STEP 1 ───────── */}
            {currentStep === 1 && (
              <div className="aac-card">
                <div className="aac-card__title">About your accommodation</div>
                <div className="aac-card__subtitle">
                  Basic details students will see on your listing
                </div>

                <div className="aac-field">
                  <label className="aac-label">Accommodation type <span>*</span></label>
                  <div className="aac-type-grid">
                    {ACC_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button key={t.key} type="button"
                          className={`aac-type-card${accType === t.key ? " selected" : ""}`}
                          onClick={() => setAccType(t.key)}>
                          <div className="aac-type-icon"><Icon size={18} /></div>
                          <span className="aac-type-name">{t.key}</span>
                          <span className="aac-type-desc">{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="aac-field">
                  <label className="aac-label">Accommodation for <span>*</span></label>
                  <div className="aac-option-row">
                    {GENDER_OPTIONS.map(g => (
                      <button key={g.key} type="button"
                        className={`aac-option-card${genderPref === g.key ? " active" : ""}`}
                        onClick={() => setGenderPref(g.key)}>
                        <div className="aac-option-icon-box"><g.Icon /></div>
                        <div className="aac-option-info">
                          <span className="aac-option-name">{g.label}</span>
                          <span className="aac-option-desc">{g.desc}</span>
                        </div>
                        {genderPref === g.key && (
                          <CheckCircle size={16} style={{ color: "#e67e22", flexShrink: 0 }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="aac-divider" />

                <div className="aac-field">
                  <label className="aac-label">Capacity <span>(1–10 each)</span></label>
                  <div className="aac-counters-row">
                    <div>
                      <Counter label="Bedrooms"  value={rooms}     setter={setRooms}     errorKey="rooms" />
                      <FieldError field="rooms" />
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

                <div className="aac-divider" />

                <div className="aac-field">
                  <label className="aac-label">Utilities included</label>
                  <div className="aac-utility-row">
                    <button type="button"
                      className={`aac-utility-card${utilities.electricity ? " active" : ""}`}
                      onClick={() => setUtilities(u => ({ ...u, electricity: !u.electricity }))}>
                      <Zap size={18} /><span>Electricity</span>
                      <span className={`aac-badge${utilities.electricity ? " on" : " off"}`}>
                        {utilities.electricity ? "Included" : "Not incl."}
                      </span>
                    </button>
                    <button type="button"
                      className={`aac-utility-card${utilities.water ? " active" : ""}`}
                      onClick={() => setUtilities(u => ({ ...u, water: !u.water }))}>
                      <Droplets size={18} /><span>Water</span>
                      <span className={`aac-badge${utilities.water ? " on" : " off"}`}>
                        {utilities.water ? "Included" : "Not incl."}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="aac-divider" />

                <div className="aac-field">
                  <label className="aac-label">Amenities <span>select all that apply</span></label>
                  <div className="aac-amenities-grid">
                    {AMENITY_LIST.map(({ key, icon: Icon }) => {
                      const active = amenities.includes(key);
                      return (
                        <button key={key} type="button"
                          className={`aac-amenity-item${active ? " active" : ""}`}
                          onClick={() => toggleAmenity(key)}>
                          <Icon size={15} /><span>{key}</span>
                          {active && <CheckCircle size={12} className="aac-amenity-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="aac-nav">
                  <div />
                  <button className="aac-btn-primary" onClick={handleNextStep}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ───────── STEP 2 ───────── */}
            {currentStep === 2 && (
              <div className="aac-card">
                <div className="aac-card__title">Set your location</div>
                <div className="aac-card__subtitle">
                  Click the map or search to pin your exact position
                </div>

                <div className="aac-field">
                  {mapsReady ? (
                    <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                      <input type="text"
                        className={`aac-input${errors.location ? " aac-input--error" : ""}`}
                        placeholder="Search near SLIIT…"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)} />
                    </Autocomplete>
                  ) : (
                    <div className="aac-map-loading-placeholder">
                      <Loader2 size={15} className="aac-spin" /> Loading map SDK…
                    </div>
                  )}
                </div>

                <div className="aac-map-wrapper">
                  {mapsReady ? (
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation}
                      zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                      <Marker position={selectedLocation} draggable onDragEnd={onMapClick} />
                    </GoogleMap>
                  ) : (
                    <div className="aac-map-skeleton">
                      <Loader2 size={22} className="aac-spin" /><span>Loading Google Maps…</span>
                    </div>
                  )}
                </div>

                {errors.location && (
                  <div className="aac-location-error">
                    <AlertCircle size={14} /> {errors.location}
                  </div>
                )}

                <div className="aac-map-actions">
                  <button className="aac-map-btn" onClick={handleSLIITLocation}>
                    <MapPin size={14} /> SLIIT University
                  </button>
                  <button className="aac-map-btn" onClick={handleUseCurrentLocation}>
                    <Crosshair size={14} /> Use my location
                  </button>
                </div>

                {hasSelectedLocation && (
                  <div className="aac-distance-badge">
                    <MapPin size={14} />
                    <span>
                      <strong>
                        {distanceFromSLIIT < 1
                          ? `${Math.round(distanceFromSLIIT * 1000)}m`
                          : `${distanceFromSLIIT.toFixed(2)}km`}
                      </strong>{" "}
                      from SLIIT University
                    </span>
                  </div>
                )}

                <div className="aac-field" style={{ marginTop: 16 }}>
                  <label className="aac-label">Address <span>*</span></label>
                  <textarea className={`aac-textarea${errors.address ? " aac-input--error" : ""}`}
                    rows="2" value={address}
                    onChange={e => { setAddress(e.target.value); clearError("address"); }}
                    placeholder="Full Address…" />
                  <FieldError field="address" />
                </div>

                <div className="aac-nav">
                  <button className="aac-btn-secondary" onClick={handlePreviousStep}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button className="aac-btn-primary" onClick={handleNextStep}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ───────── STEP 3 ───────── */}
            {currentStep === 3 && (
              <div className="aac-card">
                <div className="aac-card__title">Make it stand out</div>
                <div className="aac-card__subtitle">
                  Add photos — they'll be uploaded when you save your listing
                </div>

                <div className="aac-field">
                  <label className="aac-label">Photos <span>* at least 1 required</span></label>
                  <div className={`aac-upload-zone${errors.photos ? " aac-upload-zone--error" : ""}`}
                    onClick={() => {
                      if (photos.length >= 5) { toast("Maximum 5 photos allowed.", "warning"); return; }
                      document.getElementById("acc-photo-upload").click();
                    }}>
                    <input type="file" multiple accept="image/*" id="acc-photo-upload"
                      style={{ display: "none" }} onChange={handlePhotoUpload} />
                    <div className="aac-upload-icon"><Upload size={20} /></div>
                    <div className="aac-upload-text">
                      {photos.length >= 5 ? "Maximum photos reached" : "Click to add photos"}
                    </div>
                    <div className="aac-upload-hint">
                      PNG, JPG — up to 5 photos · uploaded on save
                    </div>
                  </div>
                  <FieldError field="photos" />
                </div>

                <div className="aac-photo-grid">
                  {[0, 1, 2, 3, 4].map(index => (
                    <div key={index} className="aac-photo-box">
                      {photos[index] ? (
                        <div className="aac-photo-box__inner">
                          <img src={photos[index].preview} alt={`photo-${index}`} />
                          <div className="aac-photo-box__actions">
                            <button type="button" className="aac-icon-btn del"
                              onClick={() => handleDeletePhoto(index)}>
                              <FaTrash size={11} />
                            </button>
                            <button type="button" className="aac-icon-btn upd"
                              onClick={() => triggerUpdate(index)}>
                              <FaSyncAlt size={11} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="aac-photo-box__empty"><ImageIcon size={18} /></div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="aac-divider" />

                <div className="aac-field">
                  <label className="aac-label">Title <span>* max 50 characters</span></label>
                  <input className={`aac-input${errors.title ? " aac-input--error" : ""}`}
                    type="text" value={title} maxLength={50}
                    onChange={e => { setTitle(e.target.value); clearError("title"); }}
                    placeholder="e.g. Cozy private room near SLIIT" />
                  <div className="aac-field-footer" style={{ justifyContent: "space-between" }}>
                    <FieldError field="title" />
                    <span className={`aac-char-count${title.length > 40 ? " warn" : ""}`}>
                      {title.length}/50
                    </span>
                  </div>
                </div>

                <div className="aac-field">
                  <label className="aac-label">Description <span>* max 200 characters</span></label>
                  <textarea className={`aac-textarea${errors.description ? " aac-input--error" : ""}`}
                    rows="4" value={description} maxLength={200}
                    onChange={e => { setDescription(e.target.value); clearError("description"); }}
                    placeholder="Describe what makes your place great — location, vibe, what's nearby…" />
                  <div className="aac-field-footer" style={{ justifyContent: "space-between" }}>
                    <FieldError field="description" />
                    <span className={`aac-char-count${description.length > 170 ? " warn" : ""}`}>
                      {description.length}/200
                    </span>
                  </div>
                </div>

                <div className="aac-nav">
                  <button className="aac-btn-secondary" onClick={handlePreviousStep}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button className="aac-btn-primary" onClick={handleNextStep}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ───────── STEP 4 ───────── */}
            {currentStep === 4 && (
              <div className="aac-card">
                <div className="aac-card__title">Finish up and save</div>
                <div className="aac-card__subtitle">
                  Set your price, house rules, and confirm your listing
                </div>

                <div className="aac-row">
                  <div className="aac-field">
                    <label className="aac-label">
                      Price / month (LKR) <span>* 5,000–50,000</span>
                    </label>
                    <input className={`aac-input${errors.price ? " aac-input--error" : ""}`}
                      type="number" value={price} placeholder="15000" min="5000" max="50000"
                      onChange={e => { setPrice(e.target.value); clearError("price"); }}
                      onBlur={e => clampValue(e.target.value, 5000, 50000, setPrice)} />
                    <FieldError field="price" />
                  </div>
                  <div className="aac-field">
                    <label className="aac-label">Key money <span>* 0–3 months</span></label>
                    <input className={`aac-input${errors.keyDuration ? " aac-input--error" : ""}`}
                      type="number" value={keyDuration} placeholder="0" min="0" max="3"
                      onChange={e => { setKeyDuration(e.target.value); clearError("keyDuration"); }}
                      onBlur={e => clampValue(e.target.value, 0, 3, setKeyDuration)} />
                    <FieldError field="keyDuration" />
                  </div>
                </div>

                {calculatedKeyMoney > 0 && (
                  <div className="aac-key-money-info">
                    <span>🔑 Key money total:</span>
                    <strong>LKR {calculatedKeyMoney.toLocaleString()}</strong>
                  </div>
                )}

                <div className="aac-divider" />

                <div className="aac-field">
                  <label className="aac-label">House rules</label>
                  <div className="aac-rules-grid">
                    {RULE_LIST.map(({ key, icon: Icon }) => {
                      const active = rules.includes(key);
                      return (
                        <button key={key} type="button"
                          className={`aac-rule-item${active ? " active" : ""}`}
                          onClick={() => toggleRule(key)}>
                          <Icon size={15} /><span>{key}</span>
                          {active && <CheckCircle size={12} className="aac-rule-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="aac-field">
                  <label className="aac-label">Other rules <span>optional</span></label>
                  <textarea className="aac-textarea" rows="2"
                    value={otherRules} onChange={e => setOtherRules(e.target.value)}
                    placeholder="e.g. No loud music after 11 PM, no overnight guests…" />
                </div>

                <div className="aac-divider" />

                <div className="aac-verify-section">
                  <div className="aac-verify-section__title">Confirmation</div>
                  <label className={`aac-check-label${errors.verify ? " aac-check-label--error" : ""}`}>
                    <input type="checkbox" checked={isVerified}
                      onChange={e => { setIsVerified(e.target.checked); clearError("verify"); }} />
                    I confirm that all information provided is accurate and up to date.
                  </label>
                  {errors.verify && (
                    <p className="aac-field-error" style={{ marginLeft: 26 }}>
                      <AlertCircle size={12} /> {errors.verify}
                    </p>
                  )}
                  <label className={`aac-check-label${errors.agree ? " aac-check-label--error" : ""}`}
                    style={{ marginTop: 4 }}>
                    <input type="checkbox" checked={isAgreed}
                      onChange={e => { setIsAgreed(e.target.checked); clearError("agree"); }} />
                    I agree to the Terms of Service and Bodima hosting guidelines.
                  </label>
                  {errors.agree && (
                    <p className="aac-field-error" style={{ marginLeft: 26 }}>
                      <AlertCircle size={12} /> {errors.agree}
                    </p>
                  )}
                </div>

                {isSaving && (
                  <div className="aac-saving-indicator">
                    <Loader2 size={15} className="aac-spin" />
                    Uploading photos and saving your listing…
                  </div>
                )}

                <div className="aac-nav">
                  <button className="aac-btn-secondary" onClick={handlePreviousStep} disabled={isSaving}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button className="aac-btn-save" onClick={handleSaveListing}
                    disabled={isSaving || !isVerified || !isAgreed}>
                    {isSaving
                      ? <><Loader2 size={15} className="aac-spin" /> Saving…</>
                      : <><CheckCircle size={15} /> Save listing</>}
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default AddAccommodation;