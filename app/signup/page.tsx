import { redirect } from "next/navigation";

// Public kayıt kapalı — işletme oluşturma yalnızca admin panelinden yapılır.
export default function SignupPage() {
  redirect("/login");
}
