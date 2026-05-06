const Accommodation = require("../Models/Accommodation");

// ==============================
// Add New Accommodation
// ==============================
const addAccommodation = async (req, res) => {
  try {
    const {
      owner,
      title,
      description,
      address,
      location,
      distance, // 🔹 Frontend sends "800 meters" or "1.2 km"
      pricePerMonth,
      images,
      bedrooms,
      beds,
      bathrooms,
      amenities,
      rules,
      genderPreference,
      accommodationType,
      keyMoneyDuration,
      utilityBills,
      expireDate
    } = req.body;

    // ✅ Validation: Ensure distance is included
    if (!owner || !title || !address || !pricePerMonth || !accommodationType || !distance) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: owner, title, address, price, type, or distance.",
      });
    }

    const newAccommodation = new Accommodation({
      owner,
      title,
      description,
      address,
      location,
      distance, 
      pricePerMonth: Number(pricePerMonth),
      images: images || ["69903a4ff3758a2025e91e68"],
      bedrooms: Number(bedrooms) || 1,
      beds: Number(beds) || 1,
      bathrooms: Number(bathrooms) || 1,
      amenities: amenities || [],
      rules: rules || [],
      genderPreference,
      accommodationType,
      keyMoneyDuration: Number(keyMoneyDuration) || 0,
      utilityBills: utilityBills || { electricityIncluded: false, waterIncluded: false },
      expireDate: expireDate || null
    });

    await newAccommodation.save();

    res.status(201).json({
      success: true,
      message: "Accommodation created successfully",
      data: newAccommodation,
    });

  } catch (err) {
    console.error("Database Insert Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================
// Get All Accommodations
// ==============================
const getAllAccommodations = async (req, res) => {
  try {
    const accommodations = await Accommodation.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accommodations.length,
      data: accommodations,
    });
  } catch (err) {
    console.error("Get All Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// Get Accommodation By ID
// ==============================
const getAccommodationById = async (req, res) => {
  try {
    const accommodation = await Accommodation.findById(req.params.id);

    if (!accommodation) {
      return res.status(404).json({
        success: false,
        message: "Accommodation not found",
      });
    }

    res.status(200).json({
      success: true,
      data: accommodation,
    });
  } catch (err) {
    console.error("Get By ID Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// Update Accommodation
// ==============================
const updateAccommodation = async (req, res) => {
  try {
    // 🔹 Using req.body directly allows updating 'distance' or any other field
    const updated = await Accommodation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Accommodation not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Accommodation updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==============================
// Delete Accommodation
// ==============================
const deleteAccommodation = async (req, res) => {
  try {
    const deleted = await Accommodation.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Accommodation not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Accommodation deleted successfully",
    });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  addAccommodation,
  getAllAccommodations,
  getAccommodationById,
  updateAccommodation,
  deleteAccommodation,
};