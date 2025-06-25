
-- تبسيط جدول customer_addresses وحذف الحقول المعقدة غير المطلوبة
ALTER TABLE customer_addresses 
DROP COLUMN IF EXISTS governorate_id,
DROP COLUMN IF EXISTS city_id,
DROP COLUMN IF EXISTS area_id,
DROP COLUMN IF EXISTS neighborhood_id;

-- التأكد من وجود الحقول الأساسية المطلوبة فقط
ALTER TABLE customer_addresses 
ALTER COLUMN address SET NOT NULL,
ALTER COLUMN user_id SET NOT NULL;

-- إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_default 
ON customer_addresses(user_id, is_default);

-- إضافة فهرس للإحداثيات إذا لم يكن موجوداً
CREATE INDEX IF NOT EXISTS idx_customer_addresses_coordinates 
ON customer_addresses(latitude, longitude);
