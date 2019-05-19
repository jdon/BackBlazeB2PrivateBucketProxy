const express = require('express');
const B2 = require('backblaze-b2');
const moment = require('moment');
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 6000, checkperiod: 12000 });

const app = express();
const port = 3000;

var b2;
var bucketID;
var bucketName;

app.get('*', async function(req, res) {
	console.log(req.path);
	try {
		let address = await getAddress(req.path.slice(1));
		res.redirect(address);
	} catch (err) {
		if (err == 404 || err == 410) {
			res.send(err);
		}
	}
});

app.listen(port, async function() {
	await init();
});

function getAddress(fileName) {
	value = myCache.get(fileName);

	if (value != undefined) {
		return value;
	} else {
		return getAuthForFileName(fileName).then(function(auth) {
			let address =
				'https://files.jdon.uk/file/' +
				bucketName +
				'/' +
				fileName +
				'?Authorization=' +
				auth;
			myCache.set(fileName, address);
			return address;
		});
	}
}

async function getAuthForFileName(fileName) {
	let fileInfo = await getFileInfo(fileName);

	let timeUpload = fileInfo['x-bz-upload-timestamp'];
	let new_date = moment.unix(timeUpload).add(7, 'days');
	let diffSeconds = new_date.diff(moment.unix(timeUpload), 'seconds');
	let fileID = fileInfo['x-bz-file-id'];

	if (diffSeconds > 1) {
		let auth = await getAuth(fileName, diffSeconds);
		console.log(auth);
		return auth.authorizationToken;
	}
}

async function init() {
	var keys = JSON.parse(fs.readFileSync(__dirname + '/keys.json'));

	bucketID = keys.bucketID;
	bucketName = keys.bucketName;

	b2 = new B2({
		accountId: keys.keyID,
		applicationKey: keys.applicationKey,
	});
	await b2.authorize();
}

async function getAuth(fileName, validDurationInSeconds) {
	try {
		let response = await b2.getDownloadAuthorization({
			bucketId: bucketID,
			fileNamePrefix: fileName,
			validDurationInSeconds: 604800,
		});
		return response.data;
	} catch (err) {
		return Promise.reject('410');
	}
}

async function getFileInfo(fileName) {
	try {
		let response = await b2.downloadFileByName({
			bucketName: bucketName,
			fileName: fileName,
			axiosOverride: {
				method: 'head',
			},
		});
		return response.headers;
	} catch (err) {
		return Promise.reject('404');
	}
}
