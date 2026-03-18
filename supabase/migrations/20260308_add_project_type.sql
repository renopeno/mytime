-- Add project type column
ALTER TABLE projects
ADD COLUMN type text NOT NULL DEFAULT 'web_design'
CHECK (type IN ('web_design', 'product_design', 'deck_design', 'webshop'));
