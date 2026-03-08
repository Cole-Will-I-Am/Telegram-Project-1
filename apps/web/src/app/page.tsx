"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { Shimmer } from "@/components/ui/shimmer";

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      router.replace("/chat");
    } else {
      router.replace("/login");
    }
  }, [token, router]);

  return (
    <div className="flex h-dvh items-center justify-center bg-bg-primary">
      <Shimmer className="h-8 w-48 rounded-xl" />
    </div>
  );
}
