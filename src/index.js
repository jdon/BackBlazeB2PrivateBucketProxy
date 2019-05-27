require('dotenv').config();
const debug = require('debug')('B2Proxy');
const express = require('express');
const B2 = require('backblaze-b2');
const moment = require('moment');
const NodeCache = require('node-cache');
const retry = require('async-retry');
const myCache = new NodeCache({ stdTTL: 6000, checkperiod: 12000 });

const app = express();

var b2;

const port = process.env.port;
const bucketID = process.env.bucketID;
const bucketName = process.env.bucketName;
const downloadURL = process.env.downloadURL;
const accountId = process.env.keyID;
const applicationKey = process.env.applicationKey;

app.listen(port, async function() {
	b2 = new B2({
		accountId: accountId,
		applicationKey: applicationKey,
	});
	try {
		await b2.authorize();
	} catch (err) {
		console.log(
			'Unable to authorize with B2, please check your credentials'
		);
		process.exit(err);
	}
});

app.get('*', async function(req, res) {
	debug(req.path);
	let headers = req.headers;
	if (headers['x-forwarded-for']) {
		debug(headers['x-forwarded-for']);
	}
	var fileNameWithPath = req.path.slice(1);
	return getAddressWrapper(fileNameWithPath, res);
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
	value = myCache.get(fileName);

	if (value != undefined) {
		return Promise.resolve(value);
	} else {
		return getAuthForFileName(fileName).then(function(auth) {
			let address = createAuthAddress(fileName, auth.authorizationToken);
			myCache.set(fileName, address, auth.validDurationInSeconds);
			return address;
		});
	}
}

function getAuthForFileName(fileName, data) {
	return getFile(fileName, true).then(function(fileInfo) {
		let timeUpload = fileInfo['x-bz-upload-timestamp'];
		let new_date = moment.unix(timeUpload).add(7, 'days');
		let diffSeconds = new_date.diff(moment.unix(timeUpload), 'seconds');
		let fileID = fileInfo['x-bz-file-id'];
		if (diffSeconds > 1) {
			return getAuth(fileName, diffSeconds).catch(function(error) {
				console.log('test6');
			});
		} else {
			return {
				response: {
					status: 410,
				},
				message: '',
			};
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

function wrapError(err, res) {
	debug(err);
	res.status(err.response.status);
	return res.send(err.message);
}

async function getAddressWrapper(fileNameWithPath, res) {
	try {
		return getAddr(fileNameWithPath, res);
	} catch (err) {
		console.log(err);
		if (err.message == 'Invalid authorizationToken') {
			try {
				let newB2 = new B2({
					accountId: accountId,
					applicationKey: applicationKey,
				});
				await newB2.authorize();
				b2 = newB2;
				return getAddr(fileNameWithPath, res);
			} catch (error) {
				console.log(err);
				return wrapError(
					{
						response: {
							status: 401,
						},
						message: error.message,
					},
					res
				);
			}
		}
	}
}

function getAddr(fileNameWithPath, res) {
	return getAddress(fileNameWithPath)
		.then(function(address) {
			return res.redirect(address);
		})
		.catch(function(error) {
			return wrapError(error, res);
		});
}
