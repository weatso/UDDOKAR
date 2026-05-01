-- ==========================================
-- SKEMA DATABASE ERP MINI "UD DOKAR"
-- ==========================================

-- 1. TABEL MASTER

-- Tabel Kategori
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Produk (Barang Mentah & Barang Jadi)
CREATE TYPE product_type AS ENUM ('RAW', 'FINISHED');
CREATE TYPE product_sub_type AS ENUM ('POLOS', 'CETAK');

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  type product_type NOT NULL,
  sub_type product_sub_type,
  dimensions JSONB, -- Contoh: {"p": 20, "l": 10, "t": 5, "gramasi": 150}
  stock_quantity DECIMAL DEFAULT 0,
  base_price DECIMAL DEFAULT 0, -- HPP
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_stock_quantity_non_negative CHECK (stock_quantity >= 0)
);

-- Tabel Kontak (Supplier & Customer)
CREATE TYPE contact_type AS ENUM ('SUPPLIER', 'CUSTOMER');

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type contact_type NOT NULL,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 2. TABEL TRANSAKSI & PEMBAYARAN

-- Tabel Transaksi Utama (PO/SO)
CREATE TYPE transaction_type AS ENUM ('PO_INBOUND', 'SO_OUTBOUND');
CREATE TYPE transaction_status AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id),
  type transaction_type NOT NULL,
  total_amount DECIMAL DEFAULT 0,
  amount_paid DECIMAL DEFAULT 0,
  status transaction_status DEFAULT 'UNPAID',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item Transaksi
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pembayaran Keuangan
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. TABEL PRODUKSI (SPK)

-- Surat Perintah Kerja (SPK)
CREATE TYPE production_status AS ENUM ('PENDING', 'COMPLETED');

CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spk_number TEXT UNIQUE NOT NULL,
  target_product_id UUID REFERENCES products(id),
  target_quantity DECIMAL NOT NULL,
  status production_status DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log Produksi (Pemakaian Bahan / Hasil Jadi)
CREATE TYPE production_log_type AS ENUM ('CONSUMED', 'PRODUCED');

CREATE TABLE production_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL NOT NULL,
  type production_log_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- FUNGSI & TRIGGERS (BUSINESS LOGIC)
-- ==========================================

-- A. PROTEKSI & UPDATE STOK DARI TRANSAKSI (PO & SO)
CREATE OR REPLACE FUNCTION update_stock_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_type transaction_type;
  v_current_stock DECIMAL;
BEGIN
  -- Dapatkan jenis transaksi
  SELECT type INTO v_type FROM transactions WHERE id = NEW.transaction_id;
  
  -- Dapatkan stok produk saat ini
  SELECT stock_quantity INTO v_current_stock FROM products WHERE id = NEW.product_id;

  IF v_type = 'PO_INBOUND' THEN
    -- Pembelian: Tambah stok
    UPDATE products SET stock_quantity = stock_quantity + NEW.quantity WHERE id = NEW.product_id;
  
  ELSIF v_type = 'SO_OUTBOUND' THEN
    -- Penjualan: Kurangi stok
    -- Proteksi Stok Minus (Sesuai Permintaan)
    IF (v_current_stock - NEW.quantity) < 0 THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk Penjualan (SO_OUTBOUND). Sisa stok: %, Dibutuhkan: %', v_current_stock, NEW.quantity;
    END IF;
    
    UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_from_transaction
AFTER INSERT ON transaction_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_from_transaction();


-- B. PROTEKSI & UPDATE STOK DARI PRODUKSI (SPK)
CREATE OR REPLACE FUNCTION update_stock_from_production()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock DECIMAL;
BEGIN
  SELECT stock_quantity INTO v_current_stock FROM products WHERE id = NEW.product_id;

  IF NEW.type = 'CONSUMED' THEN
    -- Pemakaian Bahan (Barang Mentah): Kurangi stok
    -- Proteksi Stok Minus (Sesuai Permintaan)
    IF (v_current_stock - NEW.quantity) < 0 THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk Pemakaian Bahan Produksi. Sisa stok: %, Dibutuhkan: %', v_current_stock, NEW.quantity;
    END IF;
    
    UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
  
  ELSIF NEW.type = 'PRODUCED' THEN
    -- Hasil Produksi (Barang Jadi): Tambah stok
    UPDATE products SET stock_quantity = stock_quantity + NEW.quantity WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_from_production
AFTER INSERT ON production_logs
FOR EACH ROW
EXECUTE FUNCTION update_stock_from_production();


-- C. KALKULASI HPP SAAT SPK SELESAI (COMPLETED)
CREATE OR REPLACE FUNCTION finalize_spk_and_calculate_hpp()
RETURNS TRIGGER AS $$
DECLARE
  v_total_consumed_value DECIMAL := 0;
  v_total_produced_qty DECIMAL := 0;
  v_new_base_price DECIMAL := 0;
