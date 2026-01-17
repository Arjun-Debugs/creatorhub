import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { useCart } from "@/hooks/useCart";

export default function CreatorStorefront() {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [creator, setCreator] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courses, setCourses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);


  const fetchCreatorData = useCallback(async () => {
    const [creatorResult, coursesResult, productsResult] = await Promise.all([
      supabase.from("public_profiles").select("*").eq("id", creatorId).single(),
      supabase.from("courses").select("*").eq("creator_id", creatorId).eq("status", "published"),
      supabase.from("products").select("*").eq("creator_id", creatorId),
    ]);

    if (creatorResult.data) setCreator(creatorResult.data);
    if (coursesResult.data) setCourses(coursesResult.data);
    if (productsResult.data) setProducts(productsResult.data);

    setLoading(false);
  }, [creatorId]);


  useEffect(() => {
    if (creatorId) {
      fetchCreatorData();
    }
  }, [creatorId, fetchCreatorData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEnroll = async (course: any) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please sign in to enroll");
      navigate("/auth");
      return;
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .single();

    if (existingEnrollment) {
      toast.info("You're already enrolled in this course!");
      navigate(`/course/${course.id}`);
      return;
    }

    // For free courses, enroll immediately
    if (course.is_free) {
      setEnrolling(course.id);
      const { error } = await supabase.from("enrollments").insert({
        user_id: user.id,
        course_id: course.id,
        progress: 0,
      });

      setEnrolling(null);

      if (error) {
        toast.error("Error enrolling in course");
      } else {
        toast.success("Successfully enrolled! Redirecting to course...");
        setTimeout(() => navigate(`/course/${course.id}`), 1000);
      }
    } else {
      // For paid courses, show payment coming soon
      toast.info("Payment integration coming soon!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 pt-32">
          <p className="text-center text-muted-foreground">Creator not found</p>
        </div>
      </div>
    );
  }

  const socialLinks = typeof creator.social_links === 'object' && creator.social_links !== null
    ? creator.social_links as { instagram?: string; twitter?: string; website?: string }
    : {};

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="pt-20">
        {/* Banner */}
        <div
          className="h-64 bg-gradient-to-r from-primary/20 to-secondary/20"
          style={{
            backgroundImage: creator.banner_url ? `url(${creator.banner_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="container mx-auto px-4 -mt-20 relative z-10">
          <div className="bg-background rounded-xl shadow-soft p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.name}
                  className="w-32 h-32 rounded-full border-4 border-background shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-background shadow-lg bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                  {creator.name?.charAt(0)}
                </div>
              )}

              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{creator.name}</h1>
                <p className="text-muted-foreground mb-4">{creator.bio || "No bio available"}</p>

                {(socialLinks.instagram || socialLinks.twitter || socialLinks.website) && (
                  <div className="flex gap-3">
                    {socialLinks.instagram && (
                      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Instagram
                        </Button>
                      </a>
                    )}
                    {socialLinks.twitter && (
                      <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Twitter
                        </Button>
                      </a>
                    )}
                    {socialLinks.website && (
                      <a href={socialLinks.website} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Website
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="courses" className="mb-12">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="mt-8">
              {courses.length === 0 ? (
                <Card className="shadow-soft">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No courses available yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <Card key={course.id} className="shadow-soft hover:shadow-hover transition-all">
                      <CardHeader>
                        <CardTitle>{course.title}</CardTitle>
                        <CardDescription>{course.category}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {course.description}
                        </p>
                        <div className="flex justify-between items-center">
                          {course.is_free ? (
                            <span className="text-2xl font-bold text-green-600">FREE</span>
                          ) : (
                            <span className="text-2xl font-bold text-primary">${course.price}</span>
                          )}
                          <Button
                            onClick={() => handleEnroll(course)}
                            disabled={enrolling === course.id}
                          >
                            {enrolling === course.id ? "Enrolling..." : "Enroll Now"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="products" className="mt-8">
              {products.length === 0 ? (
                <Card className="shadow-soft">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No products available yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="shadow-soft hover:shadow-hover transition-all">
                      <CardHeader>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xl font-bold text-primary">${product.price}</span>
                          <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                            {product.type}
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => addItem({
                            id: product.id,
                            name: product.name,
                            price: Number(product.price),
                            type: product.type,
                            description: product.description,
                            image_url: product.image_url,
                          })}
                        >
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
}