// 1. นำเข้าฟอนต์ Prompt จากระบบของ Next.js
import { Prompt } from "next/font/google"; 
import "./globals.css";
import AppShell from "@/components/AppShell";

// 2. ตั้งค่าฟอนต์ ให้รองรับภาษาไทย และเลือกความหนาของตัวอักษร
const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"], 
});

export const metadata = { title: "NewStock Admin" };

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      {/* 3. สั่งให้เว็บทั้งเว็บใช้ฟอนต์นี้ โดยเอาไปใส่ในแท็ก body */}
      <body className={prompt.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}