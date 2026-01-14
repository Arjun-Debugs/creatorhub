import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import CreatorDashboard from "@/components/dashboard/CreatorDashboard";
import LearnerDashboard from "@/components/dashboard/LearnerDashboard";
import { SEO } from "@/components/SEO";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        fetchUserRole(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();

    if (error) {
      console.error("Error fetching user role:", error);
      setLoading(false);
      return;
    }

    setUserRole(data?.role || "learner");
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <SEO title="Dashboard" />
        <Navbar />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO title="Dashboard" />
      <Navbar />
      <div className="pt-20">
        {userRole === "creator" ? <CreatorDashboard /> : <LearnerDashboard />}
      </div>
    </div>
  );
}