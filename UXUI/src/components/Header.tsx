import { ShoppingCart, Search, Menu, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";

const Header = () => {
  const { totalItems, toggleCart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { label: "Products", href: "#products" },
    { label: "Categories", href: "#categories" },
    { label: "Deals", href: "#deals" },
    { label: "Support", href: "#support" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-gradient-dark backdrop-blur-sm border-b border-border/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-orange flex items-center justify-center shadow-orange group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary-foreground hidden sm:block">
              Volt<span className="text-primary">Tech</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-silver-light hover:text-primary transition-colors duration-300 font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" className="text-silver-light hover:text-primary hover:bg-charcoal">
              <Search className="w-5 h-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-silver-light hover:text-primary hover:bg-charcoal relative"
              onClick={toggleCart}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-orange text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </Button>

            <Button variant="hero" size="sm" className="hidden sm:flex">
              Sign In
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-silver-light hover:text-primary hover:bg-charcoal"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border/10 animate-fade-in">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block py-3 text-silver-light hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
            <Button variant="hero" className="w-full mt-4">
              Sign In
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;