-- Function to process a mock order transactionally
CREATE OR REPLACE FUNCTION public.process_mock_order(
  p_course_id UUID,
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  -- 1. Create Order
  INSERT INTO public.orders (user_id, item_id, item_type, amount, status)
  VALUES (p_user_id, p_course_id, 'course', p_amount, 'completed')
  RETURNING id INTO v_order_id;

  -- 2. Create Enrollment
  INSERT INTO public.enrollments (user_id, course_id, progress)
  VALUES (p_user_id, p_course_id, 0)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  RETURN v_order_id;
END;
$$;
