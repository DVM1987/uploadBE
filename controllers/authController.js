const User = require("../models/User");
const Image = require("../models/Image");
const Token = require("../models/Token");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const multer = require('multer');
const {
  attachCookiesToResponse,
  createTokenUser,
  createHash,
} = require("../utils");

const register = async (req, res) => {
  const { email, name, password } = req.body;

  const emailAlreadyExists = await User.findOne({ email });
  if (emailAlreadyExists) {
    throw new CustomError.BadRequestError("Email already exists");
  }

  // first registered user is an admin
  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? "admin" : "user";

  const verificationToken = crypto.randomBytes(40).toString("hex");

  const user = await User.create({
    name,
    email,
    password,
    role,
    verificationToken,
  });

  res.status(StatusCodes.CREATED).json({
    msg: "Success!",
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new CustomError.AuthenticationError("Invalid Credentials");
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new CustomError.AuthenticationError("Invalid Credentials");
  }

  // if (!user.isVerified) {
  //   throw new CustomError.AuthenticationError('Your account has not been verified');
  // }

  // Create a token
  const tokenUser = createTokenUser(user);
  const token = jwt.sign({ user: tokenUser }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  // Attach the token to a cookie
  const oneDay = 1000 * 60 * 60 * 24;
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + oneDay),
  });

  res.status(StatusCodes.OK).json({ user: tokenUser });
};

const checkLoginStatus = (req, res) => {
  const token = req.cookies.accessToken; // Assuming the token is stored in a cookie named 'accessToken'
  if (!token) {
    return res.json({ isLoggedIn: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.json({ isLoggedIn: false });
    }
    return res.json({ isLoggedIn: true });
  });
};

const logout = (req, res) => {
  // Clear the cookie
  res.clearCookie("token", { path: "/", httpOnly: true, sameSite: "strict" });

  res.status(StatusCodes.OK).json({ msg: "Logged out successfully" });
};


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Chỉ cho phép tải lên hình ảnh
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

const uploadImages = (req, res) => {
  const start = Date.now(); // Start time
  upload.array('images', 10)(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      return res.status(500).json(err);
    } else if (err) {
      // An unknown error occurred when uploading.
      return res.status(500).json(err);
    }

    // Save the image information to the database
    const images = req.files.map(file => ({
      filename: file.filename,
      url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));

    try {
      await Image.insertMany(images);
    } catch (error) {
      return res.status(500).json({ error: 'Error saving images to the database' });
    }

    // Everything went fine.
    const processingTime = (Date.now() - start) / 1000;
    return res.status(200).json({ files: req.files, processingTime });
  });
};

const getAllImages = async (req, res) => {
  try {
    const images = await Image.find({}, 'url').sort({ createdAt: -1 }); // Sort by 'createdAt' in descending order
    const urls = images.map(image => image.url); // Extract URLs from image objects
    return res.status(200).json(urls);
  } catch (error) {
    return res.status(500).json({ error: 'Error retrieving images from the database' });
  }
};



module.exports = {
  register,
  login,
  checkLoginStatus,
  logout,
  uploadImages,
  getAllImages,
  // logout,
  // verifyEmail,
  // forgotPassword,
  // resetPassword,
};
