import ProductCard from "./ProductCard";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import phoneImage from "@/assets/product-phone.png";
import laptopImage from "@/assets/product-laptop.png";
import watchImage from "@/assets/product-watch.png";
import earbudsImage from "@/assets/product-earbuds.png";
import controllerImage from "@/assets/product-controller.png";
import heroImage from "@/assets/hero-headphones.png";

const ProductsSection = () => {
  const products = [
    {
      id: "phone-1",
      image: phoneImage,
      name: "Pro Max Smartphone 256GB",
      price: 999.99,
      originalPrice: 1199.99,
      rating: 4.8,
      reviews: 2341,
      badge: "Bestseller",
    },
    {
      id: "laptop-1",
      image: laptopImage,
      name: "UltraBook Pro 14\" M3 Chip",
      price: 1499.99,
      rating: 4.9,
      reviews: 1823,
      badge: "New",
    },
    {
      id: "watch-1",
      image: watchImage,
      name: "Smart Watch Series X",
      price: 399.99,
      originalPrice: 449.99,
      rating: 4.7,
      reviews: 987,
    },
    {
      id: "earbuds-1",
      image: earbudsImage,
      name: "Pro Wireless Earbuds ANC",
      price: 179.99,
      originalPrice: 249.99,
      rating: 4.6,
      reviews: 3456,
      badge: "Sale",
    },
    {
      id: "controller-1",
      image: controllerImage,
      name: "Elite Gaming Controller Pro",
      price: 129.99,
      rating: 4.5,
      reviews: 2109,
    },
    {
      id: "headphones-1",
      image: heroImage,
      name: "Studio Headphones XM5",
      price: 279.99,
      originalPrice: 399.99,
      rating: 4.9,
      reviews: 4521,
      badge: "-30%",
    },
  ];

  return (
    <section id="products" className="py-16 md:py-24 bg-muted">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Featured <span className="text-gradient-orange">Products</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Handpicked selection of our most popular electronics
            </p>
          </div>
          <Button variant="outline" className="self-start md:self-auto group">
            View All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              {...product}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;