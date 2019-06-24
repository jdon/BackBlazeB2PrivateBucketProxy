const { Given, When, Then } = require('cucumber');
const { assert } = require('chai');
const rp = require('request-promise');
require('dotenv').config();

const b2Wrapper = require('../../src/b2');

const bucketID = process.env.bucketID;
const bucketName = process.env.bucketName;
const downloadURL = process.env.downloadURL;
const applicationKeyId = process.env.keyID;
const applicationKey = process.env.applicationKey;
const authSeconds = process.env.authSeconds;

Given('the correct environmental variables have been set', function() {
	assert.isString(bucketID);
	assert.isString(bucketName);
	assert.isString(downloadURL);
	assert.isString(applicationKeyId);
	assert.isString(applicationKey);
	assert.isString(authSeconds);
});

let b2;

let authResult;

When('I authenticate with B2', async function() {
	b2 = new b2Wrapper(
		bucketID,
		bucketName,
		downloadURL,
		applicationKeyId,
		applicationKey,
		authSeconds
	);

	authResult = await b2.init();

	assert.isBoolean(authResult);
});

Then('I am Successfully authenticated', function() {
	assert.isTrue(authResult);
});

let fileResult;

When('I request {string}', async function(string) {
	fileResult = await b2.getFile(string);

	assert.isString(fileResult);
});

Then('I should receive a URL with an authentication token', function() {
	assert(fileResult.includes('?Authorization='));
});

Then('I can successfully download the file', async function() {
	let optionsStart = {
		uri: fileResult,
		method: 'head',
		resolveWithFullResponse: true,
	};
	return rp(optionsStart)
		.then(function(response) {
			// Process html...
			assert.equal(response.statusCode, 200);
		})
		.catch(function(err) {
			assert.fail(0, 1, err);
		});
});
