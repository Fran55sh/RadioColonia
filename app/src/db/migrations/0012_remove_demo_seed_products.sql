-- Remove demo catalog inserted by seed.ts (does not touch real products).
-- Idempotent: no-op if slugs were already deleted.

DELETE FROM products
WHERE slug IN (
  'pro-max-smartphone-256gb',
  'ultrabook-pro-14-m3',
  'smart-watch-series-x',
  'pro-wireless-earbuds-anc',
  'elite-gaming-controller-pro',
  'studio-headphones-xm5'
);
