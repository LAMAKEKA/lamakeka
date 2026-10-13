-- EST-16 / G5: handle_new_user arma full_name desde nombre+apellido o full_name
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  composed text;
BEGIN
  composed := NULLIF(
    btrim(
      concat_ws(
        ' ',
        NULLIF(btrim(COALESCE(meta->>'nombre', '')), ''),
        NULLIF(btrim(COALESCE(meta->>'apellido', '')), '')
      )
    ),
    ''
  );

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(btrim(COALESCE(meta->>'full_name', '')), ''),
      composed,
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Crea profiles; full_name desde metadata full_name o nombre+apellido (EST-16 G5)';
