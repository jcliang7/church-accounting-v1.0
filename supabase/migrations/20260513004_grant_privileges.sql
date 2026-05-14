-- 授予 authenticated role 存取權限
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.donors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.offerings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.expense_items TO authenticated;
GRANT SELECT ON public.ministry_funds TO authenticated;
GRANT SELECT ON public.offering_types TO authenticated;
GRANT SELECT ON public.bank_accounts TO authenticated;
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT SELECT ON public.subject_category_mapping TO authenticated;
GRANT SELECT ON public.accounting_item_mapping TO authenticated;
GRANT SELECT ON public.system_configs TO authenticated;
