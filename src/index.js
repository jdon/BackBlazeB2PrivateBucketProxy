require('dotenv').config();
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
		process.exit(err);
	}
});

app.get('*', async function(req, res) {
	console.log(req.path);
	let headers = req.headers;
	if (headers['x-forwarded-for']) {
		console.log(headers['x-forwarded-for']);
	}
	try {
		var fileNameWithPath = req.path.slice(1);
		let address = await getAddress(fileNameWithPath);
		res.redirect(address);
	} catch (err) {
		console.log(err);
		if (err == 404 || err == 410 || err == 401) {
			res.send(err);
		}
	}
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

async function getAuthForFileName(fileName, data) {
	let fileInfo = await getFile(fileName, true);

	let timeUpload = fileInfo['x-bz-upload-timestamp'];
	let new_date = moment.unix(timeUpload).add(7, 'days');
	let diffSeconds = new_date.diff(moment.unix(timeUpload), 'seconds');
	let fileID = fileInfo['x-bz-file-id'];

	if (diffSeconds > 1) {
		let auth = await getAuth(fileName, diffSeconds);
		return auth;
	}
}

async function init() {
	var keys = JSON.parse(fs.readFileSync(__dirname + '/keys.json'));

	bucketID = keys.bucketID;
	bucketName = keys.bucketName;
	downloadURL = keys.downloadURL;
}

async function getAuth(fileName, validDurationInSeconds) {
	try {
		let response = await b2.getDownloadAuthorization({
			bucketId: bucketID,
			fileNamePrefix: fileName,
			validDurationInSeconds: 604800,
		});
		response.data.validDurationInSeconds = validDurationInSeconds;
		return response.data;
	} catch (err) {
		return Promise.reject('410');
	}
}

async function getFile(fileName, infoOnly) {
	let method = infoOnly ? 'head' : 'get';
	try {
		let response = await b2.downloadFileByName({
			bucketName: bucketName,
			fileName: fileName,
			axiosOverride: {
				method: method,
			},
		});
		if (infoOnly) {
			return response.headers;
		} else {
			response.data;
		}
	} catch (err) {
		if (err.message == 'Invalid authorizationToken') {
			return retry(b2.authorize, { retries: 3 })
				.then(function(result) {
					console.log('result:' + result);
				})
				.catch(function() {
					return Promise.reject('401');
				});
		}
		return Promise.reject('404');
	}
}
