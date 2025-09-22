// routes/serviceRoutes.js
import express from "express";
import { ServicesFetching } from "../controllers/service.controller.js";

const router = express.Router();

// GET /api/services — fetch services with filters, pagination, sorting
router.get("/services", ServicesFetching);


export { router as servicesRouter };