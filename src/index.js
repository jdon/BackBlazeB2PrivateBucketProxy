require('dotenv').config();
const port = process.env.port;
const bugSnagKey = process.env.bugsnagcode;

const express = require('express');
const app = express();

let bugSnagMiddleware

if (bugSnagKey) {
	const bugsnag = require('@bugsnag/js')
	const bugsnagExpress = require('@bugsnag/plugin-express')
	const bugsnagClient = bugsnag(bugSnagKey)
	bugsnagClient.use(bugsnagExpress)
	bugSnagMiddleware = bugsnagClient.getPlugin('express')
}

let router = express.Router();
const b2Router = require('./routers/b2');

app.use(bugSnagMiddleware.requestHandler)
app.listen(port);


router.use('/', b2Router);

app.use('/', router);
app.use(bugSnagMiddleware.errorHandler)
