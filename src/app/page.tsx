import Dashboard from "@/components/Dashboard";
import { AuthProvider } from "@/components/AuthProvider";

export default function Home() {
  return (
    <main>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </main>
  );
}
