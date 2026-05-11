import { Mail, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { toast } from "sonner";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("Thanks for subscribing! Check your inbox for exclusive deals.");
      setEmail("");
    }
  };

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-silver rounded-3xl p-8 md:p-12 lg:p-16 border border-border">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-orange flex items-center justify-center shadow-orange">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Stay <span className="text-gradient-orange">Updated</span>
            </h2>

            <p className="text-lg text-muted-foreground">
              Subscribe to our newsletter for exclusive deals, new arrivals, and tech news.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-background border-border focus:border-primary"
                required
              />
              <Button variant="hero" size="lg" type="submit" className="group whitespace-nowrap">
                Subscribe
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>

            <p className="text-sm text-muted-foreground">
              No spam, unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;