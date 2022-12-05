import faker from "@faker-js/faker";
import { prisma } from "@/config";

export async function createBooking(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId,
      roomId,
      updatedAt: faker.date.recent(),
      createdAt: faker.date.recent(),
    },
  });
}

export async function searchBookingById(id: number) {
  return prisma.booking.findFirst({
    where: {
      id,
    },
  });
}
