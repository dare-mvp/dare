revoke all on function public.claim_paystack_withdrawals(integer)
from public, anon, authenticated;

grant execute on function public.claim_paystack_withdrawals(integer)
to service_role;
