import Navigation from "./components/Navigation";
import "./globals.css";


export const metadata = {
  title: "Coupon Scraper",
  description: "Scrape coupons from multiple sources",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/4 lg:w-1/5 p-4">
              <Navigation />
            </div>
            <main className="md:w-3/4 lg:w-4/5 p-4">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}