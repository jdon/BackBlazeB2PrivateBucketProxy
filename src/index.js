require('dotenv').config();
const debug = require('debug')('B2Proxy');
const express = require('express');

const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 6000, checkperiod: 12000 });

const b2Wrapper = require('./b2');

const app = express();

const port = process.env.port;
const bucketID = process.env.bucketID;
const bucketName = process.env.bucketName;
const downloadURL = process.env.downloadURL;
const applicationKeyId = process.env.keyID;
const applicationKey = process.env.applicationKey;

let b2 = new b2Wrapper(
	bucketID,
	bucketName,
	downloadURL,
	applicationKeyId,
	applicationKey
);

app.get('*', async function(req, res) {
	debug(req.path);
	const fileNameWithPath = req.path.slice(1);
	const address = myCache.get(fileNameWithPath);
	if (address != undefined) {
		return res.redirect(address);
	}
	try {
		let authURL = await b2.getFile(fileNameWithPath);
		myCache.set(fileNameWithPath, authURL);
		return res.redirect(authURL);
	} catch (err) {
		res.send(err);
	}
});

app.listen(port, async function() {
	try {
		await b2.init();
	} catch (err) {
		debug(err);
		// eslint-disable-next-line no-process-exit
		process.exit(err);
	}
});
