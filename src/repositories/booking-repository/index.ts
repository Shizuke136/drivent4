import { prisma } from "@/config";

function getBookingByUserId(userId: number) {
  return prisma.booking.findFirst({
    where: {
      userId
    }, select: {
      id: true,
      Room: true
    }
  });
}

function getRoomBookings(id: number) {
  return prisma.room.findFirst({
    where: {
      id
    }, include: {
      Booking: true
    }
  });
}

function postBooking(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId
    }, include: {
      Room: true
    }
  });
}

function updateBooking(id: number, roomId: number) {
  return prisma.booking.update({
    where: {
      id
    }, data: {
      roomId
    }
  });
}

const bookingRepository = { getBookingByUserId, postBooking, getRoomBookings, updateBooking };

export default bookingRepository;
