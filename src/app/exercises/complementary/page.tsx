import BibliotecaComplementar from "@/components/BibliotecaComplementar";

export const metadata = {
  title: "Biblioteca Complementar | GymApp",
  description: "800+ exercícios com triagem de segurança lombar L4-L5",
};

export default function ComplementaryPage() {
  return (
    <main className="pb-24 pt-4 px-4 max-w-2xl mx-auto">
      <BibliotecaComplementar dataUrl="/data/free-exercise-db.json" />
    </main>
  );
}
