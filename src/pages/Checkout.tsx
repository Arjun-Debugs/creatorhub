import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, CreditCard } from "lucide-react";
import { sendOrderConfirmationEmail, sendEnrollmentEmail } from "@/lib/email";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart, getTotalPrice } = useCart();
  const [processing, setProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    // Get user info
    fetchUserInfo();

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      setUserName(profile?.name || "User");
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please sign in to complete purchase");
      navigate("/auth");
      return;
    }



    setProcessing(true);

    try {
      // Step 1: Create Razorpay order via Edge Function
      const { data: { session } } = await supabase.auth.getSession();

      const orderResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ items }),
        }
      );

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // Step 2: Open Razorpay checkout with order_id
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CreatorHub',
        description: `Purchase of ${items.length} course(s)`,
        image: '/logo.png',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        order_id: orderData.razorpay_order_id,
        handler: async function (response: any) {
          // Step 3: Verify payment signature via Edge Function
          console.log('Payment successful, verifying signature...');

          try {
            const verifyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  payment_method: response.method || null,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.verified) {
              throw new Error('Payment verification failed');
            }

            // Send confirmation emails
            if (import.meta.env.VITE_RESEND_API_KEY && import.meta.env.VITE_RESEND_API_KEY !== 're_your_api_key_here') {
              for (const item of items) {
                await sendOrderConfirmationEmail({
                  to: userEmail,
                  userName: userName,
                  courseName: item.name,
                  orderAmount: item.price,
                  orderId: response.razorpay_payment_id
                });

                await sendEnrollmentEmail({
                  to: userEmail,
                  userName: userName,
                  courseName: item.name,
                  courseUrl: `${window.location.origin}/course/${item.id}`
                });
              }
            }

            toast.success("Payment successful! Check your email for confirmation.");
            clearCart();
            navigate("/dashboard");
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed. Please contact support with payment ID: " + response.razorpay_payment_id);
            setProcessing(false);
          }
        },
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: '#667eea'
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            toast.info("Payment cancelled");
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to initialize payment");
      setProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <Button onClick={() => navigate("/explore")}>Browse Courses</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Billing Form */}
          <div className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
                <CardDescription>Review your details before payment</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      required
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <div className="flex gap-2 p-4 border rounded-lg bg-muted/50 items-center">
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">Razorpay</span>
                      <div className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Secure
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports UPI, Cards, Net Banking, and Wallets
                    </p>
                  </div>

                  <Button type="submit" className="w-full mt-4" size="lg" disabled={processing}>
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay ₹${getTotalPrice().toFixed(2)}`
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="shadow-soft lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                    </div>
                    <p className="font-semibold">₹{item.price}</p>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>₹{getTotalPrice().toFixed(2)}</span>
                </div>

                <div className="bg-secondary/10 p-4 rounded-lg flex items-start gap-3 mt-4">
                  <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-secondary-foreground">Secure Checkout</p>
                    <p className="text-muted-foreground">Powered by Razorpay. Your payment information is encrypted and secure.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
