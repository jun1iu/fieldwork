FROM caddy:2
COPY Caddyfile /etc/caddy/Caddyfile
COPY dist/ /srv/fieldwork/
