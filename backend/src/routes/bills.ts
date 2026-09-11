import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Bill } from "../models/Bill";
import { ensureTempDir } from "../services/ocr";
import { processBill, serializeBill } from "../services/billProcessor";
import { config } from "../config";

const router = Router();

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const dir = await ensureTempDir();
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, WEBP) are allowed"));
    }
  },
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const expiresAt = new Date(Date.now() + config.tempFileTtlMs);

    const bill = await Bill.create({
      status: "processing",
      tempFilePath: req.file.path,
      tempFileExpiresAt: expiresAt,
      items: [],
    });

    processBill(bill._id.toString()).catch((err) =>
      console.error("Bill processing error:", err)
    );

    res.status(201).json({
      id: bill._id.toString(),
      status: bill.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    res.status(500).json({ error: message });
  }
});

router.get("/:id", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  res.json(serializeBill(bill));
});

router.get("/:id/status", async (req, res) => {
  const bill = await Bill.findById(req.params.id).select(
    "status errorMessage updatedAt"
  );
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }
  res.json({
    status: bill.status,
    errorMessage: bill.errorMessage,
    updatedAt: bill.updatedAt,
  });
});

router.patch("/:id", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const {
    restaurantName,
    billDate,
    tax,
    serviceCharge,
    subtotal,
    grandTotal,
    cgst,
    sgst,
    vat,
  } = req.body;

  if (restaurantName !== undefined) bill.restaurantName = restaurantName;
  if (billDate !== undefined) bill.billDate = billDate;
  if (tax !== undefined) bill.tax = Number(tax);
  if (serviceCharge !== undefined) bill.serviceCharge = Number(serviceCharge);
  if (subtotal !== undefined) bill.subtotal = Number(subtotal);
  if (grandTotal !== undefined) bill.grandTotal = Number(grandTotal);
  if (cgst !== undefined) bill.cgst = Number(cgst);
  if (sgst !== undefined) bill.sgst = Number(sgst);
  if (vat !== undefined) bill.vat = Number(vat);

  await bill.save();
  res.json(serializeBill(bill));
});

router.post("/:id/items", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const { name, price, quantity = 1 } = req.body;
  if (price === undefined) {
    res.status(400).json({ error: "price is required" });
    return;
  }

  bill.items.push({
    name: name ?? "",
    price: Number(price),
    quantity: Number(quantity),
  });
  await bill.save();
  res.json(serializeBill(bill));
});

router.patch("/:id/items/:itemId", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const item = bill.items.id(req.params.itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const { name, price, quantity } = req.body;
  if (name !== undefined) item.name = name;
  if (price !== undefined) item.price = Number(price);
  if (quantity !== undefined) item.quantity = Number(quantity);

  await bill.save();
  res.json(serializeBill(bill));
});

router.delete("/:id/items/:itemId", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const item = bill.items.id(req.params.itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  item.deleteOne();
  await bill.save();
  res.json(serializeBill(bill));
});

router.post("/:id/retry", async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  if (!bill.tempFilePath) {
    res.status(400).json({
      error: "Original image was already deleted. Please upload again.",
    });
    return;
  }

  bill.status = "processing";
  bill.errorMessage = undefined;
  await bill.save();

  processBill(bill._id.toString()).catch((err) =>
    console.error("Bill retry error:", err)
  );

  res.json({ id: bill._id.toString(), status: bill.status });
});

export default router;
