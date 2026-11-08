FROM caddy:2
COPY Caddyfile /etc/caddy/Caddyfile
COPY dist/ /srv/fieldwork/

# A CDN in front of the site may cache /style.css for hours. Version its URL by content hash
# so a changed stylesheet is always fetched fresh. The build fails if the rewrite did not apply.
RUN h=$(md5sum /srv/fieldwork/style.css | cut -c1-10) \
 && sed -i "s|href=\"style.css\"|href=\"style.css?v=${h}\"|" /srv/fieldwork/index.html \
 && grep -q "style.css?v=${h}" /srv/fieldwork/index.html
