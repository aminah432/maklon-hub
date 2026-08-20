insert into public.user_roles (user_id, role)
select '9e2778f5-3fba-4860-9756-bce483993dab'::uuid, 'super_admin'::app_role
where not exists (
  select 1 from public.user_roles where user_id = '9e2778f5-3fba-4860-9756-bce483993dab'::uuid and role = 'super_admin'::app_role
);