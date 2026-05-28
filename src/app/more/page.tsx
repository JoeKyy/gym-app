"use client";
import { redirect } from "next/navigation";

// /more now redirects to /settings (consolidated settings hub)
export default function MorePage() {
  redirect("/settings");
}
