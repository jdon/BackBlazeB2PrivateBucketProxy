# B2PrivateBucketProxy

Allows access to files in a private BackBlaze B2 bucket for one week, after that
it will return a 410 error.


Requires a `.env` file in the following format:

```
port=8080
keyID=h1c7wuy56dltx6nixmiych9wv
applicationKey=fun7ztolviavg2kfwpxvndxn3gnyr32
bucketID=13o4f8i9fr3fzlmpvrqahi65
bucketName=bucketName
downloadURL=https://domain.tld/files
authSeconds=604800
DEBUG=B2Proxy
```

For running the docker you can also use the `.env` file. e.g

`docker run -p 8080:8080 --env-file .env -d jdon/b2proxy`



GitHub: 
https://github.com/jdon/BackBlazeB2PrivateBucketProxy


Docker Hub:
https://hub.docker.com/r/jdon278/b2proxy/
