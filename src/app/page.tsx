import MenuPage from "./(comensal)/menu/page";

// La portada muestra la carta: se regenera igual que /menu (debe ser un literal aquí).
export const revalidate = 60;
export { generateMetadata } from "./(comensal)/menu/page";

export default function Home() {
  return <MenuPage />;
}
