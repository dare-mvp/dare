revoke all on function public.accept_dare_action(uuid, uuid, text)
from public, anon, authenticated, service_role;

grant execute on function public.accept_dare_action(uuid, uuid, text)
to service_role;
