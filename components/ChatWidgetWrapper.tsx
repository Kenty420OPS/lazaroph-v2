"use client";

import { usePathname } from "next/navigation";
import ChatWidget from "./ChatWidget";

export default function ChatWidgetWrapper() {
  const pathname = usePathname();

  // Do not render the chat widget on the admin page, 
  // as the admin has their own dedicated chat dashboard.
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return <ChatWidget />;
}
