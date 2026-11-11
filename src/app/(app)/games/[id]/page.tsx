import { notFound } from "next/navigation";
import { GAME_BY_ID, GAMES, type GameId } from "@/content/games";
import { GamePlayer } from "./game-player";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = GAME_BY_ID[id as GameId];
  return g ? { title: g.title, description: g.tagline } : {};
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!GAME_BY_ID[id as GameId]) notFound();
  return <GamePlayer id={id as GameId} />;
}
