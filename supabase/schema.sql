-- ==============================================================================
-- SCHEMA COMPLET SUPABASE - APPLICATION DE GESTION COMMERCIALE FCFA (SAAS MULTI-TENANT)
-- Architecture Multi-Boutiques (Multi-Tenant) avec RLS (Row Level Security)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES FONDAMENTALES
-- ==============================================================================

-- 2.1 BOUTIQUES / ORGANISATIONS (Multi-Tenant)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  ninea TEXT,
  rccm TEXT,
  legal_form TEXT DEFAULT 'SUARL', -- SUARL, SARL, Entreprise Individuelle, etc.
  tax_regime TEXT DEFAULT 'exempte' CHECK (tax_regime IN ('tva_18', 'exempte')),
  bank_name TEXT,
  bank_iban TEXT,
  default_due_days INT DEFAULT 0,
  invoice_prefix TEXT NOT NULL DEFAULT 'FAC',
  payment_terms TEXT DEFAULT 'Paiement à réception. Facture payable par Wave, Orange Money ou Espèces.',
  footer_message TEXT DEFAULT 'Merci pour votre confiance !',
  currency TEXT NOT NULL DEFAULT 'FCFA',
  notifications BOOLEAN DEFAULT TRUE,
  logo_url TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.2 PROFILS UTILISATEURS & ROLES
-- Lié à auth.users de Supabase
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'vendeur' CHECK (role IN ('gerant', 'vendeur')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.3 CATEGORIES DE PRODUITS
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.4 PRODUITS & SERVICES
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  reference TEXT,
  brand TEXT,
  serial_number TEXT,
  purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Seul le gérant devrait voir ce prix
  sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  alert_threshold NUMERIC(12, 2) NOT NULL DEFAULT 5,
  warranty_months INT NOT NULL DEFAULT 0,
  description TEXT,
  image TEXT, -- Emoji fallback ou URL Supabase Storage
  is_service BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.5 CLIENTS
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.6 VENTES & FACTURES
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  due_date TIMESTAMPTZ,
  doc_type TEXT NOT NULL DEFAULT 'facture' CHECK (doc_type IN ('facture', 'proforma')),
  method TEXT NOT NULL DEFAULT 'especes' CHECK (method IN ('especes', 'wave', 'orange_money', 'virement', 'carte')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(business_id, invoice_number)
);

-- 2.7 LIGNES D'ARTICLES DE VENTE
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  serial_number TEXT,
  warranty_months INT NOT NULL DEFAULT 0
);

-- 2.8 PAIEMENTS / REGLEMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('especes', 'wave', 'orange_money', 'virement', 'carte')),
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.9 MOUVEMENTS DE STOCK
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie', 'retour', 'ajustement')),
  quantity NUMERIC(12, 2) NOT NULL, -- négatif pour sortie, positif pour entrée
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.10 TICKETS SAV (SERVICE APRES-VENTE & REPARATIONS)
CREATE TABLE IF NOT EXISTS public.service_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  serial_number TEXT,
  issue TEXT NOT NULL,
  deposit_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  technician TEXT,
  status TEXT NOT NULL DEFAULT 'en_reparation' CHECK (status IN ('en_reparation', 'repare', 'livre')),
  notes TEXT,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(business_id, number)
);

-- ==============================================================================
-- 3. INDEXATION POUR LES PERFORMANCES MULTI-TENANT
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_business ON public.user_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_reference ON public.products(business_id, reference);
CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_sales_business ON public.sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(business_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_tickets_business ON public.service_tickets(business_id);

-- ==============================================================================
-- 4. FONCTIONS HELPER POUR LE MULTI-TENANT & RLS
-- ==============================================================================

-- Récupérer le business_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_current_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM public.user_profiles
  WHERE id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Récupérer le rôle de l'utilisateur connecté ('gerant' ou 'vendeur')
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles
  WHERE id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Restreindre l'exécution aux utilisateurs authentifiés uniquement (bloquer anon)
REVOKE EXECUTE ON FUNCTION public.get_current_business_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_business_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) - ISOLATION STRICTE ENTRE BOUTIQUES
-- ==============================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

-- 5.1 BUSINESSES
CREATE POLICY "Users can view their own business"
  ON public.businesses FOR SELECT
  USING (id = public.get_current_business_id());

CREATE POLICY "Gerants can update their own business"
  ON public.businesses FOR UPDATE
  USING (id = public.get_current_business_id() AND public.get_current_user_role() = 'gerant');

-- 5.2 USER PROFILES
CREATE POLICY "Users can view members of the same business"
  ON public.user_profiles FOR SELECT
  USING (business_id = public.get_current_business_id());

