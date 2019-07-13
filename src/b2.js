const B2 = require('backblaze-b2');
const debug = require('debug')('B2PWrapper');
const moment = require('moment');

class b2Wrapper {
	constructor(
		bucketID,
		bucketName,
		downloadURL,
		applicationKeyId,
		applicationKey,
		authSeconds
	) {
		this.bucketID = bucketID;
		this.bucketName = bucketName;
		this.downloadURL = downloadURL;
		this.applicationKeyId = applicationKeyId;
		this.applicationKey = applicationKey;
		this.authSeconds = authSeconds;
		this.isAuthorized = false;
		this.b2 = null;
	}

	async init() {
		try {
			let authedB2 = new B2({
				applicationKeyId: this.applicationKeyId,
				applicationKey: this.applicationKey,
			});

			await authedB2.authorize();
			debug('Successfully authorized with B2');

			this.b2 = authedB2;
			return true;
		} catch (err) {
			debug(
				'Unable to authorize with B2, please check your credentials!'
			);
			throw 'Unable to authorize with B2, please check your credentials!';
		}
	}

	async getFile(fileName) {
		try {
			//b2 lib doesn't automatically auth, so lets just auth every call
			await this.init();

			let response = await this.b2.downloadFileByName({
				bucketName: this.bucketName,
				fileName: fileName,
				axiosOverride: {
					method: 'head',
				},
			});

			let headers = response.headers;

			if (!headers['x-bz-upload-timestamp']) {
				throw {
					status: 404,
					message: 'File not found',
				};
			}

			// check that file was upload within the last week
			let timeUpload = headers['x-bz-upload-timestamp'] / 1000;
			let new_date = moment
				.unix(timeUpload)
				.add(this.authSeconds, 'seconds');
			let validDurationInSeconds = new_date.diff(moment(), 'seconds');

			if (validDurationInSeconds < 1) {
				throw {
					status: 410,
					message: 'The requested file is no longer available',
				};
			}

			validDurationInSeconds =
				validDurationInSeconds >= 604800
					? 604800
					: validDurationInSeconds;

			let authResponse = await this.b2.getDownloadAuthorization({
				bucketId: this.bucketID,
				fileNamePrefix: fileName,
				validDurationInSeconds: validDurationInSeconds,
			});

			let authData = authResponse.data;

			if (!authData['authorizationToken']) {
				throw {
					status: 500,
					message: 'Failed to get authorization',
				};
			}

			let authToken = authData.authorizationToken;

			return (
				this.downloadURL +
				'/' +
				this.bucketName +
				'/' +
				fileName +
				'?Authorization=' +
				authToken
			);
		} catch (err) {
			debug(err);
			throw {
				status: err.status || 500,
				message: err.message || err,
			};
		}
	}
}

module.exports = b2Wrapper;
