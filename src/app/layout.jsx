import "@/app/globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export const metadata = {
  title: "Sol Voyager - Urban Instability Dashboard",
  description:
    "Cloud-native ground instability screening using multi-temporal Sentinel-1 SAR backscatter anomaly detection via Google Earth Engine.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
