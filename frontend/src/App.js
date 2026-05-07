import { Routes, Route } from "react-router-dom";
import { ToastProvider } from "./Components/Overlays/ToastMessages/ToastContext.jsx";
import "./Components/Overlays/ToastMessages/Toast.css";

import Boardings from "./Components/Boardings/Boardings";

import AddAccommodation from "./Components/AddAccommodation/AddAccommodation";
import AccommodationEdit from "./Components/Accommodation_Edit/AccommodationEdit";
import AccommodationDetails from "./Components/AccommodationDetails/AccommodationDetails"

import Login from "./Components/Login/Login";

import HostListings from "./Components/Host_Listing/HostListings";
import UserProfile from "./Components/User_Profile/UserProfile";

import Messages from "./Components/Message/Messages";

import HostNavbar from "./Components/NavBar/Host_NavBar/HostNavbar";
import Footer from "./Components/NavBar/Footer/Footer";


import Register from "./Components/Register/Register";
import ForgotPassword from "./Components/ForgotPassword/ForgotPassword";
import ForgotPasswrodOtp from "./Components/ForgotPasswordOtp/ForgotPasswordOtp";
import ResetPassword from "./Components/ResetPassword/ResetPassword";
import Favourites from "./Components/Favourites/Favourites";
import HostBooking from "./Components/Host_Bookings/HostBooking";


import StudentBookings from "./Components/Student_Bookings/StudentBooking.js";
import LoadingScreen from "./Components/Overlays/LoadingScreen/Loader.jsx";



function App() {
  return (

    <ToastProvider>
    <Routes>
      
      <Route path="/" element={<Boardings />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Boardings" element={<Boardings />} />
      
      <Route path="/add-accommodation" element={<AddAccommodation />} />
      <Route path="/edit-Accommodation/:id" element={<AccommodationEdit />} />
      <Route path="/details-Accommodation/:id" element={<AccommodationDetails />} />
      
      <Route path="/Listings" element={<HostListings />} />
      <Route path="/Profile"      element={<UserProfile />} /> 
      <Route path="/Host-Profile" element={<UserProfile />} /> 
      <Route path="/UserProfile" element={<UserProfile />} />
      
      
      <Route path="/Messages" element={<Messages />} />
      
      <Route path="/HostBookings" element={<HostBooking />} />
      <Route path="/HostNavbar" element={<HostNavbar />} />
      <Route path="/Footer" element={<Footer />} />
      
      
      <Route path="/Register" element={<Register />} />
      <Route path="/ForgotPassword" element={<ForgotPassword />} />
      <Route path="/ForgotPasswrodOtp" element={<ForgotPasswrodOtp />} />
      <Route path="/ResetPassword" element={<ResetPassword />} />
      <Route path="/Favourites" element={<Favourites />} />
      
      <Route path="/StudentBookings" element={<StudentBookings />} />
      <Route path="/LoadingScreen" element={<LoadingScreen />} />

    </Routes>
    </ToastProvider>
  );
}

export default App;
