import { Clock, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

const DealsSection = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (value: number) => value.toString().padStart(2, "0");

  return (
    <section id="deals" className="py-16 md:py-24 bg-gradient-dark relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="bg-charcoal/50 backdrop-blur-sm border border-primary/20 rounded-3xl p-8 md:p-12 lg:p-16">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 text-sm text-primary">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Flash Sale</span>
              </div>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground">
                Mega Sale
                <span className="block text-gradient-orange">Up to 50% Off</span>
              </h2>

              <p className="text-lg text-muted-foreground max-w-md">
                Don't miss out on our biggest sale of the year. Premium electronics at unbeatable prices.
              </p>

              <Button variant="hero" size="xl" className="group">
                Shop the Sale
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Countdown Timer */}
            <div className="flex justify-center lg:justify-end">
              <div className="flex gap-4">
                {[
                  { value: timeLeft.hours, label: "Hours" },
                  { value: timeLeft.minutes, label: "Minutes" },
                  { value: timeLeft.seconds, label: "Seconds" },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="bg-midnight border border-border/20 rounded-2xl p-4 md:p-6 text-center min-w-[80px] md:min-w-[100px]"
                  >
                    <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-orange">
                      {formatTime(value)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DealsSection;