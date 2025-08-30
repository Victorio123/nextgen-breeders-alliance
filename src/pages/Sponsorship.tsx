import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Newsletter from "@/components/Newsletter";
import breedingImage from "@/assets/breeding-facility.jpg";
import poultryImage from "@/assets/poultry-farm.jpg";

// Extend the Window type to include PaystackPop
declare global {
  interface Window {
    PaystackPop: any;
  }
}

const Sponsorship = () => {
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paystackReady, setPaystackReady] = useState(false);
  const [totalDonations, setTotalDonations] = useState(560000); // Start from 560k
  const { toast } = useToast();

  const target = 5000000; // ₦5,000,000 target

  useEffect(() => {
    // Subscribe to new donations in realtime
    const channel = supabase
      .channel("realtime-donations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "donations" },
        (payload) => {
          const newDonation = payload.new?.amount ?? 0;
          setTotalDonations((prev) => prev + newDonation);
        }
      )
      .subscribe();

    // Load Paystack script
    function loadPaystackScript() {
      if (document.getElementById("paystack-script")) {
        setPaystackReady(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "paystack-script";
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      script.onload = () => setPaystackReady(true);
      script.onerror = () => {
        setPaystackReady(false);
        toast({
          title: "Payment Error",
          description:
            "Failed to load Paystack script. Please refresh and try again.",
          variant: "destructive",
        });
      };
      document.body.appendChild(script);
    }

    loadPaystackScript();

    return () => {
      supabase.removeChannel(channel);
      const script = document.getElementById("paystack-script");
      if (script) document.body.removeChild(script);
      setPaystackReady(false);
    };
  }, [toast]);

  const handlePaymentSuccess = async (reference: string, amt: number, payerEmail: string) => {
    try {
      // Insert donation into Supabase
      const { error } = await supabase.from("donations").insert([
        {
          amount: amt,
          email: payerEmail,
          status: "completed",
          paystack_reference: reference,
        },
      ]);

      if (error) {
        toast({
          title: "Database Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Thank you! 🎉",
        description: `Your donation was successful. Reference: ${reference}`,
      });

      setAmount("");
      setEmail("");
      setTotalDonations((prev) => prev + amt); // Add locally as well
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to record donation. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDonate = async () => {
    const amt = parseFloat(amount);

    if (!amount || isNaN(amt) || amt < 100) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount (minimum ₦100).",
        variant: "destructive",
      });
      return;
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    if (!paystackReady || typeof window.PaystackPop === "undefined") {
      toast({
        title: "Payment Error",
        description:
          "Paystack script not loaded. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!publicKey) {
        toast({
          title: "Payment Error",
          description: "Paystack public key is not configured.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email,
        amount: Math.round(amt * 100),
        currency: "NGN",
        ref: "DON_" + Date.now(),
        callback: function (response: any) {
          handlePaymentSuccess(response.reference, amt, email);
        },
        onClose: function () {
          toast({
            title: "Payment Cancelled",
            description:
              "You closed the payment window before completing payment.",
            variant: "destructive",
          });
          setIsLoading(false);
        },
      });

      handler.openIframe();
    } catch (err) {
      toast({
        title: "Payment Error",
        description:
          "Could not open Paystack payment window. Please refresh and try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const progressPercentage = Math.min((totalDonations / target) * 100, 100);
  const isTargetReached = totalDonations >= target;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-accent text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Sponsorship</h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Partner with us to transform the future of livestock breeding
          </p>
        </div>
      </section>

      {/* Sponsorship Content */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Why Sponsor Us?
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Be a part of the future of livestock breeding by sponsoring
                NextGen Breeders Alliance. Your sponsorship directly supports
                innovation, training, and research in modern livestock farming
                and feed formulation. By partnering with us, you gain visibility,
                impact, and the opportunity to shape the next generation of
                breeders worldwide.
              </p>
              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Research Excellence:</strong>{" "}
                    Support cutting-edge research in livestock genetics and
                    breeding technologies.
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Training Programs:</strong>{" "}
                    Fund comprehensive education initiatives for farmers across
                    Africa.
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Technology Innovation:</strong>{" "}
                    Drive the development of modern farming technologies and
                    practices.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <img
                src={breedingImage}
                alt="Livestock breeding research facility"
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section className="py-16 bg-muted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Support Our Mission
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Your donations help the alliance grow by supporting training
              programs, advanced technology research, feed formulation
              development, and livestock improvement initiatives across Africa.
              Every contribution makes a meaningful difference in transforming
              agricultural practices and improving farmer livelihoods.
            </p>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Make a Donation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    ₦{totalDonations.toLocaleString()} / ₦
                    {target.toLocaleString()}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                <p className="text-sm text-muted-foreground text-center">
                  {progressPercentage.toFixed(1)}% of target reached
                </p>

                {isTargetReached && (
                  <p className="text-green-600 font-semibold text-center mt-2 animate-bounce">
                    🎉 Target Reached! Thank you for your support. We encourage
                    even more donations to further our impact! 🎉
                  </p>
                )}
              </div>

              {/* Donation Form */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Your Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 mb-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 outline-none shadow-sm transition"
                  />
                </div>
                <div>
                  <label
                    htmlFor="amount"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Donation Amount (₦)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="any"
                    className="w-full p-3 mb-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 outline-none shadow-sm transition"
                  />
                </div>

                <Button
                  onClick={handleDonate}
                  disabled={isLoading || !paystackReady}
                  className="w-full"
                >
                  {isLoading
                    ? "Processing..."
                    : paystackReady
                    ? "Donate Now"
                    : "Loading Payment..."}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src={poultryImage}
                alt="Modern poultry farming facility"
                className="rounded-lg shadow-lg w-full"
              />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Your Impact
              </h2>
              <div className="space-y-6">
                <div className="border-l-4 border-primary pl-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Training & Education
                  </h3>
                  <p className="text-muted-foreground">
                    Fund comprehensive training programs that reach thousands of
                    farmers across Nigeria and Africa, providing them with modern
                    breeding techniques and sustainable farming practices.
                  </p>
                </div>

                <div className="border-l-4 border-accent pl-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Research & Development
                  </h3>
                  <p className="text-muted-foreground">
                    Support groundbreaking research in livestock genetics, feed
                    formulation, and agricultural technology that drives
                    innovation across the entire industry.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Technology Access
                  </h3>
                  <p className="text-muted-foreground">
                    Enable the development and deployment of modern farming
                    technologies, making advanced livestock breeding techniques
                    accessible to farmers of all scales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Newsletter />
    </div>
  );
};

export default Sponsorship;
