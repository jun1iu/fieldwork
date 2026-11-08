# Fieldwork Supply in Docker

Run these commands from this directory with Docker Compose available.

```sh
docker compose up -d --build
```

Open [the local storefront](http://127.0.0.1:8088). The service binds to
loopback. To use another local port, set `FIELDWORK_PORT` before running Compose.

```sh
docker compose ps
docker compose logs storefront
docker compose down
```

The image serves the static storefront from `dist/` using Caddy. Rebuild after
changing those files. The cart is stored in the visitor's browser and checkout
simulates an order.
