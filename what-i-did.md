1. cloned librechat repo
2. used docker compose up
3. copied .env.example to .env
4. added deepseek api key in .env 
5. copied librechat.example.yaml to librechat.yaml 
    cp librechat.example.yaml librechat.yaml
6. copied docker-compose.override.example.yml to docker-compose.override.yml
    cp docker-compose.override.example.yml docker-compose.override.yml
7. uncommented the lines in docker-compose.override.yml to use the config file and the latest numbered release docker image

    services:
    api:
        volumes:
        - type: bind
        source: ./librechat.yaml
        target: /app/librechat.yaml
        image: registry.librechat.ai/danny-avila/librechat:latest
        build:
            context: .
            target: node

8. also in the same above config set the "image" to "librechat" instead of the registry image so that it uses the local and "build" block was added
    so that it builds and doens't default to dockerhub.

## Local + live Mongo (Hotshot Secret AI)

Plain `docker compose up` uses an empty local Mongo — you will not see Hotshot Secret AI.

To run locally against the live DB (recommended for this fork):

See **[LOCAL_DEV.md](./LOCAL_DEV.md)** — short path:

```bash
cp .env.example .env          # once; fill secrets
./run.sh                      # SSH tunnel + compose (creates docker-compose.local.yml)
# open http://localhost:3080
```

