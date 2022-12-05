import { listBookingFromUser, bookHotelRoom, updateBooking } from "@/controllers";
import { authenticateToken } from "@/middlewares";
import { Router } from "express";

const bookingRouter = Router();

bookingRouter
  .all("/*", authenticateToken)
  .get("/", listBookingFromUser)
  .post("/", bookHotelRoom)
  .put("/:bookingId", updateBooking);

export { bookingRouter };
