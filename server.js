require('dotenv').config();
require('express-async-errors');
// express

const express = require('express');
const app = express();
// rest of the packages
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const rateLimiter = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

// database
const connectDB = require('./db/connect');

//  routers
const authRouter = require('./routes/authRoutes');

// middleware
const notFoundMiddleware = require('./middleware/not-found');

// Custom middleware to add Cross-Origin-Resource-Policy header
// const addCORPHeader = (req, res, next) => {
//   res.header('Cross-Origin-Resource-Policy', 'same-site');
//   next();
// };



app.set('trust proxy', 1);
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
  })
);
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    // ...
  })
);
// Apply the CORS middleware to enable CORS
app.use(cors({ origin: 'http://localhost:3000', credentials: true })); 
app.use((req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
// app.use(cors());
app.use(xss());
app.use(mongoSanitize());

app.use('/uploads', express.static('uploads'));

app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));

// Use the custom middleware to add the CORP header
// app.use(addCORPHeader);

app.use('/api/v1/auth', authRouter);

app.use(notFoundMiddleware);

const port = process.env.PORT || 5000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();