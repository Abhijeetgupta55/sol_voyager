import "@/app/globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export const metadata = {
  title: "Sol Voyager - Urban Instability Dashboard",
  description:
    "Real-time urban ground instability monitoring powered by Sentinel-1 InSAR analysis",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
