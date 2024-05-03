const Purchase = require("../Models/purchaseModel");
const itemTransaction = require("../Models/itemTransactionModel");
const Warehouse = require("../Models/warehouseModel");
const response = require("../Utils/resHandler");
const asynchandler = require("express-async-handler");

// Get all purchases
const getAllPurchase = asynchandler(async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("companyId")
      .populate("supplier")
      .populate({
        path: "items",
        populate: {
          path: "item",
          model: "Item",
        },
      });
    response.successResponse(res, purchases, "Data Successfully fetched");
  } catch (error) {
    response.errorResponse(res, error.message);
  }
});

// Get a single purchase by ID
const getPurchase = asynchandler(async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (purchase) {
      response.successResponse(res, purchase, "Purchase found");
    } else {
      res.status(404);
      throw new Error("Purchase not found");
    }
  } catch (error) {
    response.errorResponse(res, error.message);
  }
});

// Add a new purchase
const addPurchase = asynchandler(async (req, res) => {
  try {
    const {
      itemId,
      itemCode,
      supplier,
      referenceNo,
      taxableAmount,
      quantity,
      rate,
      cgst,
      sgst,
      igst,
      total,
      transactionOwnedBy,
      transactionType,
      typeofActivity,
      location,
      docNo,
      docDate,
      docRefNo,
      UOM,
      items,
    } = req.body;

    const generateSerialNumber = async () => {
      const purchases = await Purchase.find({ companyId: req.user.companyId });

      let newSerialNo;
      if (purchases.length === 0) {
        // If no previous purchases found, start with 1
        newSerialNo = 1;
      } else {
        // Increment based on the number of existing purchases
        newSerialNo = purchases.length + 1;
      }

      return newSerialNo;
    };

    const serialNo = await generateSerialNumber();
    console.log(items);
    // Create new purchase object with serial number and company ID
    const purchase = new Purchase({
      companyId: req.user.companyId,
      serialNo,
      itemId,
      supplier,
      referenceNo,
      quantity,
      taxableAmount,
      rate,
      cgst,
      sgst,
      igst,
      total,
      items,
    });
    // Data For save trcking transaction
    let dataToSave = {
      companyId: req.user.companyId,
      itemId,
      transactionOwnedBy,
      docNo,
      docDate,
      docRefNo,
      transactionType,
      typeofActivity,
      itemCode,
      quantity,
      UOM,
      location,
    };
    // Add Item Transaction
    // const newItemTransaction = await itemTransaction.create(dataToSave);
    // let existingTrackNos = new Set(
    //   (
    //     await itemTransaction
    //       .find({ companyId: req.user.companyId })
    //       .distinct("trackingDetails.trackNo")
    //   ).flat()
    // );
    // let newTrackingDetails = req.body.trackingDetails || [];
    // for (let detail of newTrackingDetails) {
    //   if (existingTrackNos.has(detail.trackNo)) {
    //     response.validationError(res, "Duplicate trackNo found");
    //     return;
    //   }
    // }
    // const warehouse = await Warehouse.findById(location);
    // const existingItemIndex = warehouse.items.findIndex(
    //   (item) => item.name.toString() === itemId
    // );
    // if (existingItemIndex === -1) {
    //   const newItem = {
    //     name: itemId,
    //     balanceStock: quantity,
    //     stockIn: [newItemTransaction._id],
    //   };
    //   warehouse.items.push(newItem);
    // } else {
    //   const existingItem = warehouse.items[existingItemIndex];
    //   existingItem.balanceStock += parseInt(quantity);
    //   existingItem.stockIn.push(newItemTransaction._id);
    // }
    // await warehouse.save();

    // its new

    for (const item of items) {
      const { itemId, quantity, UOM } = item;

      // Create data for item transaction
      const dataToSave = {
        companyId: req.user.companyId,
        itemId,
        transactionOwnedBy,
        docNo,
        docDate,
        docRefNo,
        transactionType,
        typeofActivity,
        quantity,
        UOM,
        location,
      };

      // Create item transaction
      await itemTransaction.create(dataToSave);

      // Update warehouse quantity
      const warehouse = await Warehouse.findById(location);
      const existingItemIndex = warehouse.items.findIndex(
        (item) => item.name.toString() === itemId
      );

      if (existingItemIndex === -1) {
        // If the item does not exist in the warehouse, add it
        warehouse.items.push({ name: itemId, balanceStock: quantity });
      } else {
        // If the item exists, update its quantity
        warehouse.items[existingItemIndex].balanceStock += quantity;
      }

      // Save the updated warehouse
      await warehouse.save();
    }

    const createdPurchase = await purchase.save();
    response.successResponse(
      res,
      createdPurchase,
      "Purchase and transaction created successfully"
    );
  } catch (error) {
    response.errorResponse(res, error.message);
  }
});

// Edit a purchase
const editPurchase = asynchandler(async (req, res) => {
  try {
    const {
      companyId,
      itemId,
      supplier,
      referenceNo,
      taxableAmount,
      cgst,
      sgst,
      igst,
      total,
    } = req.body;
    const purchase = await Purchase.findById(req.params.id);
    if (purchase) {
      purchase.companyId = companyId;
      purchase.itemId = itemId;
      purchase.supplier = supplier;
      purchase.referenceNo = referenceNo;
      purchase.taxableAmount = taxableAmount;
      purchase.cgst = cgst;
      purchase.sgst = sgst;
      purchase.igst = igst;
      purchase.total = total;

      const updatedPurchase = await purchase.save();
      response.successResponse(
        res,
        updatedPurchase,
        "Purchase updated successfully"
      );
    } else {
      res.status(404);
      throw new Error("Purchase not found");
    }
  } catch (error) {
    response.errorResponse(res, error.message);
  }
});

// Delete a purchase
const deletePurchase = asynchandler(async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (purchase) {
      await purchase.remove();
      response.successResponse(res, null, "Purchase deleted successfully");
    } else {
      res.status(404);
      throw new Error("Purchase not found");
    }
  } catch (error) {
    response.errorResponse(res, error.message);
  }
});

module.exports = {
  getAllPurchase,
  getPurchase,
  addPurchase,
  editPurchase,
  deletePurchase,
};
