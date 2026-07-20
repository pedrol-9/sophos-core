-- =====================================================================
-- MIGRACIÓN: MIGRACIÓN WOMPI A MERCADO PAGO
-- =====================================================================

-- 1. Renombrar tabla y columnas
ALTER TABLE IF EXISTS public.transacciones_wompi RENAME TO transacciones_mercadopago;

ALTER TABLE IF EXISTS public.transacciones_mercadopago 
  RENAME COLUMN referencia_wompi TO referencia_mercadopago;

ALTER TABLE IF EXISTS public.transacciones_mercadopago 
  RENAME COLUMN wompi_transaction_id TO mercadopago_payment_id;

-- 2. Recrear políticas con nombres coherentes
DROP POLICY IF EXISTS admin_select_transacciones ON public.transacciones_mercadopago;
DROP POLICY IF EXISTS super_admin_all_transacciones ON public.transacciones_mercadopago;

CREATE POLICY admin_select_transacciones ON public.transacciones_mercadopago
  FOR SELECT TO authenticated
  USING (id_institucion = public.get_id_institucion());

CREATE POLICY super_admin_all_transacciones ON public.transacciones_mercadopago
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

-- Permisos
GRANT ALL ON TABLE public.transacciones_mercadopago TO authenticated, anon;
