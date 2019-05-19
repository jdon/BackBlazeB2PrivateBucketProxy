docker pull jdon/b2proxy
docker stop b2proxy
docker rm b2proxy
docker run --name b2proxy -p 8080:8080 --env-file .env -d jdon/b2proxy