import { AuthenticatedRequest } from "@/middlewares";
import { Response } from "express";
import { Room } from "@prisma/client";

import bookingService from "@/services/booking-service";

import httpStatus from "http-status";

export async function listBookingFromUser(req: AuthenticatedRequest, res: Response) {
  const { userId } = req as AuthenticatedRequest;

  try {
    const booking: { id: number, Room: Room } = await bookingService.searchBookingByUserId(userId);
    return res.status(httpStatus.OK).send(booking);
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }
  }
}

export async function bookHotelRoom(req: AuthenticatedRequest, res: Response) {
  const { userId } = req as AuthenticatedRequest;
  const roomId: number = req.body.roomId;

  try {
    const bookingId: number = await bookingService.postBooking(userId, roomId);
    return res.status(httpStatus.OK).send({ bookingId });
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    } else if (error.name === "ForbiddenError") {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
  }
}

export async function updateBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req as AuthenticatedRequest;
  const roomId: number = req.body.roomId;
  const { bookingId } = req.params as Record<string, string>;

  try {
    const bookingUpdatedId: number = await bookingService.updateBooking(userId, roomId, bookingId);
    res.status(httpStatus.OK).send({ bookingUpdatedId });
  } catch (error) {
    if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    } else if (error.name === "ForbiddenError") {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
    return res.sendStatus(httpStatus.INTERNAL_SERVER_ERROR);
  }
}
