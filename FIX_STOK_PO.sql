-- =========================================================================
-- PERBAIKAN LOGIKA STOK PEMBELIAN (PO INBOUND)
-- Silakan jalankan kode SQL ini di menu SQL Editor pada Supabase Dashboard
-- =========================================================================

-- 1. Modifikasi Fungsi Insert: Hentikan penambahan stok otomatis saat PO dibuat
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
    -- PO INBOUND: JANGAN tambah stok saat pembuatan PO.
    -- Stok hanya akan ditambah saat penerimaan barang (qty_received di-update)
    -- Jadi blok ini dibiarkan kosong.
  
  ELSIF v_type = 'SO_OUTBOUND' THEN
    -- Penjualan: Kurangi stok seperti biasa
    IF (v_current_stock - NEW.quantity) < 0 THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk Penjualan (SO_OUTBOUND). Sisa stok: %, Dibutuhkan: %', v_current_stock, NEW.quantity;
    END IF;
    
    UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 2. Buat Fungsi Baru: Menambah stok HANYA KETIKA qty_received di-update (Penerimaan Barang)
CREATE OR REPLACE FUNCTION update_stock_on_receiving()
RETURNS TRIGGER AS $$
DECLARE
  v_type transaction_type;
  v_diff DECIMAL;
BEGIN
  -- Dapatkan jenis transaksi
  SELECT type INTO v_type FROM transactions WHERE id = NEW.transaction_id;
  
  -- Hanya jalankan untuk PO_INBOUND dan jika ada perubahan pada qty_received
  IF v_type = 'PO_INBOUND' AND NEW.qty_received IS DISTINCT FROM OLD.qty_received THEN
    -- Hitung selisih jumlah yang baru diterima
    v_diff := COALESCE(NEW.qty_received, 0) - COALESCE(OLD.qty_received, 0);
    
    IF v_diff > 0 THEN
      -- Tambahkan selisih tersebut ke stok produk
      UPDATE products SET stock_quantity = stock_quantity + v_diff WHERE id = NEW.product_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 3. Pasang Trigger Baru pada tabel transaction_items
DROP TRIGGER IF EXISTS trigger_update_stock_on_receiving ON transaction_items;

CREATE TRIGGER trigger_update_stock_on_receiving
AFTER UPDATE OF qty_received ON transaction_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_receiving();

-- =========================================================================
-- SELESAI. STOK SEKARANG HANYA BERTAMBAH SAAT KLIK "SIMPAN PENERIMAAN BARANG"
-- =========================================================================
