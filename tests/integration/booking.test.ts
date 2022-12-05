import app, { init } from "@/app";
import * as jwt from "jsonwebtoken";
import faker from "@faker-js/faker";
import httpStatus from "http-status";
import supertest from "supertest";
import {
  createEnrollmentWithAddress,
  createHotel,
  createRoomWithCapacity1,
  createRoomWithHotelId,
  createTicket,
  createTicketTypeWithHotel,
  createTicketTypeWithoutHotel,
  createUser,
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";
import { createBooking, searchBookingById } from "../factories/booking-factory";

const server = supertest(app);

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is invalid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no active session for the given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 404 if there is no booking for user", async () => {
      const token = await generateValidToken();

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 and with booking object including room data", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const hotel = await createHotel();
      const hotelRoom = await createRoomWithHotelId(hotel.id);
      const booking = await createBooking(user.id, hotelRoom.id);

      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        id: booking.id,
        Room: {
          id: hotelRoom.id,
          hotelId: hotelRoom.hotelId,
          name: hotelRoom.name,
          capacity: hotelRoom.capacity,
          createdAt: hotelRoom.createdAt.toISOString(),
          updatedAt: hotelRoom.updatedAt.toISOString()
        },
      });
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const body = { roomId: faker.datatype.number() };

    const response = await server.post("/booking").send(body);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is invalid", async () => {
    const body = { roomId: faker.datatype.number() };
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no active session for the given token", async () => {
    const body = { roomId: faker.datatype.number() };
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 if user has no enrollment", async () => {
      const body = { roomId: faker.datatype.number() };
      const token = await generateValidToken();

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if user has no valid ticket", async () => {
      const body = { roomId: faker.datatype.number() };
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if ticket has no hotel", async () => {
      const body = { roomId: faker.datatype.number() };
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithoutHotel();
      await createTicket(enrollment.id, ticketType.id, "PAID");

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if user has not paid the ticket", async () => {
      const body = { roomId: faker.datatype.number() };
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, "RESERVED");

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 if roomId is not valid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, "PAID");
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const body = { roomId: faker.datatype.number() };
      await createBooking(user.id, room.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 if hotel room has maximum capacity", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, "PAID");
      const hotel = await createHotel();
      const room = await createRoomWithCapacity1(hotel.id);
      const body = { roomId: room.id };
      await createBooking(user.id, room.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 200 and with bookingId - equivalent partition", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, "PAID");
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const body = { roomId: room.id };
      await createBooking(user.id, room.id);

      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        bookingId: expect.any(Number),
      });

      const createdBooking = await searchBookingById(response.body.bookingId);
      expect(createdBooking).toEqual({
        id: expect.any(Number),
        userId: expect.any(Number),
        roomId: expect.any(Number),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});

describe("POST /booking/:bookingId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const body = { roomId: faker.datatype.number() };

    const response = await server.put("/booking/0").send(body);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is invalid", async () => {
    const body = { roomId: faker.datatype.number() };
    const token = faker.lorem.word();

    const response = await server.put("/booking/0").set("Authorization", `Bearer ${token}`).send(body);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no active session for the given token", async () => {
    const body = { roomId: faker.datatype.number() };
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put("/booking/0").set("Authorization", `Bearer ${token}`).send(body);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 if hotel room has maximum capacity", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const hotel = await createHotel();
      const olderRoom = await createRoomWithHotelId(hotel.id);
      const newerRoom = await createRoomWithCapacity1(hotel.id);
      const body = { roomId: newerRoom.id };
      const booking = await createBooking(user.id, olderRoom.id);
      await createBooking(user.id, newerRoom.id);

      const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if there is no booking for this user", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const hotel = await createHotel();
      const room = await createRoomWithHotelId(hotel.id);
      const body = { roomId: room.id };

      const response = await server.put("/booking/0").set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 if roomId is not valid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const hotel = await createHotel();
      await createRoomWithHotelId(hotel.id);
      const body = { roomId: faker.datatype.number() };

      const response = await server.put("/booking/0").set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 and with bookingId - equivalent partition", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const hotel = await createHotel();
      const oldRoom = await createRoomWithHotelId(hotel.id);
      const newRoom = await createRoomWithHotelId(hotel.id);
      const body = { roomId: newRoom.id };
      const booking = await createBooking(user.id, oldRoom.id);

      const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send(body);
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        bookingUpdatedId: booking.id,
      });

      const createdBooking = await searchBookingById(response.body.bookingId);
      expect(createdBooking).toEqual({
        id: booking.id,
        userId: user.id,
        roomId: newRoom.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});
