const { register, login, logout } = require("../controllers/authController");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Assuming you are using Jest and supertest for HTTP assertions
const multer = require("multer");
const request = require("supertest");
const express = require("express");
const app = express();
const Image = require("../models/Image"); // Replace with your actual Image model path

// Mocking dependencies
jest.mock("../models/User");
jest.mock("jsonwebtoken");
jest.mock("../utils", () => ({
  attachCookiesToResponse: jest.fn(),
  createTokenUser: jest.fn(() => ({
    name: "TestUser",
    userId: "123",
    role: "user",
  })),
  createHash: jest.fn(),
}));

jest.mock("../models/Image", () => ({
  insertMany: jest.fn(),
}));

// Mock 'multer' to simulate file upload
jest.mock("multer", () => {
  const multerMock = {
    diskStorage: jest.fn(),
    array: jest.fn((fieldname, maxCount) =>
      jest.fn((req, res, callback) => {
        req.files = [
          /* mocked files data */
        ];
        callback(null);
      })
    ),
  };
  return jest.fn(() => multerMock);
});

// Helpers
const setupMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res); // Add this line
  return res;
};
// Mocking environment variables
process.env.JWT_SECRET = "testsecret";
describe("register", () => {
  it("should throw BadRequestError if email already exists", async () => {
    User.findOne.mockResolvedValue(true); // Mocking that email already exists
    const req = {
      body: {
        email: "test@example.com",
        name: "Test User",
        password: "password",
      },
    };
    const res = setupMockResponse();
    await expect(register(req, res)).rejects.toThrow(
      CustomError.BadRequestError
    );
  });

  it("should create a new user and send a success response", async () => {
    User.findOne.mockResolvedValue(false); // Mocking that email does not exist
    User.create.mockResolvedValue({
      _id: "123",
      email: "test@example.com",
      name: "Test User",
    });

    const req = {
      body: {
        email: "test@example.com",
        name: "Test User",
        password: "password",
      },
    };
    const res = setupMockResponse();

    await register(req, res);
    expect(User.create).toHaveBeenCalledWith(expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith({ msg: "Success!" });
  });
});

describe("login", () => {
  it("should throw AuthenticationError if credentials are invalid", async () => {
    User.findOne.mockResolvedValue(null); // Mocking that user does not exist
    const req = { body: { email: "wrong@example.com", password: "password" } };
    const res = setupMockResponse();
    await expect(login(req, res)).rejects.toThrow(
      CustomError.AuthenticationError
    );
  });

  it("should login user and send a response with a token", async () => {
    const mockUser = {
      _id: "123",
      email: "test@example.com",
      name: "Test User",
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockResolvedValue(mockUser);
    const req = { body: { email: "test@example.com", password: "password" } };
    const res = setupMockResponse();

    await login(req, res);
    expect(mockUser.comparePassword).toHaveBeenCalledWith("password");
    expect(res.cookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith(expect.any(Object));
  });
});

describe("logout", () => {
  it("should clear the cookie and send a success response", async () => {
    const req = {};
    const res = setupMockResponse();

    logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith("token", expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith({ msg: "Logged out successfully" });
  });
});

describe("Multer diskStorage configuration", () => {
  test("diskStorage should be a function", () => {
    expect(typeof storage).toBe("function");
  });

  test("diskStorage should define destination and filename", () => {
    const cbMock = jest.fn();
    storage.destination(null, null, cbMock);
    storage.filename(null, { originalname: "test.jpg" }, cbMock);

    expect(cbMock).toHaveBeenNthCalledWith(1, null, "./uploads/");
    expect(cbMock).toHaveBeenNthCalledWith(
      2,
      null,
      expect.stringContaining("test.jpg")
    );
  });
});

describe("Multer upload configuration", () => {
  test("upload should be a function", () => {
    expect(typeof upload).toBe("function");
  });

  test("upload should filter non-image files", () => {
    const cbMock = jest.fn();
    upload.fileFilter(null, { mimetype: "text/plain" }, cbMock);
    expect(cbMock).toHaveBeenCalledWith(
      new Error("Only image files are allowed!"),
      false
    );
  });
});

describe("uploadImages controller", () => {
  let mockRequest, mockResponse;
  beforeEach(() => {
    mockRequest = {
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:3000"),
      files: [
        /* mocked files data */
      ],
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test("uploadImages should save images and return data", async () => {
    Image.insertMany.mockResolvedValue(/* mocked response */);

    const next = jest.fn();
    await uploadImages(mockRequest, mockResponse, next);

    expect(Image.insertMany).toHaveBeenCalledWith(expect.any(Array));
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.any(Object));
  });

  // Add more tests for different scenarios (e.g., MulterError, unknown error, etc.)
});

// You will need to implement the actual app routing that uses `uploadImages`
app.post("/upload-images", uploadImages);

// Use supertest to test the endpoint if needed
describe("POST /upload-images", () => {
  test("It should handle image upload", async () => {
    const response = await request(app)
      .post("/upload-images")
      .attach("images", Buffer.from("mock image data"), "test.jpg");

    expect(response.statusCode).toBe(200);
    expect(response.body.files).toEqual(expect.any(Array));
    // Add more assertions as needed
  });
});
