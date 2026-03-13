import "../src/assets/css/style.css";

export const metadata = {
  title: "Skillfield",
  description:
    "Skillfield is a Melbourne-based technology services firm delivering Cyber Security, AI and Data Services.",
  icons: {
    icon: "https://skillfield.com.au/wp-content/uploads/2022/05/Skillfield-Logo-FULLFAV32.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