CREATE POLICY "Gerants can manage user profiles in their business"
  ON public.user_profiles FOR ALL
  USING (business_id = public.get_current_business_id() AND public.get_current_user_role() = 'gerant');

-- 5.3 CATEGORIES
CREATE POLICY "Tenant categories access"
  ON public.categories FOR ALL
  USING (business_id = public.get_current_business_id())
  WITH CHECK (business_id = public.get_current_business_id());

-- 5.4 PRODUCTS
CREATE POLICY "Tenant products read"
  ON public.products FOR SELECT
  USING (business_id = public.get_current_business_id());

CREATE POLICY "Tenant products write"
  ON public.products FOR ALL
  USING (business_id = public.get_current_business_id())
  WITH CHECK (business_id = public.get_current_business_id());

-- 5.5 CUSTOMERS
CREATE POLICY "Tenant customers access"
  ON public.customers FOR ALL
  USING (business_id = public.get_current_business_id())
  WITH CHECK (business_id = public.get_current_business_id());

-- 5.6 SALES
CREATE POLICY "Tenant sales read"
  ON public.sales FOR SELECT
  USING (business_id = public.get_current_business_id());

CREATE POLICY "Tenant sales insert"
  ON public.sales FOR INSERT
  WITH CHECK (business_id = public.get_current_business_id());

CREATE POLICY "Gerants can update sales"
  ON public.sales FOR UPDATE
  USING (business_id = public.get_current_business_id() AND public.get_current_user_role() = 'gerant');

CREATE POLICY "Only Gerants can delete sales"
  ON public.sales FOR DELETE
  USING (business_id = public.get_current_business_id() AND public.get_current_user_role() = 'gerant');

-- 5.7 SALE ITEMS
CREATE POLICY "Tenant sale items read"
  ON public.sale_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
      AND sales.business_id = public.get_current_business_id()
  ));

CREATE POLICY "Tenant sale items insert"
  ON public.sale_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
      AND sales.business_id = public.get_current_business_id()
  ));

CREATE POLICY "Tenant sale items delete"
  ON public.sale_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
      AND sales.business_id = public.get_current_business_id()
      AND public.get_current_user_role() = 'gerant'
  ));

-- 5.8 PAYMENTS
CREATE POLICY "Tenant payments access"
  ON public.payments FOR ALL
  USING (business_id = public.get_current_business_id())
  WITH CHECK (business_id = public.get_current_business_id());

-- 5.9 STOCK MOVEMENTS
CREATE POLICY "Tenant stock movements access"
  ON public.stock_movements FOR ALL
  USING (business_id = public.get_current_business_id())
  WITH CHECK (business_id = public.get_current_business_id());

-- 5.10 SERVICE TICKETS
CREATE POLICY "Tenant service tickets access"
  ON public.service_tickets FOR ALL
  USING (business_id = public.get_current_business_id())
  WITH CHECK (business_id = public.get_current_business_id());

-- ==============================================================================
-- 6. TRIGGER D'INSCRIPTION AUTOMATIQUE (NOUVEAU COMPTE GÉRANT)
-- Crée automatiquement une boutique et un profil gérant lors du signup Supabase
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id UUID;
  business_name_val TEXT;
  full_name_val TEXT;
BEGIN
  -- Récupération des métadonnées envoyées lors du signUp()
  business_name_val := COALESCE(new.raw_user_meta_data->>'business_name', 'Ma Boutique');
  full_name_val := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Gérant');

  -- 1. Créer la boutique
  INSERT INTO public.businesses (name, owner, email)
  VALUES (business_name_val, full_name_val, new.email)
  RETURNING id INTO new_business_id;

  -- 2. Créer le profil de l'utilisateur en tant que Gérant de cette boutique
  INSERT INTO public.user_profiles (id, business_id, full_name, role)
  VALUES (new.id, new_business_id, full_name_val, 'gerant');

  -- 3. Insérer les catégories de base pour la boutique
  INSERT INTO public.categories (business_id, name) VALUES
    (new_business_id, 'Smartphones & Tablettes'),
    (new_business_id, 'Ordinateurs & Accessoires'),
    (new_business_id, 'Audio & Écouteurs'),
    (new_business_id, 'Connectique & Chargeurs'),
    (new_business_id, 'Services & Réparations');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Sécurité : Fonction déclencheur uniquement, interdire l'appel direct depuis l'API REST
REVOKE EXECUTE ON FUNCTION public.handle_new_user_signup() FROM PUBLIC, anon, authenticated;

-- Déclencheur sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
