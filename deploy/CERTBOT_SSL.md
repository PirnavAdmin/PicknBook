# PickNBook EC2 Nginx and SSL

Use this after DNS for `picknbook.in` and `www.picknbook.in` points to the EC2 server.

1. Copy `deploy/nginx/picknbook.in.conf` to `/etc/nginx/sites-available/picknbook.in`.
2. Enable it:

```bash
sudo ln -sf /etc/nginx/sites-available/picknbook.in /etc/nginx/sites-enabled/picknbook.in
sudo nginx -t
sudo systemctl reload nginx
```

3. Keep the frontend container/app available on host port `3001`. Host Nginx listens on public port `80` and forwards to `127.0.0.1:3001`.

4. After you install Certbot manually, run:

```bash
sudo certbot --nginx -d picknbook.in -d www.picknbook.in
```

Choose the redirect option so HTTP redirects to HTTPS. Certbot will add the `443` SSL server block and certificate paths.

5. Verify renewal:

```bash
sudo certbot renew --dry-run
```
