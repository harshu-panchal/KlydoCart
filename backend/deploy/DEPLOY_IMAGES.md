# Production deployment checklist (images)

Do **not** run these on production until you are ready. This document is configuration guidance only.

## 1. Create storage outside the app directory

```bash
sudo mkdir -p /var/storage/{products,categories,sellers,delivery,banners,stores,returns,users,documents}
sudo chown -R <pm2-user>:www-data /var/storage
sudo find /var/storage -type d -exec chmod 775 {} \;
```

## 2. Set environment on the API host

```bash
# in PM2 ecosystem or systemd Environment=
STORAGE_ROOT=/var/storage
PUBLIC_IMAGE_BASE_URL=https://api.your-domain.com/images
```

Restart PM2 after changing env:

```bash
pm2 restart klydocart-backend --update-env
```

## 3. Install Nginx snippet

1. Copy `nginx-images.conf` ideas into your existing API `server` block.
2. Replace `api.example.com` and certificate paths.
3. Ensure `alias /var/storage/;` matches `STORAGE_ROOT`.
4. Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Verify

```bash
# Upload via API (authenticated), then:
curl -I https://api.your-domain.com/images/products/2026/10/<uuid>.webp
```

Expect `200`, correct `Content-Type`, and long-cache headers.

## 5. Mongo migration

Keep Cloudinary URLs until the dry-run report looks correct and you explicitly approve execute mode.

```bash
cd /path/to/backend
npx tsx src/scripts/migrateCloudinaryUrlsToVps.ts
```

## Rollback

1. Point `PUBLIC_IMAGE_BASE_URL` / uploads back to Cloudinary by restoring previous `uploadRoutes` + env if needed (Cloudinary service still in repo).
2. Mongo documents still contain Cloudinary URLs until a future approved migration runs.
3. Files under `/var/storage` can remain; they do not affect Cloudinary.
