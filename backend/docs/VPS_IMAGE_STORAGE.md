# KlydoCart VPS Image Storage (Phases A–B)

Cloudinary remains installed for rollback, but **new uploads** go to local/VPS storage via Multer + Sharp.

## Environment variables

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `STORAGE_ROOT` | **Yes in production** | `/var/storage` | Absolute filesystem root for images. Must be **outside** the app deploy directory so PM2 restarts and deploys do not wipe files. |
| `PUBLIC_IMAGE_BASE_URL` | **Yes in production** | `https://api.klydocart.com/images` | Public URL prefix returned as `secureUrl` / `url`. No trailing slash. |
| `PORT` | No | `5000` | Used only to build a local default public base URL when `PUBLIC_IMAGE_BASE_URL` is unset. |
| `ALLOW_IMAGE_URL_MIGRATION` | No | unset | Reserved for a future approved Mongo rewrite. Execute mode is **locked** in the current script. |

### Local development defaults

If unset:

- `STORAGE_ROOT` → `<backend>/.storage`
- `PUBLIC_IMAGE_BASE_URL` → `http://localhost:<PORT>/images`

Add to `backend/.env`:

```env
STORAGE_ROOT=D:/Appzeto/KlydoCart-main/backend/.storage
PUBLIC_IMAGE_BASE_URL=http://localhost:5000/images
```

### Production example

```env
STORAGE_ROOT=/var/storage
PUBLIC_IMAGE_BASE_URL=https://api.klydocart.com/images
```

## Directory layout

```
/var/storage/
  products/2026/10/<uuid>.webp
  categories/2026/10/<uuid>.webp
  sellers/2026/10/<uuid>.webp
  delivery/2026/10/<uuid>.webp
  banners/2026/10/<uuid>.webp
  stores/2026/10/<uuid>.webp
  returns/2026/10/<uuid>.webp
  users/2026/10/<uuid>.webp
  documents/2026/10/<uuid>.pdf   # or .webp for image docs
```

Public URL:

`https://api.klydocart.com/images/products/2026/10/<uuid>.webp`

## API compatibility

Upload endpoints unchanged:

- `POST /api/v1/upload/image`
- `POST /api/v1/upload/images`
- `POST /api/v1/upload/document` (10 MB)
- `POST /api/v1/upload/documents` (10 MB)
- `DELETE /api/v1/upload?publicId=...` (preferred)
- `DELETE /api/v1/upload/:publicId` (legacy; no slashes)

Response `data` still matches:

```json
{
  "url": "...",
  "secureUrl": "...",
  "publicId": "products/2026/10/uuid.webp",
  "width": 1200,
  "height": 800,
  "format": "webp",
  "bytes": 12345
}
```

Frontend should keep using `secureUrl`.

## Linux permissions (production)

```bash
sudo mkdir -p /var/storage
sudo chown -R deploy:www-data /var/storage
sudo chmod -R 775 /var/storage
# Ensure the Node/PM2 user can write and Nginx (www-data) can read
```

## Nginx

See `backend/deploy/nginx-images.conf` for a drop-in `location /images/` block.

Prefer Nginx for static delivery in production. Express also mounts `/images` from `STORAGE_ROOT` for local/dev.

## Migration (dry-run only for now)

Downloaded assets + mapping:

- `frontend/assets/cloudinary/**`
- `frontend/assets/cloudinary/_metadata/url-mapping.json`

```bash
cd backend
npx tsx src/scripts/migrateCloudinaryUrlsToVps.ts
```

This inspects MongoDB Cloudinary URLs and writes a report under  
`frontend/assets/cloudinary/_metadata/migration-reports/`.  
It does **not** update MongoDB. `--execute` is refused until you explicitly approve a later change.

## What was intentionally not done

- No MongoDB image URL rewrites
- No deletion of downloaded Cloudinary mirror files
- Cloudinary npm package and `cloudinaryService.ts` retained
- No production server/Nginx changes executed from this repo
