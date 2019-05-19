# B2PrivateBucketProxy

Allows access to files in a private BackBlaze B2 bucket for one week, after that
it will return a 410 error.

For local development, create a `.env` file following the format in
`.templateenv`.

For running the docker you can also use the `.env` file. e.g
`docker run -p 8080:8080 --env-file .env -d jdon/b2proxy`
