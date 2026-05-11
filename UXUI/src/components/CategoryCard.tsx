import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  icon: LucideIcon;
  title: string;
  count: number;
  delay?: number;
}

const CategoryCard = ({ icon: Icon, title, count, delay = 0 }: CategoryCardProps) => {
  return (
    <div
      className="group relative bg-card hover:bg-secondary rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-silver flex items-center justify-center group-hover:bg-gradient-orange transition-all duration-300">
          <Icon className="w-8 h-8 text-charcoal group-hover:text-primary-foreground transition-colors duration-300" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{count} Products</p>
        </div>
      </div>
    </div>
  );
};

export default CategoryCard;