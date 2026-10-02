import { useState } from "react";
import { Link } from "react-router-dom";
import { CassetteCase, CassetteTape } from "../components/Cassette";
import { NoteCard } from "../components/NoteCard";
import { THEMES, type ThemeDef } from "../data/themes";
import { useTheme } from "../lib/theme";
import type { ThemeId } from "../types";

export function HomePage() {
  const [themeId, setThemeId] = useState<ThemeId>("none");
  const theme = THEMES.find((item) => item.id === themeId) ?? THEMES[0];
  useTheme(themeId);

  return (
    <section className="home">
      <div className="hero">
        <NoteCard value={heroNote(theme)} readOnly className="hero-note" />
        <div className="hero-tape">
          <CassetteTape coverId={theme.heroCover} />
        </div>
        <div className="hero-case">
          <CassetteCase coverId={theme.heroCase} stickers={theme.stickers} sideA={[]} sideB={[]} />
        </div>
      </div>

      <div className="theme-picker">
        <p>Pick a vibe</p>
        <div className="theme-row">
          {THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`theme-chip theme-${item.id} ${themeId === item.id ? "on" : ""}`}
              aria-pressed={themeId === item.id}
              onClick={() => setThemeId(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.blurb}</small>
            </button>
          ))}
        </div>
      </div>

      <Link to={`/create?theme=${theme.id}`} className="btn btn-dark create-btn">
        Create a mixtape
      </Link>
    </section>
  );
}

function heroNote(theme: ThemeDef) {
  if (theme.id === "birthday") return "Happy birthday — I made you a tape.";
  if (theme.id === "anniversary") return "Another year, same song. Almost.";
  if (theme.id === "travel") return "For the road, and whoever's in the passenger seat.";
  if (theme.id === "good-day") return "Press play. It's a good day for it.";
  if (theme.id === "office") return "For the desk, the tabs, and the 4pm song.";
  if (theme.id === "commute") return "For the ride in, and the ride back.";
  return "I made this for you! Enjoy creating <3";
}
