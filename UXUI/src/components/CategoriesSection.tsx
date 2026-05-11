import { Smartphone, Laptop, Watch, Headphones, Gamepad2, Camera } from "lucide-react";
import CategoryCard from "./CategoryCard";

const CategoriesSection = () => {
  const categories = [
    { icon: Smartphone, title: "Phones", count: 124 },
    { icon: Laptop, title: "Laptops", count: 89 },
    { icon: Watch, title: "Smartwatches", count: 56 },
    { icon: Headphones, title: "Audio", count: 203 },
    { icon: Gamepad2, title: "Gaming", count: 167 },
    { icon: Camera, title: "Cameras", count: 45 },
  ];

  return (
    <section id="categories" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Shop by <span className="text-gradient-orange">Category</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our wide range of electronics across all major categories
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <CategoryCard
              key={category.title}
              icon={category.icon}
              title={category.title}
              count={category.count}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;