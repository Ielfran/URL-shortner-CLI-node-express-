const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const logger = require('./utils/logger');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

//Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url} from ${req.ip}`);
    next();
});

const urlRoutes = require('./routes/url');
app.use('/', urlRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to the URL Shortening API');
});

app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server is running in port ${PORT}`);
});
