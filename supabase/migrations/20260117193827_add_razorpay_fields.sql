-- Add Razorpay-specific fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS error_reason TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON public.orders(razorpay_payment_id);

-- Update process_mock_order function to accept Razorpay data
CREATE OR REPLACE FUNCTION public.process_order_with_razorpay(
  p_course_id UUID,
  p_user_id UUID,
  p_amount DECIMAL,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  -- 1. Create Order with Razorpay details
  INSERT INTO public.orders (
    user_id, 
    item_id, 
    item_type, 
    amount, 
    status,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    payment_method
  )
  VALUES (
    p_user_id, 
    p_course_id, 
    'course', 
    p_amount, 
    'completed',
    p_razorpay_order_id,
    p_razorpay_payment_id,
    p_razorpay_signature,
    p_payment_method
  )
  RETURNING id INTO v_order_id;

  -- 2. Create Enrollment
  INSERT INTO public.enrollments (user_id, course_id, progress)
  VALUES (p_user_id, p_course_id, 0)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  RETURN v_order_id;
END;
$$;
