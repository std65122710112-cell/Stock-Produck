import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = { title: "NewStock Admin" };

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}