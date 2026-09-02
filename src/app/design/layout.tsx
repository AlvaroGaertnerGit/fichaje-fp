import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fichaje · Exploración visual",
  description: "Exploración visual interna. No es la aplicación final.",
  robots: { index: false, follow: false },
};

export default function DesignExplorationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
