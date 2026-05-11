import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import ProductsSection from "@/components/ProductsSection";
import DealsSection from "@/components/DealsSection";
import NewsletterSection from "@/components/NewsletterSection";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>VoltTech - Premium Electronics Store | Phones, Laptops, Audio & Gaming</title>
        <meta
          name="description"
          content="Shop the latest electronics at VoltTech. Premium smartphones, laptops, headphones, smartwatches, and gaming gear with free shipping and 2-year warranty."
        />
        <meta name="keywords" content="electronics, smartphones, laptops, headphones, gaming, tech store" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <HeroSection />
          <CategoriesSection />
          <ProductsSection />
          <DealsSection />
          <NewsletterSection />
        </main>
        <Footer />
        <CartDrawer />
      </div>
    </>
  );
};

export default Index;