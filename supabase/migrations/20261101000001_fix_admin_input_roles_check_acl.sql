-- #232: product_versions_input_contract calls this immutable validator under
-- the invoking PostgREST role. 20261028000001 accidentally revoked EXECUTE
-- from authenticated, making all admin version INSERT/UPDATE operations fail
-- with SQLSTATE 42501. Restore only the minimal required role permission.
-- RLS on product_versions and the CHECK itself remain unchanged.
GRANT EXECUTE ON FUNCTION public.is_valid_input_image_roles(JSONB) TO authenticated;
