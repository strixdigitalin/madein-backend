require("dotenv").config();
const Company = require("../Models/companyModel");
const Warehouse = require("../Models/warehouseModel");
const jwt = require("jsonwebtoken");
const response = require("../Utils/resHandler");
const bcrypt = require("bcrypt");
const asynchandler = require("express-async-handler");

const createCompany = asynchandler(async (req, res) => {
  const { gst, phoneNumber, email, password, proprieter, companyName } =
    req.body;
  const existingEmail = await Company.findOne({ email });
  const existingGst = await Company.findOne({ gst });
  const existingPhoneNumber = await Company.findOne({ phoneNumber });
  const existingCompanyName = await Company.findOne({ companyName });
  if (existingEmail) {
    return response.errorResponse(
      res,
      "Company with this email already exists"
    );
  }
  if (existingGst) {
    return response.errorResponse(res, "Company with this GST already exists");
  }
  if (existingCompanyName) {
    return response.errorResponse(res, "Company with this Name already exists");
  }
  if (existingPhoneNumber) {
    return response.errorResponse(
      res,
      "Company with this phone number already exists"
    );
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newCompany = await Company.create({
      gst,
      phoneNumber,
      email,
      password: hashedPassword,
      proprieter,
      companyName,
    });
    response.successResponse(res, newCompany, "Company created successfully");
  } catch (error) {
    console.error(error);
    response.internalServerError(res, "Internal server error");
  }
});

const login = asynchandler(async (req, res) => {
  const { email, password } = req.body;
  try {
    const company = await Company.findOne({ email });
    if (!company) {
      return response.errorResponse(res, "Invalid email or password");
    }
    const passwordMatch = await bcrypt.compare(password, company.password);
    if (!passwordMatch) {
      return response.errorResponse(res, "Invalid email or password");
    }
    const token = jwt.sign({ companyId: company._id }, process.env.JWTSECRET, {
      expiresIn: "1d",
    });
    response.successResponse(res, { token, company }, "Login successful");
  } catch (error) {
    console.error(error);
    response.internalServerError(res, "Internal server error");
  }
});

const addLocation = asynchandler(async (req, res) => {
  const { name, code, location } = req.body;
  try {
    const companyId = req.user.companyId;
    const newLocation = new Warehouse({
      companyId,
      name,
      code,
      location,
    });
    await newLocation.save();
    await Company.findByIdAndUpdate(
      companyId,
      { $push: { addresses: newLocation._id } },
      { new: true }
    );
    response.successResponse(res, newLocation, "Updated");
  } catch (error) {
    response.errorResponse(res, "Internal Server Error");
  }
});
const getlocations = asynchandler(async (req, res) => {
  try {
    let data = await Warehouse.find({ companyId: req.user.companyId })
      .populate("items.name")
      .populate("items.stockIn")
      .populate("items.stockOut");
    response.successResponse(res, data, "Locations Fetched");
  } catch (error) {
    response.errorResponse(res, "Locations Fetched failed");
  }
});

module.exports = {
  createCompany,
  login,
  addLocation,
  getlocations,
};
