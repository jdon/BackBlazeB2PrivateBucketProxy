require('dotenv').config();
const express = require('express');
const app = express();
var router = express.Router()
const b2Router = require('./routers/b2');

const port = process.env.port;

app.listen(port);

router.use('/', b2Router)

app.use('/', router);