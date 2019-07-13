const express = require('express');
const b2Router = express.Router();
const debug = require('debug')('B2Proxy-B2Router');
const b2Wrapper = require('../b2');
const cacheService = require('../cacheService');
const cache = new cacheService(3600); // Create a new cache service instance

const bucketID = process.env.bucketID;
const bucketName = process.env.bucketName;
const downloadURL = process.env.downloadURL;
const applicationKeyId = process.env.keyID;
const applicationKey = process.env.applicationKey;
const authSeconds = process.env.authSeconds;

let b2 = new b2Wrapper(
	bucketID,
	bucketName,
	downloadURL,
	applicationKeyId,
	applicationKey,
	authSeconds
);

b2Router.get('*', async (req, res) => {
	debug(req.path);
	const fileNameWithPath = decodeURI(req.path.slice(1));
	const cachedResponse = cache.get(fileNameWithPath);
	if (cachedResponse != null) {
		return res.redirect(cachedResponse);
	}
	try {
		let authURL = await b2.getFile(fileNameWithPath);
		cache.set(fileNameWithPath, authURL);
		return res.redirect(authURL);
	} catch (err) {
		return res.send(err);
	}
});
module.exports = b2Router;
