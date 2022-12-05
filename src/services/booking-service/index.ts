import { notFoundError, forbiddenError } from "@/errors";
import bookingRepository from "@/repositories/booking-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { Room } from "@prisma/client";

async function searchBookingByUserId(userId: number): Promise<{ id: number, Room: Room }> {
  const booking: { id: number, Room: Room } = await bookingRepository.getBookingByUserId(userId);

  if (!booking) {
    throw notFoundError();
  }

  return booking;
}

async function postBooking(userId: number, roomId: number): Promise<number> {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);

  if (!enrollment) {
    throw forbiddenError();
  }

  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

  if (!ticket) {
    throw forbiddenError();
  } else if (ticket.status === "RESERVED") {
    throw forbiddenError();
  } else if (ticket.TicketType.isRemote || !ticket.TicketType.includesHotel) {
    throw forbiddenError();
  }

  const roomBookings = await bookingRepository.getRoomBookings(roomId);

  if (!roomId || !roomBookings) {
    throw notFoundError();
  } else if (roomBookings.Booking.length >= roomBookings.capacity) {
    throw forbiddenError();
  }

  const postedBooking = await bookingRepository.postBooking(userId, roomId);

  return postedBooking.id;
}

async function updateBooking(userId: number, roomId: number, bookingId: string): Promise<number> {
  const roomBookings = await bookingRepository.getRoomBookings(roomId);

  if (!roomId || !roomBookings) {
    throw notFoundError();
  } else if (roomBookings.Booking.length >= roomBookings.capacity) {
    throw forbiddenError();
  }

  const booking = await bookingRepository.getBookingByUserId(userId);

  if(!Number(bookingId) || !booking || booking.id !== Number(bookingId)) {
    throw forbiddenError();
  }

  const updateBooking = await bookingRepository.updateBooking(Number(bookingId), roomId);

  return updateBooking.id;
}

const bookingService = { searchBookingByUserId, postBooking, updateBooking };

export default bookingService;
