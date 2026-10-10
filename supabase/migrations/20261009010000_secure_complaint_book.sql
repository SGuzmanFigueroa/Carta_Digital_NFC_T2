BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE public.complaint_books (
  id text PRIMARY KEY,
  provider_name text NOT NULL,
  provider_ruc text NOT NULL CHECK(provider_ruc ~ '^[0-9]{11}$'),
  provider_address text,
  active boolean NOT NULL DEFAULT true
);
-- Do not invent the provider's address. Configure it administratively before activation.
INSERT INTO public.complaint_books(id,provider_name,provider_ruc)
SELECT 'primary',branch_name,branch_ruc FROM public.system_config
WHERE id='primary' AND branch_ruc ~ '^[0-9]{11}$' LIMIT 1;

CREATE TABLE private.complaint_counters (
  book_id text NOT NULL,
  claim_year integer NOT NULL,
  last_number bigint NOT NULL CHECK(last_number>=0),
  PRIMARY KEY(book_id,claim_year)
);
REVOKE ALL ON private.complaint_counters FROM PUBLIC,anon,authenticated;
ALTER TABLE public.complaint_book
  ADD COLUMN request_id uuid UNIQUE,
  ADD COLUMN submission_payload jsonb,
  ADD COLUMN provider_snapshot jsonb,
  ADD COLUMN declaration_accepted_at timestamptz;
ALTER TABLE public.complaint_book DROP CONSTRAINT IF EXISTS complaint_book_claim_code_key;
ALTER TABLE public.complaint_book ADD CONSTRAINT complaint_book_book_code_key UNIQUE(branch_id,claim_code);
-- Continue any existing REC numbering; never renumber historical sheets.
INSERT INTO private.complaint_counters(book_id,claim_year,last_number)
SELECT branch_id,split_part(claim_code,'-',2)::integer,
  max(split_part(claim_code,'-',3)::bigint)
FROM public.complaint_book WHERE claim_code ~ '^REC-[0-9]{4}-[0-9]{4,18}$' AND branch_id IS NOT NULL
GROUP BY branch_id,split_part(claim_code,'-',2)::integer;

ALTER TABLE public.complaint_book ADD CONSTRAINT complaint_document_valid CHECK(
  (doc_type='DNI' AND doc_number ~ '^[0-9]{8}$') OR
  (doc_type='RUC' AND doc_number ~ '^[0-9]{11}$') OR
  (doc_type='CE' AND doc_number ~ '^[A-Za-z0-9]{6,12}$') OR
  (doc_type='PASAPORTE' AND doc_number ~ '^[A-Za-z0-9]{6,20}$')) NOT VALID;
ALTER TABLE public.complaint_book ADD CONSTRAINT complaint_email_valid CHECK(
  length(email)<=254 AND email ~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$'
  AND email NOT LIKE '.%' AND email NOT LIKE '%..%') NOT VALID;

-- All legacy policies must be removed, especially USING(true) public reads.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='complaint_book' LOOP
    EXECUTE format('DROP POLICY %I ON public.complaint_book',p.policyname);
  END LOOP;
END $$;
ALTER TABLE public.complaint_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_books ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.complaint_book,public.complaint_books FROM anon,authenticated;
GRANT SELECT,UPDATE ON public.complaint_book TO authenticated;
-- app_metadata is assigned by Auth administration, never by a browser's editable role cookie.
CREATE POLICY complaint_admin_read ON public.complaint_book FOR SELECT TO authenticated USING (
  (SELECT auth.jwt())->'app_metadata'->>'complaint_role'='admin'
  AND (SELECT auth.jwt())->'app_metadata'->>'complaint_book_id'=branch_id);
CREATE POLICY complaint_admin_update ON public.complaint_book FOR UPDATE TO authenticated USING (
  (SELECT auth.jwt())->'app_metadata'->>'complaint_role'='admin'
  AND (SELECT auth.jwt())->'app_metadata'->>'complaint_book_id'=branch_id)
WITH CHECK ((SELECT auth.jwt())->'app_metadata'->>'complaint_role'='admin'
  AND (SELECT auth.jwt())->'app_metadata'->>'complaint_book_id'=branch_id);

CREATE FUNCTION private.immutable_complaint_sheet() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF (to_jsonb(NEW)-'status'-'resolution_notes'-'resolved_at') IS DISTINCT FROM
     (to_jsonb(OLD)-'status'-'resolution_notes'-'resolved_at') THEN
    RAISE EXCEPTION 'La hoja registrada no se puede reescribir. Solo puede actualizarse su atención.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.immutable_complaint_sheet() FROM PUBLIC;
