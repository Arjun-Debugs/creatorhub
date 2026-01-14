import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Sparkles, Users, TrendingUp } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";
import creator1 from "@/assets/featured-creator-1.jpg";
import creator2 from "@/assets/featured-creator-2.jpg";
import creator3 from "@/assets/featured-creator-3.jpg";
import { SEO } from "@/components/SEO";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 gradient-hero relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage: `url(${heroBanner})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
              Empower your creativity.
              <br />
              <span className="text-gradient">
                Teach. Share. Earn.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Your all-in-one platform to teach courses, sell products, and grow your creative business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="default" className="text-lg px-8 h-14 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                  Join as Creator
                </Button>
              </Link>
              <Link to="/explore">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-full glass hover:bg-white/20">
                  Explore Creators
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            Start your creative journey in three simple steps
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="glass-card border-l-4 border-l-primary/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Create your space</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Set up your creator profile and customize your storefront to showcase your unique brand.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-secondary/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Upload your content</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Share your knowledge through courses or sell your creative products directly to your audience.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-accent/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">Start earning</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Connect with learners and customers while building a sustainable creative business.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Creators */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Featured Creators</h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            Discover talented creators sharing their passion and expertise
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { img: creator1, name: "Art & Design", tag: "Visual Arts", color: "text-primary bg-primary/10" },
              { img: creator2, name: "Music Production", tag: "Music", color: "text-secondary bg-secondary/10" },
              { img: creator3, name: "Dance & Movement", tag: "Performance", color: "text-accent bg-accent/10" },
            ].map((creator, idx) => (
              <Card key={idx} className="overflow-hidden hover:scale-105 transition-transform duration-300 shadow-soft hover:shadow-hover border-0">
                <div className="relative group">
                  <img src={creator.img} alt={creator.name} className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <span className="text-white font-medium">View Profile</span>
                  </div>
                </div>
                <CardContent className="p-6 relative bg-card">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${creator.color}`}>
                    {creator.tag}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{creator.name}</h3>
                  <Link to="/explore">
                    <Button variant="ghost" className="mt-2 p-0 h-auto hover:text-primary">
                      View Storefront →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}