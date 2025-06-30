import express from "express";
import path from "path";

const router = express.Router();

// Serwowanie plików z `filestohost/` pod ścieżką `/assets/` 
// TODO dodać blanka
router.use("/", express.static(path.resolve("filestohost")));

export default router;