CREATE TRIGGER immutable_complaint_sheet BEFORE UPDATE ON public.complaint_book FOR EACH ROW EXECUTE FUNCTION private.immutable_complaint_sheet();

CREATE FUNCTION public.get_complaint_book(p_book_id text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('bookId',id,'name',provider_name,'ruc',provider_ruc,'address',coalesce(provider_address,''),
  'configured',length(trim(coalesce(provider_address,'')))>=5)
 FROM public.complaint_books WHERE id=p_book_id AND active
$$;
REVOKE ALL ON FUNCTION public.get_complaint_book(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_complaint_book(text) TO anon,authenticated;

CREATE FUNCTION public.submit_complaint(p_book_id text,p_request_id uuid,p_entry jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE book public.complaint_books; sheet public.complaint_book; field text; value text;
 v_claim_year integer; claim_number bigint; code text; provider jsonb;
BEGIN
 IF p_request_id IS NULL OR p_book_id IS NULL OR jsonb_typeof(p_entry) IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'La solicitud de reclamación no es válida.' USING ERRCODE='22023';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 SELECT * INTO sheet FROM public.complaint_book WHERE request_id=p_request_id;
 IF FOUND THEN
   IF sheet.branch_id IS DISTINCT FROM p_book_id OR sheet.submission_payload IS DISTINCT FROM p_entry THEN
     RAISE EXCEPTION 'La referencia de envío pertenece a una hoja distinta.' USING ERRCODE='22023';
   END IF;
   RETURN jsonb_build_object('claimCode',sheet.claim_code,'createdAt',sheet.created_at,'provider',sheet.provider_snapshot);
 END IF;
 SELECT * INTO book FROM public.complaint_books WHERE id=p_book_id AND active;
 IF NOT FOUND OR length(trim(coalesce(book.provider_address,'')))<5 THEN
   RAISE EXCEPTION 'El establecimiento debe completar la identificación de su libro. Solicita el libro físico.' USING ERRCODE='55000';
 END IF;
 FOREACH field IN ARRAY ARRAY['fullName','docType','docNumber','phone','email','address','contractedGoodType','goodDescription','claimType','detail','consumerRequest'] LOOP
   IF jsonb_typeof(p_entry->field) IS DISTINCT FROM 'string' OR length(trim(p_entry->>field))<1 THEN
     RAISE EXCEPTION 'Completa los datos obligatorios de la hoja.' USING ERRCODE='22023';
   END IF;
 END LOOP;
 IF length(p_entry->>'fullName') NOT BETWEEN 2 AND 160 OR length(p_entry->>'address') NOT BETWEEN 5 AND 300
   OR length(p_entry->>'phone') NOT BETWEEN 7 AND 25 OR (p_entry->>'phone') !~ '^[+0-9() .-]+$'
   OR length(regexp_replace(p_entry->>'phone','[^0-9]','','g'))<7
   OR length(p_entry->>'goodDescription') NOT BETWEEN 2 AND 1000 OR length(p_entry->>'detail') NOT BETWEEN 5 AND 5000
   OR length(p_entry->>'consumerRequest') NOT BETWEEN 2 AND 3000 OR length(coalesce(p_entry->>'tableNumber',''))>80 THEN
   RAISE EXCEPTION 'Revisa la longitud y el formato de los datos de la hoja.' USING ERRCODE='22023';
 END IF;
 IF NOT (
   (p_entry->>'docType'='DNI' AND p_entry->>'docNumber' ~ '^[0-9]{8}$') OR
   (p_entry->>'docType'='RUC' AND p_entry->>'docNumber' ~ '^[0-9]{11}$') OR
   (p_entry->>'docType'='CE' AND p_entry->>'docNumber' ~ '^[A-Za-z0-9]{6,12}$') OR
   (p_entry->>'docType'='PASAPORTE' AND p_entry->>'docNumber' ~ '^[A-Za-z0-9]{6,20}$')) THEN
   RAISE EXCEPTION 'Documento inválido: el DNI requiere 8 dígitos y el RUC 11.' USING ERRCODE='22023';
 END IF;
 value:=p_entry->>'email';
 IF length(value)>254 OR value !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$'
   OR value LIKE '.%' OR value LIKE '%..%' THEN RAISE EXCEPTION 'Ingresa un correo electrónico válido.' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_entry->'isMinor') IS DISTINCT FROM 'boolean' OR p_entry->'declarationAccepted' IS DISTINCT FROM 'true'::jsonb
   OR (p_entry->>'contractedGoodType') NOT IN ('PRODUCTO','SERVICIO') OR (p_entry->>'claimType') NOT IN ('RECLAMO','QUEJA') THEN
   RAISE EXCEPTION 'Revisa el tipo de hoja y confirma la declaración.' USING ERRCODE='22023';
 END IF;
 IF (p_entry->>'isMinor')::boolean AND (jsonb_typeof(p_entry->'parentName') IS DISTINCT FROM 'string'
   OR length(trim(p_entry->>'parentName')) NOT BETWEEN 2 AND 160) THEN
   RAISE EXCEPTION 'Completa el nombre del representante del menor.' USING ERRCODE='22023';
 END IF;
 IF jsonb_typeof(p_entry->'claimedAmount') IS DISTINCT FROM 'number' OR NOT ((p_entry->>'claimedAmount')::numeric BETWEEN 0 AND 99999999.99) THEN
   RAISE EXCEPTION 'El monto reclamado no es válido.' USING ERRCODE='22023';
 END IF;
 v_claim_year:=extract(year FROM timezone('America/Lima',clock_timestamp()));
 INSERT INTO private.complaint_counters(book_id,claim_year,last_number) VALUES(p_book_id,v_claim_year,1)
 ON CONFLICT(book_id,claim_year) DO UPDATE SET last_number=private.complaint_counters.last_number+1
 RETURNING last_number INTO claim_number;
 code:='REC-'||v_claim_year||'-'||lpad(claim_number::text,greatest(4,length(claim_number::text)),'0');
 provider:=jsonb_build_object('bookId',book.id,'name',book.provider_name,'ruc',book.provider_ruc,'address',book.provider_address,'configured',true);
 INSERT INTO public.complaint_book(claim_code,branch_id,request_id,submission_payload,provider_snapshot,declaration_accepted_at,
  full_name,doc_type,doc_number,phone,email,address,is_minor,parent_name,contracted_good_type,claimed_amount,good_description,table_number,claim_type,detail,consumer_request)
 VALUES(code,p_book_id,p_request_id,p_entry,provider,clock_timestamp(),
  p_entry->>'fullName',p_entry->>'docType',p_entry->>'docNumber',p_entry->>'phone',lower(p_entry->>'email'),p_entry->>'address',
  (p_entry->>'isMinor')::boolean,CASE WHEN (p_entry->>'isMinor')::boolean THEN p_entry->>'parentName' ELSE NULL END,
  p_entry->>'contractedGoodType',(p_entry->>'claimedAmount')::numeric,p_entry->>'goodDescription',p_entry->>'tableNumber',
  p_entry->>'claimType',p_entry->>'detail',p_entry->>'consumerRequest') RETURNING * INTO sheet;
 RETURN jsonb_build_object('claimCode',sheet.claim_code,'createdAt',sheet.created_at,'provider',provider);
END $$;
REVOKE ALL ON FUNCTION public.submit_complaint(text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_complaint(text,uuid,jsonb) TO anon,authenticated;
CREATE FUNCTION public.configure_complaint_book(p_book_id text,p_name text,p_ruc text,p_address text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF (auth.jwt()->'app_metadata'->>'complaint_role') IS DISTINCT FROM 'admin'
   OR (auth.jwt()->'app_metadata'->>'complaint_book_id') IS DISTINCT FROM p_book_id THEN
   RAISE EXCEPTION 'No tienes permiso para editar este libro.' USING ERRCODE='42501';
 END IF;
 IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 160 OR p_ruc IS NULL OR p_ruc !~ '^[0-9]{11}$'
   OR p_address IS NULL OR length(trim(p_address)) NOT BETWEEN 5 AND 300 THEN
   RAISE EXCEPTION 'Completa la razón social, RUC de 11 dígitos y dirección.' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.complaint_books(id,provider_name,provider_ruc,provider_address)
 VALUES(p_book_id,trim(p_name),p_ruc,trim(p_address)) ON CONFLICT(id) DO UPDATE
 SET provider_name=EXCLUDED.provider_name,provider_ruc=EXCLUDED.provider_ruc,provider_address=EXCLUDED.provider_address;
 RETURN public.get_complaint_book(p_book_id);
END $$;
REVOKE ALL ON FUNCTION public.configure_complaint_book(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_complaint_book(text,text,text,text) TO authenticated;
COMMIT;
