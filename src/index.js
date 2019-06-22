require('dotenv').config();
const debug = require('debug')('B2Proxy');
const express = require('express');
const B2 = require('backblaze-b2');
const moment = require('moment');
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 6000, checkperiod: 12000 });

const app = express();

var b2;

const port = process.env.port;
const bucketID = process.env.bucketID;
const bucketName = process.env.bucketName;
const downloadURL = process.env.downloadURL;
const applicationKeyId = process.env.keyID;
const applicationKey = process.env.applicationKey;

b2 = new B2({
	applicationKeyId: applicationKeyId,
	applicationKey: applicationKey,
});

app.get('*', function(req, res) {
	debug(req.path);
	let headers = req.headers;
	if (headers['x-forwarded-for']) {
		debug(headers['x-forwarded-for']);
	}
	var fileNameWithPath = req.path.slice(1);
	let address = myCache.get(fileNameWithPath);

	if (address != undefined) {
		return res.redirect(address);
	} else {
		return b2
			.authorize()
			.then(function() {
				return getAddress(fileNameWithPath).then(function(address) {
					return res.redirect(address);
				});
			})
			.catch(function(err) {
				res.send(err.message);
				debug(err.message);
			});
	}
});

app.listen(port, function() {
	b2.authorize()
		.then(function() {
			debug('Successfully authorized with B2');
		})
		.catch(function(err) {
			debug(
				'Unable to authorize with B2, please check your credentials!'
			);
			process.exit(err);
		});
});

function createAuthAddress(fileName, auth) {
	return (
		downloadURL +
		'/' +
		bucketName +
		'/' +
		fileName +
		'?Authorization=' +
		auth
	);
}

function getAddress(fileName) {
	return getAuthForFileName(fileName).then(function(auth) {
		let address = createAuthAddress(fileName, auth.authorizationToken);
		myCache.set(fileName, address, auth.validDurationInSeconds);
		return address;
	});
}

function getAuthForFileName(fileName, data) {
	return getFile(fileName, true).then(function(fileInfo) {
		let timeUpload = fileInfo['x-bz-upload-timestamp'] / 1000;
		let new_date = moment.unix(timeUpload).add(7, 'days');
		let diffSeconds = new_date.diff(moment(), 'seconds');
		let fileID = fileInfo['x-bz-file-id'];
		if (diffSeconds > 1) {
			return getAuth(fileName, diffSeconds);
		} else {
			return Promise.reject({
				response: {
					status: 410,
				},
				message: 'Request failed with status code 410',
			});
		}
	});
}

function getAuth(fileName, validDurationInSeconds) {
	return b2
		.getDownloadAuthorization({
			bucketId: bucketID,
			fileNamePrefix: fileName,
			validDurationInSeconds: validDurationInSeconds,
		})
		.then(function(response) {
			response.data.validDurationInSeconds = validDurationInSeconds;
			return response.data;
		});
}

function getFile(fileName, infoOnly) {
	let method = infoOnly ? 'head' : 'get';
	return b2
		.downloadFileByName({
			bucketName: bucketName,
			fileName: fileName,
			axiosOverride: {
				method: method,
			},
		})
		.then(function(response) {
			if (infoOnly) {
				return response.headers;
			} else {
				return response.data;
			}
		});
}

function getAddr(fileNameWithPath, res) {}
