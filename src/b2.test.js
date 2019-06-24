const b2Wrapper = require('./b2');
const bucketID = process.env.bucketID;
const bucketName = process.env.bucketName;
const downloadURL = process.env.downloadURL;
const applicationKeyId = process.env.keyID;
const applicationKey = process.env.applicationKey;
const authSeconds = process.env.authSeconds;


describe('Successfully authenticates and gets a file', () => {
	

	let b2 = new b2Wrapper(
		bucketID,
		bucketName,
		downloadURL,
		applicationKeyId,
		applicationKey,
		authSeconds
	);

	test('Authenticates successfully', async () => {
		expect.assertions(1);

		let result = await b2.init()
		return expect(result).toBe(true);

	});

	let URL;

	test('Get file URL successfully', async () => {
		expect.assertions(1);
		try{
			let downloadURl = await b2.getFile('/testFile')
			URL = downloadURL;
			expect(downloadURl).stringContaining("Authorization");

		}catch(err){
			expect(err).toBeNull();
		}

	});

})

describe('Errors correctly', () => {

	test('Errors with incorrect auth', async () => {
		expect.assertions(1);

		let b2 = new b2Wrapper(
			'invalid',
			'invalid',
			'invalid',
			'invalid',
			'invalid',
			'invalid'
		);

		try{
			await b2.init()
		}catch(err){
			expect(err).toBe("Unable to authorize with B2, please check your credentials!");
		}

	});

})