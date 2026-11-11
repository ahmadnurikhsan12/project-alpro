"use client";

import type { ComponentType } from "react";
import { DetektifVariabel } from "@/components/games/detektif-variabel";
import { EliminasiKilat } from "@/components/games/eliminasi-kilat";
import { GameShell, type GameProps } from "@/components/games/game-shell";
import { MisiBelanja } from "@/components/games/misi-belanja";
import { PasangkanIstilah } from "@/components/games/pasangkan-istilah";
import { SusunLangkah } from "@/components/games/susun-langkah";
import { TantanganSpldv } from "@/components/games/tantangan-spldv";
import { TebakNilai } from "@/components/games/tebak-nilai";
import { GAME_BY_ID, type GameId } from "@/content/games";

const COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
  "detektif-variabel": DetektifVariabel,
  "misi-belanja": MisiBelanja,
  "eliminasi-kilat": EliminasiKilat,
  "pasangkan-istilah": PasangkanIstilah,
  "tantangan-spldv": TantanganSpldv,
  "susun-langkah": SusunLangkah,
  "tebak-nilai": TebakNilai,
};

export function GamePlayer({ id }: { id: GameId }) {
  const Game = COMPONENTS[id];
  return <GameShell meta={GAME_BY_ID[id]} render={(p) => <Game {...p} />} />;
}