BEGIN
  -- Hanya jalankan jika status berubah menjadi COMPLETED
  IF NEW.status = 'COMPLETED' AND OLD.status = 'PENDING' THEN
    
    -- 1. Hitung total nilai bahan mentah (CONSUMED) berdasarkan HPP saat ini
    SELECT COALESCE(SUM(pl.quantity * p.base_price), 0)
    INTO v_total_consumed_value
    FROM production_logs pl
    JOIN products p ON p.id = pl.product_id
    WHERE pl.production_order_id = NEW.id AND pl.type = 'CONSUMED';

    -- 2. Hitung total jumlah barang jadi (PRODUCED)
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_total_produced_qty
    FROM production_logs
    WHERE production_order_id = NEW.id AND type = 'PRODUCED';

    -- 3. Kalkulasi dan Update HPP Baru
    IF v_total_produced_qty > 0 THEN
      v_new_base_price := v_total_consumed_value / v_total_produced_qty;
      
      -- Update base_price di tabel products
      UPDATE products SET base_price = v_new_base_price WHERE id = NEW.target_product_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_finalize_spk
AFTER UPDATE ON production_orders
FOR EACH ROW
EXECUTE FUNCTION finalize_spk_and_calculate_hpp();


-- D. UPDATE STATUS PEMBAYARAN OTOMATIS
CREATE OR REPLACE FUNCTION update_transaction_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid DECIMAL;
  v_total_amount DECIMAL;
BEGIN
  -- Dapatkan total pembayaran untuk transaksi ini
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE transaction_id = NEW.transaction_id;

  -- Dapatkan total tagihan dari transaksi
  SELECT total_amount INTO v_total_amount
  FROM transactions
  WHERE id = NEW.transaction_id;

  -- Tentukan status
  IF v_total_paid >= v_total_amount THEN
    UPDATE transactions 
    SET amount_paid = v_total_paid, status = 'PAID'
    WHERE id = NEW.transaction_id;
  ELSIF v_total_paid > 0 THEN
    UPDATE transactions 
    SET amount_paid = v_total_paid, status = 'PARTIAL'
    WHERE id = NEW.transaction_id;
  ELSE
    UPDATE transactions 
    SET amount_paid = v_total_paid, status = 'UNPAID'
    WHERE id = NEW.transaction_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_status
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_transaction_payment_status();

-- ==========================================
-- 4. TABEL JURNAL AKUNTANSI (DOUBLE-ENTRY)
-- ==========================================

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  debit DECIMAL DEFAULT 0,
  credit DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. TRIGGER JURNAL OTOMATIS SAAT PEMBAYARAN
CREATE OR REPLACE FUNCTION record_journal_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_type transaction_type;
BEGIN
  -- Dapatkan jenis transaksi dari pembayaran ini
  SELECT type INTO v_transaction_type 
  FROM transactions 
  WHERE id = NEW.transaction_id;

  -- JURNAL UNTUK PENJUALAN (SO_OUTBOUND)
  -- Pelanggan Bayar: Debit Kas bertambah, Kredit Piutang Usaha berkurang
  IF v_transaction_type = 'SO_OUTBOUND' THEN
    -- 1. Debit Kas/Bank
    INSERT INTO journal_entries (payment_id, transaction_id, account_name, debit, credit)
    VALUES (NEW.id, NEW.transaction_id, 'Kas/Bank', NEW.amount, 0);
    
    -- 2. Kredit Piutang Usaha
    INSERT INTO journal_entries (payment_id, transaction_id, account_name, debit, credit)
    VALUES (NEW.id, NEW.transaction_id, 'Piutang Usaha', 0, NEW.amount);
    
  -- JURNAL UNTUK PEMBELIAN (PO_INBOUND)
  -- Bayar Supplier: Debit Hutang Usaha berkurang, Kredit Kas berkurang
  ELSIF v_transaction_type = 'PO_INBOUND' THEN
    -- 1. Debit Hutang Usaha
    INSERT INTO journal_entries (payment_id, transaction_id, account_name, debit, credit)
    VALUES (NEW.id, NEW.transaction_id, 'Hutang Usaha', NEW.amount, 0);
    
    -- 2. Kredit Kas/Bank
    INSERT INTO journal_entries (payment_id, transaction_id, account_name, debit, credit)
    VALUES (NEW.id, NEW.transaction_id, 'Kas/Bank', 0, NEW.amount);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_journal
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION record_journal_on_payment();

-- ==========================================
-- 5. TABEL JADWAL PEMBAYARAN (TENOR/CICILAN)
-- ==========================================
CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount_to_pay DECIMAL NOT NULL,
  due_date DATE NOT NULL,
  status transaction_status DEFAULT 'UNPAID',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. SECURITY: ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================

-- A. Enable RLS di semua tabel
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- B. Buat Policy: Izinkan semua akses HANYA untuk role "authenticated" (Sudah Login)

-- Categories
CREATE POLICY "Allow authenticated full access categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products
CREATE POLICY "Allow authenticated full access products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contacts
CREATE POLICY "Allow authenticated full access contacts" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Transactions
CREATE POLICY "Allow authenticated full access transactions" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Transaction Items
CREATE POLICY "Allow authenticated full access transaction_items" ON transaction_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payments
CREATE POLICY "Allow authenticated full access payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payment Schedules
CREATE POLICY "Allow authenticated full access payment_schedules" ON payment_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Production Orders
CREATE POLICY "Allow authenticated full access production_orders" ON production_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Production Logs
CREATE POLICY "Allow authenticated full access production_logs" ON production_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Journal Entries
CREATE POLICY "Allow authenticated full access journal_entries" ON journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
